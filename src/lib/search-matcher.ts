// The search's rules (Feature 003 #63; spec #51 "Search", ADR 0002, `08`).
//
// src/lib/search.ts reads the published entries of the searchable collections when a search is
// made. This module holds the rules for what a search asks and what it finds: reading the request,
// normalising text, matching, ranking, grouping and building snippets. It imports only
// src/lib/pagination.ts, which has no import, so node:test checks it directly.

import { PAGE_PARAM, parsePageNumber } from "./pagination.ts";

/** The query parameter that carries the query. */
export const QUERY_PARAM = "q";

/** The query parameter that narrows the results to one group. */
export const GROUP_PARAM = "group";

/** The fewest characters a query has after normalisation. */
const MIN_QUERY_LENGTH = 2;

/** The most characters of a query the search reads. */
export const MAX_QUERY_LENGTH = 100;

/** The most characters of text a snippet shows, as many as a page's meta description. */
export const SNIPPET_LENGTH = 160;

/** About how many characters of text a cut snippet keeps before the first match. */
const SNIPPET_LEAD = 40;

/** The fixed number of results a page shows, as many as a Document list (src/lib/documents.ts). */
export const SEARCH_PAGE_SIZE = 20;

/**
 * The kinds of content the search finds, one per searchable collection, each as citizens read it:
 * the GLOSSARY's Thai names, except two that are pending the Product Owner (#63). A Health Service
 * is shortened from หน่วยบริการสุขภาพที่เกี่ยวข้อง, and a Basic Page (หน้าเนื้อหาพื้นฐาน) reads as หน้าข้อมูล.
 */
export const KIND_LABELS = {
	news: "ข่าว",
	activity: "กิจกรรม",
	announcement: "ประกาศ",
	service: "บริการประชาชน",
	health_service: "หน่วยบริการสุขภาพ",
	health_content: "ความรู้สุขภาพ",
	health_report: "รายงานสุขภาพ",
	document: "เอกสารเผยแพร่",
	page: "หน้าข้อมูล",
} as const;

export type SearchKind = keyof typeof KIND_LABELS;

/**
 * The result groups (`08` §7, spec #51 "Search"), in the order the page offers them, each by its
 * `group` query value and the kinds it holds; ทุกประเภท holds every kind. A group is a filter, not a
 * kind of content.
 */
export const SEARCH_GROUPS = [
	{ id: "all", label: "ทุกประเภท", kinds: Object.keys(KIND_LABELS) as SearchKind[] },
	{ id: "news", label: "ข่าวสาร", kinds: ["news", "activity", "announcement"] },
	{ id: "services", label: "บริการประชาชน", kinds: ["service"] },
	{ id: "health", label: "ข้อมูลสุขภาพ", kinds: ["health_content", "health_report"] },
	{ id: "health-services", label: "หน่วยบริการ", kinds: ["health_service"] },
	{ id: "documents", label: "เอกสาร", kinds: ["document"] },
	{ id: "about", label: "เกี่ยวกับเรา", kinds: ["page"] },
] as const satisfies ReadonlyArray<{ id: string; label: string; kinds: readonly SearchKind[] }>;

export type SearchGroup = (typeof SEARCH_GROUPS)[number];

type SearchGroupId = SearchGroup["id"];

/** The group a `group` value asks for; any value that names none is ทุกประเภท. */
export function parseGroup(raw: string | null): SearchGroup {
	return SEARCH_GROUPS.find((group) => group.id === raw) ?? SEARCH_GROUPS[0];
}

/** Whether a group holds the kind. */
function holds(group: SearchGroup, kind: SearchKind): boolean {
	return (group.kinds as readonly SearchKind[]).includes(kind);
}

/** Zero-width space, non-joiner and joiner, and the byte order mark. */
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

