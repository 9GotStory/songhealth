// Versions cited for the current documents (#127 retro).
//
// A file that names the version of a current document it was checked against, as DESIGN.md names
// the Homepage and Sitemap versions its contract follows, goes stale when that document is
// amended: in #127, DESIGN.md §8 kept the old versions while its §12 was updated. Each cited
// version must be the document's own Version line, so amending a current document also brings
// back every file that cites its version. The Feature 001 and 002 records in specs/ are left out.
// DESIGN.md also names, in its Updated line and a change-history entry, the ticket whose branch
// commits a change to it (#286 retro).

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const ROOT = new URL("../../", import.meta.url);

/** The folder of the current documents, `00-website-foundation.md` to `10-system-blueprint.md`. */
const CURRENT = new URL("docs/website-modernization-docs/current/", ROOT);

/** A current document named with its version, with or without its folder, a code span or "(". */
const CITATION = /(\d{2}-[a-z-]+)\.md`?\s*\(?v(\d+\.\d+)/g;

/** A current document's header line that states its version. */
const VERSION_LINE = /^> \*\*Version:\*\* (\d+\.\d+)\s*$/m;

/** The files git tracks or would track, outside the Feature 001 and 002 records in specs/. */
function repositoryFiles(): string[] {
	return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
		cwd: ROOT,
		encoding: "utf8",
	})
		.split("\0")
		.filter((file) => file && !file.startsWith("specs/"));
}

/** Each version citation in a text file, as `path:line`, with the document and version it names. */
async function citations(): Promise<Array<{ at: string; document: string; version: string }>> {
	const found: Array<{ at: string; document: string; version: string }> = [];
	for (const file of repositoryFiles()) {
		const bytes = await readFile(new URL(file, ROOT));
		if (bytes.includes(0)) continue;
		bytes
			.toString("utf8")
			.split("\n")
			.forEach((line, index) => {
				for (const [, document, version] of line.matchAll(CITATION)) {
					found.push({ at: `${file}:${index + 1}`, document, version });
				}
			});
	}
	return found;
}

/** A current document's Version line, or undefined when no such document exists. */
async function versionOf(document: string): Promise<string | undefined> {
	try {
		return VERSION_LINE.exec(await readFile(new URL(`${document}.md`, CURRENT), "utf8"))?.[1];
	} catch {
		return undefined;
	}
}

describe("DESIGN.md's own version", () => {
	it("is the version of its newest change-history entry", async () => {
		const design = await readFile(new URL("docs/design/DESIGN.md", ROOT), "utf8");
		const status = /^> \*\*Status:\*\* v(\d+\.\d+)/m.exec(design)?.[1];
		assert.ok(status, "DESIGN.md states its version in its Status line");
		// The history's entries open with "- **v1.2 …", oldest first (#244 retro: a v1.3 entry under
		// a v1.2 Status line).
		const entries = [...design.matchAll(/^- \*\*v(\d+\.\d+)\b/gm)].map(([, version]) => version);
		assert.equal(entries.at(-1), status);
	});
});

/**
 * The ticket a branch builds, from its name (docs/agents/issue-tracker.md "Branches"):
 * `feat/<feature>-<ticket>-<slug>` or, standalone, `feat/<ticket>-<slug>`. A retro's or any other
 * branch builds none.
 */
function ticketOfBranch(branch: string): string | undefined {
	return /^feat\/(?:\d{3}-)?(\d+)-/.exec(branch)?.[1];
}

/**
 * What DESIGN.md lacks for `ticket`: its Updated line naming it, a change-history entry naming it.
 */
function missingFor(design: string, ticket: string): string[] {
	const named = new RegExp(`#${ticket}\\b`);
	const updated = /^> \*\*Updated:\*\*.*$/m.exec(design)?.[0] ?? "";
	const entries = design.match(/^- \*\*v\d+\.\d+\b.*$/gm) ?? [];
	return [
		...(named.test(updated) ? [] : [`the Updated line names #${ticket}`]),
		...(entries.some((entry) => named.test(entry)) ? [] : [`a §13 entry names #${ticket}`]),
	];
}

