// The Legacy site's migration script (#177, #178, #179, #180; spec #174 "The migration script";
// ADR 0008): temporary tooling, which leaves the repository with its tests when WordPress is
// retired.
//
//   node scripts/migration.ts plan <export.xml> <wp-content.zip>
//   node scripts/migration.ts import <export.xml> <wp-content.zip> <target> [--final]
//   node scripts/migration.ts import <export.xml> <wp-content.zip> --dry-run [--final]
//   node scripts/migration.ts verify <export.xml> <wp-content.zip> <target>
//   node scripts/migration.ts leak-check <export.xml>
//
// where <target> is `--origin <url> --token-file <file>`.
//
// plan reads the WXR export of the whole Legacy site and the zip of its `wp-content` folder, and
// writes two files into the export's folder, which must lie outside the repository:
// classification-list.csv, the Classification list, and inventory.json, the inventory. It prints
// where, with the list's counts. A classification-list.csv already in that folder is the earlier
// list: plan merges with it and writes the merged list in its place. plan refuses an export inside
// the repository (exit 2), and stops without writing anything on a list it cannot merge (exit 1).
// Neither file carries an author, an item's author, a draft or any type the migration does not
// read, such as the form plugin's submission (scripts/migration/legacy-site.ts).
//
// The Classification list (GLOSSARY) is UTF-8 CSV with a byte order mark, so that a spreadsheet
// opens its Thai, and one row per published news stream item (`public-new`), directive and
// procurement notice, drafts being not migrated (#177 comment 6719251511, item 2): the news
// stream, then directives, then procurement notices, each oldest first. Its columns:
//
// - legacy_type: public-new, directive or procurement.
// - slug: the legacy slug, such as news-154.
// - wp_id: the WordPress ID, by which a merge matches rows.
// - title: the legacy title.
// - published: the legacy publish date, as the Bangkok calendar day, such as 2025-10-01.
// - fiscal_year: the fiscal year of that day, October to September, such as 2569. Staff write a
//   Summary for each News and Activity of the current fiscal year (spec #174, Q6).
// - categories: the legacy categories' names, in code point order, joined by "; ".
// - flags: hints for reviewers, separated by spaces:
//   - title-word: a กิจกรรม item whose title holds เชิญชวน, ขอเชิญ or ประชาสัมพันธ์;
//   - no-category: the item has no category;
//   - unmatched-categories: its categories name no default;
//   - pm25: it carries the legacy category PM 2.5;
//   - text: its ACF editor or its block editor holds text, which becomes a News body or an
//     Activity's Summary;
//   - no-file: a directive or procurement notice names no file;
//   - missing-file: it uses a file that the uploads copy lacks, or an attachment the export lacks;
//   - not-in-export: the export no longer holds the item, and the row stays as reviewers left it.
// - default_target: News, Activity, Announcement, Document, or ต้องเลือก for a row a reviewer
//   decides (spec #174 "Mapping"):
//   - a news stream item in กิจกรรม is an Activity, or ต้องเลือก with title-word; in
//     ประชาสัมพันธ์, with or without PM 2.5, or without a category, it is News;
//   - a directive in คำสั่ง is a Document, and one in ประกาศ an Announcement;
//   - a procurement notice is an Announcement;
//   - any other categories are ต้องเลือก.
//   A trial import takes a title-word row at its category's default, an Activity; an
//   unmatched-categories row has none (spec #174 "The migration script").
// - default_type: the term slug of the Announcement's type or the Document's (spec #174 "Model
//   changes"): procurement (จัดซื้อจัดจ้าง) for a procurement notice; recruitment (รับสมัครงาน) for a
//   directive in ประกาศ whose title holds รับสมัคร, สรรหา or ลูกจ้าง, and general (ประกาศทั่วไป) for
//   the others; order (คำสั่ง) for a directive in คำสั่ง.
// - decision: empty, or the reviewer's target, which replaces default_target: News or Activity
//   for the news stream, Announcement or Document for the others, or ต้องเลือก.
// - decision_type: empty, or the term slug that replaces default_type. A decision that changes the
//   target drops default_type, so such a row carries only the type decision_type names (spec #174:
//   only an order carries a type), and plan names an Announcement left without one. plan does not
//   check the slug against the terms, which only the target runtime holds.
// - summary: empty, or the Summary staff wrote.
//
// A merge keeps each row's decision, decision_type and summary, and any column reviewers added,
// and writes every other cell again from the export. It appends the export's new items with their
// defaults, and keeps a row whose item the export no longer holds, flagged not-in-export. It
// refuses a list without one of the columns above, with a WordPress ID twice, or saved in another
// encoding than UTF-8.
//
// The inventory (scripts/migration/plan.ts Inventory) counts the items by type and status, the
// published items by category, and the attachments used and unused; it lists the missing files,
// reports the list as plan left it, and records the SHA-256 of the export and the zip.
//
// import reads the export, the zip and the Classification list beside the export, and writes the
// news stream, directives, procurement notices and ITA posts to one origin through EmDash's native
// APIs (scripts/migration/import-plan.ts and scripts/migration/moit-plan.ts say what it writes,
// scripts/migration/writer.ts writes it). A file anom-001.pdf beside the export, the office's copy
// of ANOM-001's document, is uploaded for it; without that file the MOIT links the document's
// official source. It acts as the Administrator whose API token is in the 0600 file --token-file
// names, on the development runtime ~/.local/state/songhealth-qdev/dev-pat, and never prints the
// token. Without --final it is a trial, which takes a row still ต้องเลือก at its default and lists
// it. A final run refuses while any row is ต้องเลือก. Any run refuses a list that lacks an item of
// the export, a row with no default, an order with no file to make its Document from, and a slug it
// would make twice (exit 1), and stops before it writes anything if a target slug or a legacy
// redirect exists or a term is missing (exit 1). A write the target refuses stops the run where it
// is (exit 1): restore the backup taken before it. It writes import-report.json beside the export:
// the inputs' digests, the counts, the rows taken at their default and what it could not carry.
//
// import --dry-run stops after the plan: it needs no token and reaches no target, and writes
// import-plan.json beside the export, the same each time, with the counts import would print. It
// shows a window's numbers before the window. Keep a copy from before a window: a later commit that
// writes the same file plans the same import, though a change to the writer still needs a window.
//
// verify checks a target against the same plan, read as a trial reads it: the counts, that each
// redirect answers one 301 to a page that answers 200, that every used file is in the Media
// Library, that every page answers 200, that each entry is published with its legacy date and
// belongs to the Administrator, that an Announcement's page lists its Documents in the planned
// order, that a Document's page offers its file under its uploaded name, that a MOIT's page shows
// all its Evidence with every file able to be served, and that a fiscal year's page lists its
// MOITs. It writes verify-report.json beside the export, and exits 1 on a failure.
//
// leak-check reads the lines the staged changes add and stops (exit 1) when one holds a file name,
// a title, a label, an alt text or a caption of the export, naming the file and the item without
// repeating the string: fixtures are made up (spec #174), and the repository's history is public.
// .githooks/pre-commit runs it wherever the export exists, which CI's checkout does not hold.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import { parseArgs } from "node:util";

