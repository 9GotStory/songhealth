// Pull-request screenshots of public pages, taken from the development runtime.
//
//   node scripts/capture-screenshots.mjs <out-dir> <target> [<target>...]
//
// A target `[name=]path` is captured full-page at 1440 px (desktop), 375 px and 320 px (mobile),
// into <name>-<width>.png. Without a name, the path gives it ("/news/x" is "news-x"), so name a
// path whose slug is synthetic. At the mobile widths the first target, when it is a full-page one,
// is captured again with the menu open. A target `name=path@width` is captured full-page at that
// one width, into <name>.png, and `name=path@width>selector` is a close-up of the first element the
// CSS selector matches, such as "header-375=/@375>header", for a small change that a full page
// would bury (#145 retro). The origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324. Pages
// are read anonymously, with no credential.
//
// A pull request shows its pages before and after. Take the before screenshots while the runtime
// still serves the base, before the ticket's first scripts/dev-runtime-update.sh: afterwards they
// need the base promoted again.
//
// To show the images in a pull request without adding them to the code tree, put them on an
// image-only branch with scripts/evidence-branch.sh <ticket> <out-dir>, which prints how to push
// and embed them.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const WIDTHS = [
	{ name: "desktop", viewport: { width: 1440, height: 900 } },
	{ name: "375", viewport: { width: 375, height: 812 } },
	{ name: "320", viewport: { width: 320, height: 640 } },
];

const [outDir, ...targets] = process.argv.slice(2);
if (outDir === undefined || targets.length === 0) {
	console.error("usage: node scripts/capture-screenshots.mjs <out-dir> <target> [<target>...]");
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A file-name stem for a path: "/" is "home", "/news/x" is "news-x". Thai letters stay. */
function stem(path) {
	const trimmed = path.replace(/^\/+|\/+$/g, "").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-");
	return trimmed === "" ? "home" : trimmed;
}

/**
 * A target as its file-name base, its path, and the one width and element it names, if any:
 * "name=/path" names it, a bare "/path" names itself, and "@width>selector" follows the path.
 */
const pages = targets.map((target) => {
	const split = target.startsWith("/") ? -1 : target.indexOf("=");
	const name = split === -1 ? undefined : target.slice(0, split);
	const rest = split === -1 ? target : target.slice(split + 1);
	const one = /^(?<path>.*?)@(?<width>\d+)(?:>(?<selector>.+))?$/.exec(rest)?.groups;
	const path = one?.path ?? rest;
	return {
		base: name ?? (one ? `${stem(path)}-${one.width}` : stem(path)),
		path,
		width: one && Number(one.width),
		selector: one?.selector,
	};
});

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const written = [];

/** `path` opened at `viewport`, with every picture loaded and decoded. */
async function openPage(path, viewport) {
	const page = await browser.newPage({ viewport });
	await page.goto(new URL(path, origin).href);
	// A full-page screenshot does not scroll, so lazy pictures below the fold would never load.
	// Load and decode every picture first, as a reader scrolling down would see it.
	await page.evaluate(async () => {
		await document.fonts.ready;
		for (const image of document.images) image.loading = "eager";
		await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
	});
	return page;
}

try {
	for (const [index, { base, path, width, selector }] of pages.entries()) {
		if (width !== undefined) {
			const page = await openPage(path, { width, height: 900 });
			const file = join(outDir, `${base}.png`);
			if (selector === undefined) await page.screenshot({ path: file, fullPage: true });
			else await page.locator(selector).first().screenshot({ path: file });
			written.push(file);
			await page.close();
			continue;
		}
		for (const { name, viewport } of WIDTHS) {
			const page = await openPage(path, viewport);
			const file = join(outDir, `${base}-${name}.png`);
			await page.screenshot({ path: file, fullPage: true });
			written.push(file);
			if (index === 0 && name !== "desktop") {
				await page.getByText("เมนู", { exact: true }).click();
				const menuFile = join(outDir, `${base}-${name}-menu.png`);
				await page.screenshot({ path: menuFile, fullPage: true });
				written.push(menuFile);
			}
			await page.close();
		}
	}
} finally {
	await browser.close();
}
console.log(written.join("\n"));
