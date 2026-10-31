// The Homepage's curated sections, read through EmDash (Feature 003 #65; spec #51 "Homepage
// (`04`, Figma order)", approved Q11): the Featured item, the Frequently Used Services and the
// Quick Access shortcuts that staff pick in three native menus. src/lib/homepage-menus.ts holds the
// rules of which items show.
//
// Each menu is read with getMenu, and each item's address is mapped back to its entry with
// EmDash's resolveEmDashPath, which finds an entry only while it is published (emdash 1.1.0
// src/query.ts; docs/agents/emdash-1.1.0.md "Menus"). That resolution ignores a failed read of the
// entry, so such an item is left out like an unpublished one, while a failed menu read throws as
// the page's other reads do.
//
// A closed Announcement has expired, so it is not Featured and the next item is (`04` §5; #51 user
// story 20): the Homepage keeps closed Announcements off, as its Announcements do.

import { getMenu, resolveEmDashPath, type ContentEntry, type PortableTextBlock } from "emdash";
import { activityPath } from "./activities";
import { announcementPath, detailsExcerpt, isClosed } from "./announcements";
import type { Instant } from "./dated-lists";
import { healthContentPath } from "./health-content";
import { healthReportPath } from "./health-reports";
import {
	HOMEPAGE_MENUS,
	featuredItem,
	frequentServices,
	quickAccessLinks,
	type FeaturedCollection,
	type QuickAccessLink,
	type ResolvePath,
} from "./homepage-menus";
import { newsPath, type ImageFieldValue } from "./news";
import { servicePath } from "./service-catalog";
import type { ServiceData } from "./services";

/** The fields the Homepage reads of a curated entry, whichever kind it is (seed/seed.json). */
interface CuratedData extends ServiceData {
	details?: PortableTextBlock[] | null;
	closes_at?: Instant;
	featured_image?: ImageFieldValue | null;
}

type CuratedEntry = ContentEntry<CuratedData>;

/** What the Featured hero shows of the Featured entry. */
export interface FeaturedView {
	/** The entry's database id. */
	id: string;
	collection: FeaturedCollection;
	title: string;
	/** Its summary, or for an Announcement, which has none, the start of its details. */
	lead?: string;
	image?: ImageFieldValue;
	/** Its canonical address (`03` §15). */
	href: string;
}

export interface HomepageCuration {
	featured?: FeaturedView;
	services: CuratedEntry[];
	quickAccess: QuickAccessLink[];
}

/** Each Featured kind's canonical address of an entry, by slug. */
const FEATURED_PATHS: Record<FeaturedCollection, (slug: string) => string> = {
	news: newsPath,
	announcements: announcementPath,
	health_content: healthContentPath,
	services: servicePath,
	activities: activityPath,
	health_reports: healthReportPath,
};

const resolve: ResolvePath<CuratedEntry> = async (path) => {
	const found = await resolveEmDashPath<CuratedData>(path);
	return found && { collection: found.collection, entry: found.entry };
};

/** The items of a Homepage menu, none when staff deleted the menu. */
async function menuItems(name: string) {
	return (await getMenu(name))?.items ?? [];
}

/**
 * The Homepage's curated sections at `now`; `siteOrigin` tells a link on this site from another
 * site's.
 */
export async function readHomepageCuration(
	siteOrigin: string,
	now: Date,
): Promise<HomepageCuration> {
	const resolveFeatured: ResolvePath<CuratedEntry> = async (path) => {
		const found = await resolve(path);
		return found?.collection === "announcements" && isClosed(found.entry.data, now) ? null : found;
	};
	const [featured, services, quickAccess] = await Promise.all([
		menuItems(HOMEPAGE_MENUS.featured).then((items) =>
			featuredItem(items, siteOrigin, resolveFeatured),
		),
		menuItems(HOMEPAGE_MENUS.services).then((items) =>
			frequentServices(items, siteOrigin, resolve),
		),
		menuItems(HOMEPAGE_MENUS.quickAccess).then((items) =>
			quickAccessLinks(items, siteOrigin, resolve),
		),
	]);
	if (!featured) return { services, quickAccess };
	const { collection, entry } = featured;
	const lead =
		collection === "announcements" ? detailsExcerpt(entry.data.details) : entry.data.summary;
	return {
		featured: {
			id: entry.data.id,
			collection,
			title: entry.data.title,
			lead: lead?.trim() || undefined,
			image: entry.data.featured_image ?? undefined,
			href: FEATURED_PATHS[collection](entry.id),
		},
		services,
		quickAccess,
	};
}
