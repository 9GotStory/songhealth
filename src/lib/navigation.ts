// Songhealth site navigation (Feature 003 #52): the main navigation and the
// utility links the page shell renders on every page.
//
// - MAIN_NAVIGATION is `03` §2 in order. Each page names the section it belongs
//   to, and the shell marks that item as current. The section is declared by
//   the page, not derived from URL segments (`03` §14).
// - UTILITY_LINKS are the `03` §2 utility items.

export const MAIN_NAVIGATION = [
	{ section: "home", label: "หน้าแรก", href: "/" },
	{ section: "about", label: "เกี่ยวกับเรา", href: "/about" },
	{ section: "news", label: "ข่าวสาร", href: "/news" },
	{ section: "services", label: "บริการประชาชน", href: "/services" },
	{ section: "health", label: "ข้อมูลสุขภาพ", href: "/health" },
	{ section: "documents", label: "เอกสารเผยแพร่", href: "/documents" },
] as const;

export type NavigationSection = (typeof MAIN_NAVIGATION)[number]["section"];

export const UTILITY_LINKS = [
	{ label: "ค้นหา", href: "/search" },
	{ label: "ติดต่อเรา", href: "/contact" },
] as const;

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
