// PROTOTYPE (throwaway, branch prototype/design): what the Activities list and an Activity page
// hand each variant (src/pages/activities/).
import type { ActivityData, ActivityEntry } from "../../../lib/activities";
import type { ImageFieldValue } from "../../../lib/news";
import type { OnePageMode } from "../../../lib/prototype-design";
import { formatThaiDate } from "../../../lib/thai-date";

export interface ActivitiesListProps {
	title: string;
	lead: string;
	entries: ActivityEntry[];
	page: number;
	hasMore: boolean;
	onepage: OnePageMode;
	/** The list's address for page 1, for the empty page's way back. */
	firstPageHref: string;
}

export interface ActivityPageProps {
	activity: ActivityData;
	/** The entry's slug. */
	slug: string;
	/** Its picture while it can be served: its One Page, or a photo. */
	image?: ImageFieldValue;
	gallery: { image: ImageFieldValue; caption?: string | null }[];
	/** The latest other Activities, for a side column or a "more" list. */
	latest: ActivityEntry[];
	onepage: OnePageMode;
}

/** An Activity's details as label and text, in reading order, each only when set. */
export function activityDetails(activity: ActivityData): [string, string][] {
	const details: [string, string | undefined | null][] = [
		["วันที่จัดกิจกรรม", activity.activity_at ? formatThaiDate(activity.activity_at) : undefined],
		["สถานที่", activity.location_text],
		["ผู้เข้าร่วม", activity.participants_text],
		["เผยแพร่", activity.publishedAt ? formatThaiDate(activity.publishedAt) : undefined],
	];
	return details.filter((detail): detail is [string, string] => !!detail[1]);
}

/** The address EmDash serves a local media file from (src/lib/media.ts localKeyOf). */
export function mediaFileHref(image: ImageFieldValue): string {
	const key = (image as { meta?: { storageKey?: unknown } }).meta?.storageKey;
	return `/_emdash/api/media/file/${typeof key === "string" && key !== "" ? key : image.id}`;
}
