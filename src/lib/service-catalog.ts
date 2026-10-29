// The Service catalog's rules (Feature 003 #58; spec #51 "Public reads" (Services), `03` §7 and
// §15). The module has no import, so node:test checks it directly; src/lib/services.ts reads
// through EmDash and uses it.

/** The Service catalog's address. */
const SERVICES_PATH = "/services";

/** The query parameter of the Service Category filter. */
export const CATEGORY_PARAM = "category";

/** The catalog's filter: a Service Category term slug, empty when not set. */
export interface ServiceFilters {
	category: string;
}

/** A Service's canonical address, `/services/{slug}` (`03` §15), encoded as EmDash encodes it. */
export function servicePath(slug: string): string {
	return `${SERVICES_PATH}/${encodeURIComponent(slug)}`;
}

/** The filter a catalog address asks for, trimmed. */
export function parseServiceFilters(params: URLSearchParams): ServiceFilters {
	return { category: params.get(CATEGORY_PARAM)?.trim() ?? "" };
}

/** The catalog's address with the filter when it is set. */
export function servicesPath(filters: Partial<ServiceFilters> = {}): string {
	if (!filters.category) return SERVICES_PATH;
	return `${SERVICES_PATH}?${new URLSearchParams({ [CATEGORY_PARAM]: filters.category })}`;
}

/**
 * Whether a link leaves this site for another website: an http or https address on another
 * origin than `siteOrigin`. A site-relative path, an email address or a telephone number does not.
 */
export function isExternalHref(href: string, siteOrigin: string): boolean {
	let url: URL;
	try {
		url = new URL(href, siteOrigin);
	} catch {
		return false;
	}
	return (url.protocol === "https:" || url.protocol === "http:") && url.origin !== siteOrigin;
}
