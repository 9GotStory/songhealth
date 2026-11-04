// How wide each word a title keeps whole is (src/lib/thai-title.ts), at each type size a title
// takes, in the site's own font on the development runtime (#146 retro). A kept word cannot break,
// so a title's column must be at least as wide as its widest word at the column's type size: a
// spec's or ticket's "fits" claim compares this table with the column at the tightest width.
//
//   node scripts/thai-title-widths.ts
//
// The sizes and weights are the type tokens of src/styles/global.css. It reads the Homepage
// anonymously from PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324, for the self-hosted font, and
// prints a Markdown table: each word, its characters, and its width in CSS px at each size, widest
// first.

import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

import { KEPT_WORDS } from "../src/lib/thai-title.ts";

const css = await readFile(new URL("../src/styles/global.css", import.meta.url), "utf8");

/** The font size and weight of the type token `--text-<name>`, as the stylesheet sets them. */
function token(name: string): { size: string; weight: string } {
	const size = new RegExp(`--text-${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
	if (size === undefined) throw new Error(`src/styles/global.css sets no --text-${name}`);
	const weight = new RegExp(`--text-${name}--font-weight:\\s*([^;]+);`).exec(css)?.[1]?.trim();
	return { size, weight: weight ?? "400" };
}

/** The type a title takes, as its column heading, its size and its weight. */
const SIZES = [
	{ name: "Display", ...token("display") },
	{ name: "H1", ...token("h1") },
	{ name: "H2", ...token("h2") },
	{ name: "H3", ...token("h3") },
	{ name: "Body Large 600 (card)", ...token("body-large"), weight: "600" },
	{ name: "Body 600 (compact card)", ...token("body"), weight: "600" },
];

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";
const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	await page.goto(new URL("/", origin).href);
	const rows = await page.evaluate(
		async ({ words, sizes }) => {
			const probes = words.map((word) =>
				sizes.map(({ size, weight }) => {
					const probe = document.createElement("span");
					probe.style.cssText = `position: absolute; white-space: nowrap; font-size: ${size}; font-weight: ${weight}`;
					probe.textContent = word;
					document.body.append(probe);
					return probe;
				}),
			);
			// Every weight the probes use has loaded before they are measured.
			await document.fonts.ready;
			return probes.map((row, index) => ({
				word: words[index]!,
				widths: row.map((probe) => Math.round(probe.getBoundingClientRect().width)),
			}));
		},
		{ words: [...KEPT_WORDS], sizes: SIZES },
	);
	rows.sort((a, b) => b.widths[0]! - a.widths[0]!);
	console.log(`| Word | Characters | ${SIZES.map(({ name }) => name).join(" | ")} |`);
	console.log(`| --- | --- | ${SIZES.map(() => "---").join(" | ")} |`);
	for (const { word, widths } of rows) {
		console.log(`| ${word} | ${[...word].length} | ${widths.join(" | ")} |`);
	}
} finally {
	await browser.close();
}
