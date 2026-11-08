// The Legacy site's migration script (#177, #178; spec #174 "The migration script"; ADR 0008):
// temporary tooling, which leaves the repository with its tests when WordPress is retired.
//
//   node scripts/migration.ts plan <export.xml> <wp-content.zip>
//   node scripts/migration.ts import <export.xml> <wp-content.zip> <target> [--final]
//   node scripts/migration.ts verify <export.xml> <wp-content.zip> <target>
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
// news stream to one origin through EmDash's native APIs (scripts/migration/import-plan.ts says
// what it writes, scripts/migration/writer.ts writes it). It acts as the Administrator whose API
// token is in the 0600 file --token-file names, on the development runtime
// ~/.local/state/songhealth-qdev/dev-pat, and never prints the token. Without --final it is a
// trial, which takes a row still ต้องเลือก at its default and lists it. It refuses a final run while
// any row is ต้องเลือก, a list that lacks an item of the export, and a row with no default (exit 1),
// and stops before it writes anything if a target slug or a legacy redirect exists or a term is
// missing (exit 1). A write the target refuses stops the run where it is (exit 1): restore the
// backup taken before it. It writes import-report.json beside the export: the inputs' digests, the
// counts, the rows taken at their default and what it could not carry.
//
// verify checks a target against the same plan, read as a trial reads it: the counts, that each
// redirect answers one 301 to a page that answers 200, that every used file is in the Media
// Library, that every page answers 200, and that each entry is published with its legacy date and
// belongs to the Administrator. It writes verify-report.json beside the export, and exits 1 on a
// failure.

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, realpath, rename, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import { parseArgs } from "node:util";

import { firstStop, planImport, type ImportPlan } from "./migration/import-plan.ts";
import { blocksOf, readLegacySite } from "./migration/legacy-site.ts";
import { plan, TO_CHOOSE } from "./migration/plan.ts";
import { verifyTarget } from "./migration/verify.ts";
import { administrator, applyImport, readTarget, scrubSecrets } from "./migration/writer.ts";
import { openZip, readZipNames, type Zip } from "./migration/zip.ts";

const USAGE = `usage: node scripts/migration.ts plan <export.xml> <wp-content.zip>
       node scripts/migration.ts import <export.xml> <wp-content.zip> --origin <url> --token-file <file> [--final]
       node scripts/migration.ts verify <export.xml> <wp-content.zip> --origin <url> --token-file <file>`;

/** The files the commands write into the export's folder. */
const LIST_FILE = "classification-list.csv";
const INVENTORY_FILE = "inventory.json";
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
	{ exportPath, final }: TargetOptions,
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
	});
}

/** Each planned collection with how many entries it holds. */
const entryCounts = (planned: ImportPlan) =>
	Object.fromEntries(
		[...new Set(planned.entries.map((entry) => entry.collection))].map((collection) => [
			collection,
			planned.entries.filter((entry) => entry.collection === collection).length,
		]),
	);

async function importCommand(options: TargetOptions): Promise<number> {
	const { exportPath, zipPath, origin, tokenFile, final } = options;
	const folder = await exportFolder(exportPath);
	if (folder === undefined) return 2;
	const zip = await openZip(zipPath);
	try {
		const planned = await importPlanOf(folder, options, zip);
		const admin = await administrator(origin, tokenFile);
		const target = await readTarget(admin, planned);
		const stop = firstStop(planned, target);
		if (stop !== undefined) {
			console.error(`import: stopped before writing anything: ${stop}`);
			return 1;
		}
		const { uploaded, reused } = await applyImport(admin, planned, target, zip);
		const { missing, atDefault } = planned.report;
		const entries = entryCounts(planned);
		const report = {
			run: final ? "final" : "trial",
			origin,
			export: await digestOf(exportPath),
			uploads: await digestOf(zipPath),
			list: await digestOf(join(folder, LIST_FILE)),
			entries,
			pictures: {
				used: planned.pictures.length + missing.length,
				uploaded,
				reused,
				missing: missing.length,
			},
			redirects: planned.redirects.length,
			...planned.report,
		};
		const reportPath = join(folder, IMPORT_REPORT_FILE);
		await replaceFile(reportPath, `${JSON.stringify(report, null, "\t")}\n`);
		console.log(`Import report: ${reportPath}`);
		console.log(`Run: ${report.run}, into ${origin}`);
		console.log(`Entries: ${JSON.stringify(entries)}`);
		console.log(`Pictures: ${JSON.stringify(report.pictures)}`);
		console.log(`Redirects: ${report.redirects}`);
		console.log(`Rows taken at their default: ${listed(atDefault.map(({ slug }) => slug))}`);
		console.log(`Notes: ${planned.report.notes.length} (in the report)`);
		return 0;
	} finally {
		await zip.close();
	}
}

async function verifyCommand(options: TargetOptions): Promise<number> {
	const { exportPath, zipPath, origin, tokenFile } = options;
	const folder = await exportFolder(exportPath);
	if (folder === undefined) return 2;
	const zip = await openZip(zipPath);
	try {
		const planned = await importPlanOf(folder, options, zip);
		const admin = await administrator(origin, tokenFile);
		const target = await readTarget(admin, planned);
		// EmDash's content hash: `sha1:` and the file's SHA-1 in hex (emdash 1.1.0
		// src/utils/hash.ts computeContentHash).
		const hashes = new Map<number, string>();
		for (const { attachment, path } of planned.pictures) {
			hashes.set(
				attachment,
				`sha1:${createHash("sha1")
					.update(await zip.read(path))
					.digest("hex")}`,
			);
		}
		const result = await verifyTarget({
			planned,
			entries: target.entries.filter((entry) => !entry.trashed),
			media: target.media,
			folders: target.folders,
			owner: admin.userId,
			hashes,
			request: async (path) => {
				const response = await fetch(new URL(path, origin), { redirect: "manual" });
				await response.arrayBuffer();
				return { status: response.status, location: response.headers.get("location") };
			},
		});
		const reportPath = join(folder, VERIFY_REPORT_FILE);
		const report = {
			origin,
			export: await digestOf(exportPath),
			uploads: await digestOf(zipPath),
			list: await digestOf(join(folder, LIST_FILE)),
			...result,
		};
		await replaceFile(reportPath, `${JSON.stringify(report, null, "\t")}\n`);
		console.log(`Verify report: ${reportPath}`);
		console.log(`Entries: ${JSON.stringify(result.entries)}`);
		console.log(`Pictures: ${JSON.stringify(result.pictures)}`);
		console.log(`Pages: ${JSON.stringify(result.pages)}`);
		console.log(`Redirects: ${JSON.stringify(result.redirects)}`);
		for (const failure of result.failures) console.log(`FAIL ${failure}`);
		console.log(`VERIFY: ${result.failures.length === 0 ? "PASS" : "FAIL"}`);
		return result.failures.length === 0 ? 0 : 1;
	} finally {
		await zip.close();
	}
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
			},
		});
	} catch {
		return undefined;
	}
	const { origin, "token-file": tokenFile, final } = parsed.values;
	const [command, exportPath, zipPath, ...others] = parsed.positionals;
	if (exportPath === undefined || zipPath === undefined || others.length > 0) return undefined;
	if (command === "plan" && origin === undefined && tokenFile === undefined && !final) {
		return () => planCommand(exportPath, zipPath);
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
			`${args[0]}: ${scrubSecrets(error instanceof Error ? error.message : String(error))}`,
		);
		return 1;
	}
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