describe("DESIGN.md amended on a ticket's branch", () => {
	it("names the ticket in its Updated line and a change-history entry when a commit stages it", async () => {
		// CODING_STANDARDS "Documents", Amendments (#286 retro: neither reached the commit, and the
		// review found both). CI stages nothing, so there the check holds by itself.
		const git = (...args: string[]) =>
			execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
		const staged = git("diff", "--cached", "--name-only").split("\n");
		const ticket = ticketOfBranch(git("rev-parse", "--abbrev-ref", "HEAD"));
		if (!staged.includes("docs/design/DESIGN.md") || ticket === undefined) return;
		const design = await readFile(new URL("docs/design/DESIGN.md", ROOT), "utf8");
		assert.deepEqual(missingFor(design, ticket), []);
	});

	it("reads the ticket from a feature's or a standalone ticket's branch, and none from another", () => {
		assert.equal(ticketOfBranch("feat/009-286-topic-chips-photos-heading"), "286");
		assert.equal(ticketOfBranch("feat/276-built-reveal"), "276");
		assert.equal(ticketOfBranch("chore/009-retro-286"), undefined);
		assert.equal(ticketOfBranch("009-news-post-redesign"), undefined);
		assert.equal(ticketOfBranch("main"), undefined);
	});

	it("finds a missing Updated line or entry, and a ticket whose number only starts another", () => {
		const design = (updated: string, entry: string) =>
			`> **Updated:** 2026-11-14 (Feature 009 ${updated})\n\n- **v1.3 x (2026-11-14, Feature 009 ${entry}):** y\n`;
		assert.deepEqual(missingFor(design("#286", "#286"), "286"), []);
		assert.deepEqual(missingFor(design("#284", "#286"), "286"), ["the Updated line names #286"]);
		assert.deepEqual(missingFor(design("#286", "#284"), "286"), ["a §13 entry names #286"]);
		assert.deepEqual(missingFor(design("#2861", "#2861"), "286"), [
			"the Updated line names #286",
			"a §13 entry names #286",
		]);
	});
});

describe("a feature's decision banner", () => {
	it("stands once in each current document and in DESIGN.md", async () => {
		// A feature amends a document under one banner and one version bump; a later ticket of the
		// feature keeps that banner (CODING_STANDARDS "Documents", Amendments; #247 retro: a second
		// "Feature 008 decision" banner and a second bump reached review).
		const documents = repositoryFiles().filter(
			(file) =>
				file === "docs/design/DESIGN.md" ||
				(file.startsWith("docs/website-modernization-docs/current/") && file.endsWith(".md")),
		);
		assert.ok(documents.length > 1, "the current documents are found");
		const repeated: string[] = [];
		for (const file of documents) {
			const text = await readFile(new URL(file, ROOT), "utf8");
			const features = [...text.matchAll(/^> \*\*Feature (\d+) decision/gm)].map(([, n]) => n);
			for (const feature of new Set(features)) {
				if (features.filter((n) => n === feature).length > 1) {
					repeated.push(`${file}: Feature ${feature}`);
				}
			}
		}
		assert.deepEqual(repeated, []);
	});
});

describe("versions cited for the current documents", () => {
	it("finds the versions DESIGN.md cites", async () => {
		assert.ok((await citations()).some(({ at }) => at.startsWith("docs/design/DESIGN.md:")));
	});

	it("match each cited document's Version line", async () => {
		const stale: string[] = [];
		for (const { at, document, version } of await citations()) {
			const current = await versionOf(document);
			if (current !== version) {
				stale.push(
					`${at} cites ${document}.md v${version}; its Version is ${current ?? "missing"}`,
				);
			}
		}
		assert.deepEqual(stale, []);
	});
});
