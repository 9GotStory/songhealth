// What the migration script's verify command checks of a target (#178, #179 retro, #181; spec #174
// "The migration script"): the plan's entries, files, pages and redirects against what the target
// holds and how it answers, and what an Announcement's and a Document's page offers people.
// scripts/migration.ts makes the reads; this module imports only the planning modules at run time,
// so node:test drives what the shared development runtime cannot produce, such as a redirect that
// answers 302 (CODING_STANDARDS "Tests").

import type { ImportPlan, PlannedRedirect } from "./import-plan.ts";
import type { Target } from "./writer.ts";

export interface VerifyInput {
	planned: ImportPlan;
	/** The entries of the planned collections, outside the trash. */
	entries: Target["entries"];
	media: Target["media"];
	folders: Target["folders"];
	/** The importing Administrator's user ID. */
	owner: string;
	/**
	 * The attachments the import's report lists as reused: EmDash answers such an upload with the
	 * item it holds, which stays in its folder (emdash 1.1.0 src/astro/routes/api/media.ts).
	 */
	reused: Set<number>;
	/** Each planned file's content hash, as EmDash writes one, by its attachment. */
	hashes: Map<number, string>;
	/** How the target answers a GET of `path`, without following a redirect. */
	request: (path: string) => Promise<{ status: number; location: string | null; body: string }>;
}

interface VerifyReport {
	/** The planned entries found, and all the published entries the collection holds. */
	entries: Record<string, { planned: number; found: number; inCollection: number }>;
	files: { planned: number; inLibrary: number; inFolder: number };
	pages: { planned: number; passed: number };
	redirects: { planned: number; passed: number };
	/** The redirects to a page staff have not yet written, neither passed nor failed. */
	pending: PlannedRedirect[];
	/** The file whose direct address answers 404, since those addresses are not redirected. */
	directFiles: { planned: number; passed: number };
	/** The Announcements whose page lists their Documents in the planned order. */
	lists: { planned: number; passed: number };
	/** The Documents whose page offers their file under its uploaded name. */
	downloads: { planned: number; passed: number };
	/** The MOITs whose page shows all their Evidence, each file of it able to be served. */
	moits: { planned: number; passed: number };
	/** The fiscal years whose page lists all their MOITs. */
	years: { planned: number; passed: number };
	failures: string[];
}

/**
 * The new address that answers 404 until staff publish its Basic Page
 * (src/pages/about/organization.astro), so a redirect to it is pending, not failed (#181).
 */
const WRITTEN_BY_STAFF = "/about/organization";

/** An address's path: a `Location` may be written absolute or site-relative. */
const pathOf = (location: string) => new URL(location, "http://target.invalid").pathname;

/** The time of an ISO 8601 instant, so that two ways of writing one compare equal. */
const timeOf = (instant: string | null) => (instant === null ? Number.NaN : Date.parse(instant));

/**
 * The slugs of the Documents a page lists in its related Documents section, in its order
 * (src/components/RelatedDocuments.astro, src/components/DetailSection.astro,
 * src/components/DocumentRow.astro).
 */
function listedDocuments(html: string): string[] {
	const section = /id="related-documents"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
	return [...section.matchAll(/href="\/documents\/([^"#?]+)"/g)].map(([, slug]) =>
		decodeURIComponent(slug!),
	);
}

/**
 * The name a page's download link gives its file (src/components/DocumentDownload.astro). Astro
 * writes `&` and `"` in an attribute as entities (astro 7.3.5
 * dist/runtime/server/render/util.js toAttributeString).
 */
const offeredFilename = (html: string) =>
	/<a\b[^>]*\bdownload="([^"]*)"/
		.exec(html)?.[1]
		?.replaceAll("&quot;", '"')
		.replaceAll("&amp;", "&");

/**
 * How much Evidence a MOIT's page says it holds, and whether it says a file cannot be served
 * (src/components/MoitPage.astro).
 */
const evidenceShown = (html: string) => ({
	count: /หลักฐาน (\d+) รายการ/.exec(html)?.[1],
	unavailable: html.includes("ไฟล์ที่ไม่พร้อมให้บริการ"),
});

/** The pieces of Evidence among a planned MOIT's blocks, its Requirements left aside. */
const plannedEvidence = (data: Record<string, unknown>) =>
	(data.evidence as { _type: string }[]).filter(({ _type }) => _type !== "ita_requirement").length;

