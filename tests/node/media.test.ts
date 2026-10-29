// Media on public pages (#55; spec #51 "Public reads", `03` §17).
//
// A page shows a CMS image or offers a Document's file only while the file can be served: EmDash
// serves local media from its storage by key, and a media item deleted in Admin takes its stored
// file with it. These tests drive the check with a stand-in for EmDash's storage adapter.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { downloadableFile, isMediaAvailable } from "../../src/lib/media.ts";

/**
 * A stand-in for EmDash's storage adapter holding `files` (storage key → size in bytes), and the
 * runtime that carries it. A missing key fails the way EmDash's adapters fail (emdash 1.1.0
 * src/storage/local.ts download: an EmDashStorageError with code NOT_FOUND).
 */
function runtimeWith(files: Record<string, number> = {}) {
	const asked: string[] = [];
	const open = new Set<string>();
	const stored = new Map(Object.entries(files));
	return {
		asked,
		/** Keys whose download stream was opened and not cancelled. */
		open,
		runtime: {
			storage: {
				async exists(key: string) {
					asked.push(key);
					return stored.has(key);
				},
				async download(key: string) {
					asked.push(key);
					const size = stored.get(key);
					if (size === undefined) {
						throw Object.assign(new Error(`File not found: ${key}`), { code: "NOT_FOUND" });
					}
					open.add(key);
					const body = new ReadableStream<Uint8Array>({
						cancel: () => void open.delete(key),
					});
					return { body, contentType: "application/pdf", size };
				},
			},
			getPublicMediaUrl: (key: string) => `/_emdash/api/media/file/${key}`,
		},
	};
}

describe("isMediaAvailable", () => {
	it("is true for local media whose stored file exists, looked up by its storage key", async () => {
		const { asked, runtime } = runtimeWith({ "01JX0001.png": 2_048 });
		const image = { id: "01JX0001", provider: "local", meta: { storageKey: "01JX0001.png" } };
		assert.equal(await isMediaAvailable(image, runtime), true);
		assert.deepEqual(asked, ["01JX0001.png"]);
	});

	it("is false once the stored file is gone, as after its media item was deleted", async () => {
		const { runtime } = runtimeWith();
		const image = { id: "01JX0002", provider: "local", meta: { storageKey: "01JX0002.png" } };
		assert.equal(await isMediaAvailable(image, runtime), false);
	});

	it("takes a value without a provider as local media, the way EmDash does", async () => {
		const { runtime } = runtimeWith({ "01JX0003.pdf": 10 });
		assert.equal(
			await isMediaAvailable({ id: "01JX0003", meta: { storageKey: "01JX0003.pdf" } }, runtime),
			true,
		);
	});

	it("is false for media of another provider, which a page could only show from another origin", async () => {
		const { asked, runtime } = runtimeWith({ "photo-1": 10 });
		const image = {
			id: "photo-1",
			provider: "external",
			src: "https://images.example/photo-1.jpg",
		};
		assert.equal(await isMediaAvailable(image, runtime), false);
		assert.deepEqual(asked, [], "the storage is not asked about another provider's media");
	});

	it("is false without a value or without a storage adapter to serve it", async () => {
		const image = { id: "01JX0004", meta: { storageKey: "01JX0004.png" } };
		assert.equal(await isMediaAvailable(undefined, runtimeWith().runtime), false);
		assert.equal(await isMediaAvailable(image, undefined), false);
		assert.equal(await isMediaAvailable(image, { storage: null }), false);
	});
});

describe("downloadableFile", () => {
	/**
	 * A file field value as EmDash saves the Admin's pick (@emdash-cms/admin 1.1.0
	 * FileFieldRenderer, normalised by emdash 1.1.0 src/media/normalize.ts, which keeps no size).
	 */
	function pickedFile(storageKey: string, filename: string) {
		return {
			id: storageKey.replace(/\..*$/, ""),
			provider: "local",
			filename,
			mimeType: "application/pdf",
			meta: { storageKey },
		};
	}

	it("offers a stored file at EmDash's media URL, with its file type, size and original name", async () => {
		const { runtime } = runtimeWith({ "01JX0010.pdf": 1_258_291 });
		assert.deepEqual(
			await downloadableFile(pickedFile("01JX0010.pdf", "แผนปฏิบัติการ 2569.pdf"), runtime),
			{
				href: "/_emdash/api/media/file/01JX0010.pdf",
				type: "PDF",
				size: "1.2 MB",
				filename: "แผนปฏิบัติการ 2569.pdf",
			},
		);
	});

	it("releases the stored file it opened to read the size", async () => {
		const { open, runtime } = runtimeWith({ "01JX0015.pdf": 10 });
		await downloadableFile(pickedFile("01JX0015.pdf", "a.pdf"), runtime);
		assert.deepEqual([...open], []);
	});

	it("offers nothing when the stored file is gone", async () => {
		const { runtime } = runtimeWith();
		assert.equal(await downloadableFile(pickedFile("01JX0011.pdf", "a.pdf"), runtime), undefined);
	});

	it("offers nothing for another provider's file or without a storage adapter", async () => {
		const external = { id: "", provider: "external", src: "https://files.example/a.pdf" };
		assert.equal(await downloadableFile(external, runtimeWith().runtime), undefined);
		assert.equal(await downloadableFile(pickedFile("01JX0016.pdf", "a.pdf"), undefined), undefined);
	});

	it("passes on a storage failure other than a missing file", async () => {
		const runtime = {
			storage: {
				exists: async () => true,
				download: async () => {
					throw Object.assign(new Error("disk unreadable"), { code: "DOWNLOAD_FAILED" });
				},
			},
		};
		await assert.rejects(
			downloadableFile(pickedFile("01JX0017.pdf", "a.pdf"), runtime),
			/disk unreadable/,
		);
	});

	it("writes the size in the Admin's units, with at most one decimal", async () => {
		const sizeOf = async (bytes: number) =>
			(
				await downloadableFile(
					pickedFile("01JX0012.pdf", "a.pdf"),
					runtimeWith({ "01JX0012.pdf": bytes }).runtime,
				)
			)?.size;
		assert.equal(await sizeOf(0), "0 B");
		assert.equal(await sizeOf(820), "820 B");
		assert.equal(await sizeOf(358_400), "350 KB");
		assert.equal(await sizeOf(1_536), "1.5 KB");
		assert.equal(await sizeOf(5_368_709_120), "5 GB");
	});

	it("takes the type from the stored file's key when the filename has no extension", async () => {
		const { runtime } = runtimeWith({ "01JX0014.pdf": 2_048 });
		const file = await downloadableFile(pickedFile("01JX0014.pdf", "ตารางสรุป"), runtime);
		assert.equal(file?.type, "PDF");
	});
});
