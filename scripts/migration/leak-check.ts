// What the migration script's leak-check command looks for (#179 retro; spec #174 "What makes a
// good test": no Legacy site content in the repository): the export's file names and texts in the
// lines a commit adds. scripts/migration.ts reads the export and the staged changes; at run time
// this module imports only the planner, which imports nothing, so node:test checks it directly
// (tests/node/migration-leak-check.test.ts).

import type { LegacySite } from "./legacy-site.ts";
import { filesOf } from "./plan.ts";

/**
 * The shortest text taken to name something. The Legacy site's titles and alt texts are at least
 * this long, and its shorter labels are common words.
 */
const SHORTEST_TEXT = 16;

/** The lines a commit adds to one file. */
interface AddedLines {
	file: string;
	lines: string[];
}

/** Where a commit adds one of the export's strings: what it is, without repeating it. */
interface Leak {
	file: string;
	what: string;
}

/** The export's strings that name something of the Legacy site, each with what it is. */
function stringsOf(site: LegacySite): Map<string, string> {
	const strings = new Map<string, string>();
	const addText = (text: string, what: string) => {
		const trimmed = text.trim();
		if (trimmed.length >= SHORTEST_TEXT) strings.set(trimmed, what);
	};
	for (const { slug, title, files } of site.items) {
		addText(title, `the title of ${slug}`);
		for (const { label } of files) addText(label, `a label of ${slug}`);
	}
	for (const [id, { path, alt, caption }] of filesOf(site, []).byId) {
		const name = path?.split("/").at(-1);
		if (name) strings.set(name, `the file name of attachment ${id}`);
		addText(alt, `the alt text of attachment ${id}`);
		addText(caption, `the caption of attachment ${id}`);
	}
	return strings;
}

/**
 * Where `added` holds the export's strings, once for each string and file. Prose under docs/ and
 * specs/ may name a real item on purpose, as `docs/research/legacy-ita.md` names ANOM-001's file.
 */
export function leaksIn(site: LegacySite, added: AddedLines[]): Leak[] {
	const strings = [...stringsOf(site)];
	return added
		.filter(({ file }) => !/^(?:docs|specs)\//.test(file))
		.flatMap(({ file, lines }) => {
			const text = lines.join("\n");
			return strings.flatMap(([string, what]) => (text.includes(string) ? [{ file, what }] : []));
		});
}

/** The lines each file gains in a unified diff of `git diff --unified=0`. */
export function addedLinesOf(diff: string): AddedLines[] {
	const added: AddedLines[] = [];
	let current: AddedLines | undefined;
	let inHunk = false;
	for (const line of diff.split("\n")) {
		if (line.startsWith("diff --git ")) {
			current = undefined;
			inHunk = false;
		} else if (line.startsWith("@@ ")) {
			inHunk = true;
		} else if (!inHunk && line.startsWith("+++ b/")) {
			current = { file: line.slice("+++ b/".length), lines: [] };
			added.push(current);
		} else if (inHunk && current !== undefined && line.startsWith("+")) {
			current.lines.push(line.slice(1));
		}
	}
	return added;
}
