// The migration script's leak check (#179 retro; spec #174 "What makes a good test": no Legacy site
// content in the repository; seam A). Every export here is synthetic.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { addedLinesOf, leaksIn } from "../../scripts/migration/leak-check.ts";
import type { LegacyItem, LegacySite } from "../../scripts/migration/legacy-site.ts";
import {
	SITE,
	attachment,
	directive,
	runMigration,
	runMigrationIn,
	wxrDocument,
} from "./migration.helpers.ts";

const NAME = "qZ3xW-1700000000.pdf";

/** A title, a label or an alt text just long enough to name something: 16 characters. */
const LONG = "ประกาศเรื่องสมมุติยาว".slice(0, 16);

/** The same text a character shorter, as common words are. */
const SHORT = LONG.slice(0, 15);

function item(slug: string, fields: Partial<LegacyItem> = {}): LegacyItem {
	return {
		type: "directive",
		id: 1,
		slug,
		title: "",
		status: "publish",
		published: undefined,
		modified: undefined,
		tags: [],
		categories: [],
		featured: undefined,
		pictures: [],
		files: [],
		content: "",
		editor: "",
		...fields,
	};
}

const siteOf = (site: Partial<LegacySite>): LegacySite => ({
	items: [],
	attachments: [],
	pages: [],
	...site,
});

const inTests = (...lines: string[]) => [{ file: "tests/node/x.test.ts", lines }];

describe("the leak check", () => {
	const named = siteOf({
		attachments: [
			{ id: 4, url: `${SITE}/wp-content/uploads/2025/03/${NAME}`, alt: "", caption: "" },
		],
	});

	it("finds an attachment's file name in a line a commit adds, and names the attachment", () => {
		assert.deepEqual(leaksIn(named, inTests(`path: "wp-content/${NAME}",`)), [
			{ file: "tests/node/x.test.ts", what: "the file name of attachment 4" },
		]);
	});

	it("says nothing of a line that holds none of the export's strings", () => {
		assert.deepEqual(leaksIn(named, inTests('path: "wp-content/notice.pdf",')), []);
	});

	it("finds a title, a long label, an alt text and a caption", () => {
		const site = siteOf({
			items: [
				item("directive-1", {
					title: `${LONG} ชื่อ`,
					files: [{ id: 9, label: `${LONG} ป้าย` }],
				}),
			],
			attachments: [{ id: 5, url: `${SITE}/a.webp`, alt: `${LONG} ภาพ`, caption: `${LONG} คำ` }],
		});
		assert.deepEqual(
			leaksIn(
				site,
				inTests(
					`title: "${LONG} ชื่อ"`,
					`label: "${LONG} ป้าย"`,
					`alt: "${LONG} ภาพ"`,
					`caption: "${LONG} คำ"`,
				),
			).map(({ what }) => what),
			[
				"the title of directive-1",
				"a label of directive-1",
				"the alt text of attachment 5",
				"the caption of attachment 5",
			],
		);
	});

	it("takes a text of 16 characters as naming something, and one of 15 as common words", () => {
		const longer = siteOf({ items: [item("directive-1", { files: [{ id: 9, label: LONG }] })] });
		const shorter = siteOf({ items: [item("directive-1", { files: [{ id: 9, label: SHORT }] })] });
		assert.equal(leaksIn(longer, inTests(LONG)).length, 1);
		assert.deepEqual(leaksIn(shorter, inTests(SHORT)), []);
	});

	it("says nothing of a public institution's name an export text equals, and still finds a longer text that holds it", () => {
		const ministry = "กระทรวงสาธารณสุข";
		const site = siteOf({
			attachments: [{ id: 6, url: `${SITE}/a.webp`, alt: ministry, caption: `${ministry} สมมุติ` }],
		});
		assert.deepEqual(leaksIn(site, inTests(`affiliation: "จังหวัดสมมุติ · ${ministry}"`)), []);
		assert.deepEqual(leaksIn(site, inTests(`caption: "${ministry} สมมุติ"`)), [
			{ file: "tests/node/x.test.ts", what: "the caption of attachment 6" },
		]);
	});

	it("reads a file name percent-encoded in the export as the uploads copy names it", () => {
		const encoded = siteOf({
			attachments: [
				{
					id: 6,
					url: `${SITE}/wp-content/uploads/${encodeURIComponent("เอกสารสมมุติ.pdf")}`,
					alt: "",
					caption: "",
				},
			],
		});
		assert.equal(leaksIn(encoded, inTests("เอกสารสมมุติ.pdf")).length, 1);
	});

	it("reports a string once for each file that holds it", () => {
		const added = [
			{ file: "tests/node/a.test.ts", lines: [NAME, NAME] },
			{ file: "scripts/b.ts", lines: [NAME] },
		];
		assert.deepEqual(leaksIn(named, added), [
			{ file: "tests/node/a.test.ts", what: "the file name of attachment 4" },
			{ file: "scripts/b.ts", what: "the file name of attachment 4" },
		]);
	});

	it("finds a file name as the export's address writes it, percent-encoded", () => {
		const encoded = encodeURIComponent("เอกสารสมมุติ.pdf");
		const site = siteOf({
			attachments: [{ id: 6, url: `${SITE}/wp-content/${encoded}`, alt: "", caption: "" }],
		});
		assert.equal(leaksIn(site, inTests(`url: "${SITE}/wp-content/${encoded}"`)).length, 1);
	});

	it("takes a file name of 10 characters as naming something, and one of 9 as common", () => {
		const siteNamed = (name: string) =>
			siteOf({ attachments: [{ id: 7, url: `${SITE}/wp-content/${name}`, alt: "", caption: "" }] });
		assert.equal(leaksIn(siteNamed("abcdef.pdf"), inTests("my-abcdef.pdf")).length, 1);
		assert.deepEqual(leaksIn(siteNamed("abcde.pdf"), inTests("my-abcde.pdf")), []);
	});

	it("reads no research note, which may name a real item on purpose, and every other path", () => {
		const research = [{ file: "docs/research/legacy-ita.md", lines: [NAME] }];
		assert.deepEqual(leaksIn(named, research), []);
		for (const file of ["docs/prototypes/x.html", "specs/005/x.md", "tests/docs/research/x.ts"]) {
			assert.equal(leaksIn(named, [{ file, lines: [NAME] }]).length, 1, file);
		}
	});
});

