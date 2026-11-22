// Screenshot content for Feature 013's pages (spec #392; #393's before screenshots), the cases the
// demo dataset lacks. The demo dataset holds one fiscal year, 2570, with two MOITs. CASE names one,
// since each needs the runtime in its own state:
//
// - content: fiscal year 2568 with twenty-two published MOITs and 2569 with one, so the landing
//   lists three years with the demo dataset's 2570. Among 2568's: MOIT 1 at the sizes of the
//   office's published ITA content (spec #392 "Measured in the prototype": a title of 175
//   characters, 37 Requirements, a Requirement title of 238 characters), MOIT 2 without a summary,
//   MOIT 3 without a Requirement and MOIT 4 without Evidence. A draft MOIT of 2567, a year with no
//   published MOIT and so no page, is captured through its signed preview link. Captured as
//   ita-three-years, ita-year-one (2569), ita-year-22 (2568), moit-published-sizes,
//   moit-no-summary, moit-no-requirement, moit-no-evidence and moit-no-year-page, each
//   -<width>.
// - none: every published MOIT returned to draft, so the landing says that none is published.
//   Captured as ita-none-<width>.
//
// Every title is made up and starts with "[ตัวอย่าง]"; the sizes alone come from the export.
//
//   CASE=content scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
//     scripts/screenshot-fixtures/ita-cases.ts <out-dir>

import type { Capture, Fixtures, FixtureKit } from "../capture-with-fixtures.ts";
import { atWidths, caseOf } from "./homepage-widths.ts";

const which = caseOf(["content", "none"] as const);

/** Made-up words, repeated to `length` characters after "[ตัวอย่าง] ". */
function filler(length: number, words: string): string {
	let text = "[ตัวอย่าง] ";
	while (text.length < length) text += `${words} `;
	return text.slice(0, length).trimEnd().padEnd(length, "ก");
}

const TITLE_WORDS = "ตัวชี้วัดสมมุติสำหรับทดสอบการแสดงผลชื่อที่ยาวมากของหน้าเว็บไซต์";
const REQUIREMENT_WORDS = "ข้อกำหนดสมมุติสำหรับทดสอบการตัดบรรทัดของหัวข้อที่ยาว";

const SUMMARY = "สรุปสมมุติของตัวชี้วัด สำหรับภาพหน้าจอก่อนและหลังการออกแบบใหม่";
const UPDATED_ON = "2026-10-30T03:00:00.000Z";

const NO_ROUND = "ไม่ระบุรอบ";
const evidenceLink = (label: string) => ({
	_type: "ita_link",
	label,
	url: "/about",
	round: NO_ROUND,
	current: false,
});
const requirement = (number: string, title: string) => ({
	_type: "ita_requirement",
	number,
	title,
});

interface Moit {
	year: number;
	number: number;
	title: string;
	summary?: string;
	evidence: Record<string, unknown>[];
}

/** Create MOIT `moit`, published unless `draft`; returns its id and slug. */
async function createMoit({ admin, helpers }: FixtureKit, moit: Moit, draft = false) {
	const slug = helpers.syntheticSlug(`shot-moit-${moit.number}-${moit.year}`);
	const entry = await helpers.createSyntheticEntry(admin, "moit", {
		slug,
		data: {
			title: moit.title,
			fiscal_year: moit.year,
			number: moit.number,
			...(moit.summary ? { summary: moit.summary } : {}),
			updated_on: UPDATED_ON,
			evidence: moit.evidence,
		},
	});
	if (!entry.result.ok) throw new Error(`moit: ${helpers.nativeRefusalOf(entry.result)}`);
	if (!draft) await helpers.publishEntryAt(admin, "moit", entry.entryId!);
	return { id: entry.entryId!, slug };
}

/** A plain MOIT of `year`: a summary, one Requirement and one piece of Evidence. */
const plain = (year: number, number: number): Moit => ({
	year,
	number,
	title: `[ตัวอย่าง] ตัวชี้วัดสมมุติข้อที่ ${number} ของปีงบประมาณ พ.ศ. ${year}`,
	summary: SUMMARY,
	evidence: [requirement("1", "ข้อกำหนดสมมุติข้อแรก"), evidenceLink("1.1 หลักฐานสมมุติ")],
});

async function content(kit: FixtureKit): Promise<Capture[]> {
	const sizes = await createMoit(kit, {
		year: 2568,
		number: 1,
		title: filler(175, TITLE_WORDS),
		evidence: Array.from({ length: 37 }, (_, index) => [
			requirement(
				String(index + 1),
				index === 0 ? filler(238, REQUIREMENT_WORDS) : `ข้อกำหนดสมมุติข้อที่ ${index + 1}`,
			),
			evidenceLink(`${index + 1}.1 หลักฐานสมมุติ`),
		]).flat(),
	});
	const noSummary = await createMoit(kit, { ...plain(2568, 2), summary: undefined });
	const noRequirement = await createMoit(kit, {
		...plain(2568, 3),
		evidence: [evidenceLink("หลักฐานสมมุติก่อนข้อกำหนด"), evidenceLink("หลักฐานสมมุติชิ้นที่สอง")],
	});
	const noEvidence = await createMoit(kit, { ...plain(2568, 4), evidence: [] });
	for (let number = 5; number <= 22; number += 1) await createMoit(kit, plain(2568, number));
	await createMoit(kit, plain(2569, 1));
	const draft = await createMoit(kit, plain(2567, 1), true);
	const preview = await kit.helpers.mintPreviewLink(kit.admin, "moit", draft.id);
	return [
		...atWidths("ita-three-years", "/ita"),
		...atWidths("ita-year-one", "/ita/2569"),
		...atWidths("ita-year-22", "/ita/2568"),
		...atWidths("moit-published-sizes", `/ita/${sizes.slug}`),
		...atWidths("moit-no-summary", `/ita/${noSummary.slug}`),
		...atWidths("moit-no-requirement", `/ita/${noRequirement.slug}`),
		...atWidths("moit-no-evidence", `/ita/${noEvidence.slug}`),
		...atWidths("moit-no-year-page", `${preview.pathname}${preview.search}`),
	];
}

async function none(kit: FixtureKit): Promise<Capture[]> {
	await kit.borrow("moit");
	return atWidths("ita-none", "/ita");
}

const fixtures: Fixtures = (kit) => (which === "content" ? content(kit) : none(kit));

export default fixtures;
