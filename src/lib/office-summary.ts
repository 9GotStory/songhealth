// The office summary sentence (docs/design/homepage-concept-v1.md §11): the Homepage hero's
// headline and the page's description (Feature 008 #241; spec #239
// "Hero and Featured"). The module imports nothing, so node:test checks it directly.

/** One line of the hero's headline from `lg`: its text, then the words the headline marks. */
export interface HeadlineLine {
	text: string;
	/** The words shown in accent-warm, which end the line. */
	marked?: string;
}

/**
 * The sentence as the hero's headline breaks it from `lg`: three fixed lines, with "ด้านสุขภาพ"
 * marked. A line carries the space that follows it in the sentence.
 */
export const OFFICE_SUMMARY_LINES: readonly HeadlineLine[] = [
	{ text: "ศูนย์กลางข้อมูล บริการ " },
	{ text: "และการประสานงาน", marked: "ด้านสุขภาพ" },
	{ text: "ของประชาชนในอำเภอสอง จังหวัดแพร่" },
];

/** The sentence whole, as the lines read one after another. */
export const OFFICE_SUMMARY = OFFICE_SUMMARY_LINES.map(
	({ text, marked = "" }) => text + marked,
).join("");
