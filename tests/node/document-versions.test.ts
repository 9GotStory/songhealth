// Versions cited for the current documents (#127 retro).
//
// A file that names the version of a current document it was checked against, as DESIGN.md names
// the Homepage and Sitemap versions its contract follows, goes stale when that document is
// amended: in #127, DESIGN.md §8 kept the old versions while its §12 was updated. Each cited
// version must be the document's own Version line, so amending a current document also brings
// back every file that cites its version. The Feature 001 and 002 records in specs/ are left out.

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
