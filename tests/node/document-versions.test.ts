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

/** The feature a feature's ticket branch builds, `feat/<feature>-<ticket>-<slug>`, as "010". */
function featureOfBranch(branch: string): string | undefined {
	return /^feat\/(\d{3})-\d+-/.exec(branch)?.[1];
}

/**
 * What DESIGN.md lacks for a ticket of `feature`: a version of the feature's own in its Status
 * line, which no change-history entry of another feature carries (CODING_STANDARDS "Documents",
 * Amendments; #312 retro: Feature 010's first ticket kept Feature 009's v1.3, and the review found
 * it).
 */
function versionMissingFor(design: string, feature: string): string[] {
	const status = /^> \*\*Status:\*\* v(\d+\.\d+)/m.exec(design)?.[1];
	const others = (design.match(/^- \*\*v\d+\.\d+\b.*$/gm) ?? []).filter(
		(entry) =>
			entry.startsWith(`- **v${status} `) &&
			/Feature \d{3}\b/.test(entry) &&
			!entry.includes(`Feature ${feature}`),
	);
	return others.length === 0 ? [] : [`a version of Feature ${feature}'s own, not v${status}`];
}

/**
 * What DESIGN.md lacks for `ticket`: its Updated line naming it, a change-history entry naming it.
 */
function missingFor(design: string, ticket: string): string[] {
	const named = new RegExp(`#${ticket}\\b`);
	const updated = /^> \*\*Updated:\*\*.*$/m.exec(design)?.[0] ?? "";
	// An entry runs on over its indented lines, where Prettier can wrap the ticket's number (#339
	// retro).
	const entries = design.match(/^- \*\*v\d+\.\d+\b.*(?:\n {2,}\S.*)*/gm) ?? [];
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
		const branch = git("rev-parse", "--abbrev-ref", "HEAD");
		const ticket = ticketOfBranch(branch);
		if (!staged.includes("docs/design/DESIGN.md") || ticket === undefined) return;
		const design = await readFile(new URL("docs/design/DESIGN.md", ROOT), "utf8");
		const feature = featureOfBranch(branch);
		assert.deepEqual(
			[...missingFor(design, ticket), ...(feature ? versionMissingFor(design, feature) : [])],
			[],
		);
	});

	it("reads the ticket from a feature's or a standalone ticket's branch, and none from another", () => {
		assert.equal(ticketOfBranch("feat/009-286-topic-chips-photos-heading"), "286");
		assert.equal(ticketOfBranch("feat/276-built-reveal"), "276");
		assert.equal(ticketOfBranch("chore/009-retro-286"), undefined);
		assert.equal(ticketOfBranch("009-news-post-redesign"), undefined);
		assert.equal(ticketOfBranch("main"), undefined);
	});

	it("finds a missing Updated line or entry, reads an entry over its wrapped lines, and passes over a ticket whose number only starts another", () => {
		const design = (updated: string, entry: string) =>
			`> **Updated:** 2026-11-14 (Feature 009 ${updated})\n\n- **v1.3 x (2026-11-14, Feature 009 ${entry}):** y\n`;
		assert.deepEqual(missingFor(design("#286", "#286"), "286"), []);
		assert.deepEqual(missingFor(design("#284", "#286"), "286"), ["the Updated line names #286"]);
		assert.deepEqual(missingFor(design("#286", "#284"), "286"), ["a §13 entry names #286"]);
		assert.deepEqual(missingFor(design("#286", "\n  #286"), "286"), []);
		assert.deepEqual(
			missingFor(`> **Updated:** #286\n\n- **v1.3 x:** y\n\n#286 in another paragraph\n`, "286"),
			["a §13 entry names #286"],
		);
		assert.deepEqual(missingFor(design("#2861", "#2861"), "286"), [
			"the Updated line names #286",
			"a §13 entry names #286",
		]);
	});
});

