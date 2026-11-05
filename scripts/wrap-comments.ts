// The width of code comments (#65 retro), and the rewrap that keeps a comment to it (#147 retro).
//
// Prettier wraps code at the 100 columns of prettier.config.mjs but leaves a comment as it is
// written, so a long comment line passes the format check. In a file Prettier formats, a comment
// line keeps to 100 columns too, counted as Prettier counts them: a tab as 2 columns, its default
// tabWidth, and a nonspacing mark, such as a Thai vowel or tone mark written above or below its
// consonant, as none. A line that is a single word, such as a long address, cannot wrap and is
// left alone. tests/node/comment-width.test.ts checks every such file, and `npm run format` runs
// this script after Prettier to rewrap what that check would report:
//
//   node scripts/wrap-comments.ts
//
// A line breaks only at a space outside a `code span`, so a Thai word stays whole. The words past
// the width move to the start of the paragraph's next line, or onto a new line where the paragraph
// ends: at a blank comment line, a list item, a JSDoc tag or code. A list item's next lines start
// under its words, and a one-line `/** … */` or `/* … */` comment opens into a block. An indented
// line that is not a list item's, such as a command line, stays as written for its author, and
// the check still reports it.

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import * as prettier from "prettier";

const ROOT = new URL("../", import.meta.url);

/** The widest a comment line may be. */
export const WIDTH = 100;

/** The code Prettier formats here: TypeScript, JavaScript modules, Astro components and styles. */
const CODE = /\.(ts|mjs|astro|css)$/;

/** A comment line: one that starts with `//`, or a line of a `/* … *\/` block. */
const COMMENT = /^\s*(\/\/|\/\*|\*)/;

/** The ignore files Prettier reads, so a file it leaves alone is left alone here too. */
const IGNORE_PATH = [".gitignore", ".prettierignore"].map((name) =>
	fileURLToPath(new URL(name, ROOT)),
);

/** The code files Prettier formats that git tracks or would track, from the repository root. */
export async function formattedCode(): Promise<string[]> {
	const files: string[] = [];
	for (const file of execFileSync(
		"git",
		["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
		{ cwd: ROOT, encoding: "utf8" },
	)
		.split("\0")
		.filter((name) => CODE.test(name))) {
		const path = fileURLToPath(new URL(file, ROOT));
		if (!(await prettier.getFileInfo(path, { ignorePath: IGNORE_PATH })).ignored) files.push(file);
	}
	return files;
}

/** A line's width as Prettier counts it. */
export function widthOf(line: string): number {
	return [...line.replaceAll("\t", "  ").replace(/\p{Mn}/gu, "")].length;
}

/** Whether a comment line is wider than `width` and holds more than one word, so it can wrap. */
function tooWide(line: string, width: number): boolean {
	const words = line.replace(COMMENT, "").trim();
	return COMMENT.test(line) && widthOf(line) > width && /\s/.test(words);
}

/** Each comment line wider than WIDTH that could wrap, as `path:line (columns)`. */
export async function wideComments(files: string[]): Promise<string[]> {
	const found: string[] = [];
	for (const file of files) {
		(await readFile(new URL(file, ROOT), "utf8")).split("\n").forEach((line, index) => {
			if (tooWide(line, WIDTH)) found.push(`${file}:${index + 1} (${widthOf(line)} columns)`);
		});
	}
	return found;
}

/** A line comment or a block comment's inner line: its lead (indent, marker, space), its words. */
const LINE = /^(\s*(?:\/\/|\*(?!\/)) ?)(.*)$/;

/** A list item's marker at the start of a comment's words: "- ", "* ", "+ ", "1. " or "1) ". */
const LIST_ITEM = /^(?:[-*+]|\d+[.)]) /;

/**
 * How line `i` wraps: the lead its words start after, and the continuation, the lead of the lines
 * that go on with it. A list item's next lines start under its words. An indented line wraps only
 * as one of those lines; any other, such as a command line, is left as written.
 */
function leadsOf(lines: string[], i: number): { lead: string; continuation: string } | undefined {
	const [, lead, text] = LINE.exec(lines[i] ?? "") ?? [];
	if (lead === undefined || text === undefined) return undefined;
	const item = LIST_ITEM.exec(text)?.[0];
	if (item !== undefined) return { lead, continuation: lead + " ".repeat(item.length) };
	const indent = /^ */.exec(text)?.[0] ?? "";
	if (indent === "") return { lead, continuation: lead };
	for (let j = i - 1; j >= 0; j--) {
		const [, aboveLead, above = ""] = LINE.exec(lines[j] ?? "") ?? [];
		if (aboveLead !== lead || above === "") return undefined;
		const aboveItem = LIST_ITEM.exec(above)?.[0];
		if (aboveItem !== undefined) {
			return aboveItem.length === indent.length
				? { lead: lead + indent, continuation: lead + indent }
				: undefined;
		}
		if (!above.startsWith(indent)) return undefined;
	}
	return undefined;
}

/** Whether `line` goes on with the paragraph whose lines start with `lead`. */
function continues(line: string | undefined, lead: string): line is string {
	if (line === undefined || !line.startsWith(lead)) return false;
	const text = line.slice(lead.length);
	return /^[^\s@]/.test(text) && !LIST_ITEM.test(text);
}

/** A comment's words: its text split at each space outside a `code span`. */
function wordsOf(text: string): string[] {
	const words: string[] = [];
	let word = "";
	let code = false;
	for (const char of text) {
		if (char === "`") code = !code;
		if (char !== " " || code) word += char;
		else if (word !== "") {
			words.push(word);
			word = "";
		}
	}
	if (word !== "") words.push(word);
	// A span left open protects no space.
	return code ? text.split(" ").filter(Boolean) : words;
}

/** A one-line block comment: its indent, its opening (`/*` or `/**`) and its words. */
const ONE_LINE_BLOCK = /^(\s*)(\/\*\*?) (.*\S) \*\/$/;

/** `source` with its comment lines wider than `width` rewrapped. */
export function wrapComments(source: string, width = WIDTH): string {
	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (!tooWide(line, width)) continue;
		const block = ONE_LINE_BLOCK.exec(line);
		if (block) {
			const [, indent = "", opening = "", words = ""] = block;
			lines.splice(i, 1, indent + opening, `${indent} * ${words}`, `${indent} */`);
			continue;
		}
		const leads = leadsOf(lines, i);
		if (leads === undefined) continue;
		const [first = "", ...rest] = wordsOf(line.slice(leads.lead.length));
		let head = leads.lead + first;
		while (rest.length > 0 && widthOf(`${head} ${rest[0]}`) <= width) head += ` ${rest.shift()}`;
		if (rest.length === 0) continue;
		lines[i] = head;
		const { continuation } = leads;
		const next = lines[i + 1];
		if (continues(next, continuation)) {
			lines[i + 1] = `${continuation}${rest.join(" ")} ${next.slice(continuation.length)}`;
		} else lines.splice(i + 1, 0, continuation + rest.join(" "));
	}
	return lines.join("\n");
}

/** Rewraps each file of the code Prettier formats in place, and names each file it changes. */
async function main(): Promise<void> {
	for (const file of await formattedCode()) {
		const url = new URL(file, ROOT);
		const source = await readFile(url, "utf8");
		const wrapped = wrapComments(source);
		if (wrapped === source) continue;
		await writeFile(url, wrapped);
		console.log(`${file}: comments rewrapped`);
	}
}

if (import.meta.main) await main();