import { scrubEmbeddedSecrets } from "../tests/browser/cms.helpers.ts";
import { firstStop, planImport, type ImportPlan } from "./migration/import-plan.ts";
import { addedLinesOf, leaksIn } from "./migration/leak-check.ts";
import { blocksOf, computeContentHash, readLegacySite } from "./migration/legacy-site.ts";
import { ANOM_001_FILE } from "./migration/moit-plan.ts";
import { plan, TO_CHOOSE } from "./migration/plan.ts";
import { verifyTarget } from "./migration/verify.ts";
import { administrator, applyImport, readTarget, type Target } from "./migration/writer.ts";
import { openZip, readZipNames, withFileBeside, type Zip } from "./migration/zip.ts";

const USAGE = `usage: node scripts/migration.ts plan <export.xml> <wp-content.zip>
       node scripts/migration.ts import <export.xml> <wp-content.zip> --origin <url> --token-file <file> [--final]
       node scripts/migration.ts import <export.xml> <wp-content.zip> --dry-run [--final]
       node scripts/migration.ts verify <export.xml> <wp-content.zip> --origin <url> --token-file <file>
       node scripts/migration.ts leak-check <export.xml>`;

/** The files the commands write into the export's folder. */
const LIST_FILE = "classification-list.csv";
const INVENTORY_FILE = "inventory.json";
const IMPORT_PLAN_FILE = "import-plan.json";
const IMPORT_REPORT_FILE = "import-report.json";
const VERIFY_REPORT_FILE = "verify-report.json";

/** The repository, which the export and everything made from it stay out of (ADR 0008). */
const REPOSITORY = new URL("..", import.meta.url);

/** Whether `path` is `folder` or lies inside it; both are absolute. */
export function isInside(path: string, folder: string): boolean {
	const route = relative(folder, path);
	return route.split(sep)[0] !== ".." && !isAbsolute(route);
}

