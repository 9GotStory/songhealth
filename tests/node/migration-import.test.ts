// The migration script's import of the news stream (#178; spec #174 "The migration script",
// "Mapping: the news stream" and "Redirects"; seam A).
//
// The import turns the Legacy site's export and the Classification list into a plan of what it
// writes, and verify checks a target against that plan. The expected values come from the spec and
// the ticket. Every export and picture here is synthetic, and each export goes through EmDash's own
// parser and converter, which plain Node loads (Product Owner, #177 comment 6719251511, item 1, and
// #178 comment 6720200201, item 3).

import assert from "node:assert/strict";
import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { firstStop, planImport } from "../../scripts/migration/import-plan.ts";
import { blocksOf, readLegacySite } from "../../scripts/migration/legacy-site.ts";
import { plan } from "../../scripts/migration/plan.ts";
import { verifyTarget, type VerifyInput } from "../../scripts/migration/verify.ts";
import { openZip, type Zip } from "../../scripts/migration/zip.ts";
import {
	ACTIVITY,
	OTHER_NEWS,
	PM25,
	PUBLIC_RELATIONS,
	attachment,
	newsItem,
	runMigration,
	wxrDocument,
	zipOf,
	type SyntheticItem,
} from "./migration.helpers.ts";

/** What reviewers wrote in a row of the list. */
type Review = { decision?: string; decision_type?: string; summary?: string };

/** A cell as the list's CSV writes it. */
const csvCell = (value: string) =>
	/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** The list `text` with what reviewers wrote, by slug. Synthetic cells hold no comma or quote. */
function reviewed(text: string, reviews: Record<string, Review>): string {
	const [header, ...rows] = text.trimEnd().split("\r\n");
	const columns = header!.split(",");
	const at = (name: string) => columns.indexOf(name);
	const lines = rows.map((line) => {
		const cells = line.split(",");
		for (const [column, value] of Object.entries(reviews[cells[at("slug")]!] ?? {})) {
			cells[at(column)] = csvCell(value);
		}
		return cells.join(",");
	});
	return [header, ...lines, ""].join("\r\n");
}

/** How the target answers a request for a path, as verify reads it. */
type Answer = { status: number; location: string | null };

/** The uploads copy's path of each attachment in `items`. */
const uploadsOf = (items: SyntheticItem[]) =>
	items.flatMap((item) => (item.url === undefined ? [] : [new URL(item.url).pathname.slice(1)]));

interface ImportOptions {
	reviews?: Record<string, Review>;
	/** The uploads copy's names, every attachment's file unless given. */
	uploads?: string[];
	final?: boolean;
	/** The items the list was made from, `items` unless given. */
	listItems?: SyntheticItem[];
}

/** What import plans for an export holding `items`, from its list with `reviews` written in. */
async function importOf(
	items: SyntheticItem[],
	{
		reviews = {},
		uploads = uploadsOf(items),
		final = false,
		listItems = items,
	}: ImportOptions = {},
) {
	const site = await readLegacySite(wxrDocument(items));
	const listed = plan({ site: await readLegacySite(wxrDocument(listItems)), uploads });
	const list = reviewed(listed.list, reviews);
	return planImport({ site, uploads, list, final, toBlocks: blocksOf });
}

/** A One Page attachment `id`, as the news stream's items use them. */
const onePage = (id: number, details: { alt?: string; caption?: string } = {}) =>
	attachment(id, `wp-content/uploads/2025/03/one-page-${id}.webp`, details);

/** An item whose featured image is attachment `featured`, repeated in `image_1` as most are. */
const featuring = (featured: number) => ({
	_thumbnail_id: String(featured),
	image_1: String(featured),
});

describe("an attachment's details in the export", () => {
	it("gives its alt text and its caption, and none where it has none", async () => {
		const { attachments } = await readLegacySite(
			wxrDocument([
				attachment(11, "wp-content/uploads/a.webp", { alt: "ภาพกิจกรรม", caption: "คำบรรยายภาพ" }),
				attachment(12, "wp-content/uploads/b.webp"),
			]),
		);
		assert.deepEqual(
			attachments.map(({ id, alt, caption }) => [id, alt, caption]),
			[
				[11, "ภาพกิจกรรม", "คำบรรยายภาพ"],
				[12, "", ""],
			],
		);
	});
});

describe("the uploads copy's files", () => {
	/** Runs `use` on an open zip made of `bytes`, and removes it. */
	async function withZip<T>(bytes: Buffer, use: (zip: Zip) => Promise<T>): Promise<T> {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-migration-test-"));
		try {
			await writeFile(join(folder, "wp-content.zip"), bytes);
			const zip = await openZip(join(folder, "wp-content.zip"));
			try {
				return await use(zip);
			} finally {
				await zip.close();
			}
		} finally {
			await rm(folder, { recursive: true });
		}
	}

	it("gives the bytes of a deflated file and of a stored one", async () => {
		const picture = new TextEncoder().encode("ภาพสังเคราะห์ ".repeat(50));
		const stored = new Uint8Array([0, 1, 2, 3, 255]);
		await withZip(
			zipOf([
				"wp-content/uploads/",
				{ path: "wp-content/uploads/deflated.webp", bytes: picture },
				{ path: "wp-content/uploads/ภาพ.webp", bytes: stored, stored: true },
			]),
			async (zip) => {
				assert.deepEqual(
					new Uint8Array(await zip.read("wp-content/uploads/deflated.webp")),
					picture,
				);
				assert.deepEqual(new Uint8Array(await zip.read("wp-content/uploads/ภาพ.webp")), stored);
			},
		);
	});

	it("refuses a name the zip does not hold", async () => {
		await withZip(zipOf([{ path: "a.webp", bytes: new Uint8Array([1]) }]), async (zip) => {
			await assert.rejects(zip.read("b.webp"), /b\.webp is not in/);
		});
	});

	it("refuses a file whose compression method it does not read", async () => {
		const bytes = zipOf([{ path: "a.webp", bytes: new Uint8Array([1, 2, 3]), stored: true }]);
		// The method field of the file's central directory entry, whose offset the end record holds.
		bytes.writeUInt16LE(12, bytes.readUInt32LE(bytes.length - 22 + 16) + 10);
		await withZip(bytes, async (zip) => {
			await assert.rejects(zip.read("a.webp"), /compression method 12/);
		});
	});

	it("refuses a file whose local header is damaged", async () => {
		const bytes = zipOf([{ path: "a.webp", bytes: new Uint8Array([1, 2, 3]), stored: true }]);
		bytes.writeUInt32LE(0, 0);
		await withZip(bytes, async (zip) => {
			await assert.rejects(zip.read("a.webp"), /a\.webp is damaged/);
		});
	});

	it("refuses a file whose bytes do not match its checksum", async () => {
		const bytes = zipOf([{ path: "a.webp", bytes: new Uint8Array([1, 2, 3]), stored: true }]);
		// The file's first byte follows the local header (30 bytes) and its name (6 bytes).
		bytes[36] = 9;
		await withZip(bytes, async (zip) => {
			await assert.rejects(zip.read("a.webp"), /a\.webp is damaged/);
		});
	});
});

