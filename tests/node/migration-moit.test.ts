// The import of the Legacy site's ITA posts (#180; spec #174 "Mapping: ITA posts", ADR 0006;
// seam A). Each post is a synthetic one shaped like a case in `docs/research/legacy-ita.md`, and
// goes through EmDash's own parser and converter, as the real export does. The expected values
// come from the spec and the ticket.

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ImportPlan } from "../../scripts/migration/import-plan.ts";
import {
	ACTIVITY,
	attachment,
	featuring,
	importOf,
	moitPost,
	moitTags,
	newsItem,
	onePage,
	runMigration,
	withExport,
	zipOf,
	type ImportOptions,
	type SyntheticItem,
} from "./migration.helpers.ts";
import { ANOM_001_SOURCE } from "../../scripts/migration/moit-plan.ts";
import { verifyTarget } from "../../scripts/migration/verify.ts";
import { linkBlock, requirementBlock } from "./ita.helpers.ts";

/** An attachment `id` that Evidence links, and the address a post's link writes for it. */
const evidenceFile = (id: number) => attachment(id, `wp-content/uploads/2026/03/file-${id}.pdf`);
const fileHref = (id: number) => `/wp-content/uploads/2026/03/file-${id}.pdf`;

/** The Round every Evidence block takes in 2567–2569 (spec #174 "Mapping: ITA posts"). */
const NO_ROUND = "ไม่ระบุรอบ";

/** A file block as the plan holds it, naming its attachment until the writer has its media item. */
const fileBlock = (label: string, id: number, round = NO_ROUND) => ({
	_type: "ita_file",
	label,
	file: { fileField: id },
	round,
});

/** The ANOM-001 attachment, and a post that links it. */
const ANOM = attachment(1479, "wp-content/uploads/2024/11/7-long-name.pdf");
const ANOM_POST = moitPost(
	2,
	2567,
	'<h5>7. <a href="/wp-content/uploads/2024/11/7-long-name.pdf">ยุทธศาสตร์</a></h5>',
);

/** The Evidence blocks the import plans for one post among `others`. */
async function evidenceOf(post: SyntheticItem, others: SyntheticItem[] = []) {
	const { entries } = await importOf([...others, post]);
	return entries.at(-1)!.data.evidence;
}

describe("an ITA post", () => {
	it("becomes one MOIT: year and number from its tags, its title without MOIT n, its dates", async () => {
		const planned = await importOf([
			evidenceFile(31),
			moitPost(
				3,
				2569,
				`<h5>1. ข้อกำหนดแรก</h5><p>1.1 <a href="${fileHref(31)}">บันทึกเสนอ</a></p>`,
				{
					title: "MOIT 3 หน่วยงานมีรายงาน",
					date: "2026-02-25 06:56:47",
					modified: "2026-03-09 09:16:06",
				},
			),
		]);
		assert.deepEqual(planned.entries, [
			{
				collection: "moit",
				slug: "moit-3-2569",
				publishedAt: "2026-02-25T06:56:47.000Z",
				data: {
					title: "หน่วยงานมีรายงาน",
					fiscal_year: 2569,
					number: 3,
					updated_on: "2026-03-09T09:16:06.000Z",
					evidence: [
						requirementBlock("1", "ข้อกำหนดแรก"),
						requirementBlock("1.1", "บันทึกเสนอ"),
						fileBlock("บันทึกเสนอ", 31),
					],
				},
				taxonomies: {},
				page: "/ita/moit-3-2569",
			},
		]);
	});
});