/** A file's SHA-256, read as a stream, since the uploads copy is 1.3 GB. */
async function sha256Of(path: string): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
	return hash.digest("hex");
}

/** Writes `text` over `path` through a temporary file, so that a failed write keeps the old one. */
async function replaceFile(path: string, text: string): Promise<void> {
	await writeFile(`${path}.tmp`, text);
	await rename(`${path}.tmp`, path);
}

/** "none", or the count and the names. */
const listed = (names: string[]) =>
	names.length === 0 ? "none" : `${names.length}: ${names.join(", ")}`;

/** The export's folder, or none when it lies inside the repository, which the command refuses. */
async function exportFolder(exportPath: string): Promise<string | undefined> {
	const folder = await realpath(dirname(exportPath));
	if (!isInside(folder, await realpath(REPOSITORY))) return folder;
	console.error(
		`${folder} is inside the repository: the export and what the script writes stay out of it`,
	);
	return undefined;
}

/** The text of the list at `listPath`, or none when it does not exist. */
async function readList(listPath: string): Promise<string | undefined> {
	const bytes = await readFile(listPath).catch((error: NodeJS.ErrnoException) => {
		if (error.code === "ENOENT") return undefined;
		throw error;
	});
	try {
		// A spreadsheet can save Thai in another code page, which a lenient read would turn into
		// U+FFFD, losing the Summaries without a word.
		return bytes && new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new Error(
			`the earlier list is not UTF-8: save ${listPath} as CSV UTF-8 and run plan again`,
		);
	}
}

async function planCommand(exportPath: string, zipPath: string): Promise<number> {
	const folder = await exportFolder(exportPath);
	if (folder === undefined) return 2;
	const xml = await readFile(exportPath);
	const listPath = join(folder, LIST_FILE);
	const result = plan({
		site: await readLegacySite(xml.toString("utf8")),
		uploads: await readZipNames(zipPath),
		earlierList: await readList(listPath),
	});
	const inventory = {
		export: { file: basename(exportPath), sha256: createHash("sha256").update(xml).digest("hex") },
		...result.inventory,
		uploads: {
			file: basename(zipPath),
			sha256: await sha256Of(zipPath),
			...result.inventory.uploads,
		},
	};
	const inventoryPath = join(folder, INVENTORY_FILE);
	await replaceFile(listPath, result.list);
	await replaceFile(inventoryPath, `${JSON.stringify(inventory, null, "\t")}\n`);
	const { list, attachments, missing } = result.inventory;
	console.log(`Classification list: ${listPath} (${list.rows} rows)`);
	console.log(`Inventory: ${inventoryPath}`);
	console.log(
		`Targets: ${Object.entries(list.targets)
			.map(([target, rows]) => `${target} ${rows}`)
			.join(", ")}`,
	);
	console.log(`Rows still "${TO_CHOOSE}": ${listed(list.toChoose)}`);
	if (list.unreadable.length > 0) {
		const decisions = list.unreadable.map(({ slug, decision }) => `${slug} "${decision}"`);
		console.log(`Decisions plan cannot read: ${listed(decisions)}`);
	}
	if (list.untyped.length > 0) {
		console.log(`Announcements without a type: ${listed(list.untyped)}`);
	}
	if (list.merged) {
		console.log(`Rows added to the earlier list: ${listed(list.added)}`);
		console.log(`Items no longer in the export: ${listed(list.vanished)}`);
	} else {
		console.log("No earlier list: every row starts at its default.");
	}
	console.log(
		`Attachments used: ${attachments.used} of ${attachments.total}; missing files: ${listed(missing.map(({ id }) => String(id)))}`,
	);
	return 0;
}

/** A file's name and SHA-256, as a report records its inputs. */
const digestOf = async (path: string) => ({ file: basename(path), sha256: await sha256Of(path) });

/** What import and verify take from the command line. */
interface TargetOptions {
	exportPath: string;
	zipPath: string;
	origin: string;
	tokenFile: string;
	final: boolean;
}

/** The plan of the export and the list beside it. Reads no credential and reaches no target. */
async function importPlanOf(
	folder: string,
	{ exportPath, final }: Pick<TargetOptions, "exportPath" | "final">,
	zip: Zip,
): Promise<ImportPlan> {
	const listPath = join(folder, LIST_FILE);
	const list = await readList(listPath);
	if (list === undefined) throw new Error(`no Classification list at ${listPath}: run plan first`);
	return planImport({
		site: await readLegacySite(await readFile(exportPath, "utf8")),
		uploads: zip.names,
		list,
		final,
		toBlocks: blocksOf,
		hasOfficeFile: await access(join(folder, ANOM_001_FILE)).then(
			() => true,
			() => false,
		),
		fingerprintOf: zip.fingerprintOf,
	});
}

