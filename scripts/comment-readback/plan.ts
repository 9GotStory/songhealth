// Whether a posted issue comment's body is the file it was posted from (#421 retro item 3: a
// read-back by hand twice met a trailing empty line, and once the log said the body matched).
// GitHub may hold the body with CRLF line ends and without the file's last newline, so both sides
// are read with LF ends and without white space at their end.

const lines = (text: string) => text.replaceAll("\r\n", "\n").trimEnd().split("\n");

const quoted = (line: string | undefined) =>
	line === undefined ? "(ended)" : JSON.stringify(line);

/** "matches", or the first line, counted from 1, where the posted body and the file differ. */
export function compareBodies(posted: string, file: string): string {
	const one = lines(posted);
	const other = lines(file);
	let at = 0;
	while (at < Math.max(one.length, other.length) && one[at] === other[at]) at++;
	if (at === one.length && at === other.length) return "matches";
	return `differs at line ${at + 1}: posted ${quoted(one[at])}  |  file ${quoted(other[at])}`;
}
