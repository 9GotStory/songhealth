// Services on the public site (Feature 003 #57, #58; spec #51 "Public reads" (Services), `03` §15).
// A Health Service page links to the Services it offers; #58 builds the Service pages.

/** The Service catalog's address. */
export const SERVICES_PATH = "/services";

/** A Service's canonical address, `/services/{slug}` (`03` §15), encoded as EmDash encodes it. */
export function servicePath(slug: string): string {
	return `${SERVICES_PATH}/${encodeURIComponent(slug)}`;
}