describe("an Activity", () => {
	it("keeps the title, the legacy slug and the publish date, with its One Page as the featured image", async () => {
		const { entries } = await importOf([
			onePage(11),
			newsItem(1, {
				categories: [ACTIVITY],
				date: "2025-03-14 03:00:00",
				meta: featuring(11),
			}),
		]);
		assert.deepEqual(entries, [
			{
				collection: "activities",
				slug: "news-1",
				publishedAt: "2025-03-14T03:00:00.000Z",
				data: { title: "เรื่องที่ 1", featured_image: { picture: 11 } },
				taxonomies: {},
				page: "/activities/news-1",
			},
		]);
	});

	it("puts its other ACF pictures into the gallery in their fields' order, captioned from the export", async () => {
		const { entries } = await importOf([
			onePage(11),
			onePage(13, { caption: "คำบรรยายภาพที่สอง" }),
			onePage(12),
			newsItem(1, {
				categories: [ACTIVITY],
				meta: { ...featuring(11), image_3: "12", image_2: "13" },
			}),
		]);
		assert.deepEqual(entries[0]!.data.gallery, [
			{ image: { picture: 13 }, caption: "คำบรรยายภาพที่สอง" },
			{ image: { picture: 12 } },
		]);
	});

	it("keeps another item's featured picture out of the gallery and names it in the report", async () => {
		const { entries, report } = await importOf([
			onePage(11),
			onePage(12),
			newsItem(1, { categories: [ACTIVITY], meta: featuring(11) }),
			newsItem(2, { categories: [ACTIVITY], meta: { _thumbnail_id: "12", image_1: "11" } }),
		]);
		assert.equal(entries[1]!.data.gallery, undefined);
		assert.deepEqual(report.notes, [
			{ slug: "news-2", note: "picture 11 is the featured image of news-1: left out" },
		]);
	});
});

/** Portable Text blocks as JSON keeps them, without their generated `_key`s. */
function withoutKeys(blocks: unknown): unknown {
	if (Array.isArray(blocks)) return blocks.map(withoutKeys);
	if (blocks === null || typeof blocks !== "object") return blocks;
	return Object.fromEntries(
		Object.entries(blocks)
			.filter(([key, value]) => key !== "_key" && value !== undefined)
			.map(([key, value]) => [key, withoutKeys(value)]),
	);
}

const span = (text: string, ...marks: string[]) => ({
	_type: "span",
	text,
	...(marks.length === 0 ? {} : { marks }),
});

