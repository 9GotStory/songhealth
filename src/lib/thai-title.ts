// Thai titles that keep compound words whole (Feature 006 #145; spec #144 "Shared: Thai titles keep
// compound words whole").
//
// A browser breaks a Thai line where its dictionary (ICU) ends a word, and that dictionary splits
// compounds that read as one word: "เบา|หวาน", "อำเภอ|สอง", "ครั้ง|ที่" (Node 26.13.0's
// Intl.Segmenter("th") gives the same splits). A title splits into runs: each word of the curated
// list below is a run kept together, and the text around it is plain. ThaiTitle.astro renders a
// kept run so that a line cannot break inside it and leaves the text as it is, so copied text and
// search read the title as written.
//
// At each place the longest listed word that starts there is kept, so "ความดันโลหิตสูง" wins over
// "ความดันโลหิต" and "ตรวจคัดกรอง" over "คัดกรอง", and every occurrence is kept. Two listed words
// side by side stay two runs, so a line can still break between them, as the header's
// "สำนักงานสาธารณสุข" / "อำเภอสอง" does. A run holds the title's characters as they are: the page
// escapes each run as it renders it (astro 7.3.5 dist/runtime/server/render/any.js renderChild).
//
// A listed word has at most 15 characters, so a kept run fits the narrowest card column. The list
// is curated: a compound it does not name can still break, and a word that a reported bad break
// shows joins it in a later change.

/** The most characters (Unicode code points) a listed word may have. */
const KEPT_WORD_MAX = 15;

/** The Thai compound words a title keeps on one line, as spec #144 lists them. */
const KEPT_WORDS = [
	"เบาหวาน",
	"ความดันโลหิตสูง",
	"ความดันโลหิต",
	"ปฏิบัติงาน",
	"อำเภอสอง",
	"จังหวัดแพร่",
	"สาธารณสุข",
	"ไข้เลือดออก",
	"ไข้หวัดใหญ่",
	"ผู้สูงอายุ",
	"ยุงลาย",
	"สมองเสื่อม",
	"หกล้ม",
	"อัมพาต",
	"คุณภาพชีวิต",
	"ประชาสัมพันธ์",
	"อาสาสมัคร",
	"ตรวจคัดกรอง",
	"คัดกรอง",
	"ประจำปี",
	"ครั้งที่",
	"ห่างไกล",
	"ออกกำลังกาย",
	"ประจำหมู่บ้าน",
	"หลังคาเรือน",
	"เครือข่าย",
];

/** A part of a title: a listed word kept together, or the plain text around it. */
export interface TitleRun {
	text: string;
	keep: boolean;
}

/**
 * A function that splits a title into runs by `words`. A word that is empty or longer than
 * KEPT_WORD_MAX is refused with a RangeError.
 */
export function titleSplitter(words: readonly string[]): (title: string) => TitleRun[] {
	for (const word of words) {
		const length = [...word].length;
		if (length === 0 || length > KEPT_WORD_MAX) {
			throw new RangeError(
				`a kept word has 1 to ${KEPT_WORD_MAX} characters: "${word}" has ${length}`,
			);
		}
	}
	const longestFirst = [...words].sort((a, b) => b.length - a.length);
	return (title) => {
		const runs: TitleRun[] = [];
		let plainFrom = 0;
		let at = 0;
		while (at < title.length) {
			const word = longestFirst.find((candidate) => title.startsWith(candidate, at));
			if (word === undefined) {
				at += 1;
				continue;
			}
			if (plainFrom < at) runs.push({ text: title.slice(plainFrom, at), keep: false });
			runs.push({ text: word, keep: true });
			at += word.length;
			plainFrom = at;
		}
		if (plainFrom < title.length) runs.push({ text: title.slice(plainFrom), keep: false });
		return runs;
	};
}

/** `title` split into runs by the Thai keep-together list. */
export const titleRuns = titleSplitter(KEPT_WORDS);
