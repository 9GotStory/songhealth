// Pull-request screenshots of public pages, taken from the development runtime.
//
//   node scripts/capture-screenshots.mjs [--in-window] [--source <name>] <out-dir> <target>...
//
// A target `[name=]path` is captured full-page at 1440 px (desktop), 375 px and 320 px (mobile),
// into <name>-<width>.png. Without a name, the path gives it ("/news/x" is "news-x"), so name a
// path whose slug is synthetic. At the mobile widths the first target, when it is a full-page one,
// is captured again with the menu open. A target `name=path@width` is captured full-page at that
// one width, into <name>.png, and `name=path@width>selector` is a close-up of the first element the
// selector matches, such as "header-375=/@375>header", for a small change that a full page
// would bury (#145 retro). The selector is a Playwright locator, so
// `article:has(h3:has-text("x"))` picks a card by its title. A close-up shows each select in it as
// the list of all its options, since a screenshot leaves out the pop-up an open select draws
// (#176). A target that ends in `!text` is captured after a click on the element whose whole text
// is `text`, such as a control that opens part of the page (#148). The origin is
// PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324. Pages are read anonymously, with no credential.
// It prints each file with its size in pixels, so a pull request can quote a page's height from it
// (#146 retro). A close-up also prints its element's layout size, the one to quote: its PNG covers
// every pixel the element touches, so it can come out a pixel larger (#194 retro). It records each
// file's target in <out-dir>/captures.txt, a line of the file's name, a tab and its path at its
// width, then its selector, its click and an open menu, keeping the lines of earlier runs into the
// same folder for other files. scripts/evidence-branch.sh keeps that record beside the images, so a
// later ticket that captures the same pages again reads their paths there (#282 retro: a
// feature's before screenshots named no `?topic=`, and a guessed slug matched nothing).
//
// It also records which source took each file, in <out-dir>/captured-by.txt: the --source a caller
// names, such as scripts/capture-with-fixtures.ts's fixtures module, else this command. A file
// another source took into the folder stops the run before a browser opens, with the file and both
// sources: a second module's capture of the same name would overwrite the first (#346 retro:
// health-service-inactive). The same source takes its files again, and a before image copied in
// is free. scripts/evidence-branch.sh leaves the record out of the branch
// (scripts/capture-plan.ts).
//
// While a window holds the runtime (docs/operations/development-quadlet.md "A window") its pages
// show the window's content in place of the demo dataset, so the script stops and names the
// window. The window's holder passes --in-window, as to scripts/dev-runtime-env.sh (#240 retro:
// a ticket's before screenshots were taken on another ticket's trial import).
//
// A pull request shows its pages before and after. Take the before screenshots while the runtime
// still serves the base, before the ticket's first scripts/dev-runtime-update.sh: afterwards they
// need the base promoted again.
//
// To show the images in a pull request without adding them to the code tree, put them on an
// image-only branch with scripts/evidence-branch.sh <ticket> <out-dir>, which prints how to push
// and embed them.

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { chromium } from "@playwright/test";
import { clashes, planShots } from "./capture-plan.ts";

let args = process.argv.slice(2);
const inWindow = args.includes("--in-window");
const sourceAt = args.indexOf("--source");
const source = sourceAt === -1 ? "capture-screenshots.mjs" : args[sourceAt + 1];
if (sourceAt !== -1) args = args.toSpliced(sourceAt, 2);
/** scripts/dev-runtime-common.sh's WINDOW_LOCK. */
const windowLock = join(homedir(), ".local/state/songhealth-qdev/window");
if (!inWindow && existsSync(windowLock)) {
	console.error(
		`capture-screenshots: a window holds the runtime: ${readFileSync(windowLock, "utf8").trim()}`,
	);
	console.error("wait until it closes (scripts/dev-runtime-window.sh status)");
	process.exit(1);
}
const [outDir, ...targets] = args.filter((arg) => arg !== "--in-window");
if (outDir === undefined || targets.length === 0 || source === undefined) {
	console.error(
		"usage: node scripts/capture-screenshots.mjs [--in-window] [--source <name>] <out-dir> <target> [<target>...]",
	);
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A record's lines of a file's name, a tab and its value, by the file. */
function readRecord(record) {
	return new Map(
		existsSync(record)
			? readFileSync(record, "utf8")
					.split("\n")
					.filter((line) => line !== "")
					.map((line) => line.split("\t", 2))
			: [],
	);
}

/** `lines` written to `record`, sorted by the file. */
async function writeRecord(record, lines) {
	await writeFile(
		record,
		[...lines]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([file, value]) => `${file}\t${value}\n`)
			.join(""),
	);
}

const shots = planShots(targets);
const record = join(outDir, "captures.txt");
const lines = readRecord(record);
const takenByRecord = join(outDir, "captured-by.txt");
const takenBy = readRecord(takenByRecord);
const taken = clashes(shots, takenBy, source);
if (taken.length > 0) {
	for (const { file, takenBy: other } of taken) {
		console.error(`capture-screenshots: ${file}: ${other} took it, this run is ${source}`);
	}
	console.error("name the capture apart, or take it into another folder");
	process.exit(1);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
/** Each file written, with its target as captures.txt records it. */
const written = new Map();
/** Each close-up's element size in CSS px, by its file. */
const elementSizes = new Map();

/** A PNG's width × height in pixels, from its IHDR header: a CSS px each, at scale factor 1. */
async function pngSize(file) {
	const header = (await readFile(file)).subarray(16, 24);
	return `${header.readUInt32BE(0)}×${header.readUInt32BE(4)}`;
}

/**
 * `path` opened at `viewport`, with every picture loaded and decoded, after a click on the element
 * whose whole text is `click`, when given.
 */
async function openPage(path, viewport, click) {
	// With reduced motion preferred a page stands still and whole: the Homepage's reveal holds back
	// what lies below the window, where a full-page screenshot never scrolls (#249).
	const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
	await page.goto(new URL(path, origin).href);
	// A full-page screenshot does not scroll, so lazy pictures below the fold would never load.
	// Load and decode every picture first, as a reader scrolling down would see it, including those
	// the click shows.
	await page.evaluate(async () => {
		await document.fonts.ready;
		for (const image of document.images) image.loading = "eager";
		await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
	});
	if (click !== undefined) await page.getByText(click, { exact: true }).click();
	return page;
}

try {
	for (const { file: name, target, path, viewport, selector, click, menu } of shots) {
		const page = await openPage(path, viewport, click);
		const file = join(outDir, name);
		if (selector === undefined) await page.screenshot({ path: file, fullPage: true });
		else {
			const element = page.locator(selector).first();
			await element.evaluate((node) => {
				for (const select of node.querySelectorAll("select")) select.size = select.length;
			});
			await element.screenshot({ path: file });
			const box = await element.boundingBox();
			elementSizes.set(file, `${box.width}×${box.height}`);
		}
		written.set(file, target);
		if (menu !== undefined) {
			await page.locator("summary").filter({ hasText: "เปิดเมนู" }).click();
			const menuFile = join(outDir, menu.file);
			await page.screenshot({ path: menuFile, fullPage: true });
			written.set(menuFile, menu.target);
		}
		await page.close();
	}
} finally {
	await browser.close();
}
for (const [file, target] of written) {
	lines.set(basename(file), target);
	takenBy.set(basename(file), source);
}
await writeRecord(record, lines);
await writeRecord(takenByRecord, takenBy);
for (const file of written.keys()) {
	const element = elementSizes.has(file) ? ` (element ${elementSizes.get(file)})` : "";
	console.log(`${file} ${await pngSize(file)}${element}`);
}