describe("a News item", () => {
	it("keeps the title, the legacy slug and the publish date, with its featured picture and the ACF editor's HTML as the body", async () => {
		const { entries } = await importOf([
			onePage(11),
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				date: "2025-03-14 03:00:00",
				meta: {
					...featuring(11),
					editor:
						"<h4><strong>หัวข้อ</strong></h4>\n<p>ข้อความ <strong>เน้น</strong></p>\n<ul><li>รายการ</li></ul>",
				},
			}),
		]);
		const { data, ...entry } = entries[0]!;
		assert.deepEqual(entry, {
			collection: "news",
			slug: "news-1",
			publishedAt: "2025-03-14T03:00:00.000Z",
			taxonomies: {},
			page: "/news/news-1",
		});
		assert.equal(data.title, "เรื่องที่ 1");
		assert.deepEqual(data.featured_image, { picture: 11 });
		assert.deepEqual(withoutKeys(data.body), [
			{ _type: "block", style: "h4", children: [span("หัวข้อ", "strong")] },
			{ _type: "block", style: "normal", children: [span("ข้อความ "), span("เน้น", "strong")] },
			{ _type: "block", style: "normal", listItem: "bullet", level: 1, children: [span("รายการ")] },
		]);
	});

	it("has no body when neither editor holds text", async () => {
		const { entries } = await importOf([
			newsItem(1, { categories: [PUBLIC_RELATIONS], meta: { editor: "<p>&nbsp;</p>" } }),
		]);
		assert.equal(entries[0]!.data.body, undefined);
	});

	it("takes the body from the block editor when the ACF editor is empty", async () => {
		const { entries } = await importOf([
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				content: "<!-- wp:paragraph --><p>จากบล็อก</p><!-- /wp:paragraph -->",
			}),
		]);
		assert.deepEqual(withoutKeys(entries[0]!.data.body), [
			{ _type: "block", style: "normal", children: [span("จากบล็อก")] },
		]);
	});

	it("takes the body from the ACF editor when both hold text, and reports the other", async () => {
		const { entries, report } = await importOf([
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				content: "<p>จากบล็อก</p>",
				meta: { editor: "<p>จาก ACF</p>" },
			}),
		]);
		assert.deepEqual(withoutKeys(entries[0]!.data.body), [
			{ _type: "block", style: "normal", children: [span("จาก ACF")] },
		]);
		assert.ok(
			report.notes.some(({ slug, note }) => slug === "news-1" && /block editor/.test(note)),
			JSON.stringify(report.notes),
		);
	});

	it("leaves a picture or an embed out of the body, and reports it", async () => {
		const { entries, report } = await importOf([
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				meta: {
					editor:
						'<p>ข้อความ</p><img src="/wp-content/uploads/a.webp" alt="ภาพ"><iframe src="https://example.org/embed"></iframe>',
				},
			}),
		]);
		assert.deepEqual(withoutKeys(entries[0]!.data.body), [
			{ _type: "block", style: "normal", children: [span("ข้อความ")] },
		]);
		assert.deepEqual(
			report.notes.filter(({ slug }) => slug === "news-1").map(({ note }) => note),
			[
				"no featured picture",
				'not carried: <img src="/wp-content/uploads/a.webp" alt="ภาพ">',
				'not carried: <iframe src="https://example.org/embed">',
			],
		);
	});

	it("reports a link into the uploads that names no attachment, which its body keeps", async () => {
		const { entries, report } = await importOf([
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				meta: { editor: '<p><a href="/wp-content/uploads/2025/03/unlisted.pdf">เอกสาร</a></p>' },
			}),
		]);
		const [block] = entries[0]!.data.body as { markDefs: { href: string }[] }[];
		assert.equal(block!.markDefs[0]!.href, "/wp-content/uploads/2025/03/unlisted.pdf");
		assert.deepEqual(report.notes, [
			{ slug: "news-1", note: "no featured picture" },
			{
				slug: "news-1",
				note: "a link into the uploads names no attachment: /wp-content/uploads/2025/03/unlisted.pdf",
			},
		]);
	});

	it("keeps a block that is not a paragraph in the body, such as preformatted text", async () => {
		const { entries } = await importOf([
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				meta: { editor: "<p>ก่อนหน้า</p><pre>ค่า 12.5</pre>" },
			}),
		]);
		assert.deepEqual(
			(entries[0]!.data.body as { _type: string }[]).map(({ _type }) => _type),
			["block", "code"],
		);
	});

	it("puts its other ACF pictures into the body, after any text, in their fields' order, with their alt text and caption", async () => {
		const { entries, files, report } = await importOf([
			onePage(11),
			onePage(13, { alt: "ภาพแผ่นที่สอง", caption: "คำบรรยาย" }),
			onePage(12),
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				meta: { ...featuring(11), image_3: "12", image_2: "13", editor: "<p>ข้อความ</p>" },
			}),
		]);
		assert.deepEqual(
			files.map(({ attachment: id }) => id),
			[11, 13, 12],
		);
		const body = entries[0]!.data.body as { _key: string }[];
		assert.deepEqual(withoutKeys(body), [
			{ _type: "block", style: "normal", children: [span("ข้อความ")] },
			{ _type: "image", asset: { bodyPicture: 13 }, alt: "ภาพแผ่นที่สอง", caption: "คำบรรยาย" },
			{ _type: "image", asset: { bodyPicture: 12 }, alt: "" },
		]);
		assert.equal(new Set(body.map(({ _key }) => _key)).size, 3);
		assert.equal(entries[0]!.data.gallery, undefined);
		assert.deepEqual(report.notes, []);
	});

	it("has a body of pictures alone when it holds no text", async () => {
		const { entries } = await importOf([
			onePage(11),
			onePage(12),
			newsItem(1, { categories: [PUBLIC_RELATIONS], meta: { ...featuring(11), image_2: "12" } }),
		]);
		assert.deepEqual(withoutKeys(entries[0]!.data.body), [
			{ _type: "image", asset: { bodyPicture: 12 }, alt: "" },
		]);
	});

	it("keeps its own picture and another item's featured picture out of the body", async () => {
		const { entries, report } = await importOf([
			onePage(11),
			onePage(12),
			newsItem(1, { categories: [ACTIVITY], meta: featuring(11) }),
			newsItem(2, { categories: [PUBLIC_RELATIONS], meta: { _thumbnail_id: "12", image_1: "11" } }),
		]);
		assert.equal(entries[1]!.data.body, undefined);
		assert.deepEqual(report.notes, [
			{ slug: "news-2", note: "picture 11 is the featured image of news-1: left out" },
		]);
	});

	it("leaves out of the body a picture whose file the uploads copy lacks", async () => {
		const items = [
			onePage(11),
			onePage(12),
			newsItem(1, { categories: [PUBLIC_RELATIONS], meta: { ...featuring(11), image_2: "12" } }),
		];
		const { entries, report } = await importOf(items, {
			uploads: uploadsOf(items).filter((path) => !path.endsWith("-12.webp")),
		});
		assert.equal(entries[0]!.data.body, undefined);
		assert.deepEqual(
			report.missing.map(({ attachment: id }) => id),
			[12],
		);
	});

	it("takes its Summary from the list", async () => {
		const { entries } = await importOf([newsItem(1, { categories: [PUBLIC_RELATIONS] })], {
			reviews: { "news-1": { summary: "สรุปที่เจ้าหน้าที่เขียน" } },
		});
		assert.equal(entries[0]!.data.summary, "สรุปที่เจ้าหน้าที่เขียน");
	});

	it("has no Summary when the list gives none", async () => {
		const { entries } = await importOf([newsItem(1, { categories: [PUBLIC_RELATIONS] })]);
		assert.equal(entries[0]!.data.summary, undefined);
	});
});

