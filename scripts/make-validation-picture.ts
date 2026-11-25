// The validation picture of the T016 lifecycle harness (#454; spec #450 "T022, T028 and the
// validation fixture"): a plain teal 96×32 PNG, the size and colour of T015's lost picture.
//
//   node scripts/make-validation-picture.ts [output]   (default: the committed picture)
//
// Its bytes depend on nothing but this file: the pixels go into stored (uncompressed) deflate
// blocks, so no zlib version can change them, and each run writes the same bytes. The harness
// holds their SHA-256 as MEDIA_EXPECTED_SHA256 (tests/operations/verify-foundation.sh), and its
// --self-test checks the committed file and a fresh run against that digest.

import { writeFileSync } from "node:fs";
import { crc32 } from "node:zlib";

const WIDTH = 96;
const HEIGHT = 32;
const TEAL = [0x0d, 0x94, 0x88];
const DEFAULT_OUTPUT = "tests/operations/fixtures/validation-picture.png";

function chunk(type: string, data: Buffer): Buffer {
	const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typeAndData));
	return Buffer.concat([length, typeAndData, crc]);
}

function adler32(data: Buffer): number {
	let a = 1;
	let b = 0;
	for (const byte of data) {
		a = (a + byte) % 65521;
		b = (b + a) % 65521;
	}
	return ((b << 16) | a) >>> 0;
}

// A zlib stream of one stored block (RFC 1950 and RFC 1951 §3.2.4); one block holds 65,535 bytes.
function storedZlib(data: Buffer): Buffer {
	if (data.length > 0xffff) throw new Error("the picture's rows exceed one stored block");
	const header = Buffer.from([0x78, 0x01, 0x01, 0, 0, 0, 0]);
	header.writeUInt16LE(data.length, 3);
	header.writeUInt16LE(~data.length & 0xffff, 5);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(adler32(data));
	return Buffer.concat([header, data, checksum]);
}

const row = Buffer.concat([
	Buffer.from([0]),
	Buffer.from(Array.from({ length: WIDTH }, () => TEAL).flat()),
]);
const pixels = Buffer.concat(Array.from({ length: HEIGHT }, () => row));

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, deflate, adaptive filtering, no interlace

const png = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	chunk("IHDR", ihdr),
	chunk("IDAT", storedZlib(pixels)),
	chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(process.argv[2] ?? DEFAULT_OUTPUT, png);