describe("the lines a commit adds", () => {
	it("are a diff's added lines, by file", () => {
		const diff = [
			"diff --git a/tests/x.ts b/tests/x.ts",
			"index 1..2 100644",
			"--- a/tests/x.ts",
			"+++ b/tests/x.ts",
			"@@ -1 +1 @@",
			"-removed",
			"+added one",
			"@@ -9 +9,2 @@",
			"+added two",
			"+++ a line that starts with two plus signs",
			"diff --git a/scripts/y.ts b/scripts/y.ts",
			"--- a/scripts/y.ts",
			"+++ b/scripts/y.ts",
			"@@ -0,0 +1 @@",
			"+added three",
			"",
		].join("\n");
		assert.deepEqual(addedLinesOf(diff), [
			{
				file: "tests/x.ts",
				lines: ["added one", "added two", "++ a line that starts with two plus signs"],
			},
			{ file: "scripts/y.ts", lines: ["added three"] },
		]);
	});

	it("read a path git quotes, whatever characters it holds", () => {
		const diff = [
			'diff --git "a/tests/we\\"ird.ts" "b/tests/we\\"ird.ts"',
			'--- "a/tests/we\\"ird.ts"',
			'+++ "b/tests/we\\"ird.ts"',
			"@@ -0,0 +1 @@",
			"+added",
			"",
		].join("\n");
		assert.deepEqual(
			addedLinesOf(diff).map(({ lines }) => lines),
			[["added"]],
		);
	});

	it("are none for a deleted file, and none for an empty diff", () => {
		const deleted = [
			"diff --git a/tests/x.ts b/tests/x.ts",
			"deleted file mode 100644",
			"--- a/tests/x.ts",
			"+++ /dev/null",
			"@@ -1 +0,0 @@",
			"-gone",
			"",
		].join("\n");
		assert.deepEqual(addedLinesOf(deleted), []);
		assert.deepEqual(addedLinesOf(""), []);
	});
});