/** What a command on a target works from. */
interface TargetRun {
	folder: string;
	zip: Zip;
	planned: ImportPlan;
	admin: Awaited<ReturnType<typeof administrator>>;
	target: Target;
}

/**
 * Runs `work` on the plan of the export and the state of its target, with the uploads copy open.
 * The plan comes first, so a refusal needs no credential and reaches no target.
 */
async function onTarget(
	options: TargetOptions,
	work: (run: TargetRun) => Promise<number>,
): Promise<number> {
	const folder = await exportFolder(options.exportPath);
	if (folder === undefined) return 2;
	const zip = await openZip(options.zipPath);
	try {
		const planned = await importPlanOf(folder, options, zip);
		const admin = await administrator(options.origin, options.tokenFile);
		return await work({
			folder,
			zip: withFileBeside(zip, ANOM_001_FILE, join(folder, ANOM_001_FILE)),
			planned,
			admin,
			target: await readTarget(admin, planned),
		});
	} finally {
		await zip.close();
	}
}

/** The digests of a run's three inputs, as each report records them. */
const inputsOf = async (folder: string, { exportPath, zipPath }: TargetOptions) => ({
	export: await digestOf(exportPath),
	uploads: await digestOf(zipPath),
	list: await digestOf(join(folder, LIST_FILE)),
});

/** Prints what a plan holds, beside the files' line that import and a dry run word apart. */
function printPlan({ redirects, report: { groups, atDefault, notes } }: ImportPlan) {
	console.log(`Items: ${JSON.stringify(groups)}`);
	console.log(`Redirects: ${redirects.length}`);
	console.log(`Rows taken at their default: ${listed(atDefault.map(({ slug }) => slug))}`);
	console.log(`Notes: ${notes.length} (in the report)`);
}

async function dryRunCommand(
	options: Pick<TargetOptions, "exportPath" | "zipPath" | "final">,
): Promise<number> {
	const folder = await exportFolder(options.exportPath);
	if (folder === undefined) return 2;
	const zip = await openZip(options.zipPath);
	try {
		const planned = await importPlanOf(folder, options, zip);
		const planPath = join(folder, IMPORT_PLAN_FILE);
		await replaceFile(planPath, `${JSON.stringify(planned, null, "\t")}\n`);
		console.log(`Import plan: ${planPath}`);
		const { missing } = planned.report;
		console.log(
			`Files: ${JSON.stringify({ used: planned.files.length + missing.length, missing: missing.length })}`,
		);
		printPlan(planned);
		return 0;
	} finally {
		await zip.close();
	}
}

const importCommand = (options: TargetOptions) =>
	onTarget(options, async ({ folder, zip, planned, admin, target }) => {
		const stop = firstStop(planned, target);
		if (stop !== undefined) {
			console.error(`import: stopped before writing anything: ${stop}`);
			return 1;
		}
		const { uploaded, reused } = await applyImport(admin, planned, target, zip);
		const { missing } = planned.report;
		const report = {
			run: options.final ? "final" : "trial",
			origin: options.origin,
			...(await inputsOf(folder, options)),
			files: {
				used: planned.files.length + missing.length,
				uploaded,
				reused: reused.length,
				missing: missing.length,
			},
			redirects: planned.redirects.length,
			...planned.report,
			reused: reused.map(({ attachment, filename }) => ({ attachment, filename })),
		};
		const reportPath = join(folder, IMPORT_REPORT_FILE);
		await replaceFile(reportPath, `${JSON.stringify(report, null, "\t")}\n`);
		console.log(`Import report: ${reportPath}`);
		console.log(`Run: ${report.run}, into ${options.origin}`);
		console.log(`Files: ${JSON.stringify(report.files)}`);
		printPlan(planned);
		return 0;
	});