describe("the topic ฝุ่น PM 2.5", () => {
	it("goes to a News item in the PM 2.5 category", async () => {
		const { entries } = await importOf([newsItem(1, { categories: [PM25, PUBLIC_RELATIONS] })]);
		assert.deepEqual(entries[0]!.taxonomies, { topic: ["pm25"] });
	});

	it("goes to a News item whose title holds PM 2.5, written with a space or without", async () => {
		const { entries } = await importOf([
			newsItem(1, { title: "รายงานฝุ่น PM 2.5 ประจำวัน" }),
			newsItem(2, { title: "รายงานฝุ่น PM2.5 ประจำวัน" }),
		]);
		assert.deepEqual(
			entries.map(({ taxonomies }) => taxonomies),
			[{ topic: ["pm25"] }, { topic: ["pm25"] }],
		);
	});

	it("goes to no other News, and to no Activity even with PM 2.5 in its title", async () => {
		const { entries } = await importOf([
			newsItem(1, { categories: [PUBLIC_RELATIONS], title: "ข่าวเรื่องอื่น" }),
			newsItem(2, { categories: [ACTIVITY], title: "แจกหน้ากากกันฝุ่น PM 2.5" }),
		]);
		assert.deepEqual(
			entries.map(({ taxonomies }) => taxonomies),
			[{}, {}],
		);
	});
});

describe("an Activity's text, which only a row moved from News can have", () => {
	it("goes into the Summary with its line breaks", async () => {
		const { entries } = await importOf(
			[
				newsItem(1, {
					categories: [PUBLIC_RELATIONS],
					meta: { editor: "<p>ย่อหน้าแรก</p>\n<p>บรรทัดหนึ่ง<br>บรรทัดสอง</p>" },
				}),
			],
			{ reviews: { "news-1": { decision: "Activity" } } },
		);
		assert.equal(entries[0]!.collection, "activities");
		assert.equal(entries[0]!.data.summary, "ย่อหน้าแรก\nบรรทัดหนึ่ง\nบรรทัดสอง");
		assert.equal(entries[0]!.data.body, undefined);
	});

	it("gives way to a Summary the list holds, and the report says so", async () => {
		const { entries, report } = await importOf(
			[
				newsItem(1, {
					categories: [PUBLIC_RELATIONS],
					meta: { editor: "<p>ข้อความเดิม</p>" },
				}),
			],
			{ reviews: { "news-1": { decision: "Activity", summary: "สรุปจากบัญชี" } } },
		);
		assert.equal(entries[0]!.data.summary, "สรุปจากบัญชี");
		assert.ok(
			report.notes.some(({ slug, note }) => slug === "news-1" && /Summary/.test(note)),
			JSON.stringify(report.notes),
		);
	});

	it("reports a block that is not text, such as preformatted text", async () => {
		const { entries, report } = await importOf(
			[
				newsItem(1, {
					categories: [PUBLIC_RELATIONS],
					meta: { editor: "<p>ข้อความ</p><pre>ค่า 12.5</pre>" },
				}),
			],
			{ reviews: { "news-1": { decision: "Activity" } } },
		);
		assert.equal(entries[0]!.data.summary, "ข้อความ");
		assert.ok(
			report.notes.some(({ note }) => note === "not carried: a code block"),
			JSON.stringify(report.notes),
		);
	});

	it("reports what is not text: an embed and a link", async () => {
		const { entries, report } = await importOf(
			[
				newsItem(1, {
					categories: [PUBLIC_RELATIONS],
					meta: {
						editor:
							'<p>ข้อความ <a href="/wp-content/uploads/a.pdf">ไฟล์</a></p><iframe src="https://example.org/embed"></iframe>',
					},
				}),
			],
			{ reviews: { "news-1": { decision: "Activity" } } },
		);
		assert.equal(entries[0]!.data.summary, "ข้อความ ไฟล์");
		assert.deepEqual(
			report.notes.filter(({ slug }) => slug === "news-1").map(({ note }) => note),
			[
				"no featured picture",
				'not carried: <iframe src="https://example.org/embed">',
				"link not carried: /wp-content/uploads/a.pdf",
			],
		);
	});
});

describe("the report", () => {
	it("counts the items by legacy group and target", async () => {
		const { report } = await importOf([
			newsItem(1, { categories: [ACTIVITY] }),
			newsItem(2, { categories: [ACTIVITY] }),
			newsItem(3, { categories: [PUBLIC_RELATIONS] }),
		]);
		assert.deepEqual(report.groups, { "public-new": { Activity: 2, News: 1 } });
	});
});

describe("a row's target", () => {
	it("is the reviewer's decision, in any case and with spaces around it", async () => {
		const { entries } = await importOf(
			[newsItem(1, { categories: [ACTIVITY] }), newsItem(2, { categories: [PUBLIC_RELATIONS] })],
			{ reviews: { "news-1": { decision: " news " }, "news-2": { decision: "activity" } } },
		);
		assert.deepEqual(
			entries.map(({ collection }) => collection),
			["news", "activities"],
		);
	});
});

