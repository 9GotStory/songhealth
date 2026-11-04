// PROTOTYPE (throwaway, branch prototype/design): what SiteLayout hands each variant's header and
// footer (src/lib/prototype-design.ts).
import type { OfficialChannel } from "../../../lib/contact-links";
import type { OfficeContact } from "../../../lib/office-contact-settings";
import type { SiteIdentity } from "../../../lib/site-identity";

interface NavigationLink {
	label: string;
	href: string;
	current?: "page" | "true";
}

export interface ShellProps {
	identity: SiteIdentity;
	navigation: NavigationLink[];
	utility: readonly { label: string; href: string }[];
	footerLinks: { label: string; href: string }[];
	channels: OfficialChannel[];
	contact: OfficeContact;
}
