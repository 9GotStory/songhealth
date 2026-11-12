// Dates on public pages (Feature 003 #54; spec #51 "Dates", user story 12).
//
// EmDash stores instants in UTC. Citizens read them in Thai, with the Buddhist Era year, on the
// Bangkok calendar day: "24 ก.ย. 2569". The `th-TH` locale's default calendar is the Buddhist
// one, and Node 26.13.0 (the pinned runtime and node:26.13.0-bookworm-slim image) ships full ICU
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

const THAI_DAY = new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "Asia/Bangkok" });

const THAI_MONTH_AND_YEAR = new Intl.DateTimeFormat("th-TH", {
	month: "short",
	year: "numeric",
	timeZone: "Asia/Bangkok",
});

/**
 * A stored instant's Thai date in two parts, such as "24" and "ก.ย. 2569", for a date tile that
 * shows the day large (Feature 008 #245). Throws a RangeError for a non-date.
 */
export function thaiDateParts(value: Date | string): { day: string; monthAndYear: string } {
	const date = new Date(value);
	return { day: THAI_DAY.format(date), monthAndYear: THAI_MONTH_AND_YEAR.format(date) };
}
