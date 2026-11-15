// What scripts/measure-text-contrast.ts and scripts/measure-focus-contrast.ts share: the widths and
// the origin they read, a page opened at each width with its animations stopped, the run with a
// fixtures module, PNG screenshots decoded to pixels, and WCAG 2.2's contrast ratio.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";

import { SYNTHETIC_REFERRER } from "../playwright.config.ts";
import type { Fixtures } from "./capture-with-fixtures.ts";
import { fixturePath } from "./contrast/plan.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A colour's red, green and blue, 0 to 255. */
export type Rgb = readonly [number, number, number];

/** The colour a computed style writes, such as "rgb(11, 107, 87)". */
export function rgbOf(color: string): Rgb {
	const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
	return [r, g, b];
}

/** How far apart two colours are: the sum of their channels' differences, 0 to 765. */
export function distance(one: Rgb, other: Rgb): number {
	return one.reduce((sum, channel, index) => sum + Math.abs(channel - other[index]!), 0);
}

/** WCAG 2.2's relative luminance of a colour. */
function luminance([r, g, b]: Rgb): number {
	const linear = (channel: number) => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2.2's contrast ratio of two colours, 1 to 21. */
export function contrast(one: Rgb, other: Rgb): number {
	const [a, b] = [luminance(one), luminance(other)];
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A decoded screenshot: its width and its pixels, four channels each, row by row. */
export interface Pixels {
	width: number;
	data: number[];
}

/** The pixels of each PNG screenshot, decoded by the page's own browser. */
export function decode(page: Page, pngs: Buffer[]): Promise<Pixels[]> {
	return page.evaluate(
		(encoded) =>
			Promise.all(
				encoded.map(async (png) => {
					const image = new Image();
					image.src = `data:image/png;base64,${png}`;
					await image.decode();
					const canvas = document.createElement("canvas");
					canvas.width = image.width;
					canvas.height = image.height;
					const context = canvas.getContext("2d")!;
					context.drawImage(image, 0, 0);
					const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
					return { width: image.width, data: Array.from(data) };
				}),
			),
		pngs.map((png) => png.toString("base64")),
	);
}

/** The colour of the pixel that starts at `at` in `pixels.data`. */
export function pixelAt(pixels: Pixels, at: number): Rgb {
	return [pixels.data[at]!, pixels.data[at + 1]!, pixels.data[at + 2]!];
}

/** One thing to read on a page: the name its line carries, and the locator that finds it. */
export interface Target {
	name: string;
	selector: string;
}

/**
 * Open `path` at each width with animations and transitions stopped, and `style` added when it is
 * given, and print what `read` gives for each selector there, a line each. With `expand`, a
 * selector stands for the targets it gives on that page, a line each under its own name. With a
 * fixtures module of scripts/screenshot-fixtures/, its content is made first and removed
 * afterwards, as scripts/capture-with-fixtures.ts does; a path written "fixture:<name>" is then
 * the page of the module's capture of that name, whose slug the module made (#287 retro). The
 * measuring runs in this process without blocking it, so the fixture kit's restore still reaches
 * the runtime (a blocked event loop failed a menu restore in #241). Pages are read anonymously.
 */
export async function measureAtEachWidth(
	{
		path,
		selectors,
		fixtures,
		style,
		expand,
	}: {
		path: string;
		selectors: string[];
		fixtures?: string;
		style?: string;
		expand?: (page: Page, selector: string) => Promise<Target[]>;
	},
	read: (page: Page, selector: string, name: string) => Promise<string>,
): Promise<void> {
	const FIXTURE = "fixture:";
	if (path.startsWith(FIXTURE) && fixtures === undefined) {
		throw new Error(`${path} needs --fixtures, the module that makes the page`);
	}
	const measure = async (path: string) => {
		const browser = await chromium.launch();
		try {
			for (const width of WIDTHS) {
				const page = await browser.newPage({
					viewport: { width, height: 1200 },
					extraHTTPHeaders: { referer: SYNTHETIC_REFERRER },
				});
				await page.goto(new URL(path, ORIGIN).href);
				if (style !== undefined) await page.addStyleTag({ content: style });
				await page.evaluate(() => {
					for (const node of document.querySelectorAll<HTMLElement>("*")) {
						node.style.setProperty("animation", "none", "important");
						node.style.setProperty("transition", "none", "important");
					}
				});
				for (const selector of selectors) {
					const targets = expand ? await expand(page, selector) : [{ name: selector, selector }];
					for (const target of targets) {
						const reading = await read(page, target.selector, target.name);
						console.log(`${width} px  ${target.name}  ${reading}`);
					}
				}
				await page.close();
			}
		} finally {
			await browser.close();
		}
	};
	if (fixtures === undefined) {
		await measure(path);
		return;
	}
	const { withFixtureKit } = await import("./fixture-kit.ts");
	await withFixtureKit(async (kit) => {
		const module = (await import(pathToFileURL(resolve(fixtures)).href)).default as Fixtures;
		const captures = await module(kit);
		await measure(
			path.startsWith(FIXTURE) ? fixturePath(captures, path.slice(FIXTURE.length)) : path,
		);
	});
}
