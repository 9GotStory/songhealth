// Pull-request screenshots of public pages that need content to show: make synthetic content
// through the native API, capture it with capture-screenshots.mjs, then remove everything that
// was made, even when a step fails.
//
//   SONGHEALTH_DEV_ACCESS=~/.local/state/songhealth-qdev/dev-pat \
//     node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/<name>.ts <out-dir>
//
// A fixtures module's default export receives a FixtureKit and returns the paths to capture.
// Titles start with "[ตัวอย่าง]", like the demo dataset. Every slug carries the synthetic mark, so
// scripts/dev-runtime-residue.sh finds anything a failed cleanup leaves. The origin is
// PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, deflateSync } from "node:zlib";

import * as helpers from "../tests/browser/cms.helpers.ts";

export interface FixtureKit {
	admin: helpers.CmsActor;
	helpers: typeof helpers;
	/** A new term of `taxonomy`; returns its slug. */
	term(taxonomy: string, label: string): Promise<string>;
	/** A new 1200×750 picture, a diagonal blend of two hex colours, with `alt`; returns its id. */
	picture(alt: string, from: string, to: string): Promise<string>;
	/** One Portable Text block of `style` (normal, h2, …), the shape the Admin editor saves. */
	block(text: string, style?: string): Record<string, unknown>;
}

export type Fixtures = (kit: FixtureKit) => Promise<string[]>;

const [fixturesPath, outDir] = process.argv.slice(2);
if (fixturesPath === undefined || outDir === undefined) {
	console.error("usage: node scripts/capture-with-fixtures.ts <fixtures-module> <out-dir>");
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A PNG of `width`×`height` RGB pixels from `colour(x, y)`. */
function png(width: number, height: number, colour: (x: number, y: number) => number[]): Buffer {
	const chunk = (type: string, data: Buffer) => {
		const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
		const framed = Buffer.alloc(body.length + 8);
		framed.writeUInt32BE(data.length, 0);
		body.copy(framed, 4);
		framed.writeUInt32BE(crc32(body), body.length + 4);
		return framed;
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
	const rows = Buffer.alloc((width * 3 + 1) * height);
	for (let y = 0; y < height; y += 1) {
		const row = y * (width * 3 + 1); // each row starts with filter type 0
		for (let x = 0; x < width; x += 1) rows.set(colour(x, y), row + 1 + x * 3);
	}
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(rows)),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

function rgb(hex: string): number[] {
	return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

const admin = await helpers.createPatActor({
	baseUrl: origin,
	token: await helpers.loadDevAccessToken(),
	expected: { role: helpers.NATIVE_ROLES.administrator },
});
const terms: helpers.SyntheticTerm[] = [];
const media: string[] = [];

const kit: FixtureKit = {
	admin,
	helpers,
	async term(taxonomy, label) {
		const term = await helpers.createSyntheticTerm(admin, taxonomy, label);
		terms.push(term);
		return term.slug;
	},
	async picture(alt, from, to) {
		const [a, b] = [rgb(from), rgb(to)];
		const bytes = png(1200, 750, (x, y) => {
			const t = (x / 1200 + y / 750) / 2;
			return a.map((channel, index) => Math.round(channel + (b[index] - channel) * t));
		});
		const form = new FormData();
		const name = `${helpers.SYNTHETIC_FIXTURE_MARK}-shot-${crypto.randomUUID().slice(0, 8)}.png`;
		form.append("file", new File([new Uint8Array(bytes)], name, { type: "image/png" }));
		form.append("deduplicate", "false");
		const uploaded = await helpers.cmsRequest(admin, "/_emdash/api/media", {
			method: "POST",
			form,
		});
		const id = helpers.nativeItemOf(uploaded)?.id;
		if (!uploaded.ok || typeof id !== "string") {
			throw new Error(`picture: ${helpers.nativeRefusalOf(uploaded)}`);
		}
		media.push(id);
		const described = await helpers.cmsRequest(admin, `/_emdash/api/media/${id}`, {
			method: "PUT",
			body: { alt },
		});
		if (!described.ok) throw new Error(`picture alt: ${helpers.nativeRefusalOf(described)}`);
		return id;
	},
	block(text, style = "normal") {
		const key = crypto.randomUUID().slice(0, 8);
		return {
			_type: "block",
			_key: key,
			style,
			markDefs: [],
			children: [{ _type: "span", _key: `${key}s`, text, marks: [] }],
		};
	},
};

const failures: string[] = [];
try {
	const fixtures = (await import(pathToFileURL(resolve(fixturesPath)).href)).default as Fixtures;
	const paths = await fixtures(kit);
	const capture = spawnSync("node", ["scripts/capture-screenshots.mjs", outDir, ...paths], {
		stdio: "inherit",
	});
	if (capture.status !== 0) failures.push("capture-screenshots.mjs failed");
} finally {
	// Entries first, so no entry still uses a picture or term when it goes.
	const report = await helpers.cleanupOwnedFixtures(admin, { permanent: true });
	if (!report.complete) failures.push(`entries left: ${JSON.stringify(report)}`);
	for (const id of media) {
		const removed = await helpers.cmsRequest(admin, `/_emdash/api/media/${id}`, {
			method: "DELETE",
		});
		if (!removed.ok) failures.push(`picture ${id}: ${helpers.nativeRefusalOf(removed)}`);
	}
	failures.push(...(await helpers.deleteSyntheticTerms(admin, terms)));
}
if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exit(1);
}
console.log("synthetic content removed");
