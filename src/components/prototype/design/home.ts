// PROTOTYPE (throwaway, branch prototype/design): what the Homepage hands each variant's Homepage
// (src/pages/index.astro), read once by the page as now.
import type { ContentEntry } from "emdash";
import type { ActivityEntry } from "../../../lib/activities";
import type { AnnouncementEntry } from "../../../lib/announcements";
import type { HealthContentEntry } from "../../../lib/health-content";
import type { DirectoryOverview } from "../../../lib/health-services";
import type { FeaturedView, HomepageCuration } from "../../../lib/homepage-curation";
import type { NewsData } from "../../../lib/news";
import type { OfficeContact } from "../../../lib/office-contact-settings";
import type { OnePageMode } from "../../../lib/prototype-design";
import type { SiteIdentity } from "../../../lib/site-identity";

export interface HomeProps {
	identity: SiteIdentity;
	featured?: FeaturedView;
	services: HomepageCuration["services"];
	quickAccess: HomepageCuration["quickAccess"];
	/** The newest published News that is not the Featured item, newest first. */
	news: ContentEntry<NewsData>[];
	/** Up to 3 current Announcements that are not Featured. */
	announcements: AnnouncementEntry[];
	healthContent: HealthContentEntry[];
	directory: DirectoryOverview;
	/** The latest Activities, by when they were held. */
	activities: ActivityEntry[];
	contact: OfficeContact;
	now: Date;
	onepage: OnePageMode;
	/** The Contact Summary's lead, also the page's description. */
	officeSummary: string;
}
