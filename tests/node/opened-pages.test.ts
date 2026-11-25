// The pages a person opened on the development runtime, read from the app's log (#250 retro):
// scripts/opened-pages/plan.ts, which scripts/dev-runtime-opened.ts prints.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { notOpened, notOpenedLines, openedPages } from "../../scripts/opened-pages/plan.ts";

/** A line of `podman logs --timestamps`, at a second of 2026-11-13T09:mm:ss+07:00. */
function line(clock: string, path: string, status = 200): string {
	return `2026-11-13T09:${clock}.402012000+07:00 02:${clock} [${status}] ${path} 107ms`;
}

describe("openedPages", () => {
	it("lists each page a request names, with its time and status, and leaves out what a page loads", () => {
		const opened = openedPages(
			[
				line("11:00", "/news"),
				line("11:00", "/_image"),
				line("11:01", "/_emdash/api/media/file/x.webp"),
				line("11:02", "/src/styles/global.css"),
				line("11:02", "/@vite/client"),
				line("11:05", "/news/demo-news-health-fair"),
				line("11:09", "/missing", 404),
				"09:11:10 [vite] page reload",
			],
			15,
		);
		assert.deepEqual(opened.pages, [
			{ at: "2026-11-13T02:11:00Z", status: 200, path: "/news" },
			{ at: "2026-11-13T02:11:05Z", status: 200, path: "/news/demo-news-health-fair" },
			{ at: "2026-11-13T02:11:09Z", status: 404, path: "/missing" },
		]);
		assert.deepEqual(opened.homepage, []);
	});

	it("reads the health check's own requests for / as nobody's", () => {
		const opened = openedPages(
			[line("11:07", "/"), line("11:23", "/"), line("11:39", "/"), line("11:55", "/")],
			15,
		);
		assert.deepEqual(opened.homepage, []);
	});

	it("counts a request for / between two health checks as one load", () => {
		const opened = openedPages([line("11:07", "/"), line("11:15", "/"), line("11:23", "/")], 15);
		assert.deepEqual(opened.homepage, [
			{ from: "2026-11-13T02:11:07Z", to: "2026-11-13T02:11:23Z", loads: 1 },
		]);
	});

	it("counts loads on both sides of the interval's edge", () => {
		// 12 s after a health check is inside its interval; 15 s after is the next check.
		const inside = openedPages([line("11:07", "/"), line("11:19", "/")], 15);
		assert.deepEqual(inside.homepage, [
			{ from: "2026-11-13T02:11:07Z", to: "2026-11-13T02:11:19Z", loads: 1 },
		]);
		const next = openedPages([line("11:07", "/"), line("11:22", "/")], 15);
		assert.deepEqual(next.homepage, []);
	});

	it("counts several loads in one stretch, and each stretch on its own", () => {
		const opened = openedPages(
			[
				line("11:07", "/"),
				line("11:09", "/"),
				line("11:12", "/"),
				line("11:23", "/"),
				line("11:39", "/"),
				line("12:11", "/"),
				line("12:13", "/"),
			],
			15,
		);
		assert.deepEqual(opened.homepage, [
			{ from: "2026-11-13T02:11:07Z", to: "2026-11-13T02:11:23Z", loads: 2 },
			{ from: "2026-11-13T02:12:11Z", to: "2026-11-13T02:12:13Z", loads: 1 },
		]);
	});
});

describe("notOpened", () => {
	const opened = openedPages(
		[
			line("11:00", "/news"),
			line("11:05", "/news/health"),
			line("11:09", "/health/content/demo-health-dengue"),
			line("11:12", "/news/demo-news-gone", 404),
		],
		15,
	);

	it("lists the expected pages that no request answered 200, in the order given", () => {
		assert.deepEqual(
			notOpened(opened, [
				"/health/content/demo-health-flu-vaccine",
				"/news",
				"/health/content",
				"/health/content/demo-health-dengue",
			]),
			["/health/content/demo-health-flu-vaccine", "/health/content"],
		);
	});

	it("does not count a page that answered another status", () => {
		assert.deepEqual(notOpened(opened, ["/news/demo-news-gone"]), ["/news/demo-news-gone"]);
	});

	it("says beside a page it lists what the latest request for it answered, when one named it", () => {
		// #436 retro: the 404 page's step answered [404] and read "not opened" with nothing beside it.
		assert.deepEqual(notOpenedLines(opened, ["/news/demo-news-gone", "/health/content"]), [
			"not opened: /news/demo-news-gone (answered 404 at 2026-11-13T02:11:12Z)",
			"not opened: /health/content",
		]);
		const answeredTwice = openedPages(
			[line("11:12", "/gone", 404), line("11:20", "/gone", 500)],
			15,
		);
		assert.deepEqual(notOpenedLines(answeredTwice, ["/gone"]), [
			"not opened: /gone (answered 500 at 2026-11-13T02:11:20Z)",
		]);
	});

	it("reads an expected address without its query string, as the log holds it, and names it once", () => {
		assert.deepEqual(
			notOpened(opened, [
				"/news/health?topic=demo-topic-vaccine",
				"/activities?page=2",
				"/activities",
			]),
			["/activities"],
		);
	});

	it("counts the Homepage as opened only where a stretch of / holds a load", () => {
		assert.deepEqual(notOpened(opened, ["/"]), ["/"]);
		const withLoad = openedPages([line("11:07", "/"), line("11:15", "/")], 15);
		assert.deepEqual(notOpened(withLoad, ["/"]), []);
		const healthCheckAlone = openedPages([line("11:07", "/"), line("11:22", "/")], 15);
		assert.deepEqual(notOpened(healthCheckAlone, ["/"]), ["/"]);
	});
});
