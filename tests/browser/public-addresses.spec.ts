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

import { expect, test, type TestInfo } from "@playwright/test";

import {
	cleanupOwnedFixtures,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemsOf,
	nativeRefusalOf,
	NATIVE_ROLES,
	publishEntry,
	SYNTHETIC_FIXTURE_MARK,
	updateEntry,
	uploadSyntheticMedia,
	type CmsActor,
} from "./cms.helpers";

/** `03` §15: where each public collection's entries live. */
const CANONICAL_PREFIXES: Record<string, string> = {
	news: "/news",
	activities: "/activities",
	announcements: "/announcements",
	services: "/services",
	health_services: "/health-services",
	health_content: "/health/content",
	health_reports: "/health/reports",
	documents: "/documents",
	pages: "/pages",
};

let admin: CmsActor;
let origin: string;
/** Old slugs of entries whose slug a test changed: their redirects are removed at the end. */
const movedSlugs: string[] = [];

function syntheticSlug(label: string): string {
	return `${SYNTHETIC_FIXTURE_MARK}-${label}-${crypto.randomUUID().slice(0, 8)}`;
}

function syntheticTitle(label: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ${label}`;
}

/** Create a synthetic entry and fail with the native refusal when it is refused. */
async function createEntry(
	collection: string,
	slug: string,
	fields: { data?: Record<string, unknown>; references?: Record<string, string[]> } = {},
): Promise<string> {
	const created = await createSyntheticEntry(admin, collection, {
		data: { title: syntheticTitle(slug), ...fields.data },
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

/** The `<loc>` values of a sitemap document. */
function locations(xml: string): string[] {
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

test.beforeAll(async ({}, testInfo: TestInfo) => {
	const baseURL = testInfo.project.use.baseURL;
	if (baseURL === undefined) {
		throw new Error("this suite needs a configured baseURL (PLAYWRIGHT_BASE_URL)");
	}
	origin = new URL(baseURL).origin;
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
});

test.afterAll(async () => {
	if (admin === undefined) return;
	const failures: string[] = [];
	for (const slug of movedSlugs) {
		const listed = await cmsRequest(admin, "/_emdash/api/redirects", {
			searchParams: { search: slug, limit: "100" },
		});
		if (!listed.ok) {
			failures.push(`listing the redirects of ${slug}: ${nativeRefusalOf(listed)}`);
			continue;
		}
		const redirects = nativeItemsOf(listed) as Array<{ id: string; source: string; auto: boolean }>;
		for (const redirect of redirects.filter(
			({ source, auto }) => auto && source.endsWith(`/${slug}`),
		)) {
			const removed = await cmsRequest(
				admin,
				`/_emdash/api/redirects/${encodeURIComponent(redirect.id)}`,
				{ method: "DELETE" },
			);
			if (!removed.ok) {
				failures.push(`deleting the redirect from ${redirect.source}: ${nativeRefusalOf(removed)}`);
			}
		}
	}
	const report = await cleanupOwnedFixtures(admin, { permanent: true });
	if (!report.complete) {
		failures.push(`owned fixtures left: ${JSON.stringify(report)}`);
	}
	expect(failures, "the suite's synthetic fixtures must all be removed").toEqual([]);
});

// News is what #53 names. Health Content shows that the pattern, not EmDash's fallback
// `/{collection}/{slug}`, builds the address: the fallback would give /health_content/….
for (const collection of ["news", "health_content"]) {
	const prefix = CANONICAL_PREFIXES[collection];

	test(`${collection}: a published entry whose slug changes answers its old address with a 301 to ${prefix}/<new slug>`, async ({
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
		expect(moves, "the native redirect list").toEqual([
			{ source: `${prefix}/${oldSlug}`, destination: `${prefix}/${newSlug}`, type: 301 },
		]);

		const response = await request.get(`${prefix}/${oldSlug}`, { maxRedirects: 0 });
		expect(response.status(), `GET ${prefix}/${oldSlug}`).toBe(301);
		expect(response.headers().location).toBe(`${prefix}/${newSlug}`);
	});
}

test("the preview link of a draft in each public collection is its canonical, slug-based address", async () => {
	const media = await uploadSyntheticMedia(admin);
	expect(media.mediaId, "the synthetic file must upload").toBeDefined();
	const slugs: Record<string, string> = {};
	const ids: Record<string, string> = {};
	for (const collection of Object.keys(CANONICAL_PREFIXES)) {
		slugs[collection] = syntheticSlug(collection.replaceAll("_", "-"));
	}
	// A Document needs its file, and a Health Report needs the Document it describes.
	ids.documents = await createEntry("documents", slugs.documents, {
		data: { file: { id: media.mediaId } },
	});
	ids.health_reports = await createEntry("health_reports", slugs.health_reports, {
		references: { report_document: [ids.documents] },
	});
	for (const collection of Object.keys(CANONICAL_PREFIXES)) {
		ids[collection] ??= await createEntry(collection, slugs[collection]);
	}

	for (const [collection, prefix] of Object.entries(CANONICAL_PREFIXES)) {
		const minted = await cmsRequest(
			admin,
			`/_emdash/api/content/${collection}/${encodeURIComponent(ids[collection])}/preview-url`,
			{ method: "POST", body: {} },
		);
		expect(minted.ok, `${collection}: ${nativeRefusalOf(minted)}`).toBe(true);
		const link = new URL(String(nativeDataOf(minted)?.url), origin);
		// The signed token stays out of every message.
		expect(link.pathname, `the ${collection} preview link`).toBe(`${prefix}/${slugs[collection]}`);
		expect(
			link.searchParams.get("_preview"),
			`the ${collection} preview link is signed`,
		).toBeTruthy();
	}
});

test("the sitemap lists a published entry at its canonical absolute address, and never a draft or Personnel", async ({
	request,
}) => {
	const publishedSlug = syntheticSlug("sitemap-published");
	const draftSlug = syntheticSlug("sitemap-draft");
	await publish("news", await createEntry("news", publishedSlug));
	await createEntry("news", draftSlug);
	const personnelSlug = syntheticSlug("sitemap-personnel");
	await publish("personnel", await createEntry("personnel", personnelSlug));

	const index = await request.get("/sitemap.xml");
	expect(index.status(), "GET /sitemap.xml").toBe(200);
	const sitemaps = locations(await index.text());
	expect(sitemaps).toContain(`${origin}/sitemap-news.xml`);
	expect(sitemaps).not.toContain(`${origin}/sitemap-personnel.xml`);

	const news = await request.get("/sitemap-news.xml");
	expect(news.status(), "GET /sitemap-news.xml").toBe(200);
	const addresses = locations(await news.text());
	expect(addresses).toContain(`${origin}/news/${publishedSlug}`);
	expect(addresses.filter((address) => address.endsWith(`/${draftSlug}`))).toEqual([]);

	for (const sitemap of sitemaps) {
		const listed = locations(await (await request.get(new URL(sitemap).pathname)).text());
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