const verifyCommand = (options: TargetOptions) =>
	onTarget(options, async ({ folder, zip, planned, admin, target }) => {
		const hashes = new Map<number, string>();
		for (const { attachment, path } of planned.files) {
			hashes.set(attachment, await computeContentHash(await zip.read(path)));
		}
		const result = await verifyTarget({
			planned,
			entries: target.entries.filter((entry) => !entry.trashed),
			media: target.media,
			folders: target.folders,
			owner: admin.userId,
			hashes,
			request: async (path) => {
				const response = await fetch(new URL(path, options.origin), { redirect: "manual" });
				const body = await response.text();
				return { status: response.status, location: response.headers.get("location"), body };
			},
		});
		const reportPath = join(folder, VERIFY_REPORT_FILE);
		const report = { origin: options.origin, ...(await inputsOf(folder, options)), ...result };
		await replaceFile(reportPath, `${JSON.stringify(report, null, "\t")}\n`);
		console.log(`Verify report: ${reportPath}`);
		console.log(`Entries: ${JSON.stringify(result.entries)}`);
		console.log(`Files: ${JSON.stringify(result.files)}`);
		console.log(`Pages: ${JSON.stringify(result.pages)}`);
		console.log(`Redirects: ${JSON.stringify(result.redirects)}`);
		console.log(`Announcements listing their Documents: ${JSON.stringify(result.lists)}`);
		console.log(`Documents offering their file: ${JSON.stringify(result.downloads)}`);
		console.log(`MOITs showing their Evidence: ${JSON.stringify(result.moits)}`);
		console.log(`Fiscal years listing their MOITs: ${JSON.stringify(result.years)}`);
		for (const failure of result.failures) console.log(`FAIL ${failure}`);
		console.log(`VERIFY: ${result.failures.length === 0 ? "PASS" : "FAIL"}`);
		return result.failures.length === 0 ? 0 : 1;
	});

async function leakCheckCommand(exportPath: string): Promise<number> {
	const staged = (...options: string[]) =>
		execFileSync("git", ["-c", "core.quotePath=false", "diff", "--cached", ...options], {
			encoding: "utf8",
			maxBuffer: 1024 ** 3,
		});
	// Named prefixes, so that a clone's diff.noprefix or diff.mnemonicPrefix changes nothing here.
	const lines = staged(
		"--unified=0",
		"--no-color",
		"--no-ext-diff",
		"--src-prefix=a/",
		"--dst-prefix=b/",
	);
	const names = staged("--name-only", "-z", "--diff-filter=ACR").split("\0").filter(Boolean);
	const site = await readLegacySite(await readFile(exportPath, "utf8"));
	const leaks = leaksIn(site, [
		...addedLinesOf(lines),
		...names.map((name) => ({ file: "a staged file's name", lines: [name] })),
	]);
	for (const { file, what } of leaks) console.error(`${file}: ${what}`);
	if (leaks.length > 0)
		console.error("leak-check: make these up: fixtures hold no Legacy site content");
	return leaks.length === 0 ? 0 : 1;
}

/** The command the arguments name, or none when they are wrong. */
function commandOf(args: string[]): (() => Promise<number>) | undefined {
	let parsed;
	try {
		parsed = parseArgs({
			args,
			allowPositionals: true,
			options: {
				origin: { type: "string" },
				"token-file": { type: "string" },
				final: { type: "boolean", default: false },
				"dry-run": { type: "boolean", default: false },
			},
		});
	} catch {
		return undefined;
	}
	const { origin, "token-file": tokenFile, final, "dry-run": dryRun } = parsed.values;
	const [command, exportPath, zipPath, ...others] = parsed.positionals;
	const noTarget = origin === undefined && tokenFile === undefined;
	const noOptions = noTarget && !final && !dryRun;
	if (command === "leak-check" && exportPath !== undefined && zipPath === undefined && noOptions) {
		return () => leakCheckCommand(exportPath);
	}
	if (exportPath === undefined || zipPath === undefined || others.length > 0) return undefined;
	if (command === "plan" && noOptions) return () => planCommand(exportPath, zipPath);
	if (dryRun) {
		return command === "import" && noTarget
			? () => dryRunCommand({ exportPath, zipPath, final })
			: undefined;
	}
	if (origin === undefined || tokenFile === undefined) return undefined;
	const options = { exportPath, zipPath, origin, tokenFile, final };
	if (command === "import") return () => importCommand(options);
	if (command === "verify" && !final) return () => verifyCommand(options);
	return undefined;
}

async function main(args: string[]): Promise<number> {
	const command = commandOf(args);
	if (command === undefined) {
		console.error(USAGE);
		return 2;
	}
	try {
		return await command();
	} catch (error) {
		console.error(
			`${args[0]}: ${scrubEmbeddedSecrets(error instanceof Error ? error.message : String(error))}`,
		);
		return 1;
	}
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
