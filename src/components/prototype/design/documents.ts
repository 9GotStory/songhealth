// PROTOTYPE (throwaway, branch prototype/design): what the Document repository hands each variant
// (src/pages/documents/index.astro).
import type { DocumentEntry } from "../../../lib/documents";

interface FilterField {
	name: string;
	label: string;
	anyLabel: string;
	value: string;
	options: { value: string; label: string }[];
}

export interface DocumentsListProps {
	title: string;
	lead: string;
	entries: DocumentEntry[];
	page: number;
	hasMore: boolean;
	fields: FilterField[];
	/** The repository's address without filters, the form's action. */
	action: string;
	filtered: boolean;
	/** The empty state's message and its way back, when the page shows nothing. */
	empty?: { message: string; action?: { href: string; label: string } };
}
