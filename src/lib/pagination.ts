// List pagination on public pages (Feature 003 #54; spec #51 "Lists and filters").
//
// Lists show a fixed number of entries per page, and the page number travels in the `page`
// query parameter, so back, forward and shared links keep the page. A value that is not a page
// number is ignored and the first page is shown: a hand-edited or stale link never fails.

/** The query parameter that carries the page number. */
export const PAGE_PARAM = "page";

/** Pages beyond this are not real pages of any Songhealth list; the number is ignored. */
const MAX_PAGE = 10_000;

/** The page a `page` query value asks for: a whole number from 1 to MAX_PAGE, otherwise 1. */
export function parsePageNumber(raw: string | null): number {
	if (raw === null || !/^[1-9][0-9]*$/.test(raw)) return 1;
	const page = Number(raw);
	return page <= MAX_PAGE ? page : 1;
}

/**
 * The address of another page of the list at `url`: its path and query string with the page
 * number replaced. The first page carries no page number, so it has one address.
 */
export function pageHref(url: URL, page: number): string {
	const params = new URLSearchParams(url.searchParams);
	params.delete(PAGE_PARAM);
	if (page > 1) params.set(PAGE_PARAM, String(page));
	const query = params.toString();
	return query === "" ? url.pathname : `${url.pathname}?${query}`;
}
