// Office Contact and the official channels as the public site shows them (Feature 003 #62; spec #51
// "Office Contact plugin" and "Public reads" (Contact), `01` §10, `03` §12). The module has no
// runtime import, so node:test checks it directly; src/lib/office-contact.ts reads the settings
// through EmDash.
//
// Office Contact lives in the settings of the Songhealth Office Contact plugin
// (src/plugins/office-contact.ts), because EmDash's native site settings accept only a fixed key
// set (emdash 1.1.0 src/api/schemas/settings.ts). A value that is empty, or not of its field's
// type, is left out, so its line disappears from the page.

import type { SettingField } from "emdash";

/** The Office Contact plugin's identity, which its settings are stored under. */
export const OFFICE_CONTACT_PLUGIN = { id: "songhealth-office-contact", version: "1.0.0" } as const;

/**
 * The Office Contact settings form EmDash's Admin generates for the plugin, one field per value
 * (#51 "Office Contact plugin"). Saving an emptied field deletes its value
 * (@emdash-cms/admin 1.1.0 PluginSettings, emdash src/api/handlers/plugin-settings.ts), so an
 * empty value never reaches a page. Coordinates are bounded to valid latitudes and longitudes;
 * the Admin's number input and the settings API both check the bounds.
 */
export const OFFICE_CONTACT_SETTINGS = {
	address: {
		type: "string",
		label: "ที่อยู่สำนักงาน",
		description: "แสดงในหน้าติดต่อเรา ขึ้นบรรทัดใหม่ได้",
		multiline: true,
	},
	telephone: {
		type: "string",
		label: "โทรศัพท์",
		description: "เบอร์หลักของสำนักงาน เช่น 054 591 234 ถ้าเป็นเบอร์เดียว ประชาชนแตะเพื่อโทรได้",
	},
	email: { type: "email", label: "อีเมล", description: "อีเมลที่ประชาชนใช้ติดต่อสำนักงาน" },
	opening_hours: {
		type: "string",
		label: "เวลาทำการ",
		description: "เช่น จันทร์–ศุกร์ 08:30–16:30 น. เว้นวันหยุดราชการ ขึ้นบรรทัดใหม่ได้",
		multiline: true,
	},
	latitude: {
		type: "number",
		label: "ละติจูด",
		description:
			"พิกัดของสำนักงาน เช่น 18.4686 ลิงก์ เปิดแผนที่ จะแสดงเมื่อกรอกทั้งละติจูดและลองจิจูด",
		min: -90,
		max: 90,
	},
	longitude: {
		type: "number",
		label: "ลองจิจูด",
		description: "พิกัดของสำนักงาน เช่น 100.1834",
		min: -180,
		max: 180,
	},
	line_url: {
		type: "url",
		label: "ลิงก์ LINE",
		description:
			"ลิงก์ LINE Official Account ของสำนักงาน ขึ้นต้นด้วย https:// เช่น https://lin.ee/…",
	},
} satisfies Record<string, SettingField>;

/** Office Contact as the pages show it. Every value is optional: an unset one is absent. */
export interface OfficeContact {
	address?: string;
	telephone?: string;
	email?: string;
	openingHours?: string;
	latitude?: number;
	longitude?: number;
	lineUrl?: string;
}

