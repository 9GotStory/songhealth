// Canonical public addresses (#53; spec #51, "Changes to the Feature 002 model" and
// "Errors, redirects, preview and SEO").
//
// EmDash builds the public addresses it generates from each collection's URL pattern: the
// permanent redirect when a published slug changes, signed preview links and the native
// sitemap (emdash 1.1.0 src/api/handlers/content.ts createSlugChangeRedirect,
// src/astro/routes/api/content/[collection]/[id]/preview-url.ts,
// src/astro/routes/sitemap-[collection].xml.ts). This suite drives those native surfaces over
// HTTP on the development runtime and checks the addresses against `03` §15.
//
// The suite reads no page, so it takes Playwright's own `test`: the third-party request guard
// of public.helpers.ts watches page loads. Fixtures are synthetic entries made through the
// native API. They are removed afterwards, together with the redirects their slug changes
// created, which deleting an entry leaves in place.

import { expect, test, type APIRequestContext } from "@playwright/test";

import { CANONICAL_URL_PATTERNS } from "../canonical-url-patterns";
import {
	cmsRequest,
	createSyntheticEntry,
	devAdminActor,
	nativeItemsOf,
	nativeRefusalOf,
	previewLink,
	publishEntry,
	removeSuiteFixtures,
	SYNTHETIC_FIXTURE_MARK,
	syntheticSlug,
	updateEntry,
	uploadSyntheticMedia,
	type CmsActor,
} from "./cms.helpers";

let admin: CmsActor;
let origin: string;
/** Old slugs of entries whose slug a test changed: their redirects are removed at the end. */
const movedSlugs: string[] = [];

/** The `03` §15 address of an entry. */
function addressOf(collection: string, slug: string): string {
	return CANONICAL_URL_PATTERNS[collection].replace("{slug}", slug);
}

/** Create a synthetic entry and fail with the native refusal when it is refused. */
async function createEntry(
	collection: string,
	slug: string,
	fields: { data?: Record<string, unknown>; references?: Record<string, string[]> } = {},
): Promise<string> {
	const created = await createSyntheticEntry(admin, collection, {
		data: { title: `${SYNTHETIC_FIXTURE_MARK} ${slug}`, ...fields.data },
		slug,
		...(fields.references !== undefined ? { references: fields.references } : {}),
	});
	expect(created.result.ok, `${collection}: ${nativeRefusalOf(created.result)}`).toBe(true);
	return created.entryId!;
}

async function publish(collection: string, id: string): Promise<void> {
	const published = await publishEntry(admin, collection, id);
	expect(published.ok, `${collection}: ${nativeRefusalOf(published)}`).toBe(true);
}

