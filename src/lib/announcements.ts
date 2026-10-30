// Announcements on the public site (Feature 003 #56; spec #51 "Public reads" (Announcements),
// `03` §15).
//
// Every read is a `getEmDashCollection` read, which returns published entries only, even with a
// preview token or in edit mode, so pages pass no status (docs/agents/emdash-1.1.0.md "Public
// reads"). The list shows current Announcements first, then closed ones, each newest first by
// announcement date, falling back to the publication. EmDash cannot sort that way, so the list
// reads every published Announcement (a query without a `limit` has none: emdash 1.1.0
// src/loader.ts `fetchLimit`) and sorts it in src/lib/dated-lists.ts (ADR 0004), which also holds
// the current-or-closed rule and the status an Announcement states: not open yet, open or closed,
// by the Bangkok day (Product Owner, 2026-10-29).

import {
	getEmDashCollection,
	type ContentEntry,
	type PortableTextBlock,
	type TaxonomyTerm,
} from "emdash";
import {
	announcementStatus,
	isCurrent,
	listDate,
	listPage,
	newestFirst,
	type AnnouncementStatus,
	type Instant,
	type ListPage,
} from "./dated-lists";

export type { AnnouncementStatus };

/** The fixed number of Announcements a list page shows. */
const ANNOUNCEMENTS_PAGE_SIZE = 20;

/** The Announcements list's title, also its crumb on each Announcement page. */
export const ANNOUNCEMENTS_TITLE = "ประกาศ";

/** The Announcements list's address. */
export const ANNOUNCEMENTS_PATH = "/announcements";

/** Each Announcement status as citizens read it, in text (spec #51 "Public reads"). */
export const STATUS_LABELS: Record<AnnouncementStatus, string> = {
	upcoming: "ยังไม่เปิด",
	open: "เปิดอยู่",
	closed: "ปิดแล้ว",
};

/** An Announcement's fields (seed/seed.json) and the system fields public pages read. */
export interface AnnouncementData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	details?: PortableTextBlock[] | null;
	announcement_at?: Instant;
	opens_at?: Instant;
	closes_at?: Instant;
	publishedAt?: Instant;
	/** Taxonomy terms hydrated by the query functions, by taxonomy name. */
	terms?: Record<string, TaxonomyTerm[]>;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

export type AnnouncementEntry = ContentEntry<AnnouncementData>;

/**
 * An Announcement's canonical address, `/announcements/{slug}` (`03` §15), encoded as EmDash
 * encodes it.
 */
export function announcementPath(slug: string): string {
	return `${ANNOUNCEMENTS_PATH}/${encodeURIComponent(slug)}`;
}

/** The date an Announcement is listed by: its announcement date, else its publication. */
export function announcementDate(data: AnnouncementData): Instant {
	return listDate(data.announcement_at, data.publishedAt);
}

/** The status the Announcement states at `now`, or none without open and close dates. */
export function statusOf(data: AnnouncementData, now: Date): AnnouncementStatus | undefined {
	return announcementStatus(data.opens_at, data.closes_at, now);
}

/** Whether the Announcement is closed at `now`: its close date has passed in Bangkok. */
function isClosed(data: AnnouncementData, now: Date): boolean {
	return !isCurrent(data.closes_at, now);
}

/** One page of published Announcements at `now`: the current ones first, then the closed ones. */
export async function listAnnouncements(
	page: number,
	now: Date,
): Promise<ListPage<AnnouncementEntry>> {
	const { entries, error } = await getEmDashCollection<"announcements", AnnouncementData>(
		"announcements",
		{ orderBy: { published_at: "desc" } },
	);
	if (error) throw error;
	const ordered = newestFirst(entries, (data) => data.announcement_at);
	return listPage(
		[
			...ordered.filter((entry) => !isClosed(entry.data, now)),
			...ordered.filter((entry) => isClosed(entry.data, now)),
		],
		page,
		ANNOUNCEMENTS_PAGE_SIZE,
	);
}
