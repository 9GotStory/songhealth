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
//
// The path resolution knows entries only: it answers nothing alike for a page of the site, such as
// /documents, for an unpublished entry's address and for an address that leads nowhere
// (docs/agents/emdash-1.1.0.md "Menus"). So a Quick Access shortcut, which can lead to a page,
// shows while its path is one of the site's own pages (SITE_PAGES) or resolves to a published
// entry.

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
 * The site's own pages: the address of each page under src/pages whose route has no parameter, the
 * not-found page aside. tests/node/public-homepage-menus.test.ts keeps the list equal to
 * src/pages.
 */
export const SITE_PAGES: ReadonlySet<string> = new Set([
	"/",
	"/about",
	"/about/leadership",
	"/about/organization",
	"/about/personnel",
	"/about/plans",
	"/about/policies",
	"/about/results",
	"/activities",
	"/announcements",
	"/contact",
	"/documents",
	"/health",
	"/health/content",
	"/health/reports",
	"/health-services",
	"/news",
	"/news/health",
	"/search",
	"/services",
]);

/** A Quick Access shortcut: the menu item's label and address. */
export interface QuickAccessLink {
	label: string;
	href: string;
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

function isFeaturedCollection(collection: string): collection is FeaturedCollection {
	return (FEATURED_COLLECTIONS as readonly string[]).includes(collection);
}

/**
 * Up to `limit` items in menu order whose path on this site resolves to a published entry that
 * `accept` takes, as each resolved. An item that leaves the site or does not resolve is skipped.
 */
async function resolvedItems<E>(
	items: readonly MenuLink[],
	siteOrigin: string,
	resolve: ResolvePath<E>,
	accept: (found: Resolved<E>) => boolean,
	limit: number,
): Promise<Resolved<E>[]> {
	const kept: Resolved<E>[] = [];
	for (const item of inMenuOrder(items)) {
		if (kept.length === limit) break;
		const path = sitePath(item.url, siteOrigin);
		const found = path === undefined ? null : await resolve(path);
		if (found && accept(found)) kept.push(found);
	}
	return kept;
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
	const [found] = await resolvedItems(
		items,
		siteOrigin,
		resolve,
		({ collection }) => isFeaturedCollection(collection),
		1,
	);
	if (!found || !isFeaturedCollection(found.collection)) return undefined;
	return { collection: found.collection, entry: found.entry };
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
	const services = await resolvedItems(
		items,
		siteOrigin,
		resolve,
		({ collection }) => collection === "services",
		SERVICES_LIMIT,
	);
	return services.map(({ entry }) => entry);
}

/**
 * The Quick Access shortcuts: up to QUICK_ACCESS_LIMIT items in menu order, each to a page of the
 * site or a published entry of any kind, the canonical destinations `04` §10.1 names. An item that
 * leads nowhere is skipped (`04` §17): an unpublished or trashed entry's address, a path that is no
 * page, another scheme such as mailto: or only a fragment. So is a link to another website, which
 * is no destination of the site, although #51 lets an item be "any destination" (Product Owner,
 * 2026-10-31: #65 comment 6538358352).
 */
export async function quickAccessLinks<E>(
	items: readonly MenuLink[],
	siteOrigin: string,
	resolve: ResolvePath<E>,
): Promise<QuickAccessLink[]> {
	const links: QuickAccessLink[] = [];
	for (const { label, url } of inMenuOrder(items)) {
		if (links.length === QUICK_ACCESS_LIMIT) break;
		const path = sitePath(url, siteOrigin);
		if (path === undefined || !(SITE_PAGES.has(path) || (await resolve(path)))) continue;
		links.push({ label, href: url });
	}
	return links;
}