describe("DESIGN.md's version on a feature's ticket branch", () => {
	it("reads the feature from a feature's ticket branch only", () => {
		assert.equal(featureOfBranch("feat/010-312-list-heading"), "010");
		assert.equal(featureOfBranch("feat/298-focal-point"), undefined);
		assert.equal(featureOfBranch("chore/010-retro-312"), undefined);
	});

	it("finds a Status version that another feature's entry carries", () => {
		const design = (status: string, entries: string[]) =>
			`> **Status:** v${status} (x)\n\n${entries.map((entry) => `- **${entry}:** y`).join("\n")}\n`;
		const f009 = "v1.3 a (2026-11-13, Feature 009 #281)";
		const standalone = "v1.3 b (2026-11-15, #298)";
		assert.deepEqual(
			versionMissingFor(
				design("1.3", [f009, standalone, "v1.3 c (2026-11-15, Feature 010 #312)"]),
				"010",
			),
			["a version of Feature 010's own, not v1.3"],
		);
		assert.deepEqual(
			versionMissingFor(
				design("1.4", [f009, standalone, "v1.4 c (2026-11-15, Feature 010 #312)"]),
				"010",
			),
			[],
		);
		assert.deepEqual(
			versionMissingFor(design("1.3", [f009, "v1.3 d (Feature 009 #282)"]), "009"),
			[],
		);
	});
});

/**
 * The banner of Feature `feature` in DESIGN.md, its quoted lines up to the first line outside the
 * quote, or undefined while the feature has none.
 */
function bannerOf(design: string, feature: string): string | undefined {
	return new RegExp(`^> \\*\\*Feature ${feature} decision.*(?:\\n>.*)*`, "m").exec(design)?.[0];
}

/**
 * What a commit on a ticket's branch of `feature` does wrong to the feature's banner: it changes
 * the banner `before` had, unless the ticket is the one `rewrite` names, the feature's hand-off
 * ticket (CODING_STANDARDS "Documents", Amendments).
 */
function bannerChangedFor(
	before: string,
	after: string,
	feature: string,
	ticket: string,
	rewrite: string | undefined,
): string[] {
	const banner = bannerOf(before, feature);
	if (banner === undefined || rewrite === ticket || bannerOf(after, feature) === banner) return [];
	return [
		`#${ticket} changes Feature ${feature}'s banner: its decisions go into §13, and the hand-off ticket commits its rewrite with SONGHEALTH_BANNER_REWRITE=<ticket>`,
	];
}

describe("Feature banner on a feature's ticket branch", () => {
	it("stays as HEAD has it when a commit stages DESIGN.md", async () => {
		// #366 and #367 each added a sentence to Feature 012's banner, and only #370's review read
		// the rule (#370 retro). CI stages nothing, so there the check holds by itself.
		const git = (...args: string[]) =>
			execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
		const staged = git("diff", "--cached", "--name-only").split("\n");
		const branch = git("rev-parse", "--abbrev-ref", "HEAD");
		const [ticket, feature] = [ticketOfBranch(branch), featureOfBranch(branch)];
		if (!staged.includes("docs/design/DESIGN.md") || !ticket || !feature) return;
		const before = git("show", "HEAD:docs/design/DESIGN.md");
		const after = await readFile(new URL("docs/design/DESIGN.md", ROOT), "utf8");
		const rewrite = process.env.SONGHEALTH_BANNER_REWRITE;
		assert.deepEqual(bannerChangedFor(before, after, feature, ticket, rewrite), []);
	});

	it("finds a changed banner, and passes a new banner, an unchanged one and the hand-off's rewrite", () => {
		const design = (banner: string) =>
			`> **Status:** v1.6\n\n> **Feature 011 decision:** a\n\n${banner}\n\nBody text.\n`;
		const banner = "> **Feature 012 decision (PO):** the pages\n> are redesigned.";
		const added = "> **Feature 012 decision (PO):** the pages\n> are redesigned. And Personnel.";
		assert.equal(bannerOf(design(banner), "012"), banner);
		assert.equal(bannerOf(design(banner), "013"), undefined);
		assert.deepEqual(bannerChangedFor(design(banner), design(added), "012", "370", undefined), [
			"#370 changes Feature 012's banner: its decisions go into §13, and the hand-off ticket commits its rewrite with SONGHEALTH_BANNER_REWRITE=<ticket>",
		]);
		assert.deepEqual(bannerChangedFor(design(banner), design(banner), "012", "370", undefined), []);
		assert.deepEqual(bannerChangedFor(design(""), design(banner), "012", "366", undefined), []);
		assert.deepEqual(bannerChangedFor(design(banner), design(added), "012", "372", "372"), []);
		assert.deepEqual(
			bannerChangedFor(design(banner), design(added), "012", "370", "372").length,
			1,
		);
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
