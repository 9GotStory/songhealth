// How Office Contact and the official channels become links on the public site (Feature 003 #62;
// spec #51 "Public reads" (Contact), `01` §10). The module has no runtime import, so node:test
// checks it directly.
//
// A telephone number or an email address staff typed is linked only when it is one number or one
// plain address; otherwise the page shows the text unlinked. The official channels are EmDash's
// native `social` site settings and the Office Contact LINE address.

/** The marks staff space a telephone number with, which a `tel:` address leaves out. */
const TELEPHONE_SPACING = /[\s\-().]/g;

/**
 * The `tel:` address that dials the telephone text, or undefined when the text is not one number,
 * such as two numbers or a number with an extension.
 */
export function telephoneHref(telephone: string): string | undefined {
	const digits = telephone.replace(TELEPHONE_SPACING, "");
	return /^\+?\d{3,15}$/.test(digits) ? `tel:${digits}` : undefined;
}

/**
 * The `mailto:` address that writes to the email text, or undefined when it is not one plain
 * address. EmDash's email field checks only that the value has an "@" (emdash 1.1.0
 * src/api/handlers/plugin-settings.ts validateValue), so spaces, a list or a query can reach here.
 */
export function emailHref(email: string): string | undefined {
	return /^[^\s@,;?&#]+@[^\s@,;?&#]+$/.test(email) ? `mailto:${email}` : undefined;
}

/** An official channel the office runs: a network's name and the office's page there. */
export interface OfficialChannel {
	label: string;
	href: string;
}

/** The networks of EmDash's native `social` site settings (emdash 1.1.0 src/settings/types.ts). */
type SocialNetwork = "twitter" | "github" | "facebook" | "instagram" | "linkedin" | "youtube";

/** A YouTube channel ID: "UC" and 22 more characters. */
const YOUTUBE_CHANNEL_ID = /^UC[\w-]{22}$/;

/**
 * The official channels in the order the site lists them, Facebook, LINE and YouTube first, the
 * channels a Thai office most often runs. Each `social` network turns a handle into the office's
 * profile address there: the Admin asks for a username or handle, not an address
 * (@emdash-cms/admin/dist/index.js, the site settings' social section). An office's LinkedIn page
 * is a company page. LINE has no handle: its Office Contact field holds an address.
 */
const CHANNELS: ReadonlyArray<{
	channel: SocialNetwork | "line";
	label: string;
	profile?: (handle: string) => string;
}> = [
	{
		channel: "facebook",
		label: "Facebook",
		profile: (handle) => `https://www.facebook.com/${handle}`,
	},
	{ channel: "line", label: "LINE" },
	{
		channel: "youtube",
		label: "YouTube",
		profile: (handle) =>
			YOUTUBE_CHANNEL_ID.test(handle)
				? `https://www.youtube.com/channel/${handle}`
				: `https://www.youtube.com/@${handle}`,
	},
	{ channel: "twitter", label: "X (Twitter)", profile: (handle) => `https://x.com/${handle}` },
	{
		channel: "instagram",
		label: "Instagram",
		profile: (handle) => `https://www.instagram.com/${handle}`,
	},
	{
		channel: "linkedin",
		label: "LinkedIn",
		profile: (handle) => `https://www.linkedin.com/company/${handle}`,
	},
	{ channel: "github", label: "GitHub", profile: (handle) => `https://github.com/${handle}` },
];

/** An address with a scheme, such as "https:" or "javascript:". */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** A web address pasted without its scheme: "www.…", or a host name with a path. */
const BARE_ADDRESS = /^(?:www\.[^\s/]+|[^\s/]+\.[^\s/]+\/)/i;

/** A handle, in any script, that can stand in a profile address as it is. */
const HANDLE = /^[\p{L}\p{M}\p{N}._-]+$/u;

/** Whether `address` is an http or https address. */
function isWebAddress(address: string): boolean {
	return URL.canParse(address) && ["http:", "https:"].includes(new URL(address).protocol);
}

/**
 * The address a channel's value names: a web address, with https:// added when it was pasted
 * without one, or else a handle on the network. Undefined when the value is empty, an address
 * that is not http or https, or neither.
 */
function channelHref(
	value: string | undefined,
	profile?: (handle: string) => string,
): string | undefined {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	const address = SCHEME.test(trimmed)
		? trimmed
		: BARE_ADDRESS.test(trimmed)
			? `https://${trimmed}`
			: undefined;
	if (address !== undefined) return isWebAddress(address) ? address : undefined;
	const handle = trimmed.replace(/^@/, "");
	return profile && HANDLE.test(handle) ? profile(handle) : undefined;
}

/**
 * The official channels that are set, as links, from the `social` settings and the LINE address.
 */
export function officialChannels(
	social: Partial<Record<SocialNetwork, string>> | undefined,
	lineUrl?: string,
): OfficialChannel[] {
	return CHANNELS.flatMap(({ channel, label, profile }) => {
		const href = channelHref(channel === "line" ? lineUrl : social?.[channel], profile);
		return href === undefined ? [] : [{ label, href }];
	});
}