describe("a trial run", () => {
	it("takes a ต้องเลือก row at its category's default, an Activity, and lists it", async () => {
		const { entries, report } = await importOf([
			newsItem(1, { categories: [ACTIVITY], title: "ขอเชิญร่วมงาน" }),
			newsItem(2, { categories: [ACTIVITY] }),
		]);
		assert.deepEqual(
			entries.map(({ collection }) => collection),
			["activities", "activities"],
		);
		assert.deepEqual(report.atDefault, [{ slug: "news-1", target: "Activity" }]);
	});

	it("takes a row a reviewer set back to ต้องเลือก, or decided unreadably, at its default", async () => {
		const { entries, report } = await importOf(
			[newsItem(1, { categories: [PUBLIC_RELATIONS] }), newsItem(2, { categories: [ACTIVITY] })],
			{ reviews: { "news-1": { decision: "ต้องเลือก" }, "news-2": { decision: "ไม่แน่ใจ" } } },
		);
		assert.deepEqual(
			entries.map(({ collection }) => collection),
			["news", "activities"],
		);
		assert.deepEqual(report.atDefault, [
			{ slug: "news-1", target: "News" },
			{ slug: "news-2", target: "Activity" },
		]);
	});

	it("stops on a row with no default, which only a reviewer can decide", async () => {
		await assert.rejects(
			importOf([newsItem(1, { categories: [OTHER_NEWS] })]),
			/news-1 has no default/,
		);
	});
});

describe("a final run", () => {
	it("refuses while any row is ต้องเลือก, a directive's too, and names them", async () => {
		await assert.rejects(
			importOf(
				[
					newsItem(1, { categories: [ACTIVITY], title: "ขอเชิญร่วมงาน" }),
					newsItem(2, { categories: [ACTIVITY] }),
					{ type: "directive", id: 3, slug: "directive-3", title: "คำสั่ง" },
				],
				{ final: true },
			),
			/final import refuses while .*news-1, directive-3/,
		);
	});

	it("goes on once every row is decided", async () => {
		const { entries, report } = await importOf(
			[newsItem(1, { categories: [ACTIVITY], title: "ขอเชิญร่วมงาน" })],
			{ final: true, reviews: { "news-1": { decision: "News" } } },
		);
		assert.deepEqual(
			entries.map(({ collection }) => collection),
			["news"],
		);
		assert.deepEqual(report.atDefault, []);
	});
});

describe("a list and an export out of step", () => {
	it("refuses a list without a row for an item of the export", async () => {
		await assert.rejects(
			importOf([newsItem(1, { categories: [ACTIVITY] }), newsItem(2, { categories: [ACTIVITY] })], {
				listItems: [newsItem(1, { categories: [ACTIVITY] })],
			}),
			/no row for news-2: run plan again/,
		);
	});

	it("leaves out a row whose item has gone back to a draft, and reports it", async () => {
		const { entries, report } = await importOf(
			[
				newsItem(1, { categories: [ACTIVITY] }),
				newsItem(2, { categories: [ACTIVITY], status: "draft" }),
			],
			{
				listItems: [
					newsItem(1, { categories: [ACTIVITY] }),
					newsItem(2, { categories: [ACTIVITY] }),
				],
			},
		);
		assert.deepEqual(
			entries.map(({ slug }) => slug),
			["news-1"],
		);
		assert.deepEqual(report.notInExport, ["news-2"]);
	});

	it("leaves out a row whose item the export no longer holds, and reports it", async () => {
		const { entries, report } = await importOf([newsItem(1, { categories: [ACTIVITY] })], {
			listItems: [newsItem(1, { categories: [ACTIVITY] }), newsItem(2, { categories: [ACTIVITY] })],
		});
		assert.deepEqual(
			entries.map(({ slug }) => slug),
			["news-1"],
		);
		assert.deepEqual(report.notInExport, ["news-2"]);
	});
});

describe("the redirects", () => {
	it("give each item one 301 from its legacy address to its canonical address", async () => {
		const { redirects } = await importOf([
			newsItem(1, { categories: [ACTIVITY] }),
			newsItem(2, { categories: [PUBLIC_RELATIONS] }),
		]);
		assert.deepEqual(redirects, [
			{ source: "/public-new/news-1/", destination: "/activities/news-1" },
			{ source: "/public-new/news-2/", destination: "/news/news-2" },
		]);
	});

	it("follow a reviewer's decision", async () => {
		const { redirects } = await importOf([newsItem(1, { categories: [ACTIVITY] })], {
			reviews: { "news-1": { decision: "News" } },
		});
		assert.deepEqual(redirects, [{ source: "/public-new/news-1/", destination: "/news/news-1" }]);
	});
});

describe("the stop before anything is written", () => {
	const items = [
		newsItem(1, { categories: [ACTIVITY] }),
		newsItem(2, { categories: [PM25, PUBLIC_RELATIONS] }),
	];
	const clear = {
		entries: [],
		terms: [{ taxonomy: "topic", slug: "pm25" }],
		redirects: [],
	};
	const entry = (collection: string, slug: string, trashed = false) => ({
		collection,
		slug,
		trashed,
	});

	it("says nothing about a target that holds none of the plan's slugs", async () => {
		assert.equal(firstStop(await importOf(items), clear), undefined);
	});

	it("names the first slug that already exists, in the plan's order", async () => {
		const stop = firstStop(await importOf(items), {
			...clear,
			entries: [entry("news", "news-2"), entry("activities", "news-1")],
		});
		assert.match(stop!, /news-1 already exists in activities/);
	});

	it("stops on a slug in the trash, which stays taken", async () => {
		const stop = firstStop(await importOf(items), {
			...clear,
			entries: [entry("news", "news-2", true)],
		});
		assert.match(stop!, /news-2 already exists in news \(in the trash\)/);
	});

	it("does not stop on the same slug in the other collection", async () => {
		const stop = firstStop(await importOf(items), {
			...clear,
			entries: [entry("activities", "news-2")],
		});
		assert.equal(stop, undefined);
	});

	it("stops on a term the plan uses and the target lacks", async () => {
		const stop = firstStop(await importOf(items), { ...clear, terms: [] });
		assert.match(stop!, /the topic term pm25 is missing/);
	});

	it("stops on a legacy address that already redirects, with or without its last slash", async () => {
		for (const source of ["/public-new/news-1/", "/public-new/news-1"]) {
			const stop = firstStop(await importOf(items), { ...clear, redirects: [source] });
			assert.match(stop!, /a redirect from \/public-new\/news-1\/ already exists/);
		}
	});
});

