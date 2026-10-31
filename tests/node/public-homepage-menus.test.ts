// The Homepage's curated sections (#65; spec #51 "Homepage (`04`, Figma order)", approved Q11;
// `04` §5, §6, §10.1 and §17).
//
// Staff curate three native menus. The Homepage maps each item's address back to a published
// entry through EmDash's path resolution, which the tests stand in for with a table of addresses,
// and skips an item that does not resolve:
//
// - Featured: the first item, in menu order, that resolves to a News, Announcement, Health Content,
//   Service, Activity or Health Report.
// - Frequently Used Services: the items that resolve to a Service, in menu order, at most 6.
// - Quick Access: up to 4 items in menu order, each to a page of the site or a published entry of
//   any kind (`04` §10.1). An item that leads nowhere is skipped (`04` §17): an unpublished entry's
//   address, a path that is no page, another website, another scheme or only a fragment. Every
//   page of the site counts, even one at an address shaped like an entry's, such as /news/health.
//
// A menu gives each content item an address with its slug encoded, as EmDash builds it (emdash
// 1.1.0 src/i18n/resolve.ts interpolateUrlPattern), and EmDash stores the slug decoded. A link
// staff type may be a full address on this site.

import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { describe, it } from "node:test";

import {
	SITE_PAGES,
	featuredItem,
	frequentServices,
	quickAccessLinks,
	type MenuLink,
	type ResolvePath,
} from "../../src/lib/homepage-menus.ts";
import { CANONICAL_URL_PATTERNS } from "../canonical-url-patterns.ts";

const SITE = "https://songhealth.example";

/** An entry as the fake resolution gives it back. */
interface Entry {
	slug: string;
}

/**
 * A stand-in for EmDash's path resolution: each published entry by its decoded address. It
 * records the paths it was asked for.
 */
function publishedAt(entries: Record<string, string>): ResolvePath<Entry> & { asked: string[] } {
	const asked: string[] = [];
	const resolve = async (path: string) => {
		asked.push(path);
		const collection = entries[path];
		return collection === undefined
			? null
			: { collection, entry: { slug: path.slice(path.lastIndexOf("/") + 1) } };
	};
	return Object.assign(resolve, { asked });
}

/** A menu item as EmDash's getMenu gives it. */
function item(label: string, url: string, children: MenuLink[] = []): MenuLink {
	return { label, url, children };
}

describe("the Featured item", () => {
	it("is the first item, in menu order, that resolves to a published entry of a Featured kind", async () => {
		const resolve = publishedAt({
			"/documents/form": "documents",
			"/health/reports/q3": "health_reports",
			"/news/later": "news",
		});

		const featured = await featuredItem(
			[
				item("ข่าวที่ยังไม่เผยแพร่", "/news/draft"),
				item("เอกสาร", "/documents/form"),
				item("รายงาน", "/health/reports/q3"),
				item("ข่าว", "/news/later"),
			],
			SITE,
			resolve,
		);

		assert.deepEqual(featured, { collection: "health_reports", entry: { slug: "q3" } });
		assert.deepEqual(resolve.asked, ["/news/draft", "/documents/form", "/health/reports/q3"]);
	});

	it("can be a News, Announcement, Health Content, Service, Activity or Health Report", async () => {
		const kinds = {
			"/news/a": "news",
			"/announcements/a": "announcements",
			"/health/content/a": "health_content",
			"/services/a": "services",
			"/activities/a": "activities",
			"/health/reports/a": "health_reports",
		};
		for (const [path, collection] of Object.entries(kinds)) {
			const featured = await featuredItem([item(path, path)], SITE, publishedAt(kinds));
			assert.equal(featured?.collection, collection, path);
		}
		for (const [path, collection] of Object.entries({
			"/documents/a": "documents",
			"/health-services/a": "health_services",
			"/pages/a": "pages",
		})) {
			const featured = await featuredItem(
				[item(path, path)],
				SITE,
				publishedAt({ [path]: collection }),
			);
			assert.equal(featured, undefined, path);
		}
	});

	it("is nothing when no item resolves", async () => {
		assert.equal(await featuredItem([], SITE, publishedAt({})), undefined);
		assert.equal(
			await featuredItem([item("ข่าว", "/news/trashed")], SITE, publishedAt({})),
			undefined,
		);
	});

	it("looks an encoded Thai slug up decoded, as EmDash stores it", async () => {
		const resolve = publishedAt({ "/announcements/ประกาศรับสมัคร": "announcements" });

		const featured = await featuredItem(
			[item("ประกาศ", `/announcements/${encodeURIComponent("ประกาศรับสมัคร")}`)],
			SITE,
			resolve,
		);

		assert.equal(featured?.collection, "announcements");
		assert.deepEqual(resolve.asked, ["/announcements/ประกาศรับสมัคร"]);
	});

	it("reads a full address on this site by its path, and never looks up another website's", async () => {
		const resolve = publishedAt({ "/news/a": "news" });

		assert.equal(
			await featuredItem([item("ข่าว", "https://other.example/news/a")], SITE, resolve),
			undefined,
		);
		assert.deepEqual(resolve.asked, []);
		assert.equal(
			(await featuredItem([item("ข่าว", `${SITE}/news/a/?from=menu#top`)], SITE, resolve))
				?.collection,
			"news",
		);
		assert.deepEqual(resolve.asked, ["/news/a"]);
	});

	it("counts a nested item in the order the menu lists it, after its parent", async () => {
		const resolve = publishedAt({ "/services/b": "services" });

		const featured = await featuredItem(
			[item("หมวด", "/news/draft", [item("บริการ", "/services/b")]), item("ข่าว", "/news/c")],
			SITE,
			resolve,
		);

		assert.equal(featured?.collection, "services");
		assert.deepEqual(resolve.asked, ["/news/draft", "/services/b"]);
	});
});

