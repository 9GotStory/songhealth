// Which Homepage section takes the sections' space above and below itself (Feature 008 #247;
// Product Owner, 2026-11-12: #247 comment 6820010972; docs/design/DESIGN.md §8).
//
// Between two neighbours there is exactly one space (80 px from `lg`, 64 px from `sm`, 32 px
// below; src/pages/index.astro has the classes). A section on the page's colour has that space
// below it, and above it only when what precedes it leaves none: the deep field, or the Current
// Announcements, a band in its own colour with its space inside it. Two sections differ. The
// Leadership strip has its own smaller space above, under the Frequently Used Services, and hands
// its space below to Latest News, which so always has its space above (spec #239 "Leadership
// strip").

/** The Homepage's sections after the deep field, in page order. Each shows only with content. */
export const HOMEPAGE_SECTIONS = [
	"leadership",
	"news",
	"announcements",
	"health",
	"discovery",
	"activities",
	"quickAccess",
	"contact",
] as const;

export type HomepageSection = (typeof HOMEPAGE_SECTIONS)[number];

/** Whether a section has the sections' space above and below it, outside its own surface. */
export interface SectionSpace {
	above: boolean;
	below: boolean;
}

/** Each section's space, given the sections the page shows. One not shown has none. */
export function homepageSpacing(
	shown: readonly HomepageSection[],
): Record<HomepageSection, SectionSpace> {
	const none = (): SectionSpace => ({ above: false, below: false });
	const spacing = Object.fromEntries(
		HOMEPAGE_SECTIONS.map((section) => [section, none()]),
	) as Record<HomepageSection, SectionSpace>;
	/** Whether what precedes the next section has left the space below itself. */
	let spaceLeft = false;
	for (const section of HOMEPAGE_SECTIONS.filter((candidate) => shown.includes(candidate))) {
		if (section === "leadership") {
			spacing.leadership.below = !shown.includes("news");
		} else if (section !== "announcements") {
			spacing[section] = { above: !spaceLeft, below: true };
		}
		spaceLeft = spacing[section].below;
	}
	return spacing;
}
