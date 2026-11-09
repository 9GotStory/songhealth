// Page weight evidence for ADR 0003's revisit (#183): what a citizen's browser downloads for each
// address, on a phone and on a desktop, starting from an empty browser cache.
//
//   scripts/production-image-check.sh --sha <commit> <news-path> -- \
//     node scripts/measure-page-weight.ts <path>...
//
// A row gives the bytes that crossed the network, headers included: the view before any scrolling,
// the whole page scrolled to its end, and a second visit in the same browser, scrolled the same
// way, which shows what the browser's cache saves. The container sends everything uncompressed; a
// reverse proxy in front of production may compress the text, never the pictures. "Waited" is the
// median and the slowest time the server took to start answering for a picture. The origin comes
// from CHECK_ORIGIN, or http://127.0.0.1:4324 when it is run alone. Exit status 1: a page or a
// picture failed; 2: no path given.

import { chromium, type CDPSession, type Page } from "@playwright/test";

import { SYNTHETIC_REFERRER } from "../playwright.config.ts";

const ORIGIN = process.env.CHECK_ORIGIN ?? "http://127.0.0.1:4324";
const SCREENS = {
	// A current phone: the pixel density decides which rendition a srcset picks, and a dense screen
	// is the heavier case for renditions. An original weighs the same at any density.
	phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
	// DESKTOP_VIEWPORT of tests/browser/public.helpers.ts, which Node cannot import directly.
	desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const QUIET_MS = 1_000;
const QUIET_LIMIT_MS = 60_000;

interface Transfer {
	type: string;
	url: string;
	status: number;
	bytes: number;
	waitedMs: number | undefined;
}

/** Every transfer of a page through the DevTools protocol, and whether any is still in flight. */
function watch(cdp: CDPSession) {
	const responses = new Map<string, Omit<Transfer, "bytes">>();
	const inFlight = new Set<string>();
	const finished: Transfer[] = [];
	let failed = 0;
	let lastActivity = performance.now();
	const touch = () => {
		lastActivity = performance.now();
	};
	cdp.on("Network.requestWillBeSent", ({ requestId }) => {
		inFlight.add(requestId);
		touch();
	});
	cdp.on("Network.responseReceived", ({ requestId, type, response }) => {
		const timing = response.timing;
		responses.set(requestId, {
			type,
			url: response.url,
			status: response.status,
			waitedMs: timing ? timing.receiveHeadersEnd - timing.sendEnd : undefined,
		});
	});
	cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
		inFlight.delete(requestId);
		touch();
		const response = responses.get(requestId);
		if (response) finished.push({ ...response, bytes: encodedDataLength });
	});
	cdp.on("Network.loadingFailed", ({ requestId, canceled }) => {
		inFlight.delete(requestId);
		touch();
		if (!canceled) failed += 1;
	});
	return {
		take: () => finished.splice(0),
		failures: () => failed,
		quiet: async () => {
			const started = performance.now();
			while (performance.now() - started < QUIET_LIMIT_MS) {
				if (inFlight.size === 0 && performance.now() - lastActivity >= QUIET_MS) return;
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			throw new Error("the page never went quiet");
		},
	};
}

/** Scrolls by half a screen at a time, the way lazy pictures see a reader. */
async function scrollToEnd(page: Page): Promise<void> {
	await page.evaluate(async () => {
		for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
			scrollTo(0, y);
			await new Promise((resolve) => setTimeout(resolve, 150));
		}
	});
}

const pictures = (transfers: Transfer[]) => transfers.filter(({ type }) => type === "Image");
const sum = (transfers: Transfer[]) => transfers.reduce((total, { bytes }) => total + bytes, 0);
const kB = (bytes: number) => Math.round(bytes / 1_000).toLocaleString("en");

function weight(transfers: Transfer[]): string {
	const images = pictures(transfers);
	return `${kB(sum(transfers))} (pictures ${kB(sum(images))}, ${images.length})`;
}

function waited(transfers: Transfer[]): string {
	const times = pictures(transfers)
		.flatMap(({ waitedMs }) => (waitedMs === undefined ? [] : [waitedMs]))
		.toSorted((a, b) => a - b);
	if (times.length === 0) return "-";
	return `${Math.round(times[Math.floor(times.length / 2)])} / ${Math.round(times.at(-1) ?? 0)}`;
}

/** Opens one address on one screen and returns its table row; a failure throws. */
async function measure(
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	path: string,
	name: string,
	screen: (typeof SCREENS)["phone"],
) {
	const context = await browser.newContext({
		...screen,
		extraHTTPHeaders: { referer: SYNTHETIC_REFERRER },
	});
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send("Network.enable");
	const network = watch(cdp);

	const visit = async () => {
		await page.goto(ORIGIN + path, { waitUntil: "load" });
		await network.quiet();
		const firstView = network.take();
		await scrollToEnd(page);
		await network.quiet();
		return { firstView, wholePage: [...firstView, ...network.take()] };
	};
	const first = await visit();
	const largest = Math.max(0, ...pictures(first.wholePage).map(({ bytes }) => bytes));
	const second = await visit();

	const bad = [...first.wholePage, ...second.wholePage].filter(({ status }) => status >= 400);
	if (network.failures() > 0 || bad.length > 0) {
		throw new Error(
			`${path} on ${name}: ${network.failures()} failed, ${bad.map(({ url, status }) => `${status} ${url}`).join(" ")}`,
		);
	}
	await context.close();
	return `| \`${path}\` | ${name} | ${weight(first.firstView)} | ${weight(first.wholePage)} | ${kB(largest)} | ${waited(first.wholePage)} | ${kB(sum(second.wholePage))} |`;
}

const paths = process.argv.slice(2);
if (paths.length === 0) {
	console.error("usage: node scripts/measure-page-weight.ts <path>...");
	process.exit(2);
}
const browser = await chromium.launch();
console.log(`Origin: ${ORIGIN} (kB = 1,000 bytes; pictures: their kB and how many)`);
console.log(
	"| Address | Screen | First view, kB | Whole page, kB | Largest picture, kB | Waited for a picture: median / slowest, ms | Second visit, kB |",
);
console.log("|---|---|---|---|---|---|---|");
try {
	for (const path of paths) {
		for (const [name, screen] of Object.entries(SCREENS)) {
			console.log(await measure(browser, path, name, screen));
		}
	}
} finally {
	await browser.close();
}
