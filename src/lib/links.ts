// Links to addresses staff enter, such as a Service's external link and channels (Feature 003 #58;
// spec #51 "Public reads" (Services)). The module has no import, so node:test checks it directly.

/**
 * Whether a link leaves this site for another website: an http or https address on another host
 * than `siteOrigin`'s. The scheme does not count, because a proxy that ends TLS can hand the page
 * an http origin while staff paste the site's https address. A site-relative path, an email
 * address or a telephone number does not leave the site.
 */
export function isExternalHref(href: string, siteOrigin: string): boolean {
	let url: URL;
	try {
		url = new URL(href, siteOrigin);
	} catch {
		return false;
	}
	return (
		(url.protocol === "https:" || url.protocol === "http:") && url.host !== new URL(siteOrigin).host
	);
}
