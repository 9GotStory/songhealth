// A section page's destinations as the Service catalog's cards (Feature 014 #420; spec #417 "The
// cards", decisions 4 to 8 and 14): /health's two areas (src/lib/health.ts) and /about's six
// sub-pages (src/lib/about.ts). Each card links to its destination, is named by its name, carries
// the icon its destination's page shows in its heading, and from `sm` shows the lead that page
// opens with as its summary (HomeServiceCard.astro, DestinationIcon.astro).

/** The destinations' icons, by their Lucide names: each its page's heading icon, or `network`. */
export type DestinationIconName =
	| "heart-pulse"
	| "file-chart-column"
	| "network"
	| "user-round"
	| "users-round"
	| "scroll-text"
	| "clipboard-list"
	| "chart-column";

/** One destination: its address, its name, its icon and the summary its card shows from `sm`. */
export interface Destination {
	href: string;
	title: string;
	icon: DestinationIconName;
	/** None where the destination gives none, such as an unpublished `organization` page. */
	summary?: string;
}
