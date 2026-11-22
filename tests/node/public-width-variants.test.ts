// Width variants and state variants on one property in the public pages' classes (#396 retro;
// CODING_STANDARDS "Public pages").
//
// Tailwind 4.3.3 writes a `max-*` variant's rules before the breakpoint variants' rules, so on one
// property a `max-lg:` loses to a `sm:` across the widths both cover (#285 retro). A state variant
// such as `hover:` adds a pseudo-class to the selector, so a plain `hover:` beats a `lg:` on one
// property at every width: #396's first review fix gave `hover:border-brand-primary
// lg:border-transparent`, and from 1,024 px the edge showed under the pointer until
// `lg:hover:border-transparent` joined it. This test reads each quoted class string of the public
// pages' source under src/ and fails on either pair.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { lineAt, publicSources } from "./public-sources.helpers.ts";

/** The breakpoints in ascending order, Tailwind 4.3.3's defaults (global.css sets no other). */
const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"];

/** Variants that add a pseudo-class or an attribute to the element's selector. */
const STATE =
	/^(?:hover|focus|focus-visible|focus-within|active|visited|target|open|disabled|checked|first|last|odd|even|(?:group|peer)-.+|aria-.+|data-.+)$/;

/** Display utilities, which all set one property. */
const DISPLAY = new Set([
	...["hidden", "block", "inline", "inline-block", "inline-flex", "flex", "grid"],
	...["inline-grid", "contents", "table", "flow-root"],
]);

/** Text utilities that set the font size: the theme's `--text-*` sizes. */
const TEXT_SIZES = new Set(["body", "body-large", "display", "h1", "h2", "h3", "label", "small"]);