/** The `<loc>` values of a sitemap document, which must be served. */
async function sitemapLocations(request: APIRequestContext, path: string): Promise<string[]> {
	const response = await request.get(path);
	expect(response.status(), `GET ${path}`).toBe(200);
	const xml = await response.text();
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

test.beforeAll(async () => {
	admin = await devAdminActor();
	origin = admin.baseUrl;
});

test.afterAll(() => removeSuiteFixtures(admin, { movedSlugs }));

// News is what #53 names. Health Content shows that the pattern, not EmDash's fallback
// `/{collection}/{slug}`, builds the address: the fallback would give /health_content/….
for (const collection of ["news", "health_content"]) {
	test(`${collection}: a published entry whose slug changes answers its old address with a 301 to its new ${CANONICAL_URL_PATTERNS[collection]} address`, async ({
		request,
	}) => {
		const oldSlug = syntheticSlug("old");
		const newSlug = syntheticSlug("new");
		const id = await createEntry(collection, oldSlug);
		await publish(collection, id);

		movedSlugs.push(oldSlug);
		// The new slug is staged in a draft revision and goes live when it is published.
		const renamed = await updateEntry(admin, collection, id, { slug: newSlug });
		expect(renamed.ok, `${collection}: ${nativeRefusalOf(renamed)}`).toBe(true);
		await publish(collection, id);

		// Staff see the move in the native redirect list (Admin, Redirects). Checking it first
		// also keeps a missing redirect from leaving a synthetic path in EmDash's 404 log,
		// which can only be cleared as a whole.
		const listed = await cmsRequest(admin, "/_emdash/api/redirects", {
			searchParams: { search: oldSlug },
		});
		expect(listed.ok, nativeRefusalOf(listed)).toBe(true);
		const moves = (nativeItemsOf(listed) as Array<Record<string, unknown>>).map(
			({ source, destination, type }) => ({ source, destination, type }),
		);
		const oldAddress = addressOf(collection, oldSlug);
		const newAddress = addressOf(collection, newSlug);
		expect(moves, "the native redirect list").toEqual([
			{ source: oldAddress, destination: newAddress, type: 301 },
		]);

		const response = await request.get(oldAddress, { maxRedirects: 0 });
		expect(response.status(), `GET ${oldAddress}`).toBe(301);
		expect(response.headers().location).toBe(newAddress);
	});
}

test("the preview link of a draft in each public collection is its canonical, slug-based address", async () => {
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic file must upload").toBeDefined();
	const slugs: Record<string, string> = {};
	const ids: Record<string, string> = {};
	for (const collection of Object.keys(CANONICAL_URL_PATTERNS)) {
		slugs[collection] = syntheticSlug(collection.replaceAll("_", "-"));
	}
	// A Document needs its file, and a Health Report needs the Document it describes.
	ids.documents = await createEntry("documents", slugs.documents, {
		data: { file: { id: media.mediaId } },
	});
	ids.health_reports = await createEntry("health_reports", slugs.health_reports, {
		references: { report_document: [ids.documents] },
	});
	for (const collection of Object.keys(CANONICAL_URL_PATTERNS)) {
		ids[collection] ??= await createEntry(collection, slugs[collection]);
	}

	for (const collection of Object.keys(CANONICAL_URL_PATTERNS)) {
		const link = await previewLink(admin, collection, ids[collection]);
		expect(link.pathname, `the ${collection} preview link`).toBe(
			addressOf(collection, slugs[collection]),
		);
		expect(
			link.searchParams.get("_preview"),
			`the ${collection} preview link is signed`,
		).toBeTruthy();
	}
});

test("the sitemap lists published entries at their canonical absolute addresses, and never a draft or Personnel", async ({
	request,
}) => {
	// Health Content shows the pattern at work, as in the redirect tests.
	const published: Record<string, string> = {
		news: syntheticSlug("sitemap-published"),
		health_content: syntheticSlug("sitemap-published"),
	};
	for (const [collection, slug] of Object.entries(published)) {
		await publish(collection, await createEntry(collection, slug));
	}
	const draftSlug = syntheticSlug("sitemap-draft");
	await createEntry("news", draftSlug);
	const personnelSlug = syntheticSlug("sitemap-personnel");
	await publish("personnel", await createEntry("personnel", personnelSlug));

	const sitemaps = await sitemapLocations(request, "/sitemap.xml");
	expect(sitemaps).not.toContain(`${origin}/sitemap-personnel.xml`);
	for (const [collection, slug] of Object.entries(published)) {
		expect(sitemaps).toContain(`${origin}/sitemap-${collection}.xml`);
		expect(await sitemapLocations(request, `/sitemap-${collection}.xml`)).toContain(
			`${origin}${addressOf(collection, slug)}`,
		);
	}

	for (const sitemap of sitemaps) {
		const listed = await sitemapLocations(request, new URL(sitemap).pathname);
		expect(
			listed.filter((address) => address.endsWith(`/${draftSlug}`)),
			`${sitemap} must not list the draft`,
		).toEqual([]);
		expect(
			listed.filter((address) => address.endsWith(`/${personnelSlug}`)),
			`${sitemap} must not list Personnel`,
		).toEqual([]);
	}
});

test("robots.txt is served and points crawlers to the sitemap", async ({ request }) => {
	const robots = await request.get("/robots.txt");
	expect(robots.status(), "GET /robots.txt").toBe(200);
	expect(robots.headers()["content-type"]).toContain("text/plain");
	expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
});
