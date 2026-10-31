// Synthetic content for the runners that need some on the development runtime
// (scripts/capture-with-fixtures.ts, scripts/measure-latency.ts): a FixtureKit that makes entries,
// terms and pictures through the native API with the development PAT (SONGHEALTH_DEV_ACCESS), and
// removes everything it made when the run ends, even when a step fails. Office Contact, the
// `social` handles and the Homepage menus it sets are restored then too. Every slug carries the
// synthetic mark, so scripts/dev-runtime-residue.sh finds anything a failed cleanup leaves. The
// origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

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
	/**
	 * Give the named Homepage menus exactly these items until the run ends, which puts back what
	 * they held (cms.helpers.ts showHomepageMenus).
	 */
	homepageMenus(menus: helpers.HomepageMenuItems): Promise<void>;
}

/** The development runtime's origin. */
export const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/**
 * Run `work` with a FixtureKit, then remove the entries, pictures and terms it made. Throws when
 * `work` fails or anything is left, after the removal ran.
 */
export async function withFixtureKit<T>(work: (kit: FixtureKit) => Promise<T>): Promise<T> {
	const admin = await helpers.devAdminActor(ORIGIN);
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
			const name = `${helpers.SYNTHETIC_FIXTURE_MARK}-shot-${crypto.randomUUID().slice(0, 8)}.png`;
			const bytes = helpers.gradientPng(from, to);
			const { id } = await helpers.uploadMediaItem(admin, name, { bytes, type: "image/png" }, alt);
			media.push(id);
			return id;
		},
		block: helpers.portableTextBlock,
		async officeContact(values, social) {
			restores.unshift(await helpers.showOfficeContact(admin, values, social));
		},
		async homepageMenus(menus) {
			restores.unshift(await helpers.showHomepageMenus(admin, menus));
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
