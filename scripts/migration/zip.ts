// The Legacy site's uploads copy, a zip of `wp-content` (#177, #178; spec #174 "Source"). It reads
// the zip's central directory, then each file it is asked for, with Node's own file API and
// `node:zlib`, so the 1.3 GB copy is never read whole and no zip package joins the dependencies
// (spec #174: no other dependency). The layout is PKWARE's APPNOTE.TXT, sections 4.3.7, 4.3.12 and
// 4.3.16.

import { open, type FileHandle } from "node:fs/promises";
import { crc32, inflateRawSync } from "node:zlib";

/** The signatures of the end of central directory record, its headers and a local file header. */
const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_HEADER = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

/** The end record's size without its comment, and the comment's largest size. */
const END_SIZE = 22;
const MAX_COMMENT = 0xffff;

/** A local file header's size without its name and extra field. */
const LOCAL_HEADER_SIZE = 30;

/** The compression methods the copy uses (APPNOTE.TXT 4.4.5). */
const STORED = 0;
const DEFLATED = 8;

/** Where a file lies in the zip, as the central directory records it. */
interface Entry {
	method: number;
	checksum: number;
	compressedSize: number;
	offset: number;
}

/** An open zip. */
export interface Zip {
	/** The names of its entries, folders (ending in "/") included, in the directory's order. */
	names: string[];
	/** The bytes of the entry `name`. Refuses a name it lacks, or a file that fails its checksum. */
	read(name: string): Promise<Buffer>;
	close(): Promise<void>;
}

/** The central directory's entries, by name, in the directory's order. */
async function readDirectory(file: FileHandle, path: string): Promise<Map<string, Entry>> {
	const { size } = await file.stat();
	const tailSize = Math.min(size, END_SIZE + MAX_COMMENT);
	const tail = Buffer.alloc(tailSize);
	await file.read(tail, 0, tailSize, size - tailSize);
	let end = tailSize - END_SIZE;
	while (end >= 0 && tail.readUInt32LE(end) !== END_OF_DIRECTORY) end--;
	if (end < 0) throw new Error(`${path} is not a zip: it has no end of central directory`);
	const count = tail.readUInt16LE(end + 10);
	const directorySize = tail.readUInt32LE(end + 12);
	const directoryOffset = tail.readUInt32LE(end + 16);
	if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
		throw new Error(`${path} is a ZIP64 archive, which this script does not read`);
	}
	const directory = Buffer.alloc(directorySize);
	await file.read(directory, 0, directorySize, directoryOffset);
	const decoder = new TextDecoder("utf-8");
	const entries = new Map<string, Entry>();
	for (let at = 0, index = 0; index < count; index++) {
		if (directory.readUInt32LE(at) !== DIRECTORY_HEADER) {
			throw new Error(`${path}: central directory entry ${index + 1} is damaged`);
		}
		const nameLength = directory.readUInt16LE(at + 28);
		const extraLength = directory.readUInt16LE(at + 30);
		const commentLength = directory.readUInt16LE(at + 32);
		entries.set(decoder.decode(directory.subarray(at + 46, at + 46 + nameLength)), {
			method: directory.readUInt16LE(at + 10),
			checksum: directory.readUInt32LE(at + 16),
			compressedSize: directory.readUInt32LE(at + 20),
			offset: directory.readUInt32LE(at + 42),
		});
		at += 46 + nameLength + extraLength + commentLength;
	}
	return entries;
}

/**
 * Opens a zip. Each name reads as UTF-8 whether its entry sets the UTF-8 flag or not, as the
 * uploads copy's names are, and an invalid byte reads as U+FFFD, such as in a name cut inside a
 * character. A ZIP64 archive, which a copy over 4 GB or 65,535 entries needs, is refused.
 */
export async function openZip(path: string): Promise<Zip> {
	const file = await open(path, "r");
	let entries: Map<string, Entry>;
	try {
		entries = await readDirectory(file, path);
	} catch (error) {
		await file.close();
		throw error;
	}
	return {
		names: [...entries.keys()],
		async read(name) {
			const entry = entries.get(name);
			if (entry === undefined) throw new Error(`${name} is not in ${path}`);
			const header = Buffer.alloc(LOCAL_HEADER_SIZE);
			await file.read(header, 0, LOCAL_HEADER_SIZE, entry.offset);
			if (header.readUInt32LE(0) !== LOCAL_HEADER) throw new Error(`${name} is damaged in ${path}`);
			const dataOffset =
				entry.offset + LOCAL_HEADER_SIZE + header.readUInt16LE(26) + header.readUInt16LE(28);
			const data = Buffer.alloc(entry.compressedSize);
			await file.read(data, 0, entry.compressedSize, dataOffset);
			if (entry.method !== STORED && entry.method !== DEFLATED) {
				throw new Error(
					`${name} uses compression method ${entry.method}, which this script does not read`,
				);
			}
			const bytes = entry.method === DEFLATED ? inflateRawSync(data) : data;
			if (crc32(bytes) !== entry.checksum) throw new Error(`${name} is damaged in ${path}`);
			return bytes;
		},
		close: () => file.close(),
	};
}

/** The names of a zip's entries: see openZip. */
export async function readZipNames(path: string): Promise<string[]> {
	const zip = await openZip(path);
	await zip.close();
	return zip.names;
}
