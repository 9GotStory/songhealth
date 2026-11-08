// The file list of the Legacy site's uploads copy, a zip of `wp-content` (#177; spec #174
// "Source"). It reads only the zip's central directory, with Node's own file API, so the 1.3 GB
// copy is never read whole and no zip package joins the dependencies (spec #174: no other
// dependency). The layout is PKWARE's APPNOTE.TXT, sections 4.3.12 and 4.3.16.

import { open } from "node:fs/promises";

/** The signatures of the end of central directory record and of a central directory header. */
const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_HEADER = 0x02014b50;

/** The end record's size without its comment, and the comment's largest size. */
const END_SIZE = 22;
const MAX_COMMENT = 0xffff;

/**
 * The names of a zip's entries, folders (ending in "/") included, in the directory's order. Each
 * name reads as UTF-8 whether its entry sets the UTF-8 flag or not, as the uploads copy's names
 * are, and an invalid byte reads as U+FFFD, such as in a name cut inside a character. A ZIP64
 * archive, which a copy over 4 GB or 65,535 entries needs, is refused.
 */
export async function readZipNames(path: string): Promise<string[]> {
	const file = await open(path, "r");
	try {
		const { size } = await file.stat();
		const tailSize = Math.min(size, END_SIZE + MAX_COMMENT);
		const tail = Buffer.alloc(tailSize);
		await file.read(tail, 0, tailSize, size - tailSize);
		let end = tailSize - END_SIZE;
		while (end >= 0 && tail.readUInt32LE(end) !== END_OF_DIRECTORY) end--;
		if (end < 0) throw new Error(`${path} is not a zip: it has no end of central directory`);
		const entries = tail.readUInt16LE(end + 10);
		const directorySize = tail.readUInt32LE(end + 12);
		const directoryOffset = tail.readUInt32LE(end + 16);
		if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
			throw new Error(`${path} is a ZIP64 archive, which this script does not read`);
		}
		const directory = Buffer.alloc(directorySize);
		await file.read(directory, 0, directorySize, directoryOffset);
		const decoder = new TextDecoder("utf-8");
		const names: string[] = [];
		for (let at = 0, index = 0; index < entries; index++) {
			if (directory.readUInt32LE(at) !== DIRECTORY_HEADER) {
				throw new Error(`${path}: central directory entry ${index + 1} is damaged`);
			}
			const nameLength = directory.readUInt16LE(at + 28);
			const extraLength = directory.readUInt16LE(at + 30);
			const commentLength = directory.readUInt16LE(at + 32);
			names.push(decoder.decode(directory.subarray(at + 46, at + 46 + nameLength)));
			at += 46 + nameLength + extraLength + commentLength;
		}
		return names;
	} finally {
		await file.close();
	}
}
