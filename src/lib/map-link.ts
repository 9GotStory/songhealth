// The "เปิดแผนที่" link (Feature 003 #57; spec #51 "Maps"): no page embeds a map (approved Q3), so a
// place links out to a map app by its coordinates. Health Service pages use it, and Office Contact
// (#62) shares it.
//
// The link is a Google Maps URL, the search action with comma-separated coordinates: `api=1` is
// required, the comma is encoded as %2C, and no API key is needed. On Android and iOS it opens
// the Google Maps app when installed (developers.google.com/maps/documentation/urls/get-started,
// read 2026-10-29). Following it is the citizen's choice; loading the page contacts no map host.

const MAPS_SEARCH = "https://www.google.com/maps/search/";

/** Whether `value` is a number from `-limit` to `limit`. */
function inRange(value: number | null | undefined, limit: number): value is number {
	return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** The map link of a place at these coordinates, or undefined when either is missing or invalid. */
export function mapHref(
	latitude: number | null | undefined,
	longitude: number | null | undefined,
): string | undefined {
	if (!inRange(latitude, 90) || !inRange(longitude, 180)) return undefined;
	const params = new URLSearchParams({ api: "1", query: `${latitude},${longitude}` });
	return `${MAPS_SEARCH}?${params}`;
}
