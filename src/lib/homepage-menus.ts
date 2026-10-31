// The rules of the Homepage's curated sections (Feature 003 #65; spec #51 "Homepage (`04`, Figma
// order)", approved Q11; `04` §5, §6, §10.1 and §17). The module imports nothing that needs the
// runtime, so node:test checks it directly; src/lib/homepage-curation.ts reads the menus through
// EmDash and hands their items here.
//
// Staff curate three native menus. A menu item returns only its label and address, and EmDash does
// not check that its entry is still published (emdash 1.1.0 src/menus/index.ts
// resolveContentReferences reads draft and trashed rows too). So each item's address is mapped
// back to a published entry with EmDash's path resolution, which the caller passes in, and an item
// that does not resolve is skipped. Unpublishing or trashing an entry therefore takes it off the
// Homepage without a menu edit.
//
// A content item's address carries its slug encoded (src/i18n/resolve.ts interpolateUrlPattern),
// while EmDash stores the slug decoded and resolves the slug it is given as it is (src/query.ts
// resolveEmDashPath), so the path is decoded first, as EmDash's own decodeSlug does
// (src/utils/slugify.ts). A link staff typed may be a full address on this site; its path counts.

import { isExternalHref } from "./links.ts";

/** The native menus that curate the Homepage, by name (spec #51 "Changes to the Feature 002 model"). */
export const HOMEPAGE_MENUS = {
	featured: "homepage-featured",
	services: "homepage-services",
	quickAccess: "homepage-quick-access",
} as const;

/** The kinds of content that can be Featured (`04` §5). */
const FEATURED_COLLECTIONS = [
	"news",
	"announcements",
	"health_content",
	"services",
	"activities",
	"health_reports",
] as const;

export type FeaturedCollection = (typeof FEATURED_COLLECTIONS)[number];

/** The most Frequently Used Services the Homepage shows (spec #51; `04` §6 suggests 4–6). */
const SERVICES_LIMIT = 6;

/** The most Quick Access shortcuts the Homepage shows (spec #51). */
const QUICK_ACCESS_LIMIT = 4;

/**
 * Where each public collection's entry addresses begin: `03` §15's URL patterns up to `{slug}`, as
 * the seed sets them and tests/canonical-url-patterns.ts records them.
 */
const ENTRY_ADDRESS_PREFIXES = [
	"/news/",
	"/activities/",
	"/announcements/",
	"/services/",
	"/health-services/",
	"/health/content/",
	"/health/reports/",
	"/documents/",
	"/pages/",
];

/**
 * The site's own pages at an address shaped like an entry's. Astro serves a page before a
 * parameter route, so /news/health is the Health News list, never a News entry.
 */
const PAGES_AT_ENTRY_ADDRESSES = new Set(["/news/health"]);

/** A Quick Access shortcut: the menu item's label and address, and whether it leaves the site. */
export interface QuickAccessLink {
	label: string;
	href: string;
	external: boolean;
}

/** A menu item as EmDash's getMenu returns it (emdash 1.1.0 src/menus/types.ts MenuItem). */
export interface MenuLink {
	label: string;
	url: string;
	children?: MenuLink[];
}

/** A published entry and its collection, as EmDash's path resolution finds it. */
export interface Resolved<E> {
	collection: string;
	entry: E;
}

/** Maps a decoded path on this site to its published entry, or null when none is published there. */
export type ResolvePath<E> = (path: string) => Promise<Resolved<E> | null>;

/** Every item of a menu in the order the menu lists them, each followed by its nested items. */
function inMenuOrder(items: readonly MenuLink[]): MenuLink[] {
	return items.flatMap((item) => [item, ...inMenuOrder(item.children ?? [])]);
}

/**
 * The decoded path of a link on this site, without a trailing slash, or undefined for a link that
 * leaves it, another scheme such as mailto:, or an address that does not parse.
 */
function sitePath(url: string, siteOrigin: string): string | undefined {
	if (url.startsWith("#") || !URL.canParse(url, siteOrigin) || isExternalHref(url, siteOrigin)) {
		return undefined;
	}
	const { protocol, pathname } = new URL(url, siteOrigin);
	if (protocol !== "http:" && protocol !== "https:") return undefined;
	let path: string;
	try {
		path = decodeURIComponent(pathname);
	} catch {
		return undefined;
	}
	return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** Whether a decoded path is a public entry's address: a prefix, then one segment, the slug. */
function isEntryAddress(path: string): boolean {
	if (PAGES_AT_ENTRY_ADDRESSES.has(path)) return false;
	return ENTRY_ADDRESS_PREFIXES.some(
		(prefix) =>
			path.startsWith(prefix) && path.length > prefix.length && !path.includes("/", prefix.length),
	);
}

function isFeaturedCollection(collection: string): collection is FeaturedCollection {
	return (FEATURED_COLLECTIONS as readonly string[]).includes(collection);
}

/**
 * The Featured item: the first item, in menu order, that resolves to a published entry of a kind
 * that can be Featured, or undefined when none does.
 */
export async function featuredItem<E>(
	items: readonly MenuLink[],
	siteOrigin: string,
	resolve: ResolvePath<E>,
): Promise<(Resolved<E> & { collection: FeaturedCollection }) | undefined> {
	for (const item of inMenuOrder(items)) {
		const path = sitePath(item.url, siteOrigin);
		if (path === undefined) continue;
		const found = await resolve(path);
		if (found && isFeaturedCollection(found.collection)) {
			return { collection: found.collection, entry: found.entry };
		}
	}
	return undefined;
}

/**
 * The Frequently Used Services: the entries of the items that resolve to a published Service, in
 * menu order, at most SERVICES_LIMIT. An item of any other kind is skipped.
 */
export async function frequentServices<E>(
	items: readonly MenuLink[],
	siteOrigin: string,
	resolve: ResolvePath<E>,
): Promise<E[]> {
	const services: E[] = [];
	for (const item of inMenuOrder(items)) {
		if (services.length === SERVICES_LIMIT) break;
		const path = sitePath(item.url, siteOrigin);
		const found = path === undefined ? null : await resolve(path);
		if (found?.collection === "services") services.push(found.entry);
	}
	return services;
}

/**
 * The Quick Access shortcuts: up to QUICK_ACCESS_LIMIT items in menu order, to any destination.
 * An item to another website shows, marked as leaving the site, and so does one to a page of the
 * site. An item at an entry's address shows while that entry is published, so an unpublished or
 * trashed entry's item is skipped. An address that leads nowhere, only a fragment or another
 * scheme such as mailto:, is skipped too.
 */
export async function quickAccessLinks<E>(
	items: readonly MenuLink[],
	siteOrigin: string,
	resolve: ResolvePath<E>,
): Promise<QuickAccessLink[]> {
	const links: QuickAccessLink[] = [];
	for (const { label, url } of inMenuOrder(items)) {
		if (links.length === QUICK_ACCESS_LIMIT) break;
		if (isExternalHref(url, siteOrigin)) {
			links.push({ label, href: url, external: true });
			continue;
		}
		const path = sitePath(url, siteOrigin);
		if (path === undefined || (isEntryAddress(path) && !(await resolve(path)))) continue;
		links.push({ label, href: url, external: false });
	}
	return links;
}
