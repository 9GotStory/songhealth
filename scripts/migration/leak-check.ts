// What the migration script's leak-check command looks for (#179 retro; spec #174 "What makes a
// good test": no Legacy site content in the repository): the export's file names and texts in the
// lines a commit adds. scripts/migration.ts reads the export and the staged changes; at run time
// this module imports only the planner, which imports nothing, so node:test checks it directly
// (tests/node/migration-leak-check.test.ts).

import type { LegacySite } from "./legacy-site.ts";
import { filesOf, lastPartOf } from "./plan.ts";

/**
 * The shortest text taken to name something. The Legacy site's titles and alt texts are at least
 * this long, and its shorter labels are common words.
 */
const SHORTEST_TEXT = 16;

/** The shortest file name taken to name something, as the Legacy site's shortest is. */
const SHORTEST_NAME = 10;

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
	for (const [id, { url, path, alt, caption }] of filesOf(site, []).byId) {
		// Its name as the uploads copy has it, and percent-encoded as the export's address writes it.
		for (const name of [path ?? "", url].map(lastPartOf)) {
			if (name.length >= SHORTEST_NAME) strings.set(name, `the file name of attachment ${id}`);
		}
		addText(alt, `the alt text of attachment ${id}`);
		addText(caption, `the caption of attachment ${id}`);
	}
	return strings;
}

/**
 * Where `added` holds the export's strings, once for each string and file. A research note may name
 * a real item on purpose, as `docs/research/legacy-ita.md` names ANOM-001's file (Product Owner,
 * #179 comment 6722228048, item 1).
 */
export function leaksIn(site: LegacySite, added: AddedLines[]): Leak[] {
	const strings = [...stringsOf(site)];
	return added
		.filter(({ file }) => !file.startsWith("docs/research/"))
		.flatMap(({ file, lines }) => {
			const text = lines.join("\n");
			return strings.flatMap(([needle, what]) => (text.includes(needle) ? [{ file, what }] : []));
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
		} else if (!inHunk && line.startsWith("+++ ") && line !== "+++ /dev/null") {
			// git quotes a path that holds an unusual character.
			current = {
				file: line
					.slice("+++ ".length)
					.replace(/^"?b\//, "")
					.replace(/"$/, ""),
				lines: [],
			};
			added.push(current);
		} else if (inHunk && current !== undefined && line.startsWith("+")) {
			current.lines.push(line.slice(1));
		}
	}
	return added;
}
