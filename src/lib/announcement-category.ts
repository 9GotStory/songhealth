// The colour of an Announcement's category badge on the Homepage (Feature 008 #245; spec #239
// "Current Announcements").
//
// An Announcement's category is its first `announcement_type` term. Procurement and recruitment,
// known by the slugs the seed gives them (seed/seed.json), each have a colour of their own. Every
// other category takes the general colour, so one staff add later shows before a colour is
// assigned here.

/** The categories with a colour of their own, by the term's slug. */
const OWN_TONES = ["procurement", "recruitment"] as const;

/** The colour a category badge takes. */
export type CategoryTone = (typeof OWN_TONES)[number] | "general";

/** The colour of the badge of the category whose term has `slug`. */
export function categoryTone(slug: string): CategoryTone {
	return OWN_TONES.find((tone) => tone === slug) ?? "general";
}