/** A string value with its surrounding space trimmed, or undefined when it is empty or not a string. */
function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** A finite number, or undefined. */
function number(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Office Contact from the plugin's stored settings, keyed by field. */
export function officeContactFrom(settings: Record<string, unknown>): OfficeContact {
	const contact: OfficeContact = {
		address: text(settings.address),
		telephone: text(settings.telephone),
		email: text(settings.email),
		openingHours: text(settings.opening_hours),
		latitude: number(settings.latitude),
		longitude: number(settings.longitude),
		lineUrl: text(settings.line_url),
	};
	return Object.fromEntries(
		Object.entries(contact).filter(([, value]) => value !== undefined),
	) as OfficeContact;
}

/** An official channel the office runs: a network's name and the office's page there. */
export interface OfficialChannel {
	label: string;
	href: string;
}

/** The networks of EmDash's native `social` site settings (emdash 1.1.0 src/settings/types.ts). */
type SocialNetwork = "twitter" | "github" | "facebook" | "instagram" | "linkedin" | "youtube";

/**
 * How a network's handle becomes the office's profile address there. The Admin asks for a username
 * or handle in each `social` field, not an address (@emdash-cms/admin 1.1.0, the site settings'
 * social section): an X handle such as @username, a Facebook page username, a YouTube channel ID
 * or handle.
 */
const SOCIAL_PROFILES: Record<
	SocialNetwork,
	{ label: string; profile: (handle: string) => string }
> = {
	facebook: { label: "Facebook", profile: (handle) => `https://www.facebook.com/${handle}` },
	youtube: {
		label: "YouTube",
		profile: (handle) =>
			YOUTUBE_CHANNEL_ID.test(handle)
				? `https://www.youtube.com/channel/${handle}`
				: `https://www.youtube.com/@${handle}`,
	},
	twitter: { label: "X (Twitter)", profile: (handle) => `https://x.com/${handle}` },
	instagram: { label: "Instagram", profile: (handle) => `https://www.instagram.com/${handle}` },
	linkedin: { label: "LinkedIn", profile: (handle) => `https://www.linkedin.com/in/${handle}` },
	github: { label: "GitHub", profile: (handle) => `https://github.com/${handle}` },
};

/** A YouTube channel ID: "UC" and 22 more characters. */
const YOUTUBE_CHANNEL_ID = /^UC[\w-]{22}$/;

/** A handle that can stand in a profile address as it is. */
const HANDLE = /^[A-Za-z0-9._-]+$/;

/** The value as an http or https address, or undefined when it is not one. */
function webAddress(value: string): string | undefined {
	if (!/^https?:\/\//i.test(value) || !URL.canParse(value)) return undefined;
	return value;
}

/** The profile address a `social` value names: a pasted web address, or a handle on the network. */
function socialHref(network: SocialNetwork, value: string | undefined): string | undefined {
	const trimmed = text(value);
	if (trimmed === undefined) return undefined;
	if (/^https?:/i.test(trimmed)) return webAddress(trimmed);
	const handle = trimmed.replace(/^@/, "");
	return HANDLE.test(handle) ? SOCIAL_PROFILES[network].profile(handle) : undefined;
}

/**
 * The official channels that are set, as links: the native `social` settings and the Office
 * Contact LINE address. Facebook, LINE and YouTube come first, the channels a Thai office most
 * often runs. A value that is neither a handle nor a web address is left out, as is a LINE address
 * that is not a web address.
 */
export function officialChannels(
	social: Partial<Record<SocialNetwork, string>> | undefined,
	lineUrl?: string,
): OfficialChannel[] {
	const channels = [
		{ label: SOCIAL_PROFILES.facebook.label, href: socialHref("facebook", social?.facebook) },
		{ label: "LINE", href: lineUrl === undefined ? undefined : webAddress(lineUrl.trim()) },
		...(["youtube", "twitter", "instagram", "linkedin", "github"] as const).map((network) => ({
			label: SOCIAL_PROFILES[network].label,
			href: socialHref(network, social?.[network]),
		})),
	];
	return channels.flatMap(({ label, href }) => (href === undefined ? [] : [{ label, href }]));
}

/** The marks staff space a telephone number with, which a `tel:` address leaves out. */
const TELEPHONE_SPACING = /[\s\-().]/g;

/**
 * The `tel:` address that dials the telephone text, or undefined when the text is not one number,
 * such as two numbers or a number with an extension; the page then shows the text unlinked.
 */
export function telephoneHref(telephone: string): string | undefined {
	const number = telephone.replace(TELEPHONE_SPACING, "");
	return /^\+?\d{3,15}$/.test(number) ? `tel:${number}` : undefined;
}