describe("the Frequently Used Services", () => {
	it("are the items that resolve to a published Service, in menu order, at most 6", async () => {
		const services = Array.from({ length: 8 }, (_, index) => `/services/s${index + 1}`);
		const resolve = publishedAt({
			...Object.fromEntries(services.map((path) => [path, "services"])),
			"/news/n": "news",
		});

		const shown = await frequentServices(
			[
				item("บริการ 1", services[0]!),
				item("ข่าว", "/news/n"),
				item("บริการที่ยังไม่เผยแพร่", "/services/draft"),
				item("ลิงก์ภายนอก", "https://other.example/services/s9"),
				...services.slice(1).map((path, index) => item(`บริการ ${index + 2}`, path)),
			],
			SITE,
			resolve,
		);

		assert.deepEqual(
			shown.map(({ slug }) => slug),
			["s1", "s2", "s3", "s4", "s5", "s6"],
		);
	});

	it("are none when no item resolves to a Service", async () => {
		assert.deepEqual(await frequentServices([], SITE, publishedAt({})), []);
		assert.deepEqual(
			await frequentServices([item("ข่าว", "/news/n")], SITE, publishedAt({ "/news/n": "news" })),
			[],
		);
	});
});

describe("Quick Access", () => {
	it("shows up to 4 items in menu order, each to a page of the site or a published entry", async () => {
		const shown = await quickAccessLinks(
			[
				item("เอกสารเผยแพร่", "/documents?type=form"),
				item("แผนงานที่ยกเลิกการเผยแพร่", "/documents/withdrawn-plan"),
				item("ความรู้สุขภาพ", "/health/content/dengue"),
				item("ข้อมูลสุขภาพ", "/health"),
				item("ติดต่อเรา", `${SITE}/contact`),
				item("ค้นหา", "/search"),
			],
			SITE,
			publishedAt({ "/health/content/dengue": "health_content" }),
		);

		assert.deepEqual(shown, [
			{ label: "เอกสารเผยแพร่", href: "/documents?type=form" },
			{ label: "ความรู้สุขภาพ", href: "/health/content/dengue" },
			{ label: "ข้อมูลสุขภาพ", href: "/health" },
			{ label: "ติดต่อเรา", href: `${SITE}/contact` },
		]);
	});

	it("skips an item at any public collection's entry address while nothing is published there", async () => {
		for (const pattern of Object.values(CANONICAL_URL_PATTERNS)) {
			for (const slug of ["withdrawn", encodeURIComponent("ถอนการเผยแพร่")]) {
				const url = pattern.replace("{slug}", slug);
				assert.deepEqual(
					await quickAccessLinks([item("รายการ", url)], SITE, publishedAt({})),
					[],
					url,
				);
			}
		}
	});

	it("counts every page of the site, and only those, as a page, even /news/health, shaped like a News address", () => {
		assert.deepEqual([...SITE_PAGES].sort(), sitePages().sort());
		assert.ok(SITE_PAGES.has("/news/health"));
	});

	it("shows an item to each page of the site with nothing published", async () => {
		for (const page of SITE_PAGES) {
			assert.deepEqual(
				await quickAccessLinks([item("หน้า", page)], SITE, publishedAt({})),
				[{ label: "หน้า", href: page }],
				page,
			);
		}
	});

	it("skips an item that leads nowhere on the site: no page, another website, another scheme or only a fragment", async () => {
		assert.deepEqual(
			await quickAccessLinks(
				[
					item("พิมพ์ผิด", "/documnets"),
					item("ระบบภายนอก", "https://other.example/eservice"),
					item("อีเมล", "mailto:office@example.org"),
					item("ส่วนนี้", "#contact"),
				],
				SITE,
				publishedAt({}),
			),
			[],
		);
	});
});

/**
 * The address of each page under src/pages whose route has no parameter, the not-found page aside:
 * the pages Astro serves before a parameter route.
 */
function sitePages(): string[] {
	const root = new URL("../../src/pages/", import.meta.url);
	return readdirSync(root, { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".astro") && !file.includes("[") && file !== "404.astro")
		.map((file) => `/${file.replace(/\.astro$/, "").replace(/(^|\/)index$/, "")}`)
		.map((route) => (route.length > 1 ? route.replace(/\/$/, "") : route));
}
