// The published MOITs, read through EmDash (Feature 004 #124; spec #121 "Public routes", ADR 0006).
//
// The ITA landing lists the fiscal years of every published MOIT, a year's page lists that year's
// MOITs, and a MOIT's page leads to the MOITs before and after it in its year. ADR 0006 keeps no
// year record, so the years come from the MOITs themselves. EmDash's query functions return
// published entries only, and no query returns distinct values or a count (emdash 1.1.0
// src/query.ts), so the landing reads every published MOIT and src/lib/ita.ts counts them by year,
// as the lists of ADR 0004 read their whole collection. A year's read filters the fiscal_year
// column (src/loader.ts). src/lib/ita.ts orders what either read returns.

import { getEmDashCollection, type ContentEntry } from "emdash";
import type { MoitData } from "./ita";

export type MoitEntry = ContentEntry<MoitData>;

/** Every published MOIT, or the published MOITs of fiscal year `year`, in no particular order. */
export async function publishedMoits(year?: number): Promise<MoitEntry[]> {
	const { entries, error } = await getEmDashCollection<"moit", MoitData>(
		"moit",
		year === undefined ? undefined : { where: { fiscal_year: String(year) } },
	);
	if (error) throw error;
	return entries;
}
