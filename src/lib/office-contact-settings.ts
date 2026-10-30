// The Office Contact plugin's settings: its identity, the settings form staff fill in, and Office
// Contact as the stored values give it (Feature 003 #62; spec #51 "Office Contact plugin"). The
// module has no runtime import, so astro.config.mjs and node:test load it directly; the plugin
// (src/plugins/office-contact.ts) declares the form, and src/lib/office-contact.ts reads the
// values through EmDash.
//
// Office Contact lives in a plugin's settings because EmDash's native site settings accept only a
// fixed key set (emdash 1.1.0 src/api/schemas/settings.ts). A value that is empty, or not of its
// field's type, is left out, so its line disappears from the page.

import type { SettingField } from "emdash";

/** The Office Contact plugin's identity, which its settings are stored under. */
export const OFFICE_CONTACT_PLUGIN = { id: "songhealth-office-contact", version: "1.0.0" } as const;

/**
 * The Office Contact settings form EmDash's Admin generates for the plugin, one field per value
 * (#51 "Office Contact plugin"). The Admin saves an emptied field as `null`, which deletes its
 * value (@emdash-cms/admin/dist/index.js PluginSettings, emdash 1.1.0
 * src/api/handlers/plugin-settings.ts), so an empty value never reaches a page. The settings API
 * rejects coordinates outside the bounds (src/api/handlers/plugin-settings.ts validateValue).
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
function trimmedText(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** A finite number, or undefined. */
function finiteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Office Contact from the plugin's stored settings, keyed by field. */
export function officeContactFrom(settings: Record<string, unknown>): OfficeContact {
	const contact: OfficeContact = {
		address: trimmedText(settings.address),
		telephone: trimmedText(settings.telephone),
		email: trimmedText(settings.email),
		openingHours: trimmedText(settings.opening_hours),
		latitude: finiteNumber(settings.latitude),
		longitude: finiteNumber(settings.longitude),
		lineUrl: trimmedText(settings.line_url),
	};
	return Object.fromEntries(
		Object.entries(contact).filter(([, value]) => value !== undefined),
	) as OfficeContact;
}
