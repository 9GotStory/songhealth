// Basic Pages on the public site (Feature 003 #60; spec #51 "Public reads" (Basic Pages), `03` §3
// and §15).
//
// A Basic Page is standalone prose that fits no structured kind (GLOSSARY). Its canonical address
// is /pages/{slug}, with no /pages listing. Two slugs are reserved for the About section: `about`
// renders at /about and `organization` at /about/organization, and their /pages/ addresses
// redirect there permanently, so each page has one canonical URL. Two more are reserved for the
// footer, which links to `privacy` and `accessibility` at their /pages/ addresses only while they
// are published.
//
// Every read goes through EmDash's query functions, which return published entries only unless a
// valid preview token asks for a draft (emdash 1.1.0 src/loader.ts, src/query.ts
// resolveEmDashEntry). Pages never pass a status.

import {
	getEmDashCollection,
	getEmDashEntry,
	type ContentEntry,
	type PortableTextBlock,
} from "emdash";
import { ABOUT_PATH, ORGANIZATION_PATH } from "./about";
import { documentsById, type DocumentEntry } from "./documents";
import { targetIds } from "./references";

/** The reserved slugs that render inside the About section, and their addresses there. */
const ABOUT_SECTION_PAGES: Record<string, string> = {
	about: ABOUT_PATH,
	organization: ORGANIZATION_PATH,
};

/** The reserved Basic Pages the footer links to, in footer order (docs/design/homepage-concept-v1.md §12). */
const FOOTER_PAGES = [
	{ slug: "privacy", label: "นโยบายความเป็นส่วนตัว" },
	{ slug: "accessibility", label: "การเข้าถึงเว็บไซต์" },
] as const;

/** The most related Documents one read returns (emdash 1.1.0 src/references/staged.ts). */
const REFERENCES_LIMIT = 100;

/** A Basic Page's fields (seed/seed.json) and the system fields public pages read. */
interface BasicPageData {
	/** The database id; the entry's own `id` is its slug. */
	id: string;
	title: string;
	summary?: string | null;
	body?: PortableTextBlock[] | null;
	publishedAt?: Date | string | null;
	/** The entry's SEO panel, on a single-entry read. */
	seo?: { title?: string | null; description?: string | null };
}

type BasicPageEntry = ContentEntry<BasicPageData>;

/** A Basic Page as its page renders it: the entry and the published Documents it links to. */
export interface BasicPage {
	entry: BasicPageEntry;
	/** Whether a valid preview token asked for the entry, which may be a draft. */
	isPreview: boolean;
	documents: DocumentEntry[];
}

/** The About section address of a reserved Basic Page slug, or undefined for any other slug. */
export function aboutSectionPath(slug: string): string | undefined {
	return Object.hasOwn(ABOUT_SECTION_PAGES, slug) ? ABOUT_SECTION_PAGES[slug] : undefined;
}

/**
 * A Basic Page's canonical address: its About section address for a reserved slug, else
 * `/pages/{slug}` (`03` §15), encoded as EmDash encodes it.
 */
export function basicPagePath(slug: string): string {
	return aboutSectionPath(slug) ?? `/pages/${encodeURIComponent(slug)}`;
}

/**
 * The Basic Page at `slug` with the published Documents it links to, in the order staff linked
 * them, or undefined when there is none to show. EmDash resolves a reference target only while it
 * is published, or a draft in preview, and loads it without its taxonomy terms, so the rows are
 * read again with them (src/references/resolve.ts, src/loader.ts loadEntriesByGroups).
 */
export async function readBasicPage(slug: string): Promise<BasicPage | undefined> {
	const { entry, isPreview, error } = await getEmDashEntry<
		"pages",
		BasicPageData,
		{ documents: { limit: number } }
	>("pages", slug, { references: { documents: { limit: REFERENCES_LIMIT } } });
	if (error) throw error;
	if (!entry) return undefined;
	const documents = await documentsById(targetIds(entry.references?.documents.entries));
	return { entry, isPreview, documents };
}

/** The footer's links to the reserved Basic Pages that are published, in footer order. */
export async function footerPageLinks(): Promise<{ label: string; href: string }[]> {
	const { entries, error } = await getEmDashCollection<"pages", BasicPageData>("pages", {
		where: { slug: FOOTER_PAGES.map(({ slug }) => slug) },
	});
	if (error) throw error;
	const published = new Set(entries.map((entry) => entry.id));
	return FOOTER_PAGES.filter(({ slug }) => published.has(slug)).map(({ slug, label }) => ({
		label,
		href: basicPagePath(slug),
	}));
}