describe("the leak-check command", () => {
	const git = (cwd: string, ...args: string[]) => spawnSync("git", args, { cwd, encoding: "utf8" });
	const synthetic = () =>
		wxrDocument([
			attachment(11, `wp-content/uploads/2025/03/${NAME}`),
			directive(1, { title: `${LONG} ชื่อเรื่อง`, meta: {} }),
		]);

	/** Runs the command in a new repository holding `text` staged at `path`, under git settings. */
	async function staged(text: string, path = "tests/x.ts", settings: string[][] = []) {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-leak-check-test-"));
		try {
			const exportFile = join(folder, "export.xml");
			await writeFile(exportFile, synthetic());
			const repository = join(folder, "repository");
			await mkdir(join(repository, "tests"), { recursive: true });
			git(repository, "init", "--quiet");
			for (const setting of settings) git(repository, "config", ...setting);
			await writeFile(join(repository, path), text);
			git(repository, "add", path);
			return runMigrationIn(repository, "leak-check", exportFile);
		} finally {
			await rm(folder, { recursive: true });
		}
	}

	it("stops on a staged line that holds the export's file name, without printing it", async () => {
		const { status, stderr, stdout } = await staged(`export const path = "${NAME}";\n`);
		assert.equal(status, 1);
		assert.match(stderr, /tests\/x\.ts: the file name of attachment 11/);
		assert.equal(`${stdout}${stderr}`.includes(NAME), false);
	});

	it("stops whatever prefixes the clone's git settings give a diff", async () => {
		for (const setting of [
			["diff.noprefix", "true"],
			["diff.mnemonicPrefix", "true"],
		]) {
			const { status } = await staged(`export const path = "${NAME}";\n`, "tests/x.ts", [setting]);
			assert.equal(status, 1, setting[0]);
		}
	});

	it("stops on a staged file named after the export's file, even a binary one", async () => {
		const { status, stderr } = await staged("\0binary", `tests/${NAME}`);
		assert.equal(status, 1);
		assert.match(stderr, /a staged file's name: the file name of attachment 11/);
		assert.equal(stderr.includes(NAME), false);
	});

	it("passes staged lines that hold none of its strings", async () => {
		const { status, stderr } = await staged('export const path = "notice.pdf";\n');
		assert.equal(status, 0, stderr);
	});

	/** Runs the command on files holding `texts`, in a folder no repository holds. */
	async function named(...texts: string[]) {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-leak-check-test-"));
		try {
			const exportFile = join(folder, "export.xml");
			await writeFile(exportFile, synthetic());
			const files = texts.map((_, index) => join(folder, `note-${index}.md`));
			await Promise.all(files.map((file, index) => writeFile(file, texts[index]!)));
			return runMigrationIn(folder, "leak-check", exportFile, ...files);
		} finally {
			await rm(folder, { recursive: true });
		}
	}

	it("stops on a named file that holds the export's strings, without printing them", async () => {
		const { status, stderr, stdout } = await named("Nothing here.\n", `It quotes ${NAME}.\n`);
		assert.equal(status, 1);
		assert.match(stderr, /note-1\.md: the file name of attachment 11/);
		assert.equal(stderr.includes("note-0.md"), false);
		assert.equal(`${stdout}${stderr}`.includes(NAME), false);
	});

	it("passes named files that hold none of its strings, with no staged lines to read", async () => {
		const { status, stderr } = await named("Nothing here.\n", "Nor here.\n");
		assert.equal(status, 0, stderr);
	});

	it("needs the export", () => {
		const { status, stderr } = runMigration("leak-check");
		assert.equal(status, 2);
		assert.match(stderr, /usage/);
	});

	/**
	 * Runs the command with --tree in a new repository whose one commit holds `files`, by path, after
	 * `change` has changed the working tree, from the repository's folder `from`.
	 */
	async function tree(
		files: Record<string, string>,
		change: (repository: string) => Promise<void> = async () => {},
		from = ".",
	) {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-leak-check-test-"));
		try {
			const exportFile = join(folder, "export.xml");
			await writeFile(exportFile, synthetic());
			const repository = join(folder, "repository");
			for (const [path, text] of Object.entries(files)) {
				await mkdir(dirname(join(repository, path)), { recursive: true });
				await writeFile(join(repository, path), text);
			}
			git(repository, "init", "--quiet");
			git(repository, "add", ".");
			const author = ["-c", "user.name=test", "-c", "user.email=test@songhealth.invalid"];
			git(repository, ...author, "commit", "--quiet", "--no-verify", "--message", "the tree");
			await change(repository);
			return runMigrationIn(join(repository, from), "leak-check", exportFile, "--tree");
		} finally {
			await rm(folder, { recursive: true });
		}
	}

	it("with --tree, stops on a file the tree already holds, from any folder of the repository", async () => {
		const { status, stderr, stdout } = await tree(
			{ "scripts/old.ts": `export const path = "${NAME}";\n`, "tests/x.ts": "// nothing\n" },
			undefined,
			"tests",
		);
		assert.equal(status, 1);
		assert.match(stderr, /^scripts\/old\.ts: the file name of attachment 11$/m);
		assert.equal(stderr.includes("tests/x.ts"), false);
		assert.equal(`${stdout}${stderr}`.includes(NAME), false);
	});

	it("with --tree, still reads the staged changes, and names a file once for a string", async () => {
		const { status, stderr } = await tree({ "tests/x.ts": "// nothing\n" }, async (repository) => {
			await writeFile(join(repository, "tests/new.ts"), `export const path = "${NAME}";\n`);
			await writeFile(join(repository, `tests/${NAME}`), "\0binary");
			git(repository, "add", ".");
		});
		assert.equal(status, 1);
		assert.equal(stderr.split("tests/new.ts: the file name of attachment 11").length - 1, 1);
		assert.match(stderr, /a staged file's name: the file name of attachment 11/);
	});

	it("with --tree, passes a tree that holds none of its strings", async () => {
		const { status, stderr } = await tree({
			"scripts/old.ts": 'export const path = "notice.pdf";\n',
			"docs/note.md": "Nothing here.\n",
		});
		assert.equal(status, 0, stderr);
	});

	it("with --tree, passes over a file the working tree no longer holds", async () => {
		const { status, stderr } = await tree(
			{ "scripts/old.ts": `export const path = "${NAME}";\n`, "tests/x.ts": "// nothing\n" },
			(repository) => rm(join(repository, "scripts/old.ts")),
		);
		assert.equal(status, 0, stderr);
	});

	it("with --tree, lets a research note name a real item, as a staged one may", async () => {
		const { status, stderr } = await tree({ "docs/research/legacy.md": `It names ${NAME}.\n` });
		assert.equal(status, 0, stderr);
	});

	it("takes --tree alone: with a file, or on another command, it is a wrong use", async () => {
		const folder = await mkdtemp(join(tmpdir(), "songhealth-leak-check-test-"));
		try {
			const exportFile = join(folder, "export.xml");
			await writeFile(exportFile, synthetic());
			for (const args of [
				["leak-check", exportFile, "--tree", exportFile],
				["plan", exportFile, join(folder, "wp-content.zip"), "--tree"],
			]) {
				const { status, stderr } = runMigrationIn(folder, ...args);
				assert.equal(status, 2, args.join(" "));
				assert.match(stderr, /usage/);
			}
		} finally {
			await rm(folder, { recursive: true });
		}
	});
});
