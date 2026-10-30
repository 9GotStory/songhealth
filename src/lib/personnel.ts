// Personnel on the public site (Feature 003 #61; spec #51 "Public reads" (About), `03` §5).
//
// Personnel is non-routable: a person has no page of their own (`03` §5), so /about/leadership and
// /about/personnel show each person in full and link to none. Every read goes through EmDash's
// query functions, which return published entries only (emdash 1.1.0 src/loader.ts); a query
// without a `limit` returns every one (src/loader.ts `fetchLimit`). A district office has a few
// dozen staff. src/lib/personnel-directory.ts keeps the publicly visible ones and orders them.

import { getEmDashCollection, type ContentEntry } from "emdash";
import type { ImageFieldValue } from "./news";
import {
	leadership,
	personnelByUnit,
	type PersonnelData as DirectoryData,
	type UnitGroup,
} from "./personnel-directory";

/** A Personnel entry's fields (seed/seed.json) and the system fields public pages read. */
interface PersonnelData extends DirectoryData {
	/** The database id; Personnel is non-routable, so the slug may be empty. */
	id: string;
	profile_image?: ImageFieldValue | null;
	/** The person's current position or assignment. */
	current_assignment?: string | null;
	public_contact?: string | null;
}

export type PersonnelEntry = ContentEntry<PersonnelData>;

async function listPublishedPersonnel(): Promise<PersonnelEntry[]> {
	const { entries, error } = await getEmDashCollection<"personnel", PersonnelData>("personnel");
	if (error) throw error;
	return entries;
}

/** The Leadership, in rank order. */
export async function listLeadership(): Promise<PersonnelEntry[]> {
	return leadership(await listPublishedPersonnel());
}

/** The publicly visible Personnel by organizational unit. */
export async function listPersonnelByUnit(): Promise<UnitGroup<PersonnelEntry>[]> {
	return personnelByUnit(await listPublishedPersonnel());
}
