// What the migration script's verify command checks of a target (#178; spec #174 "The migration
// script"): the plan's entries, files, pages and redirects against what the target holds and how
// it answers. scripts/migration.ts makes the reads; this module imports nothing at run time, so
// node:test drives what the shared development runtime cannot produce, such as a redirect that
// answers 302 (CODING_STANDARDS "Tests").

import type { ImportPlan } from "./import-plan.ts";
import type { Target } from "./writer.ts";

export interface VerifyInput {
	planned: ImportPlan;
	/** The entries of the planned collections, outside the trash. */
	entries: Target["entries"];
	media: Target["media"];
	folders: Target["folders"];
	/** The importing Administrator's user ID. */
	owner: string;
	/** Each planned file's content hash, as EmDash writes one, by its attachment. */
	hashes: Map<number, string>;
	/** How the target answers a GET of `path`, without following a redirect. */
	request: (path: string) => Promise<{ status: number; location: string | null }>;
}

interface VerifyReport {
	/** The planned entries found, and all the published entries the collection holds. */
	entries: Record<string, { planned: number; found: number; inCollection: number }>;
	files: { planned: number; inLibrary: number; inFolder: number };
	pages: { planned: number; passed: number };
	redirects: { planned: number; passed: number };
	failures: string[];
}

/** An address's path: a `Location` may be written absolute or site-relative. */
const pathOf = (location: string) => new URL(location, "http://target.invalid").pathname;

/** The time of an ISO 8601 instant, so that two ways of writing one compare equal. */
const timeOf = (instant: string | null) => (instant === null ? Number.NaN : Date.parse(instant));

/**
 * The report of a target checked against the plan: no failure means it holds what the plan wrote.
 */
export async function verifyTarget({
	planned,
	entries,
	media,
	folders,
	owner,
	hashes,
	request,
}: VerifyInput): Promise<VerifyReport> {
	const failures: string[] = [];
	const live = new Map(entries.map((entry) => [`${entry.collection}/${entry.slug}`, entry]));
	const entryCounts: VerifyReport["entries"] = {};
	for (const { collection, slug, publishedAt } of planned.entries) {
		const count = (entryCounts[collection] ??= {
			planned: 0,
			found: 0,
			inCollection: entries.filter(
				(entry) => entry.collection === collection && entry.status === "published",
			).length,
		});
		count.planned++;
		const name = `${collection}/${slug}`;
		const entry = live.get(name);
		if (entry === undefined) {
			failures.push(`${name}: not found`);
			continue;
		}
		count.found++;
		if (entry.status !== "published") failures.push(`${name}: its status is ${entry.status}`);
		if (timeOf(entry.publishedAt) !== timeOf(publishedAt)) {
			failures.push(`${name}: published at ${entry.publishedAt}, not ${publishedAt}`);
		}
		if (entry.authorId !== owner) {
			failures.push(`${name}: owned by ${entry.authorId}, not the importing Administrator`);
		}
	}
	const libraryHashes = new Set(media.map((item) => item.contentHash));
	const folderIds = new Map(folders.map((folder) => [folder.name, folder.id]));
	const files = {
		planned: planned.files.length + planned.report.missing.length,
		inLibrary: 0,
		inFolder: 0,
	};
	for (const { attachment, filename, folder } of planned.files) {
		const hash = hashes.get(attachment);
		if (hash === undefined || !libraryHashes.has(hash)) {
			failures.push(`file ${attachment} (${filename}) is not in the Media Library`);
			continue;
		}
		files.inLibrary++;
		const item = media.find((candidate) => candidate.contentHash === hash)!;
		if (item.folderId != null && item.folderId === folderIds.get(folder)) files.inFolder++;
	}
	for (const { attachment, path, usedBy } of planned.report.missing) {
		const name = path ?? `attachment ${attachment}`;
		failures.push(`${name}, used by ${usedBy.join(", ")}, is not in the uploads copy`);
	}
	const pageStatus = new Map<string, number>();
	const pages = { planned: planned.entries.length, passed: 0 };
	for (const { page } of planned.entries) {
		const { status } = await request(page);
		pageStatus.set(page, status);
		if (status === 200) pages.passed++;
		else failures.push(`${page} answers ${status}`);
	}
	const redirects = { planned: planned.redirects.length, passed: 0 };
	for (const { source, destination } of planned.redirects) {
		const { status, location } = await request(source);
		const reached = location === null ? null : pathOf(location);
		if (status !== 301) {
			failures.push(`${source} answers ${status}, not 301`);
		} else if (reached !== destination) {
			failures.push(`${source} goes to ${reached}, not ${destination}`);
		} else if (pageStatus.get(destination) !== 200) {
			failures.push(`${source} goes to ${destination}, which does not answer 200`);
		} else {
			redirects.passed++;
		}
	}
	return { entries: entryCounts, files, pages, redirects, failures };
}
