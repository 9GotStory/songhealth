// What the migration script's import and verify commands do on a target (#178; spec #174 "The
// migration script"): they read and write through EmDash's native APIs, with the helpers the demo
// dataset uses (tests/browser/cms.helpers.ts). The plan comes from
// scripts/migration/import-plan.ts; this module only carries it out.

import * as helpers from "../../tests/browser/cms.helpers.ts";
import type { ImportPlan, TargetState } from "./import-plan.ts";
import type { Zip } from "./zip.ts";

/**
 * The Administrator whose API token is in `tokenFile`, a 0600 file holding the bare token, which is
 * checked against `origin` and never printed. Entries the import creates belong to this user.
 */
export async function administrator(origin: string, tokenFile: string): Promise<helpers.CmsActor> {
	return helpers.createPatActor({
		baseUrl: origin,
		token: await helpers.loadDevAccessToken(tokenFile),
		expected: { role: helpers.NATIVE_ROLES.administrator },
	});
}

/** One native request. A refusal throws, saying what was being done. */
async function call(
	admin: helpers.CmsActor,
	what: string,
	path: string,
	options: helpers.CmsRequestOptions = {},
): Promise<helpers.NativeResult> {
	const result = await helpers.cmsRequest(admin, path, options);
	if (!result.ok) throw new Error(`${what}: ${helpers.nativeRefusalOf(result)}`);
	return result;
}

/** What the target holds, as the stop and verify read it. */
export interface Target extends TargetState {
	entries: (TargetState["entries"][number] & {
		status: string;
		publishedAt: string | null;
		authorId: string | null;
	})[];
	/** The Media Library's items (emdash 1.1.0 src/database/repositories/media.ts MediaItem). */
	media: { contentHash: string | null; folderId?: string | null }[];
	folders: { id: string; name: string }[];
}

/** The target's entries of the plan's collections, terms, redirects, media and media folders. */
export async function readTarget(admin: helpers.CmsActor, planned: ImportPlan): Promise<Target> {
	const entries: Target["entries"] = [];
	for (const collection of new Set(planned.entries.map((entry) => entry.collection))) {
		for (const trashed of [false, true]) {
			const path = `/_emdash/api/content/${collection}${trashed ? "/trash" : ""}`;
			for (const item of await helpers.listNativeItems(admin, path)) {
				entries.push({
					collection,
					slug: typeof item.slug === "string" ? item.slug : null,
					trashed,
					status: String(item.status),
					publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
					authorId: typeof item.authorId === "string" ? item.authorId : null,
				});
			}
		}
	}
	const terms: Target["terms"] = [];
	for (const taxonomy of new Set(
		planned.entries.flatMap(({ taxonomies }) => Object.keys(taxonomies)),
	)) {
		const listed = await call(
			admin,
			`listing the ${taxonomy} terms`,
			`/_emdash/api/taxonomies/${taxonomy}/terms`,
			{ searchParams: { includeCounts: "false" } },
		);
		for (const { slug } of helpers.nativeDataOf(listed)!.terms as { slug: string }[]) {
			terms.push({ taxonomy, slug });
		}
	}
	const redirects = (await helpers.listNativeItems(admin, "/_emdash/api/redirects")).map((item) =>
		String(item.source),
	);
	const media = (await helpers.listNativeItems(admin, "/_emdash/api/media")) as Target["media"];
	const folders = (await helpers.listNativeItems(
		admin,
		"/_emdash/api/media/folders",
	)) as Target["folders"];
	return { entries, terms, redirects, media, folders };
}

/** The media item a used file became: its id and its address. */
type MediaByAttachment = Map<number, { id: string; url: string }>;

/**
 * `value` with each picture a field holds replaced by its media item's `{ id }`, and each picture
 * of a body by the `asset` the Admin editor saves: the media item's id as `_ref` and its URL
 * (`docs/agents/emdash-1.1.0.md` "Media").
 */
