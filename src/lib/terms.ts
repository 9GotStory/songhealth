// Taxonomy terms on public pages (Feature 003 #54, #55; spec #51 "Public reads"; spec #174 "Public
// list filters").
//
// Entries come back from EmDash's query functions with their terms hydrated by taxonomy name, in
// label order (emdash 1.1.0 src/loader.ts). A list filter offers only the terms that the list's
// published entries carry, and a `where` on a taxonomy matches exact terms only, so a hierarchical
// taxonomy is offered flat.

import { getEmDashCollection, getTaxonomyTerms, type TaxonomyTerm } from "emdash";

/** The query parameter that narrows a list to one Topic (`topic` term), on News and Documents. */
export const TOPIC_PARAM = "topic";

/** The terms of `taxonomy` on an entry's data, in the order EmDash hydrates them (by label). */
export function termsOf(
	data: { terms?: Record<string, TaxonomyTerm[]> },
	taxonomy: string,
): TaxonomyTerm[] {
	return data.terms?.[taxonomy] ?? [];
}

/** Every term of `taxonomy`, flattened and sorted by label in Thai order. */
async function listTerms(taxonomy: string): Promise<TaxonomyTerm[]> {
	const flatten = (terms: TaxonomyTerm[]): TaxonomyTerm[] =>
		terms.flatMap((term) => [term, ...flatten(term.children ?? [])]);
	return flatten(await getTaxonomyTerms(taxonomy, { includeCounts: false })).sort((a, b) =>
		a.label.localeCompare(b.label, "th"),
	);
}

/**
 * The terms of `taxonomy` that the filter of `collection`'s list offers: those that at least one
 * published entry of `collection` carries, in the order of `listTerms`, so that no choice leads to
 * an empty list. EmDash's term counts sum every collection of a taxonomy, and `topic` belongs to
 * several lists (docs/agents/emdash-1.1.0.md "Public reads"), so each term takes one read of a
 * published entry instead, with the `where` that choosing the term puts on the list.
 */
export async function offeredTerms(collection: string, taxonomy: string): Promise<TaxonomyTerm[]> {
	const terms = await listTerms(taxonomy);
	const carried = await Promise.all(
		terms.map(async (term) => {
			const { entries, error } = await getEmDashCollection(collection, {
				limit: 1,
				where: { [taxonomy]: term.slug },
			});
			if (error) throw error;
			return entries.length > 0;
		}),
	);
	return terms.filter((_, index) => carried[index]);
}
