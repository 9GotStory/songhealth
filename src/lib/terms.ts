// Taxonomy terms on public pages (Feature 003 #54, #55; spec #51 "Public reads").
//
// Entries come back from EmDash's query functions with their terms hydrated by taxonomy name, in
// label order (emdash 1.1.0 src/loader.ts). A list filter offers every term of a taxonomy, and a
// `where` on a taxonomy matches exact terms only, so a hierarchical taxonomy is offered flat.

import { getTaxonomyTerms, type TaxonomyTerm } from "emdash";

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
export async function listTerms(taxonomy: string): Promise<TaxonomyTerm[]> {
	const flatten = (terms: TaxonomyTerm[]): TaxonomyTerm[] =>
		terms.flatMap((term) => [term, ...flatten(term.children ?? [])]);
	return flatten(await getTaxonomyTerms(taxonomy, { includeCounts: false })).sort((a, b) =>
		a.label.localeCompare(b.label, "th"),
	);
}