describe("the files", () => {
	it("takes every file an item uses: an ACF file and a link into the uploads too", async () => {
		const { files } = await importOf([
			onePage(11),
			attachment(20, "wp-content/uploads/2025/03/acf-file.pdf"),
			attachment(21, "wp-content/uploads/2025/03/linked.pdf"),
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				meta: {
					...featuring(11),
					file_1: "20",
					editor: '<p><a href="/wp-content/uploads/2025/03/linked.pdf">เอกสาร</a></p>',
				},
			}),
		]);
		assert.deepEqual(
			files.map(({ attachment: id, filename }) => [id, filename]),
			[
				[11, "one-page-11.webp"],
				[20, "acf-file.pdf"],
				[21, "linked.pdf"],
			],
		);
	});

	it("reports an ACF file, which no field of a News or an Activity holds", async () => {
		const items = [
			attachment(20, "wp-content/uploads/2025/03/acf-file.pdf"),
			newsItem(1, { categories: [PUBLIC_RELATIONS], meta: { file_1: "20" } }),
			newsItem(2, { categories: [ACTIVITY], meta: { file_2: "20" } }),
		];
		const { report } = await importOf(items);
		assert.deepEqual(
			report.notes.filter(({ note }) => note.startsWith("ACF file")),
			[
				{ slug: "news-1", note: "ACF file 20: no field holds it" },
				{ slug: "news-2", note: "ACF file 20: no field holds it" },
			],
		);
	});

	it("takes each used file once, for its folder, with its alt text and caption", async () => {
		const { files } = await importOf([
			onePage(11, { alt: "ภาพที่หนึ่ง", caption: "คำบรรยาย" }),
			onePage(12),
			onePage(99),
			newsItem(1, { categories: [ACTIVITY], meta: { ...featuring(11), image_2: "12" } }),
			newsItem(2, { categories: [ACTIVITY], meta: { _thumbnail_id: "12", image_1: "12" } }),
		]);
		assert.deepEqual(files, [
			{
				attachment: 11,
				path: "wp-content/uploads/2025/03/one-page-11.webp",
				filename: "one-page-11.webp",
				folder: "เว็บไซต์เดิม: ข่าวและกิจกรรม",
				alt: "ภาพที่หนึ่ง",
				caption: "คำบรรยาย",
			},
			{
				attachment: 12,
				path: "wp-content/uploads/2025/03/one-page-12.webp",
				filename: "one-page-12.webp",
				folder: "เว็บไซต์เดิม: ข่าวและกิจกรรม",
				alt: "",
				caption: "",
			},
		]);
	});

	it("reports a used file the uploads copy lacks, and leaves it off the entry", async () => {
		const items = [
			onePage(11),
			onePage(12),
			newsItem(1, { categories: [ACTIVITY], meta: { ...featuring(11), image_2: "12" } }),
		];
		const { files, entries, report } = await importOf(items, {
			uploads: uploadsOf(items).filter((path) => !path.endsWith("-12.webp")),
		});
		assert.deepEqual(
			files.map(({ attachment: id }) => id),
			[11],
		);
		assert.equal(entries[0]!.data.gallery, undefined);
		assert.deepEqual(report.missing, [
			{
				attachment: 12,
				path: "wp-content/uploads/2025/03/one-page-12.webp",
				usedBy: ["news-1"],
			},
		]);
	});

	it("reports an attachment the export does not list as missing, and imports the item without it", async () => {
		const { entries, report } = await importOf([
			newsItem(1, { categories: [ACTIVITY], meta: featuring(11) }),
		]);
		assert.equal(entries[0]!.data.featured_image, undefined);
		assert.deepEqual(report.missing, [{ attachment: 11, usedBy: ["news-1"] }]);
		assert.deepEqual(report.notes, [{ slug: "news-1", note: "no featured picture" }]);
	});
});

