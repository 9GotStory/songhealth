// The Songhealth Office Contact plugin (Feature 003 #62; spec #51 "Office Contact plugin", approved
// Q10). Its only capability is a settings form in Admin, where staff maintain Office Contact:
// address, telephone, email, opening hours, coordinates and the LINE address
// (src/lib/contact.ts OFFICE_CONTACT_SETTINGS).
//
// Extension gate (`10` §22): EmDash's native site settings accept only a fixed key set (emdash
// 1.1.0 src/api/schemas/settings.ts), and a plugin's settings schema is the platform's own way to
// add a settings form (src/plugins/types.ts PluginAdminConfig). It has no hooks, routes, storage or
// capabilities. EmDash's Admin generates the form at Plugins → songhealth-office-contact →
// Settings, and saving it needs the native `plugins:manage` permission, which only the
// Administrator role holds (@emdash-cms/auth 1.1.0 src/rbac.ts).
//
// astro.config.mjs registers this file as a native-format plugin entrypoint, which EmDash imports
// and calls as `createPlugin()` (src/astro/integration/virtual-modules.ts generatePluginsModule).
import { definePlugin } from "emdash";
import { OFFICE_CONTACT_PLUGIN, OFFICE_CONTACT_SETTINGS } from "../lib/contact";

export function createPlugin() {
	return definePlugin({
		...OFFICE_CONTACT_PLUGIN,
		admin: { settingsSchema: OFFICE_CONTACT_SETTINGS },
	});
}
