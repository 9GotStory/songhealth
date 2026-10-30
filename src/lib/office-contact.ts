// Office Contact and the official channels, read through EmDash (Feature 003 #62; spec #51 "Office
// Contact plugin" and "Public reads" (Contact)). /contact shows both, and the footer of every page
// shows the channels.
//
// Office Contact is the Office Contact plugin's stored settings. `getPluginSettings` returns only
// stored values, without the schema's defaults (emdash 1.1.0 src/settings/index.ts), and the
// Admin deletes a value saved empty, so an unset value is simply absent. The channels are the
// native `social` site settings and the plugin's LINE address. src/lib/contact.ts shapes both.

import { getPluginSettings, getSiteSettings } from "emdash";
import {
	OFFICE_CONTACT_PLUGIN,
	officeContactFrom,
	officialChannels,
	type OfficeContact,
	type OfficialChannel,
} from "./contact";

export async function readOfficeContact(): Promise<{
	contact: OfficeContact;
	channels: OfficialChannel[];
}> {
	const [settings, site] = await Promise.all([
		getPluginSettings(OFFICE_CONTACT_PLUGIN.id),
		getSiteSettings(),
	]);
	const contact = officeContactFrom(settings);
	return { contact, channels: officialChannels(site.social, contact.lineUrl) };
}