describe("verify", () => {
	const FOLDER = { id: "folder-1", name: "เว็บไซต์เดิม: ข่าวและกิจกรรม" };
	const OWNER = "admin-1";

	/** A target that holds exactly what the plan of one Activity and one News writes. */
	async function goodTarget(): Promise<VerifyInput & { responses: Map<string, Answer> }> {
		const planned = await importOf([
			onePage(11),
			onePage(12),
			newsItem(1, { categories: [ACTIVITY], meta: featuring(11) }),
			newsItem(2, { categories: [PUBLIC_RELATIONS], meta: featuring(12) }),
		]);
		const responses = new Map<string, Answer>([
			["/activities/news-1", { status: 200, location: null }],
			["/news/news-2", { status: 200, location: null }],
			["/public-new/news-1/", { status: 301, location: "/activities/news-1" }],
			["/public-new/news-2/", { status: 301, location: "/news/news-2" }],
		]);
		return {
			planned,
			entries: planned.entries.map(({ collection, slug, publishedAt }) => ({
				collection,
				slug,
				trashed: false,
				status: "published",
				publishedAt,
				authorId: OWNER,
			})),
			media: [
				{ contentHash: "sha1:11", folderId: FOLDER.id },
				{ contentHash: "sha1:12", folderId: FOLDER.id },
			],
			folders: [FOLDER],
			owner: OWNER,
			hashes: new Map([
				[11, "sha1:11"],
				[12, "sha1:12"],
			]),
			responses,
			request: async (path) => {
				const response = responses.get(path);
				if (response === undefined) throw new Error(`unexpected request: ${path}`);
				return response;
			},
		};
	}

	it("reports the counts and no failure for a target that matches the plan", async () => {
		const target = await goodTarget();
		const other = { ...target.entries[0]!, slug: "written-later" };
		const unpublished = { ...other, slug: "still-a-draft", status: "draft" };
		const entries = [...target.entries, other, unpublished];
		assert.deepEqual(await verifyTarget({ ...target, entries }), {
			entries: {
				activities: { planned: 1, found: 1, inCollection: 2 },
				news: { planned: 1, found: 1, inCollection: 1 },
			},
			files: { planned: 2, inLibrary: 2, inFolder: 2 },
			pages: { planned: 2, passed: 2 },
			redirects: { planned: 2, passed: 2 },
			failures: [],
		});
	});

	it("fails an entry that is missing, unpublished, dated otherwise or someone else's", async () => {
		const target = await goodTarget();
		const [activity, news] = target.entries as [
			(typeof target.entries)[0],
			(typeof target.entries)[0],
		];
		const report = await verifyTarget({
			...target,
			entries: [
				{ ...activity, status: "draft" },
				{ ...news, publishedAt: "2020-01-01T00:00:00.000Z", authorId: "someone" },
			],
		});
		assert.deepEqual(report.failures, [
			"activities/news-1: its status is draft",
			"news/news-2: published at 2020-01-01T00:00:00.000Z, not 2025-03-14T03:00:00.000Z",
			"news/news-2: owned by someone, not the importing Administrator",
		]);
		const missing = await verifyTarget({ ...target, entries: [news] });
		assert.deepEqual(missing.entries.activities, { planned: 1, found: 0, inCollection: 0 });
		assert.deepEqual(missing.failures, ["activities/news-1: not found"]);
	});

	it("takes the same instant written another way as the same date", async () => {
		const target = await goodTarget();
		const entries = target.entries.map((entry) => ({
			...entry,
			publishedAt: "2025-03-14T10:00:00+07:00",
		}));
		assert.deepEqual((await verifyTarget({ ...target, entries })).failures, []);
	});

	it("fails a page that does not answer 200", async () => {
		const target = await goodTarget();
		target.responses.set("/news/news-2", { status: 404, location: null });
		const report = await verifyTarget(target);
		assert.deepEqual(report.pages, { planned: 2, passed: 1 });
		assert.deepEqual(report.redirects, { planned: 2, passed: 1 });
		assert.deepEqual(report.failures, [
			"/news/news-2 answers 404",
			"/public-new/news-2/ goes to /news/news-2, which does not answer 200",
		]);
	});

	it("fails a redirect that is not a 301, or goes elsewhere", async () => {
		const target = await goodTarget();
		target.responses.set("/public-new/news-1/", { status: 302, location: "/activities/news-1" });
		target.responses.set("/public-new/news-2/", { status: 301, location: "/news/other" });
		const report = await verifyTarget(target);
		assert.deepEqual(report.redirects, { planned: 2, passed: 0 });
		assert.deepEqual(report.failures, [
			"/public-new/news-1/ answers 302, not 301",
			"/public-new/news-2/ goes to /news/other, not /news/news-2",
		]);
	});

	it("fails a chain or a loop, whose page answers a redirect in place of 200", async () => {
		const target = await goodTarget();
		target.responses.set("/news/news-2", { status: 301, location: "/public-new/news-2/" });
		const report = await verifyTarget(target);
		assert.deepEqual(report.failures, [
			"/news/news-2 answers 301",
			"/public-new/news-2/ goes to /news/news-2, which does not answer 200",
		]);
	});

	it("reads a Location written as an absolute address by its path", async () => {
		const target = await goodTarget();
		target.responses.set("/public-new/news-1/", {
			status: 301,
			location: "http://127.0.0.1:4324/activities/news-1",
		});
		assert.deepEqual((await verifyTarget(target)).failures, []);
	});

	it("fails a used file the Media Library lacks, and counts one reused outside the folder", async () => {
		const target = await goodTarget();
		const report = await verifyTarget({
			...target,
			media: [{ contentHash: "sha1:12", folderId: null }],
		});
		assert.deepEqual(report.files, { planned: 2, inLibrary: 1, inFolder: 0 });
		assert.deepEqual(report.failures, ["file 11 (one-page-11.webp) is not in the Media Library"]);
	});

	it("fails a used file the uploads copy lacks, which therefore cannot be in the Media Library", async () => {
		const target = await goodTarget();
		const report = await verifyTarget({
			...target,
			planned: {
				...target.planned,
				report: {
					...target.planned.report,
					missing: [
						{ attachment: 13, path: "wp-content/uploads/lost.webp", usedBy: ["news-1", "news-2"] },
						{ attachment: 14, usedBy: ["news-2"] },
					],
				},
			},
		});
		assert.deepEqual(report.files, { planned: 4, inLibrary: 2, inFolder: 2 });
		assert.deepEqual(report.failures, [
			"wp-content/uploads/lost.webp, used by news-1, news-2, is not in the uploads copy",
			"attachment 14, used by news-2, is not in the uploads copy",
		]);
	});
});

describe("the planning modules' imports", () => {
	for (const module of ["import-plan", "verify"]) {
		it(`${module}.ts imports only the planner at run time, so node:test loads it with plain Node`, async () => {
			const source = await readFile(
				new URL(`../../scripts/migration/${module}.ts`, import.meta.url),
				"utf8",
			);
			const imports = [...source.matchAll(/^import\s[\s\S]*?;$/gm)].map(([statement]) => statement);
			assert.ok(imports.length > 0, "the module's imports were not found");
			assert.deepEqual(
				imports.filter(
					(statement) =>
						!statement.startsWith("import type ") && !statement.endsWith('from "./plan.ts";'),
				),
				[],
			);
		});
	}
});

