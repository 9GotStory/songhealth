// Songhealth site navigation (Feature 003 #52, #86): the main navigation, the utility links the
// page shell renders on every page, and the breadcrumb of each inner page. The module imports no
// runtime module, so node:test checks it directly.
//
// - MAIN_NAVIGATION is `03` §2 in order. Each page names the section it belongs
//   to, and the shell marks that item as current. The section is declared by
//   the page, not derived from URL segments (`03` §14). About, Services and
//   Health Information take their address, and About and Health Information
//   their title, from the constants their own modules export for their pages.
// - UTILITY_LINKS are the `03` §2 utility items.
// - The breadcrumb leads with หน้าแรก and the page's section, both taken from
//   MAIN_NAVIGATION, so no page writes them (`03` §14). EmDash 1.1.0 builds and
//   renders none; its page context only carries a trail for SEO plugins
//   (docs/agents/emdash-1.1.0.md "Head, settings, menus, sitemap").
import { ABOUT_PATH, ABOUT_TITLE } from "./about.ts";
import { HEALTH_PATH, HEALTH_TITLE } from "./health.ts";
import { SERVICES_PATH } from "./service-catalog.ts";

export const MAIN_NAVIGATION = [
	{ section: "home", label: "หน้าแรก", href: "/" },
	{ section: "about", label: ABOUT_TITLE, href: ABOUT_PATH },
	{ section: "news", label: "ข่าวสาร", href: "/news" },
	{ section: "services", label: "บริการประชาชน", href: SERVICES_PATH },
	{ section: "health", label: HEALTH_TITLE, href: HEALTH_PATH },
	{ section: "documents", label: "เอกสารเผยแพร่", href: "/documents" },
] as const;

export type NavigationSection = (typeof MAIN_NAVIGATION)[number]["section"];

export const UTILITY_LINKS = [
	{ label: "ค้นหา", href: "/search" },
	{ label: "ติดต่อเรา", href: "/contact" },
] as const;

/** One step of the breadcrumb. */
export interface Crumb {
	label: string;
	/** The crumb's address; the current page, last, has none. */
	href?: string;
}

/**
 * The `aria-current` value of a main-navigation item: "page" on the section's
 * own landing page, "true" elsewhere in the section, and none outside it.
 */
export function currentMark(
	item: (typeof MAIN_NAVIGATION)[number],
	section: NavigationSection | undefined,
	pathname: string,
): "page" | "true" | undefined {
	if (item.section !== section) return undefined;
	return pathname === item.href ? "page" : "true";
}

/**
 * An inner page's breadcrumb, root first: หน้าแรก, which leads MAIN_NAVIGATION, the page's section
 * when it has one, then the page's own `crumbs`, which end with its title. The last crumb is the
 * current page and has no address, so a section's landing page, which has no crumbs of its own,
 * ends at the section.
 */
export function breadcrumbTrail(section: NavigationSection | undefined, crumbs: Crumb[]): Crumb[] {
	const [home, ...sectionItems] = MAIN_NAVIGATION;
	const trail: Crumb[] = [
		home,
		...sectionItems.filter((item) => item.section === section),
		...crumbs,
	];
	return trail.map(({ label, href }, index) =>
		index === trail.length - 1 ? { label } : { label, href },
	);
}
