// A MOIT's Evidence blocks (seed/seed.json block types `ita_requirement`, `ita_file`, `ita_link`)
// in the shape src/lib/ita.ts reads them, for the node tests that read them: the ITA pages'
// (public-ita.test.ts) and the search's (public-search.test.ts). The names follow the browser
// suites' builders (tests/browser/cms.helpers.ts).

import type { EvidenceBlock } from "../../src/lib/ita.ts";

/** The Round a new Evidence block starts with, which names none (seed/seed.json). */
const NO_ROUND = "ไม่ระบุรอบ";

/** A Requirement block, numbered `number`. */
export function requirementBlock(number: string, title: string): EvidenceBlock {
	return { _type: "ita_requirement", number, title };
}

/** A file block whose file is stored under `storageKey`, with no Round unless `fields` sets one. */
export function fileBlock(label: string, storageKey: string, fields: Record<string, unknown> = {}) {
	return {
		_type: "ita_file",
		label,
		file: { id: storageKey, provider: "local", filename: storageKey, meta: { storageKey } },
		round: NO_ROUND,
		...fields,
	} as EvidenceBlock;
}

/** A link block to `url`, with no Round unless `fields` sets one. */
export function linkBlock(label: string, url: string, fields: Record<string, unknown> = {}) {
	return { _type: "ita_link", label, url, round: NO_ROUND, ...fields } as EvidenceBlock;
}
