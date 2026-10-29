// Dates on public pages (Feature 003 #54; spec #51 "Dates", user story 12).
//
// EmDash stores instants in UTC. Citizens read them in Thai, with the Buddhist Era year, on the
// Bangkok calendar day: "24 ก.ย. 2569". The `th-TH` locale's default calendar is the Buddhist
// one, and Node 24.21.0 (the pinned runtime and node:24.21.0-bookworm-slim image) ships full ICU
// data, so Intl formats this natively.

const THAI_DATE = new Intl.DateTimeFormat("th-TH", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "Asia/Bangkok",
});

/** A stored instant as a Thai date, such as "24 ก.ย. 2569". Throws a RangeError for a non-date. */
export function formatThaiDate(value: Date | string): string {
	return THAI_DATE.format(new Date(value));
}
