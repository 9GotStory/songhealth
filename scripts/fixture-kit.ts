// Synthetic content for the runners that need some on the development runtime
// (scripts/capture-with-fixtures.ts, scripts/measure-latency.ts): a FixtureKit that makes entries,
// terms and pictures through the native API with the development PAT (SONGHEALTH_DEV_ACCESS), and
// removes everything it made when the run ends, even when a step fails. Office Contact and the
// `social` handles it sets are restored then too. Every slug carries the
// synthetic mark, so scripts/dev-runtime-residue.sh finds anything a failed cleanup leaves. The
// origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import { crc32, deflateSync } from "node:zlib";

import * as helpers from "../tests/browser/cms.helpers.ts";

export interface FixtureKit {
	admin: helpers.CmsActor;
	helpers: typeof helpers;
	/** A term of `taxonomy` labelled `label`, made once per run; returns its slug. */
	term(taxonomy: string, label: string): Promise<string>;
	/** A new 1200×750 picture, a diagonal blend of two hex colours, with `alt`; returns its id. */
	picture(alt: string, from: string, to: string): Promise<string>;
	/** One Portable Text block of `style` (normal, h2, …), the shape the Admin editor saves. */
	block(text: string, style?: string): Record<string, unknown>;
	/**
	 * Show `values` as Office Contact and `social` as the only `social` handles until the run ends,
	 * which restores the earlier ones (cms.helpers.ts showOfficeContact).
	 */
	officeContact(values: helpers.OfficeContactValues, social: Record<string, string>): Promise<void>;
}

/** The development runtime's origin. */
export const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

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

/**
 * Run `work` with a FixtureKit, then remove the entries, pictures and terms it made. Throws when
 * `work` fails or anything is left, after the removal ran.
 */
export async function withFixtureKit<T>(work: (kit: FixtureKit) => Promise<T>): Promise<T> {
	const admin = await helpers.createPatActor({
		baseUrl: ORIGIN,
		token: await helpers.loadDevAccessToken(),
		expected: { role: helpers.NATIVE_ROLES.administrator },
	});
	const terms: helpers.SyntheticTerm[] = [];
	/** The slug of each term made, by `${taxonomy}:${label}`. */
	const slugs = new Map<string, string>();
	const media: string[] = [];
	/** What restores the settings the run changed, newest first. */
	const restores: (() => Promise<void>)[] = [];
	const kit: FixtureKit = {
		admin,
		helpers,
		async term(taxonomy, label) {
			const key = `${taxonomy}:${label}`;
			if (!slugs.has(key)) {
				const term = await helpers.createSyntheticTerm(admin, taxonomy, label);
				terms.push(term);
				slugs.set(key, term.slug);
			}
			return slugs.get(key)!;
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
			const described = await helpers.setMediaAlt(admin, id, alt);
			if (!described.ok) throw new Error(`picture alt: ${helpers.nativeRefusalOf(described)}`);
			return id;
		},
		block: helpers.portableTextBlock,
		async officeContact(values, social) {
			restores.unshift(await helpers.showOfficeContact(admin, values, social));
		},
	};

	const failures: string[] = [];
	try {
		return await work(kit);
	} catch (error) {
		failures.push(error instanceof Error ? error.message : String(error));
		throw error;
	} finally {
		for (const restore of restores) {
			await restore().catch((error: unknown) =>
				failures.push(`settings not restored: ${error instanceof Error ? error.message : error}`),
			);
		}
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
		if (failures.length > 0) throw new Error(failures.join("\n"));
		console.log("synthetic content removed");
	}
}
