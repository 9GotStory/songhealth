// The Service catalog's rules (Feature 003 #58; spec #51 "Public reads" (Services), `00` §8.1,
// `03` §7 and §15). The module has no import, so node:test checks it directly;
// src/lib/services.ts reads through EmDash and uses it.

/** The Service catalog's address. */
const SERVICES_PATH = "/services";

/** The query parameter of the Service Category filter. */
export const CATEGORY_PARAM = "category";

/** The catalog's filter: a Service Category term slug, empty when not set. */
export interface ServiceFilters {
	category: string;
}

/** A Service's canonical address, `/services/{slug}` (`03` §15), encoded as EmDash encodes it. */
export function servicePath(slug: string): string {
	return `${SERVICES_PATH}/${encodeURIComponent(slug)}`;
}

/** The filter a catalog address asks for, trimmed. */
export function parseServiceFilters(params: URLSearchParams): ServiceFilters {
	return { category: params.get(CATEGORY_PARAM)?.trim() ?? "" };
}

/** The catalog's address with the filter when it is set. */
export function servicesPath(filters: Partial<ServiceFilters> = {}): string {
	if (!filters.category) return SERVICES_PATH;
	return `${SERVICES_PATH}?${new URLSearchParams({ [CATEGORY_PARAM]: filters.category })}`;
}

/** Who actually provides a Service (`00` §8.1), as the select field stores it. */
export type OwnershipType =
	"direct" | "coordinated" | "related_health_service" | "external_digital";

/**
 * Each ownership type as citizens read it: who actually provides the Service, so that no one
 * takes the office for the provider of every Service on its website (`00` §8.1).
 */
export const OWNERSHIP_LABELS: Record<OwnershipType, string> = {
	direct: "สำนักงานสาธารณสุขอำเภอสองให้บริการเอง",
	coordinated: "สำนักงานสาธารณสุขอำเภอสองรับเรื่องและประสานให้ โดยมีหน่วยงานอื่นร่วมดำเนินการ",
	related_health_service:
		"หน่วยบริการสุขภาพที่เกี่ยวข้อง เช่น โรงพยาบาลหรือ รพ.สต. เป็นผู้ให้บริการ",
	external_digital: "หน่วยงานภายนอกให้บริการทางออนไลน์ เว็บไซต์นี้แนะนำช่องทางเข้าถึงเท่านั้น",
};

/** A Portable Text block as a guidance field stores it; only what the emptiness rule reads. */
interface GuidanceBlock {
	_type: string;
	children?: ReadonlyArray<{ text?: string }>;
}

/**
 * Whether a Portable Text guidance field holds anything to show: a paragraph with text in it, or a
 * block that is not a paragraph, such as an image. A field the editor left or cleared to empty
 * paragraphs holds nothing.
 */
export function hasGuidance(blocks: readonly GuidanceBlock[] | null | undefined): boolean {
	return (blocks ?? []).some(
		(block) => block._type !== "block" || (block.children ?? []).some((span) => span.text?.trim()),
	);
}