/** The slugs a fiscal year's page links to (src/components/ItaYearPage.astro). */
const listedMoits = (html: string) =>
	new Set(
		[...html.matchAll(/href="\/ita\/([^"#?]+)"/g)].map(([, slug]) => decodeURIComponent(slug!)),
	);

/**
 * The last line of the report. A redirect waiting for a page is no failure, and this line counts
 * them for whoever reads only the verdict at cutover (#181 retro).
 */
export const verdictOf = ({ failures, pending }: VerifyReport) =>
	`VERIFY: ${failures.length === 0 ? "PASS" : "FAIL"}${
		pending.length === 0 ? "" : `, redirects waiting for a page staff write: ${pending.length}`
	}`;

/**
 * The report of a target checked against the plan: no failure means it holds what the plan wrote.
 */
export async function verifyTarget({
	planned,
	entries,
	media,
	folders,
	owner,
	reused,
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
		else if (!reused.has(attachment)) {
			failures.push(`file ${attachment} (${filename}) is not in the folder ${folder}`);
		}
	}
	for (const { attachment, path, usedBy } of planned.report.missing) {
		const name = path ?? `attachment ${attachment}`;
		failures.push(`${name}, used by ${usedBy.join(", ")}, is not in the uploads copy`);
	}
	const pageStatus = new Map<string, number>();
	const pages = { planned: planned.entries.length, passed: 0 };
	const lists = {
		planned: planned.entries.filter((e) => e.collection === "announcements").length,
		passed: 0,
	};
	const downloads = {
		planned: planned.entries.filter((e) => e.collection === "documents").length,
		passed: 0,
	};
	const moitEntries = planned.entries.filter((e) => e.collection === "moit");
	const moits = { planned: moitEntries.length, passed: 0 };
	for (const { page, collection, documents, data } of planned.entries) {
		const { status, body } = await request(page);
		pageStatus.set(page, status);
		if (status !== 200) {
			failures.push(`${page} answers ${status}`);
			continue;
		}
		pages.passed++;
		if (collection === "announcements") {
			const listed = listedDocuments(body);
			const asPlanned = documents ?? [];
			if (listed.join() === asPlanned.join()) lists.passed++;
			else {
				const named = (slugs: string[]) => slugs.join(", ") || "no Document";
				failures.push(`${page} lists ${named(listed)}, not ${named(asPlanned)}`);
			}
		}
		if (collection === "documents") {
			// scripts/migration/writer.ts saves the media item the upload answers, and for a file
			// EmDash reused that item keeps the first upload's name (emdash 1.1.0
			// src/astro/routes/api/media.ts). The link is what is checked, not the bytes behind it, which
			// the Media Library's content hash covers (Product Owner, #179 comment 6722228048, item 2).
			const hash = hashes.get((data.file as { fileField: number }).fileField);
			const expected = media.find((item) => item.contentHash === hash)?.filename;
			const offered = offeredFilename(body);
			if (offered !== undefined && offered === expected) downloads.passed++;
			else
				failures.push(
					`${page} offers ${offered ?? "no file"}, not ${expected ?? "a library file"}`,
				);
		}
		if (collection === "moit") {
			const { count, unavailable } = evidenceShown(body);
			const expected = plannedEvidence(data);
			if (count === undefined || Number(count) !== expected) {
				failures.push(`${page} shows ${count ?? "no"} pieces of Evidence, not ${expected}`);
			} else if (unavailable) {
				failures.push(`${page} has a file that cannot be served`);
			} else {
				moits.passed++;
			}
		}
	}
	const slugsOfYear = new Map<number, string[]>();
	for (const { slug, data } of moitEntries) {
		const year = data.fiscal_year as number;
		slugsOfYear.set(year, [...(slugsOfYear.get(year) ?? []), slug]);
	}
	const years = { planned: slugsOfYear.size, passed: 0 };
	for (const [year, slugs] of slugsOfYear) {
		const path = `/ita/${year}`;
		const { status, body } = await request(path);
		pageStatus.set(path, status);
		if (status !== 200) {
			failures.push(`${path} answers ${status}`);
			continue;
		}
		const listed = listedMoits(body);
		const absent = slugs.filter((slug) => !listed.has(slug));
		if (absent.length === 0) years.passed++;
		else failures.push(`${path} does not list ${absent.join(", ")}`);
	}
	const redirects = { planned: planned.redirects.length, passed: 0 };
	const pending: VerifyReport["pending"] = [];
	for (const { source, destination } of planned.redirects) {
		const { status, location } = await request(source);
		const reached = location === null ? null : pathOf(location);
		if (status !== 301) {
			failures.push(`${source} answers ${status}, not 301`);
			continue;
		}
		if (reached !== destination) {
			failures.push(`${source} goes to ${reached}, not ${destination}`);
			continue;
		}
		// A page's redirect goes to an address no entry or fiscal year has already requested.
		if (!pageStatus.has(destination)) {
			pageStatus.set(destination, (await request(destination)).status);
		}
		const answer = pageStatus.get(destination);
		if (answer === 200) redirects.passed++;
		else if (answer === 404 && destination === WRITTEN_BY_STAFF) {
			pending.push({ source, destination });
		} else {
			failures.push(`${source} goes to ${destination}, which does not answer 200`);
		}
	}
	const [directFile] = planned.files;
	const directFiles = { planned: directFile === undefined ? 0 : 1, passed: 0 };
	if (directFile !== undefined) {
		const address = `/${directFile.path.split("/").map(encodeURIComponent).join("/")}`;
		const { status } = await request(address);
		if (status === 404) directFiles.passed++;
		else failures.push(`${address} answers ${status}, not 404`);
	}
	return {
		entries: entryCounts,
		files,
		pages,
		redirects,
		pending,
		directFiles,
		lists,
		downloads,
		moits,
		years,
		failures,
	};
}