describe("a MOIT's lines", () => {
	it("keeps Requirements, sub-items and their Evidence in content order", async () => {
		const evidence = await evidenceOf(
			moitPost(
				1,
				2568,
				`<h5>1. ไตรมาสแรก</h5><p>1.1 ตุลาคม</p><ul><li><a href="${fileHref(41)}">บันทึก</a></li><li><a href="${fileHref(42)}">รายงาน</a></li></ul><h4>2. <a href="${fileHref(43)}">วิสัยทัศน์</a></h4>`,
			),
			[evidenceFile(41), evidenceFile(42), evidenceFile(43)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1", "ไตรมาสแรก"),
			requirementBlock("1.1", "ตุลาคม"),
			fileBlock("บันทึก", 41),
			fileBlock("รายงาน", 42),
			requirementBlock("2", "วิสัยทัศน์"),
			fileBlock("วิสัยทัศน์", 43),
		]);
	});

	it("reads a number with a trailing dot, and a stray dot after one", async () => {
		const evidence = await evidenceOf(
			moitPost(
				2,
				2568,
				`<p>3.3. <a href="${fileHref(41)}">ฟอร์มเผยแพร่</a></p><p>2.1 .&nbsp;<a href="${fileHref(42)}">บันทึกแจ้งเวียน</a></p>`,
			),
			[evidenceFile(41), evidenceFile(42)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("3.3", "ฟอร์มเผยแพร่"),
			fileBlock("ฟอร์มเผยแพร่", 41),
			requirementBlock("2.1", "บันทึกแจ้งเวียน"),
			fileBlock("บันทึกแจ้งเวียน", 42),
		]);
	});

	it("reads a line broken in two as one wording, and one address in two runs as one link", async () => {
		const evidence = await evidenceOf(
			moitPost(
				3,
				2568,
				`<h5>1. ข้อกำหนด<br>ที่ขึ้นบรรทัด</h5><p>1.1 <a href="${fileHref(41)}">รายงาน<br></a><a href="${fileHref(41)}">ประจำปี</a></p>`,
			),
			[evidenceFile(41)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1", "ข้อกำหนด ที่ขึ้นบรรทัด"),
			requirementBlock("1.1", "รายงาน ประจำปี"),
			fileBlock("รายงาน ประจำปี", 41),
		]);
	});

	it("joins runs of one link without adding a space, as a bold word inside it", async () => {
		const evidence = await evidenceOf(
			moitPost(3, 2568, `<p>1.1 <a href="${fileHref(41)}"><strong>รายงาน</strong>ประจำปี</a></p>`),
			[evidenceFile(41)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "รายงานประจำปี"),
			fileBlock("รายงานประจำปี", 41),
		]);
	});

	it("keeps two links to one file with words between them as two Evidence", async () => {
		const evidence = await evidenceOf(
			moitPost(
				3,
				2568,
				`<p>1.1 <a href="${fileHref(41)}">บันทึก</a> และ <a href="${fileHref(41)}">ฟอร์ม</a></p>`,
			),
			[evidenceFile(41)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "บันทึก และ ฟอร์ม"),
			fileBlock("บันทึก", 41),
			fileBlock("ฟอร์ม", 41),
		]);
	});

	it("gives each link of one line its own Evidence", async () => {
		const evidence = await evidenceOf(
			moitPost(
				4,
				2568,
				`<p>1.1 <a href="${fileHref(41)}">บันทึก</a> <a href="${fileHref(42)}">ฟอร์ม</a></p>`,
			),
			[evidenceFile(41), evidenceFile(42)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "บันทึก ฟอร์ม"),
			fileBlock("บันทึก", 41),
			fileBlock("ฟอร์ม", 42),
		]);
	});

	it("does not read a count such as 6 เดือน as a Requirement", async () => {
		const { entries, report } = await importOf([
			evidenceFile(41),
			moitPost(
				5,
				2568,
				`<h5>1. แผน</h5><p>6 เดือน</p><ul><li><a href="${fileHref(41)}">แผน</a></li></ul>`,
			),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [
			requirementBlock("1", "แผน"),
			fileBlock("แผน", 41),
		]);
		assert.deepEqual(report.notes, [{ slug: "moit-5-2568", note: "text not carried: 6 เดือน" }]);
	});

	it("reports a line of text with no number and no link, a paragraph or a list item", async () => {
		const { entries, report } = await importOf([
			moitPost(6, 2568, "<h5>1. รายงาน</h5><p>ไตรมาสที่ 1</p><ul><li>หัวข้อย่อยในรายงาน</li></ul>"),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, [
			{ slug: "moit-6-2568", note: "text not carried: ไตรมาสที่ 1" },
			{ slug: "moit-6-2568", note: "text not carried: หัวข้อย่อยในรายงาน" },
		]);
	});

	it("drops an empty heading without a word", async () => {
		const { entries, report } = await importOf([
			moitPost(7, 2568, '<h3 class="gb-headline"></h3><h5>1. รายงาน</h5>'),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("reports a number with no wording rather than an empty Requirement", async () => {
		const { entries, report } = await importOf([moitPost(8, 2568, "<p>1. </p><h5>2. รายงาน</h5>")]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("2", "รายงาน")]);
		assert.deepEqual(report.notes, [{ slug: "moit-8-2568", note: "text not carried: 1." }]);
	});
});

describe("the end of a post", () => {
	const CARD_TEXT =
		"<h5>สำนักงานสาธารณสุขอำเภอสอง</h5><p>ITA (Integrity and Transparency Assessment) ข้อความสมมุติ</p>";
	const FOOTER = `<figure><img src="https://songhealth.moph.go.th/wp-content/uploads/2024/10/logo-300x300.webp" alt=""/></figure>${CARD_TEXT}`;

	it("leaves out the office's card, its picture included, without a word", async () => {
		const { entries, report } = await importOf([moitPost(9, 2568, `<h5>1. รายงาน</h5>${FOOTER}`)]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("leaves out a card with no picture, and keeps the line before it", async () => {
		const { entries, report } = await importOf([
			moitPost(9, 2568, `<h5>1. รายงาน</h5>${CARD_TEXT}`),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("still reads what comes after the card, rather than cutting it unseen", async () => {
		const { entries, report } = await importOf([
			moitPost(9, 2568, `${FOOTER}<h5>2. ข้อหลังการ์ด</h5><p>บรรทัดหลังการ์ด</p>`),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("2", "ข้อหลังการ์ด")]);
		assert.deepEqual(report.notes, [
			{ slug: "moit-9-2568", note: "text not carried: บรรทัดหลังการ์ด" },
		]);
	});

	it("reads a line after the office's name when it is not the card's text", async () => {
		const { entries, report } = await importOf([
			moitPost(9, 2568, "<h5>สำนักงานสาธารณสุขอำเภอสอง</h5><h5>1. รายงาน</h5>"),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("reports a picture inside the post, which no block holds", async () => {
		const picture =
			'<figure><img src="https://songhealth.moph.go.th/wp-content/uploads/2024/11/poster.webp" alt=""/></figure>';
		const { entries, report } = await importOf([
			moitPost(12, 2568, `${picture}<h5>1. รายงาน</h5>${FOOTER}`),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, [
			{
				slug: "moit-12-2568",
				note: "picture not carried: https://songhealth.moph.go.th/wp-content/uploads/2024/11/poster.webp",
			},
		]);
	});
});

describe("a block no Evidence holds", () => {
	it("is reported by its kind", async () => {
		const { entries, report } = await importOf([
			moitPost(10, 2568, "<h5>1. รายงาน</h5><pre>ข้อความ</pre>"),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, [{ slug: "moit-10-2568", note: "not carried: a code block" }]);
	});
});

describe("a MOIT's links", () => {
	it("makes a link to a page of the site a link block marked current, at the new address", async () => {
		const evidence = await evidenceOf(
			moitPost(
				2,
				2568,
				'<p>1.1 <a href="http://songhealth.moph.go.th/officer/">ผู้บริหาร</a></p><p>1.6 <a href="https://songhealth.moph.go.th/public-news">ข่าว</a></p>',
			),
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "ผู้บริหาร"),
			linkBlock("ผู้บริหาร", "/about/personnel", { current: true }),
			requirementBlock("1.6", "ข่าว"),
			linkBlock("ข่าว", "/activities", { current: true }),
		]);
	});

	it("leads a link to a migrated news item to its page, News or Activity as the list decides", async () => {
		const post = moitPost(
			20,
			2569,
			'<p>1.2 <a href="https://songhealth.moph.go.th/public-new/news-7/">อินโฟกราฟิก</a></p>',
		);
		const news = newsItem(7, { categories: [ACTIVITY], meta: featuring(71) });
		const asActivity = await evidenceOf(post, [onePage(71), news]);
		assert.deepEqual(asActivity, [
			requirementBlock("1.2", "อินโฟกราฟิก"),
			linkBlock("อินโฟกราฟิก", "/activities/news-7", { current: true }),
		]);
		const moved = await importOf([onePage(71), news, post], {
			reviews: { "news-7": { decision: "News" } },
		});
		assert.deepEqual(moved.entries.at(-1)!.data.evidence, [
			requirementBlock("1.2", "อินโฟกราฟิก"),
			linkBlock("อินโฟกราฟิก", "/news/news-7", { current: true }),
		]);
	});

	it("leads a link to another MOIT to that MOIT's page, by its legacy address", async () => {
		const evidence = await evidenceOf(
			moitPost(2, 2569, '<p>1.1 <a href="/moit-4-2567-2/">ตัวชี้วัดเดิม</a></p>'),
			[moitPost(5, 2567, "<h5>1. รายงาน</h5>", { slug: "moit-4-2567-2" })],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "ตัวชี้วัดเดิม"),
			linkBlock("ตัวชี้วัดเดิม", "/ita/moit-5-2567", { current: true }),
		]);
	});

	it("makes a link to an uploaded picture a file block, as the WebP Evidence of 2567 MOIT 2 is", async () => {
		const picture = attachment(36, "wp-content/uploads/2024/11/month.webp");
		const evidence = await evidenceOf(
			moitPost(
				2,
				2567,
				'<ul><li><a href="/wp-content/uploads/2024/11/month.webp">ตุลาคม</a></li></ul>',
			),
			[picture],
		);
		assert.deepEqual(evidence, [fileBlock("ตุลาคม", 36)]);
	});

	it("makes an external link a link block, not marked current", async () => {
		const evidence = await evidenceOf(
			moitPost(2, 2568, '<p>1.5 <a href="http://stopcorruption.example.go.th/">กฎหมาย</a></p>'),
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.5", "กฎหมาย"),
			linkBlock("กฎหมาย", "http://stopcorruption.example.go.th/", { current: false }),
		]);
	});

	it("drops the empty Facebook button of the 2567 posts", async () => {
		const button =
			'<div class="gb-container"><a class="gb-button" href="https://www.facebook.com/profile" target="_blank" rel="noopener"><span class="gb-icon"><svg viewBox="0 0 512 512"><path d="M0 0"></path></svg></span></a></div>';
		const { entries, report } = await importOf([moitPost(1, 2567, `<h5>1. รายงาน</h5>${button}`)]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("drops a link with no text, in a paragraph of its own", async () => {
		const { entries, report } = await importOf([
			moitPost(1, 2567, '<h5>1. รายงาน</h5><p><a href="https://www.facebook.com/profile"></a></p>'),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("keeps a Facebook link that has text, as any external link", async () => {
		const evidence = await evidenceOf(
			moitPost(1, 2567, '<p>1.1 <a href="https://www.facebook.com/page">เพจสำนักงาน</a></p>'),
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "เพจสำนักงาน"),
			linkBlock("เพจสำนักงาน", "https://www.facebook.com/page", { current: false }),
		]);
	});

	it("drops an empty Facebook link on a line of words, which it would otherwise label", async () => {
		const { entries, report } = await importOf([
			moitPost(1, 2567, '<p>1.1 เพจสำนักงาน <a href="https://www.facebook.com/profile"></a></p>'),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1.1", "เพจสำนักงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("reports a link with no text on a line with no words", async () => {
		const { entries, report, files } = await importOf([
			evidenceFile(31),
			moitPost(1, 2567, `<p>1.1 <a href="${fileHref(31)}"></a></p>`),
		]);
		assert.deepEqual(entries[0]!.data.evidence, []);
		assert.deepEqual(files, []);
		assert.deepEqual(report.notes, [
			{ slug: "moit-1-2567", note: `a link with no words and no wording to take: ${fileHref(31)}` },
		]);
	});

	it("reports the words of a line whose only link is an empty Facebook one", async () => {
		const { entries, report } = await importOf([
			moitPost(1, 2567, '<p>เพจสำนักงาน <a href="https://www.facebook.com/profile"></a></p>'),
		]);
		assert.deepEqual(entries[0]!.data.evidence, []);
		assert.deepEqual(report.notes, [
			{ slug: "moit-1-2567", note: "text not carried: เพจสำนักงาน" },
		]);
	});

	it("labels an empty link to another site by the wording of its line", async () => {
		const evidence = await evidenceOf(
			moitPost(1, 2567, '<p>1.1 คำสั่งแต่งตั้ง <a href="https://example.go.th/"></a></p>'),
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "คำสั่งแต่งตั้ง"),
			linkBlock("คำสั่งแต่งตั้ง", "https://example.go.th/", { current: false }),
		]);
	});

	it("drops a tag link with no text without a word", async () => {
		const { report } = await importOf([
			moitPost(1, 2567, '<p>1.1 <a href="https://songhealth.moph.go.th/tag/2567/"></a></p>'),
		]);
		assert.deepEqual(report.notes, []);
	});

	it("drops a tag link", async () => {
		const { entries, report } = await importOf([
			moitPost(
				1,
				2567,
				'<h5>1. รายงาน</h5><p><a href="https://songhealth.moph.go.th/tag/2567/">2567</a></p>',
			),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [requirementBlock("1", "รายงาน")]);
		assert.deepEqual(report.notes, []);
	});

	it("stops on a link to a page of the site that has no new address", async () => {
		await assert.rejects(
			importOf([moitPost(2, 2568, '<p>1.1 <a href="/some-old-page/">หน้าเดิม</a></p>')]),
			/moit-2-2568 links \/some-old-page\/, which has no new address/,
		);
	});

	it("stops on a link into the uploads that names no attachment", async () => {
		await assert.rejects(
			importOf([
				moitPost(2, 2568, '<p>1.1 <a href="/wp-content/uploads/2026/03/gone.pdf">บันทึก</a></p>'),
			]),
			/moit-2-2568 links \/wp-content\/uploads\/2026\/03\/gone\.pdf, which names no attachment/,
		);
	});
});

describe("a MOIT's fixes at import", () => {
	it("resolves a link without /wp-content to its file (defect 3)", async () => {
		const evidence = await evidenceOf(
			moitPost(5, 2569, '<ul><li><a href="/uploads/2026/03/file-51.pdf">บันทึก</a></li></ul>'),
			[evidenceFile(51)],
		);
		assert.deepEqual(evidence, [fileBlock("บันทึก", 51)]);
	});

	it("reads items 1.4–1.6 of 2569 MOIT 5 as 2569, and leaves those beside them (defect 4)", async () => {
		const months =
			"<p>1.3 ธันวาคม 2568</p><p>1.4 มกราคม 2568</p><p>1.5 กุมภาพันธ์ 2568</p><p>1.6 มีนาคม 2568</p><p>1.7 เมษายน 2568</p>";
		assert.deepEqual(await evidenceOf(moitPost(5, 2569, months)), [
			requirementBlock("1.3", "ธันวาคม 2568"),
			requirementBlock("1.4", "มกราคม 2569"),
			requirementBlock("1.5", "กุมภาพันธ์ 2569"),
			requirementBlock("1.6", "มีนาคม 2569"),
			requirementBlock("1.7", "เมษายน 2568"),
		]);
		for (const other of [moitPost(5, 2568, months), moitPost(4, 2569, months)]) {
			assert.deepEqual(
				((await evidenceOf(other)) as { title: string }[]).map(({ title }) => title),
				["ธันวาคม 2568", "มกราคม 2568", "กุมภาพันธ์ 2568", "มีนาคม 2568", "เมษายน 2568"],
			);
		}
	});

	it("reads a link's own text on items 1.4–1.6 as 2569 too (defect 4)", async () => {
		assert.deepEqual(
			await evidenceOf(moitPost(5, 2569, `<p>1.4 <a href="${fileHref(51)}">มกราคม 2568</a></p>`), [
				evidenceFile(51),
			]),
			[requirementBlock("1.4", "มกราคม 2569"), fileBlock("มกราคม 2569", 51)],
		);
	});

	it('gives a link whose text is ")" the wording of its line (defect 5)', async () => {
		const evidence = await evidenceOf(
			moitPost(2, 2568, `<h4>10. รายงานผล (ตามข้อ 9<a href="${fileHref(52)}">)</a></h4>`),
			[evidenceFile(52)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("10", "รายงานผล (ตามข้อ 9)"),
			fileBlock("รายงานผล (ตามข้อ 9)", 52),
		]);
	});

	it('gives a ")" on a line of its own the wording of the Requirement it falls under', async () => {
		const evidence = await evidenceOf(
			moitPost(2, 2568, `<h4>10. รายงานผล</h4><ul><li><a href="${fileHref(52)}">)</a></li></ul>`),
			[evidenceFile(52)],
		);
		assert.deepEqual(evidence, [requirementBlock("10", "รายงานผล"), fileBlock("รายงานผล", 52)]);
	});

	it('does not make a Requirement of a numbered line that holds only ")"', async () => {
		const evidence = await evidenceOf(
			moitPost(
				2,
				2568,
				`<h4>10. รายงานผล</h4><p>10.1 <a href="${fileHref(52)}">)</a></p><ul><li><a href="${fileHref(53)}">)</a></li></ul>`,
			),
			[evidenceFile(52), evidenceFile(53)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("10", "รายงานผล"),
			fileBlock("รายงานผล", 52),
			fileBlock("รายงานผล", 53),
		]);
	});

	it('reports a ")" before any Requirement, which has no wording to take', async () => {
		const { entries, report } = await importOf([
			evidenceFile(52),
			moitPost(2, 2568, `<ul><li><a href="${fileHref(52)}">)</a></li></ul>`),
		]);
		assert.deepEqual(entries[0]!.data.evidence, []);
		assert.deepEqual(report.notes, [
			{ slug: "moit-2-2568", note: `a link with no words and no wording to take: ${fileHref(52)}` },
		]);
	});

	it("gives a link with no text the wording of its line too", async () => {
		const evidence = await evidenceOf(
			moitPost(2, 2568, `<p>1.1 คำสั่งแต่งตั้ง <a href="${fileHref(53)}"></a></p>`),
			[evidenceFile(53)],
		);
		assert.deepEqual(evidence, [
			requirementBlock("1.1", "คำสั่งแต่งตั้ง"),
			fileBlock("คำสั่งแต่งตั้ง", 53),
		]);
	});

	it("keeps a link's text that holds a letter or a digit", async () => {
		const evidence = await evidenceOf(
			moitPost(2, 2568, `<p>1.1 คำสั่ง <a href="${fileHref(54)}">(2)</a></p>`),
			[evidenceFile(54)],
		);
		assert.deepEqual(evidence, [requirementBlock("1.1", "คำสั่ง (2)"), fileBlock("(2)", 54)]);
	});

	it("keeps 2569 MOIT 2's carried-over files as submitted, and notes them (defect 12)", async () => {
		const carried = (id: number) => attachment(id, `wp-content/uploads/2025/09/carried-${id}.pdf`);
		const link = (id: number, label: string) =>
			`<li><a href="/wp-content/uploads/2025/09/carried-${id}.pdf">${label}</a></li>`;
		const content = `<ul>${link(4416, "รอบ 12 เดือน")}${link(4419, "แผนและผล")}${link(4500, "รอบ 6 เดือน")}</ul>`;
		const { entries, report } = await importOf([
			carried(4416),
			carried(4419),
			carried(4500),
			moitPost(2, 2569, content),
		]);
		assert.deepEqual(entries[0]!.data.evidence, [
			fileBlock("รอบ 12 เดือน", 4416),
			fileBlock("แผนและผล", 4419),
			fileBlock("รอบ 6 เดือน", 4500),
		]);
		assert.deepEqual(report.notes, [
			{ slug: "moit-2-2569", note: "a 2568 file, kept as submitted (defect 12): รอบ 12 เดือน" },
			{ slug: "moit-2-2569", note: "a 2568 file, kept as submitted (defect 12): แผนและผล" },
		]);
		const elsewhere = await importOf([
			carried(4416),
			moitPost(2, 2568, `<ul>${link(4416, "รอบ")}</ul>`),
		]);
		assert.deepEqual(elsewhere.report.notes, []);
	});
});

describe("ANOM-001, the file the uploads copy lacks", () => {
	it("becomes a link block to the document's official source, using no attachment", async () => {
		const planned = await importOf([ANOM, ANOM_POST], { uploads: [] });
		assert.deepEqual(planned.entries[0]!.data.evidence, [
			requirementBlock("7", "ยุทธศาสตร์"),
			linkBlock("ยุทธศาสตร์", ANOM_001_SOURCE, { current: false }),
		]);
		assert.deepEqual(planned.files, []);
		assert.deepEqual(planned.report.missing, []);
		assert.deepEqual(planned.report.notes, [
			{
				slug: "moit-2-2567",
				note: "ANOM-001: the office's file is not beside the export, so the Evidence links the document's official source",
			},
		]);
	});

	it("becomes a file block from the office's file, when that lies beside the export", async () => {
		const planned = await importOf([ANOM, ANOM_POST], { uploads: [], hasOfficeFile: true });
		assert.deepEqual(planned.entries[0]!.data.evidence, [
			requirementBlock("7", "ยุทธศาสตร์"),
			fileBlock("ยุทธศาสตร์", 1479),
		]);
		assert.deepEqual(planned.files, [
			{
				attachment: 1479,
				path: "anom-001.pdf",
				filename: "7-long-name.pdf",
				folder: "ITA 2567",
				alt: "",
				caption: "",
			},
		]);
		assert.deepEqual(planned.report.missing, []);
		assert.deepEqual(planned.report.notes, [
			{ slug: "moit-2-2567", note: "ANOM-001: uploaded from the office's file" },
		]);
	});

	it("takes the attachment's own file when the uploads copy has it after all", async () => {
		const planned = await importOf([ANOM, ANOM_POST], { hasOfficeFile: true });
		assert.deepEqual(
			planned.files.map(({ attachment: id, path }) => [id, path]),
			[[1479, "wp-content/uploads/2024/11/7-long-name.pdf"]],
		);
		assert.deepEqual(planned.report.notes, []);
	});

	it("leaves another attachment without its file to the report, with no block", async () => {
		const planned = await importOf(
			[evidenceFile(61), moitPost(1, 2569, `<p>1.1 <a href="${fileHref(61)}">บันทึก</a></p>`)],
			{ uploads: [] },
		);
		assert.deepEqual(planned.entries[0]!.data.evidence, [requirementBlock("1.1", "บันทึก")]);
		assert.deepEqual(planned.report.missing, [
			{ attachment: 61, path: "wp-content/uploads/2026/03/file-61.pdf", usedBy: ["moit-1-2569"] },
		]);
	});
});

describe("a MOIT's Round", () => {
	const evidence = `<p>1.1 <a href="${fileHref(31)}">บันทึก</a></p><p>1.2 <a href="https://example.go.th/">เว็บไซต์</a></p>`;

	for (const year of [2567, 2568, 2569]) {
		it(`is ไม่ระบุรอบ for ${year}, on every piece of Evidence`, async () => {
			assert.deepEqual(await evidenceOf(moitPost(1, year, evidence), [evidenceFile(31)]), [
				requirementBlock("1.1", "บันทึก"),
				fileBlock("บันทึก", 31),
				requirementBlock("1.2", "เว็บไซต์"),
				linkBlock("เว็บไซต์", "https://example.go.th/", { current: false }),
			]);
		});
	}

	it("is รอบ 6 เดือน for 2570, on every piece of Evidence", async () => {
		assert.deepEqual(await evidenceOf(moitPost(1, 2570, evidence), [evidenceFile(31)]), [
			requirementBlock("1.1", "บันทึก"),
			fileBlock("บันทึก", 31, "รอบ 6 เดือน"),
			requirementBlock("1.2", "เว็บไซต์"),
			linkBlock("เว็บไซต์", "https://example.go.th/", { current: false, round: "รอบ 6 เดือน" }),
		]);
	});

	it("stops on a fiscal year it has no Round for, either side of those it has", async () => {
		for (const year of [2566, 2571]) {
			await assert.rejects(
				importOf([moitPost(1, year, "<h5>1. รายงาน</h5>")]),
				new RegExp(`moit-1-${year} is of fiscal year ${year}, which has no Round`),
			);
		}
	});
});

describe("a MOIT's slug, title and tags", () => {
	it("takes moit-{n}-{year} from its tags, so moit-4-2567-2 becomes moit-5-2567", async () => {
		const { entries, redirects } = await importOf([
			moitPost(5, 2567, "<h5>1. รายงาน</h5>", { slug: "moit-4-2567-2" }),
		]);
		assert.deepEqual(
			entries.map(({ slug, page }) => [slug, page]),
			[["moit-5-2567", "/ita/moit-5-2567"]],
		);
		assert.deepEqual(redirects.slice(0, 1), [
			{ source: "/moit-4-2567-2/", destination: "/ita/moit-5-2567" },
		]);
	});

	it("takes 2569 MOIT 16 off its Thai slug, redirecting it in the upper-case hex a request reaches EmDash in", async () => {
		const { entries, redirects } = await importOf([
			moitPost(16, 2569, "<h5>1. รายงาน</h5>", {
				slug: "moit-16-%e0%b8%ab%e0%b8%99%e0%b9%88%e0%b8%a7%e0%b8%a2",
			}),
		]);
		assert.equal(entries[0]!.slug, "moit-16-2569");
		assert.deepEqual(redirects.slice(0, 1), [
			{
				source: "/moit-16-%E0%B8%AB%E0%B8%99%E0%B9%88%E0%B8%A7%E0%B8%A2/",
				destination: "/ita/moit-16-2569",
			},
		]);
	});

	it("stops on a published post without a publish date", async () => {
		await assert.rejects(
			importOf([moitPost(1, 2569, "<h5>1. รายงาน</h5>", { date: "ไม่มีวันที่" })]),
			/moit-1-2569 has no publish date/,
		);
	});

	it("keeps a title that has no MOIT n to take off, and one that is nothing else", async () => {
		const titled = async (title: string) =>
			(await importOf([moitPost(1, 2569, "<h5>1. รายงาน</h5>", { title })])).entries[0]!.data.title;
		assert.equal(await titled("หน่วยงานมีการเผยแพร่"), "หน่วยงานมีการเผยแพร่");
		assert.equal(await titled("MOIT 1"), "MOIT 1");
	});

	it("leaves out a post that is not published", async () => {
		const { entries, redirects } = await importOf([
			moitPost(1, 2569, "<h5>1. รายงาน</h5>", { status: "draft" }),
		]);
		assert.deepEqual(entries, []);
		assert.deepEqual(redirects, []);
	});

	it("stops on a published post without its fiscal year's tag or its MOIT's", async () => {
		const noMoit = [{ domain: "post_tag", slug: "2569", name: "2569" }];
		const noYear = [{ domain: "post_tag", slug: "moit-1", name: "MOIT-1" }];
		for (const [categories, slug] of [
			[noMoit, "no-moit"],
			[noYear, "no-year"],
			[[], "no-tags"],
		] as const) {
			await assert.rejects(
				importOf([moitPost(1, 2569, "<h5>1. รายงาน</h5>", { slug, categories: [...categories] })]),
				new RegExp(`${slug} does not have one fiscal year tag and one MOIT tag`),
			);
		}
	});

	it("stops on a post with two fiscal year tags", async () => {
		const categories = [{ domain: "post_tag", slug: "2568", name: "2568" }, ...moitTags(1, 2569)];
		await assert.rejects(
			importOf([moitPost(1, 2569, "<h5>1. รายงาน</h5>", { categories })]),
			/moit-1-2569 does not have one fiscal year tag and one MOIT tag/,
		);
	});

	it("stops on a post with two MOIT tags", async () => {
		const categories = [
			{ domain: "post_tag", slug: "moit-2", name: "MOIT-2" },
			...moitTags(1, 2569),
		];
		await assert.rejects(
			importOf([moitPost(1, 2569, "<h5>1. รายงาน</h5>", { categories })]),
			/moit-1-2569 does not have one fiscal year tag and one MOIT tag/,
		);
	});

	it("leaves updated_on out when the export gives no last modification", async () => {
		const { entries } = await importOf([moitPost(1, 2569, "<h5>1. รายงาน</h5>", { modified: "" })]);
		assert.deepEqual(Object.keys(entries[0]!.data), ["title", "fiscal_year", "number", "evidence"]);
	});

	it("counts the MOITs in the report, under the posts' legacy type", async () => {
		const { report } = await importOf([
			moitPost(1, 2569, "<h5>1. รายงาน</h5>"),
			moitPost(2, 2569, "<h5>1. รายงาน</h5>"),
		]);
		assert.deepEqual(report.groups, { post: { MOIT: 2 } });
	});

	it("stops on two posts of one MOIT, before anything is written", async () => {
		await assert.rejects(
			importOf([
				moitPost(4, 2567, "<h5>1. รายงาน</h5>"),
				moitPost(4, 2567, "<h5>1. รายงาน</h5>", { id: 999, slug: "moit-4-2567-2" }),
			]),
			/moit\/moit-4-2567 is planned twice/,
		);
	});
});

describe("the size of a MOIT", () => {
	/** A post of `blocks` Requirement lines. */
	const postOf = (blocks: number) =>
		moitPost(2, 2567, Array.from({ length: blocks }, (_, at) => `<p>1.${at + 1} ข้อ</p>`).join(""));

	it("takes 100 blocks", async () => {
		const evidence = await evidenceOf(postOf(100));
		assert.equal((evidence as unknown[]).length, 100);
	});

	it("stops at 101 blocks, before anything is written", async () => {
		await assert.rejects(importOf([postOf(101)]), /moit-2-2567 has 101 blocks, over 100/);
	});
});

describe("a MOIT's files", () => {
	const linking = (id: number) => `<p>1.1 <a href="${fileHref(id)}">บันทึก</a></p>`;
	const foldersOf = async (items: SyntheticItem[], options: ImportOptions = {}) =>
		(await importOf(items, options)).files.map(({ attachment: id, folder }) => [id, folder]);

	it("files a year's file in that year's folder, once however often it is linked", async () => {
		assert.deepEqual(
			await foldersOf([
				evidenceFile(31),
				moitPost(1, 2569, `${linking(31)}${linking(31)}`),
				moitPost(2, 2569, linking(31)),
			]),
			[[31, "ITA 2569"]],
		);
	});

	for (const year of [2567, 2568, 2570]) {
		it(`names the folder of ${year}`, async () => {
			assert.deepEqual(await foldersOf([evidenceFile(31), moitPost(1, year, linking(31))]), [
				[31, `ITA ${year}`],
			]);
		});
	}

	it("files a file that two fiscal years link in ITA ใช้ทุกปี", async () => {
		assert.deepEqual(
			await foldersOf([
				evidenceFile(31),
				moitPost(1, 2568, linking(31)),
				moitPost(1, 2569, linking(31)),
			]),
			[[31, "ITA ใช้ทุกปี"]],
		);
	});

	const SAME_BYTES = (path: string) => (path.includes("file-") ? "the same bytes" : path);

	it("files one document uploaded under two attachments of two years in ITA ใช้ทุกปี, both", async () => {
		assert.deepEqual(
			await foldersOf(
				[
					evidenceFile(31),
					evidenceFile(32),
					moitPost(1, 2568, linking(31)),
					moitPost(1, 2569, linking(32)),
				],
				{ fingerprintOf: SAME_BYTES },
			),
			[
				[31, "ITA ใช้ทุกปี"],
				[32, "ITA ใช้ทุกปี"],
			],
		);
	});

	it("keeps one document uploaded twice in one year in that year's folder", async () => {
		assert.deepEqual(
			await foldersOf(
				[
					evidenceFile(31),
					evidenceFile(32),
					moitPost(1, 2569, linking(31)),
					moitPost(2, 2569, linking(32)),
				],
				{ fingerprintOf: SAME_BYTES },
			),
			[
				[31, "ITA 2569"],
				[32, "ITA 2569"],
			],
		);
	});

	it("keeps a file a news item uses too in its ITA folder", async () => {
		assert.deepEqual(
			await foldersOf([
				attachment(31, "wp-content/uploads/2026/03/file-31.pdf"),
				newsItem(7, { categories: [ACTIVITY], meta: featuring(31) }),
				moitPost(1, 2569, linking(31)),
			]),
			[[31, "ITA 2569"]],
		);
	});
});

describe("the ITA pages' redirects", () => {
	const POST = "<h5>1. รายงาน</h5>";

	it("sends each year's page to its year, and the ethics page to 2569", async () => {
		const { redirects } = await importOf([
			moitPost(1, 2567, POST),
			moitPost(1, 2568, POST),
			moitPost(1, 2569, POST),
		]);
		assert.deepEqual(redirects, [
			{ source: "/moit-1-2567/", destination: "/ita/moit-1-2567" },
			{ source: "/moit-1-2568/", destination: "/ita/moit-1-2568" },
			{ source: "/moit-1-2569/", destination: "/ita/moit-1-2569" },
			{ source: "/ita-2567/", destination: "/ita/2567" },
			{ source: "/ita-2568/", destination: "/ita/2568" },
			{ source: "/ita-2569/", destination: "/ita/2569" },
			{ source: "/ethics/", destination: "/ita/2569" },
		]);
	});

	it("gives 2570 its page's redirect when its posts are in the export", async () => {
		const { redirects } = await importOf([moitPost(1, 2570, POST)]);
		assert.deepEqual(redirects.slice(1), [{ source: "/ita-2570/", destination: "/ita/2570" }]);
	});

	it("leaves out a year without MOITs, and the ethics page without 2569's", async () => {
		const { redirects } = await importOf([moitPost(1, 2568, POST)]);
		assert.deepEqual(redirects.slice(1), [{ source: "/ita-2568/", destination: "/ita/2568" }]);
	});

	it("has none at all without an ITA post", async () => {
		assert.deepEqual((await importOf([])).redirects, []);
	});
});

describe("verify of the MOITs", () => {
	const OWNER = "admin-1";
	const FOLDER = { id: "folder-1", name: "ITA 2569" };

	type Answer = { status: number; location: string | null; body: string };

	/** A MOIT page's header, as MoitPage.astro writes its counts. */
	const moitPage = (counts: string): Answer => ({
		status: 200,
		location: null,
		body: `<p>${counts}</p>`,
	});

	/** A year's page listing `slugs`, as ItaYearPage.astro writes its links. */
	const yearPage = (...slugs: string[]): Answer => ({
		status: 200,
		location: null,
		body: `<a href="/ita">ITA</a>${slugs.map((slug) => `<a href="/ita/${slug}">MOIT</a>`).join("")}`,
	});

	const redirect = (location: string): Answer => ({ status: 301, location, body: "" });

	/** A target that holds what the plan of two MOITs of 2569 writes. */
	async function goodTarget() {
		const planned = await importOf([
			evidenceFile(31),
			moitPost(
				1,
				2569,
				`<h5>1. รายงาน</h5><p>1.1 <a href="${fileHref(31)}">บันทึก</a></p><p>1.2 <a href="https://example.go.th/">เว็บไซต์</a></p>`,
			),
			moitPost(2, 2569, "<h5>1. รายงาน</h5>"),
		]);
		const responses = new Map<string, Answer>([
			["/ita/moit-1-2569", moitPage("หลักฐาน 2 รายการ ใน 1 ข้อ")],
			["/ita/moit-2-2569", moitPage("หลักฐาน 0 รายการ ใน 1 ข้อ")],
			["/ita/2569", yearPage("moit-1-2569", "moit-2-2569")],
			["/moit-1-2569/", redirect("/ita/moit-1-2569")],
			["/moit-2-2569/", redirect("/ita/moit-2-2569")],
			["/ita-2569/", redirect("/ita/2569")],
			["/ethics/", redirect("/ita/2569")],
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
			media: [{ contentHash: "sha1:31", folderId: FOLDER.id, filename: "file-31.pdf" }],
			folders: [FOLDER],
			owner: OWNER,
			hashes: new Map([[31, "sha1:31"]]),
			responses,
			request: async (path: string) => {
				const response = responses.get(path);
				if (response === undefined) throw new Error(`unexpected request: ${path}`);
				return response;
			},
		};
	}

	it("counts the MOITs and the year pages, with no failure for a target that matches", async () => {
		const result = await verifyTarget(await goodTarget());
		assert.deepEqual(result.moits, { planned: 2, passed: 2 });
		assert.deepEqual(result.years, { planned: 1, passed: 1 });
		assert.deepEqual(result.entries.moit, { planned: 2, found: 2, inCollection: 2 });
		assert.deepEqual(result.redirects, { planned: 4, passed: 4 });
		assert.deepEqual(result.failures, []);
	});

	it("fails a MOIT page that shows less Evidence than the plan holds", async () => {
		const target = await goodTarget();
		target.responses.set("/ita/moit-1-2569", moitPage("หลักฐาน 1 รายการ ใน 1 ข้อ"));
		const result = await verifyTarget(target);
		assert.deepEqual(result.moits, { planned: 2, passed: 1 });
		assert.deepEqual(result.failures, ["/ita/moit-1-2569 shows 1 pieces of Evidence, not 2"]);
	});

	it("fails a MOIT page that shows no count of Evidence", async () => {
		const target = await goodTarget();
		target.responses.set("/ita/moit-1-2569", moitPage("หน้าอื่น"));
		const result = await verifyTarget(target);
		assert.deepEqual(result.failures, ["/ita/moit-1-2569 shows no pieces of Evidence, not 2"]);
	});

	it("fails a MOIT page with a file that cannot be served", async () => {
		const target = await goodTarget();
		target.responses.set(
			"/ita/moit-1-2569",
			moitPage("หลักฐาน 2 รายการ ใน 1 ข้อ · ไฟล์ที่ไม่พร้อมให้บริการ 1"),
		);
		const result = await verifyTarget(target);
		assert.deepEqual(result.moits, { planned: 2, passed: 1 });
		assert.deepEqual(result.failures, ["/ita/moit-1-2569 has a file that cannot be served"]);
	});

	it("fails a year's page that leaves out one of its MOITs", async () => {
		const target = await goodTarget();
		target.responses.set("/ita/2569", yearPage("moit-1-2569"));
		const result = await verifyTarget(target);
		assert.deepEqual(result.years, { planned: 1, passed: 0 });
		assert.deepEqual(result.failures, ["/ita/2569 does not list moit-2-2569"]);
	});

	it("fails a year's page that does not answer, and the redirects that lead to it", async () => {
		const target = await goodTarget();
		target.responses.set("/ita/2569", { status: 404, location: null, body: "" });
		const result = await verifyTarget(target);
		assert.deepEqual(result.years, { planned: 1, passed: 0 });
		assert.deepEqual(result.failures, [
			"/ita/2569 answers 404",
			"/ita-2569/ goes to /ita/2569, which does not answer 200",
			"/ethics/ goes to /ita/2569, which does not answer 200",
		]);
	});
});

describe("the import command's ITA posts", () => {
	/** The plan of a dry run in a folder holding what `prepare` puts beside the export. */
	async function dryRun(prepare: (folder: string) => Promise<void>) {
		let planned: ImportPlan | undefined;
		await withExport([ANOM, ANOM_POST], async ({ folder, xml, zip }) => {
			// An uploads copy that lacks ANOM-001's file, as the real one does.
			await writeFile(zip, zipOf([]));
			await prepare(folder);
			const result = runMigration("import", xml, zip, "--dry-run");
			assert.equal(result.status, 0, result.stderr);
			planned = JSON.parse(await readFile(join(folder, "import-plan.json"), "utf8")) as ImportPlan;
		});
		return planned!;
	}

	it("links the official source while the office's file is not beside the export", async () => {
		const planned = await dryRun(async () => {});
		assert.deepEqual(planned.files, []);
		assert.deepEqual(planned.entries[0]!.data.evidence, [
			requirementBlock("7", "ยุทธศาสตร์"),
			linkBlock("ยุทธศาสตร์", ANOM_001_SOURCE, { current: false }),
		]);
	});

	it("plans the file named anom-001.pdf when it lies beside the export", async () => {
		const planned = await dryRun((folder) =>
			writeFile(join(folder, "anom-001.pdf"), new Uint8Array([1])),
		);
		assert.deepEqual(
			planned.files.map(({ attachment: id, path, filename, folder }) => [
				id,
				path,
				filename,
				folder,
			]),
			[[1479, "anom-001.pdf", "7-long-name.pdf", "ITA 2567"]],
		);
		assert.deepEqual(planned.entries[0]!.data.evidence, [
			requirementBlock("7", "ยุทธศาสตร์"),
			fileBlock("ยุทธศาสตร์", 1479),
		]);
	});
});
