// The start of a text as a short description (Feature 003 #56; spec #51 "Errors, redirects,
// preview and SEO"): for a page whose kind has no summary, such as an Announcement, whose meta
// description is the start of its details.
//
// Thai is written without spaces between words, so the cut falls where Intl's Thai word
// segmentation says a word ends; Node 26.13.0 ships full ICU data. A word longer than the whole
// excerpt is cut between grapheme clusters instead, so a character never loses its vowel or tone
// mark.

const WORDS = new Intl.Segmenter("th", { granularity: "word" });
const GRAPHEMES = new Intl.Segmenter("th", { granularity: "grapheme" });

/** The text with its whitespace collapsed, cut to at most `max` characters with "…" at the cut. */
export function excerpt(text: string, max: number): string {
	const flat = text.replace(/\s+/g, " ").trim();
	if (flat.length <= max) return flat;
	const room = max - 1;
	let kept = "";
	for (const { segment } of WORDS.segment(flat)) {
		if (kept.length + segment.length > room) break;
		kept += segment;
	}
	if (kept.trim() === "") {
		for (const { segment } of GRAPHEMES.segment(flat)) {
			if (kept.length + segment.length > room) break;
			kept += segment;
		}
	}
	return `${kept.trimEnd()}…`;
}
