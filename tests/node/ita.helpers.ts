// A MOIT's Evidence blocks as EmDash stores them (seed/seed.json block types `ita_requirement`,
// `ita_file`, `ita_link`), for the node tests that read them: the ITA pages' (public-ita.test.ts)
// and the search's (public-search.test.ts).

import type { EvidenceBlock } from "../../src/lib/ita.ts";

/** A Requirement block, numbered `number`. */
export function requirement(number: string, title: string): EvidenceBlock {
	return { _type: "ita_requirement", number, title };
}

/** A file block whose file is stored under `storageKey`, with no Round unless `fields` sets one. */
export function file(label: string, storageKey: string, fields: Record<string, unknown> = {}) {
	return {
		_type: "ita_file",
		label,
		file: { id: storageKey, provider: "local", filename: storageKey, meta: { storageKey } },
		round: "ไม่ระบุรอบ",
		...fields,
	} as EvidenceBlock;
}

/** A link block to `url`, with no Round unless `fields` sets one. */
export function link(label: string, url: string, fields: Record<string, unknown> = {}) {
	return { _type: "ita_link", label, url, round: "ไม่ระบุรอบ", ...fields } as EvidenceBlock;
}