describe("the script's EmDash imports", () => {
	it('only the reader loads EmDash at run time, as CODING_STANDARDS "Tests" allows', async () => {
		const folder = new URL("../../scripts/migration/", import.meta.url);
		const modules = ["../migration.ts", ...(await readdir(folder))];
		const loading: string[] = [];
		for (const name of modules) {
			const source = await readFile(new URL(name, folder), "utf8");
			const fromEmDash = /^(?:import|export)\s[^;]*?from\s+"(?:emdash|@emdash-cms\/)[^"]*";$/gm;
			const statements = [...source.matchAll(fromEmDash)].map(([statement]) => statement);
			const dynamic = /\bimport\(\s*"(?:emdash|@emdash-cms\/)/.test(source);
			if (dynamic || statements.some((statement) => !statement.startsWith("import type "))) {
				loading.push(name);
			}
		}
		assert.deepEqual(loading, ["legacy-site.ts"]);
	});
});

describe("the import and verify commands", () => {
	const run = runMigration;
	const TOKEN = "ec_pat_syntheticnotrealtoken";

	/** Runs `use` in a folder with a synthetic export and uploads copy, and `plan`'s list. */
	async function withExport(
		items: SyntheticItem[],
		use: (paths: {
			folder: string;
			xml: string;
			zip: string;
			token: string;
		}) => Promise<void> | void,
	) {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-migration-test-"));
		try {
			const xml = join(folder, "export.xml");
			const zip = join(folder, "wp-content.zip");
			const token = join(folder, "token");
			await writeFile(xml, wxrDocument(items));
			await writeFile(zip, zipOf(uploadsOf(items)));
			await writeFile(token, TOKEN);
			await chmod(token, 0o600);
			assert.equal(run("plan", xml, zip).status, 0);
			await use({ folder, xml, zip, token });
		} finally {
			await rm(folder, { recursive: true });
		}
	}

	const CHOOSE = [newsItem(1, { categories: [ACTIVITY], title: "ขอเชิญร่วมงาน" })];

	it("needs the origin and the token file", async () => {
		await withExport(CHOOSE, ({ xml, zip, token }) => {
			for (const args of [
				["import", xml, zip],
				["import", xml, zip, "--origin", "http://127.0.0.1:1"],
				["verify", xml, zip, "--token-file", token],
				["verify", xml, zip, "--origin", "http://127.0.0.1:1", "--token-file", token, "--final"],
			]) {
				const result = run(...args);
				assert.equal(result.status, 2, args.join(" "));
				assert.match(result.stderr, /^usage: /);
			}
		});
	});

	it("--dry-run writes the plan beside the export, the same each time, with no origin or token", async () => {
		const items = [
			newsItem(1, {
				categories: [PUBLIC_RELATIONS],
				meta: { editor: "<p>ข้อความ <strong>เน้น</strong></p>" },
			}),
		];
		await withExport(items, async ({ folder, xml, zip }) => {
			const first = run("import", xml, zip, "--dry-run");
			assert.equal(first.status, 0, first.stderr);
			assert.match(first.stdout, /Import plan: .*import-plan\.json/);
			const planned = await readFile(join(folder, "import-plan.json"), "utf8");
			assert.deepEqual(
				(JSON.parse(planned) as { entries: { slug: string }[] }).entries.map(({ slug }) => slug),
				["news-1"],
			);
			assert.equal(run("import", xml, zip, "--dry-run").status, 0);
			assert.equal(await readFile(join(folder, "import-plan.json"), "utf8"), planned);
		});
	});

	it("--dry-run refuses a final run as the import would, and takes no target", async () => {
		await withExport(CHOOSE, async ({ folder, xml, zip, token }) => {
			const refused = run("import", xml, zip, "--dry-run", "--final");
			assert.equal(refused.status, 1);
			assert.match(refused.stderr, /final import refuses while .*news-1/);
			await assert.rejects(readFile(join(folder, "import-plan.json")));
			for (const args of [
				["import", xml, zip, "--dry-run", "--origin", "http://127.0.0.1:1", "--token-file", token],
				["verify", xml, zip, "--dry-run"],
			]) {
				assert.equal(run(...args).status, 2, args.join(" "));
			}
		});
	});

	it("refuses an export inside the repository before it reads anything", () => {
		const inside = fileURLToPath(new URL("../../package.json", import.meta.url));
		const result = run(
			"import",
			inside,
			inside,
			"--origin",
			"http://127.0.0.1:1",
			"--token-file",
			inside,
		);
		assert.equal(result.status, 2);
		assert.match(result.stderr, /inside the repository/);
	});

	it("stops without a Classification list beside the export", async () => {
		await withExport(CHOOSE, async ({ folder, xml, zip, token }) => {
			await rm(join(folder, "classification-list.csv"));
			const result = run(
				"import",
				xml,
				zip,
				"--origin",
				"http://127.0.0.1:1",
				"--token-file",
				token,
			);
			assert.equal(result.status, 1);
			assert.match(result.stderr, /run plan first/);
		});
	});

	it("refuses a final run while a row is ต้องเลือก, before it reaches the origin", async () => {
		await withExport(CHOOSE, async ({ folder, xml, zip }) => {
			const result = run(
				"import",
				xml,
				zip,
				"--final",
				"--origin",
				"http://127.0.0.1:1",
				"--token-file",
				join(folder, "no-such-token"),
			);
			assert.equal(result.status, 1);
			assert.match(result.stderr, /final import refuses while .*news-1/);
			await assert.rejects(readFile(join(folder, "import-report.json")));
		});
	});

	it("never prints the token, even when the target cannot be reached", async () => {
		await withExport(CHOOSE, ({ xml, zip, token }) => {
			const result = run(
				"import",
				xml,
				zip,
				"--origin",
				"http://127.0.0.1:1",
				"--token-file",
				token,
			);
			assert.equal(result.status, 1);
			assert.ok(!`${result.stdout}${result.stderr}`.includes(TOKEN));
		});
	});
});