function withMedia(value: unknown, media: MediaByAttachment): unknown {
	if (Array.isArray(value)) return value.map((inner) => withMedia(inner, media));
	if (value === null || typeof value !== "object") return value;
	if ("picture" in value) return { id: media.get((value as { picture: number }).picture)!.id };
	if ("bodyPicture" in value) {
		const { id, url } = media.get((value as { bodyPicture: number }).bodyPicture)!;
		return { _ref: id, url };
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, inner]) => [key, withMedia(inner, media)]),
	);
}

/**
 * Carries out the plan on a target that the stop has cleared: the folders, the files, then the
 * entries, each created and published with its legacy date, then the redirects. It stops at the
 * first refusal, saying what it was doing; what it wrote before stays until the backup is restored,
 * and a later run stops on the first slug it wrote. It answers how many files it uploaded and which
 * ones EmDash reused.
 */
export async function applyImport(
	admin: helpers.CmsActor,
	planned: ImportPlan,
	target: Target,
	zip: Zip,
): Promise<{ uploaded: number; reused: ImportPlan["files"] }> {
	const folders = new Map(target.folders.map((folder) => [folder.name, folder.id]));
	for (const name of new Set(planned.files.map((file) => file.folder))) {
		if (folders.has(name)) continue;
		const created = await call(admin, `creating the folder ${name}`, "/_emdash/api/media/folders", {
			method: "POST",
			body: { name },
		});
		folders.set(name, String(helpers.nativeItemOf(created)!.id));
	}
	const media: MediaByAttachment = new Map();
	let uploadedCount = 0;
	const reused: ImportPlan["files"] = [];
	for (const file of planned.files) {
		const form = new FormData();
		// EmDash takes the type from the file name's extension (emdash 1.1.0 src/media/mime.ts
		// resolveUploadMimeType), and reuses an item of the same content hash unless told not to
		// (src/api/schemas/media.ts mediaUploadDeduplicateForm).
		form.append("file", new File([new Uint8Array(await zip.read(file.path))], file.filename));
		form.append("folderId", folders.get(file.folder)!);
		const uploaded = await call(admin, `uploading ${file.filename}`, "/_emdash/api/media", {
			method: "POST",
			form,
		});
		const { item, deduplicated } = helpers.nativeDataOf(uploaded) as {
			item: { id: string; url: string };
			deduplicated?: boolean;
		};
		media.set(file.attachment, item);
		if (deduplicated) {
			// A reused item keeps its own alt text and caption; the report lists it.
			reused.push(file);
			continue;
		}
		uploadedCount++;
		if (file.alt === "" && file.caption === "") continue;
		await call(admin, `describing ${file.filename}`, `/_emdash/api/media/${item.id}`, {
			method: "PUT",
			body: {
				...(file.alt === "" ? {} : { alt: file.alt }),
				...(file.caption === "" ? {} : { caption: file.caption }),
			},
		});
	}
	for (const entry of planned.entries) {
		const name = `${entry.collection}/${entry.slug}`;
		const created = await call(
			admin,
			`creating ${name}`,
			`/_emdash/api/content/${entry.collection}`,
			{
				method: "POST",
				body: {
					slug: entry.slug,
					data: withMedia(entry.data, media),
					taxonomies: entry.taxonomies,
				},
			},
		);
		const published = await helpers.publishEntry(
			admin,
			entry.collection,
			String(helpers.nativeItemOf(created)!.id),
			{ publishedAt: entry.publishedAt },
		);
		if (!published.ok) throw new Error(`publishing ${name}: ${helpers.nativeRefusalOf(published)}`);
	}
	for (const { source, destination } of planned.redirects) {
		await call(admin, `creating the redirect ${source}`, "/_emdash/api/redirects", {
			method: "POST",
			body: { source, destination, type: 301 },
		});
	}
	return { uploaded: uploadedCount, reused };
}