/** A class token: a run without whitespace, quotes or the brackets a template wraps classes in. */
const CLASS_TOKEN = /[^\s"'`{}[\](),]+/g;

/** A quoted string on one line, or a template literal. */
const QUOTED = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;

export interface ClassToken {
	token: string;
	/** The property the utility sets, as far as this test needs to tell two apart. */
	property: string;
	/** The smallest breakpoint a `sm:`-style variant starts at, as an index into BREAKPOINTS. */
	from?: number;
	/** The breakpoint a `max-*` variant ends before, as an index into BREAKPOINTS. */
	before?: number;
	/** The state variants, sorted. */
	states: string[];
	/** The other variants (`motion-safe:`, `*:`, `[&>svg]:`), which scope the token apart. */
	scope: string;
}

/** The property `utility` sets; `colors` holds the theme's `--color-*` names. */
export function propertyOf(utility: string, colors: ReadonlySet<string>): string {
	const bare = utility.replace(/^[!-]/, "");
	if (DISPLAY.has(bare)) return "display";
	if (/^border(?:-[trblxy])?(?:-\d+)?$/.test(bare)) return bare.replace(/-\d+$/, "") + "-width";
	const tinted = /^(text|bg|border(?:-[trblxy])?|ring|outline|fill|stroke|decoration)-(.+)$/.exec(
		bare,
	);
	if (tinted) {
		const [, family, value] = tinted as unknown as [string, string, string];
		const name = value.replace(/\/\d+$/, "");
		if (colors.has(name) || ["transparent", "current", "white", "black"].includes(name)) {
			return `${family}-color`;
		}
		if (family === "text") return TEXT_SIZES.has(name) ? "font-size" : bare;
	}
	return bare.includes("-") ? bare.replace(/-[^-]+$/, "") : bare;
}

/** `token` split into its property, its width range, its states and its other variants. */
export function parseToken(token: string, colors: ReadonlySet<string>): ClassToken {
	const variants = token.split(":");
	const utility = variants.pop()!;
	const parsed: ClassToken = {
		token,
		property: propertyOf(utility, colors),
		states: [],
		scope: "",
	};
	const scope: string[] = [];
	for (const variant of variants) {
		const min = BREAKPOINTS.indexOf(variant);
		const max = variant.startsWith("max-") ? BREAKPOINTS.indexOf(variant.slice(4)) : -1;
		if (min >= 0) parsed.from = Math.max(parsed.from ?? 0, min);
		else if (max >= 0) parsed.before = Math.min(parsed.before ?? BREAKPOINTS.length, max);
		else if (STATE.test(variant)) parsed.states.push(variant);
		else scope.push(variant);
	}
	parsed.states.sort();
	parsed.scope = scope.join(":");
	return parsed;
}

/**
 * The pairs in one class string that break the rules: a `max-*` token and a breakpoint token on
 * one property whose widths overlap, and a state token that no width bounds beside a breakpoint
 * token on its property, with no state token at that breakpoint to answer it.
 */
export function clashes(tokens: readonly ClassToken[]): string[] {
	const found: string[] = [];
	for (const a of tokens) {
		for (const b of tokens) {
			if (a === b || a.property !== b.property || a.scope !== b.scope) continue;
			const sameStates = a.states.join() === b.states.join();
			if (sameStates && a.before !== undefined && b.from !== undefined && b.from < a.before) {
				found.push(`${a.token} loses to ${b.token}`);
			}
			const unbounded = a.from === undefined && a.before === undefined;
			if (a.states.length > 0 && unbounded && b.states.length === 0 && b.from !== undefined) {
				const answered = tokens.some(
					(c) =>
						c.property === a.property &&
						c.scope === a.scope &&
						c.from !== undefined &&
						c.from <= b.from! &&
						a.states.every((state) => c.states.includes(state)),
				);
				if (!answered) found.push(`${a.token} beats ${b.token}`);
			}
		}
	}
	return found;
}

async function themeColors(): Promise<Set<string>> {
	const css = await readFile(new URL("../../src/styles/global.css", import.meta.url), "utf8");
	return new Set([...css.matchAll(/--color-([a-z0-9-]+):/g)].map((match) => match[1]!));
}

describe("a property set at some widths and in some states", () => {
	it("keeps each class string's width and state variants from overriding one another", async () => {
		const colors = await themeColors();
		const found: string[] = [];
		for (const { file, source } of await publicSources()) {
			for (const quoted of source.matchAll(QUOTED)) {
				const tokens = [...quoted[0].matchAll(CLASS_TOKEN)].map((m) => parseToken(m[0], colors));
				for (const clash of clashes(tokens)) {
					found.push(`${file}:${lineAt(source, quoted.index)} ${clash}`);
				}
			}
		}
		assert.deepEqual(found, [], "class strings whose variants override one another");
	});

	const colors = new Set(["brand-primary", "surface-soft", "border-default"]);
	const check = (classes: string) => clashes(classes.split(" ").map((t) => parseToken(t, colors)));

	it("finds a max-* variant that a smaller breakpoint overrides", () => {
		assert.deepEqual(check("pb-10 sm:pb-12 max-lg:pb-20"), ["max-lg:pb-20 loses to sm:pb-12"]);
		assert.deepEqual(check("max-sm:pt-9 lg:pt-22"), []);
		assert.deepEqual(check("max-lg:border-b lg:border-r"), []);
		assert.deepEqual(check("max-sm:hidden sm:flex"), []);
	});

	it("finds a state variant that beats a breakpoint on its property", () => {
		assert.deepEqual(
			check("border-border-default hover:border-brand-primary lg:border-transparent"),
			["hover:border-brand-primary beats lg:border-transparent"],
		);
		assert.deepEqual(
			check(
				"hover:border-brand-primary lg:border-transparent lg:hover:border-transparent lg:hover:bg-surface-soft",
			),
			[],
		);
		assert.deepEqual(check("max-lg:hover:border-brand-primary lg:border-transparent"), []);
		assert.deepEqual(check("hover:bg-surface-soft lg:border-transparent"), []);
		assert.deepEqual(check("motion-safe:hover:text-brand-primary lg:text-body"), []);
	});
});
