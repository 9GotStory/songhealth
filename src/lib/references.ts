// Reference targets on public pages (Feature 003 #56, #58). EmDash loads a reference field's
// targets without their taxonomy terms (emdash 1.1.0 src/loader.ts loadEntriesByGroups), so a page
// that shows them as rows reads them again by database id (documentsById, healthServicesById).

/** The database ids of a reference field's resolved targets, in the order the field gives them. */
export function targetIds(
	targets: ReadonlyArray<{ data: { id?: unknown } }> | undefined,
): string[] {
	return (targets ?? []).map((target) => String(target.data.id));
}