/** Text as it is shown: zero-width characters removed, NFC, whitespace collapsed and trimmed. */
function displayText(text: string): string {
	return text.replace(ZERO_WIDTH, "").normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * Text with each character lower-cased on its own, so the folded text maps back to the shown text
 * character by character. Thai has no letter case.
 */
function fold(text: string): string {
	return Array.from(text, (character) => character.toLowerCase()).join("");
}

/**
 * Text as the search compares it: NFC, Latin letters lower-cased, zero-width characters removed
 * and whitespace collapsed (spec #51 "Search", Normalisation).
 */
export function normalizeText(text: string): string {
	return fold(displayText(text));
}

/**
 * What a query asks for, with its text as the search reads it: nothing when the address carries
 * no query, too little below MIN_QUERY_LENGTH characters (an empty query included), else its
 * terms.
 */
export type ParsedQuery =
	| { kind: "none" }
	| { kind: "too-short"; text: string }
	| { kind: "terms"; text: string; terms: string[] };

/**
 * The query a `q` value asks for. Its text is normalised but keeps its letter case, so the page can
 * show it as typed, and is capped at MAX_QUERY_LENGTH characters. It splits on whitespace into its
 * terms, normalised and each kept once.
 */
export function parseQuery(raw: string | null): ParsedQuery {
	if (raw === null) return { kind: "none" };
	const text = [...displayText(raw)].slice(0, MAX_QUERY_LENGTH).join("").trimEnd();
	if ([...text].length < MIN_QUERY_LENGTH) return { kind: "too-short", text };
	return { kind: "terms", text, terms: [...new Set(fold(text).split(" "))] };
}

/** What a search asks for: the query, the group and the page. */
export interface SearchRequest {
	query: ParsedQuery;
	group: SearchGroup;
	page: number;
}

/**
 * The search an address asks for, by `?q=`, `?group=` and `?page=`. A group or page number that is
 * not one is ignored, so a hand-edited or stale link never fails.
 */
export function parseSearchRequest(params: URLSearchParams): SearchRequest {
	return {
		query: parseQuery(params.get(QUERY_PARAM)),
		group: parseGroup(params.get(GROUP_PARAM)),
		page: parsePageNumber(params.get(PAGE_PARAM)),
	};
}

/** A published entry as the search reads it: its kind, its text by tier, and its list date. */
export interface Searchable {
	kind: SearchKind;
	/** The entry's text by tier: its title and other names, its summary, its body as plain text. */
	text: { title: string[]; summary: string[]; body: string[] };
	/** The date the entry is listed by (ADR 0004); the newer entry wins a tie. */
	listDate?: Date | string | null;
}

/** One result: the entry and its snippet. */
interface SearchResult<E> {
	entry: E;
	snippet: string;
}

/** One page of results, and the number of results in each group. */
export interface SearchPage<E> {
	results: SearchResult<E>[];
	counts: Record<SearchGroupId, number>;
	hasMore: boolean;
}

/** An entry's text by tier, title first, normalised once per search. */
function tiersOf(entry: Searchable): string[][] {
	const { title, summary, body } = entry.text;
	return [title, summary, body].map((texts) => texts.map(normalizeText));
}

/**
 * The entry's score for the terms, or undefined unless every term appears in one of its texts. The
 * score counts the terms by the best tier each one hits: how many hit the title, how many hit the
 * summary at best, and how many only the body.
 */
function scoreOf(tiers: string[][], terms: string[]): number[] | undefined {
	const score = tiers.map(() => 0);
	for (const term of terms) {
		const best = tiers.findIndex((texts) => texts.some((text) => text.includes(term)));
		if (best === -1) return undefined;
		score[best] += 1;
	}
	return score;
}

/** The instant's time in milliseconds, or undefined when it is not set or not a date. */
function timeOf(value: Searchable["listDate"]): number | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? undefined : time;
}

/** A matched entry with what orders it. */
interface Ranked<E> {
	entry: E;
	tiers: string[][];
	score: number[];
	time: number;
}

/**
 * Higher scores first, by title hits, then summary hits; a tie goes to the newer entry, and an
 * entry without a date comes after those with one. The sort is stable, so a full tie keeps the
 * order given.
 */
function byRank<E>(a: Ranked<E>, b: Ranked<E>): number {
	for (let tier = 0; tier < a.score.length; tier += 1) {
		if (a.score[tier] !== b.score[tier]) return b.score[tier] - a.score[tier];
	}
	return a.time === b.time ? 0 : a.time < b.time ? 1 : -1;
}

const WORDS = new Intl.Segmenter("th", { granularity: "word" });
const GRAPHEMES = new Intl.Segmenter("th", { granularity: "grapheme" });

/** Where each segment of the text starts, and its end. */
function boundaries(segmenter: Intl.Segmenter, text: string): number[] {
	return [...Array.from(segmenter.segment(text), ({ index }) => index), text.length];
}

/** A stretch of a text, from `start` up to `end`. */
interface Span {
	start: number;
	end: number;
}

/**
 * Where the terms appear in a shown text, each widened to whole characters with their vowel and
 * tone marks, and merged where they overlap or touch, in order.
 */
function hitsIn(text: string, terms: string[]): Span[] {
	// The folded text, and for each of its code units the span of the shown character it folds.
	let folded = "";
	const sourceOf: Span[] = [];
	for (let index = 0; index < text.length;) {
		const character = String.fromCodePoint(text.codePointAt(index)!);
		const lower = character.toLowerCase();
		for (let unit = 0; unit < lower.length; unit += 1) {
			sourceOf.push({ start: index, end: index + character.length });
		}
		folded += lower;
		index += character.length;
	}
	const graphemes = boundaries(GRAPHEMES, text);
	const spans: Span[] = [];
	for (const term of terms) {
		for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + 1)) {
			const start = sourceOf[at].start;
			const end = sourceOf[at + term.length - 1].end;
			spans.push({
				start: graphemes.findLast((bound) => bound <= start)!,
				end: graphemes.find((bound) => bound >= end)!,
			});
		}
	}
	spans.sort((a, b) => a.start - b.start);
	const merged: Span[] = [];
	for (const span of spans) {
		const last = merged.at(-1);
		if (last !== undefined && span.start <= last.end) last.end = Math.max(last.end, span.end);
		else merged.push({ ...span });
	}
	return merged;
}

/**
 * The part of a text a snippet shows: all of a short text, else up to SNIPPET_LENGTH characters
 * starting about SNIPPET_LEAD characters before the first match. Each cut falls between words
 * within SNIPPET_LEAD characters before where it aims, else between characters, inside a word too
 * long for the snippet. The first match always shows whole.
 */
function windowOf(text: string, first: Span | undefined): Span {
	if (text.length <= SNIPPET_LENGTH) return { start: 0, end: text.length };
	const words = boundaries(WORDS, text);
	const graphemes = boundaries(GRAPHEMES, text);
	const cutBefore = (aim: number, after: number) =>
		words.findLast((bound) => bound <= aim && bound > Math.max(after, aim - SNIPPET_LEAD)) ??
		graphemes.findLast((bound) => bound <= aim)!;
	const start = cutBefore(Math.max(0, (first?.start ?? 0) - SNIPPET_LEAD), -1);
	const end = cutBefore(start + SNIPPET_LENGTH, start);
	return { start, end: Math.max(end, first?.end ?? 0) };
}

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/**
 * An entry's snippet as HTML: the first summary or body text a term appears in, else the first
 * summary or body text there is, shown around its first match with every term marked, and escaped.
 * A cut is marked with "…".
 */
function snippetOf(entry: Searchable, tiers: string[][], terms: string[]): string {
	const texts = [...entry.text.summary, ...entry.text.body];
	const normalized = [...tiers[1], ...tiers[2]];
	const hit = normalized.findIndex((text) => terms.some((term) => text.includes(term)));
	const source = hit === -1 ? texts.find((text) => displayText(text) !== "") : texts[hit];
	if (source === undefined) return "";
	const text = displayText(source);
	const hits = hitsIn(text, terms);
	const shown = windowOf(text, hits[0]);
	let html = shown.start > 0 ? "…" : "";
	let at = shown.start;
	for (const { start, end } of hits) {
		if (end <= shown.start || start >= shown.end) continue;
		const from = Math.max(start, shown.start);
		const to = Math.min(end, shown.end);
		html += `${escapeHtml(text.slice(at, from))}<mark>${escapeHtml(text.slice(from, to))}</mark>`;
		at = to;
	}
	html += escapeHtml(text.slice(at, shown.end));
	return shown.end < text.length ? `${html}…` : html;
}

/** Page `page` (from 1) of the entries that match every term in `group`, best first. */
export function searchPage<E extends Searchable>(
	entries: readonly E[],
	terms: string[],
	group: SearchGroup,
	page: number,
): SearchPage<E> {
	const ranked: Ranked<E>[] = [];
	for (const entry of entries) {
		const tiers = tiersOf(entry);
		const score = scoreOf(tiers, terms);
		if (score === undefined) continue;
		ranked.push({ entry, tiers, score, time: timeOf(entry.listDate) ?? Number.NEGATIVE_INFINITY });
	}
	ranked.sort(byRank);
	const counts = Object.fromEntries(
		SEARCH_GROUPS.map((each) => [
			each.id,
			ranked.filter(({ entry }) => holds(each, entry.kind)).length,
		]),
	) as Record<SearchGroupId, number>;
	const inGroup = ranked.filter(({ entry }) => holds(group, entry.kind));
	const start = (page - 1) * SEARCH_PAGE_SIZE;
	return {
		results: inGroup
			.slice(start, start + SEARCH_PAGE_SIZE)
			.map(({ entry, tiers }) => ({ entry, snippet: snippetOf(entry, tiers, terms) })),
		counts,
		hasMore: inGroup.length > start + SEARCH_PAGE_SIZE,
	};
}
