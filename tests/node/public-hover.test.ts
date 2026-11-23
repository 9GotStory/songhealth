// What moves under the pointer on public pages (#242 retro; CODING_STANDARDS "Public pages").
//
// An element that moves away from the pointer when it is hovered ends its own hover: it drops
// back, takes the hover again, and flickers at its edge, as the Homepage's Service card did in
// #242's first review. So no element translates on its own `hover:`. The element that takes the
// hover keeps its place as a `group`, and a child moves on `group-hover:`. This test reads the
// public pages' source under src/ and fails on a class that carries the `hover:` variant on a
// translate utility.
//
// A focus ring with the lists' white band (`focus-ring-banded`) draws the band as a `box-shadow`,
// so a `hover:shadow-*` on the same element replaces the band while the element has the keyboard's
// focus and the pointer is over it: the ITA landing's year card did until #393, and the Quick
// Access tile's list form on /health and /about did until #420 (#408). So an element that carries
// `focus-ring-banded` carries no `hover:shadow-*` unless `not-focus-visible` guards it (#393 retro,
// #393 comment 7076806956).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lineAt, publicSources } from "./public-sources.helpers.ts";

/** A class token: a run without whitespace, quotes or the brackets a template wraps classes in. */
const CLASS_TOKEN = /[^\s"'`{}[\](),]+/g;

/** The variants of a class token and its utility, the part after the last ":". */
function variantsOf(token: string): { variants: string[]; utility: string } {
	const variants = token.split(":");
	return { utility: variants.pop()!, variants };
}

/** Whether `token` is a translate utility under the element's own `hover:` variant. */
function translatesOnOwnHover(token: string): boolean {
	const { variants, utility } = variantsOf(token);
	return variants.includes("hover") && /^-?translate-/.test(utility);
}

/** Whether `token` is a shadow under the element's own `hover:`, with no `not-focus-visible:`. */
function shadowsOnUnguardedHover(token: string): boolean {
	const { variants, utility } = variantsOf(token);
	return (
		variants.includes("hover") &&
		!variants.includes("not-focus-visible") &&
		/^shadow-/.test(utility)
	);
}

/**
 * Each element's start tag in `source`, with its index: from "<" and a letter to the ">" that
 * closes it outside a quoted string and outside an expression's braces, so a class such as
 * `[&>svg]:self-end` or an arrow function inside `class:list` stays in its tag.
 */
function* startTags(source: string): Generator<{ tag: string; index: number }> {
	for (const open of source.matchAll(/<[A-Za-z]/g)) {
		let quote: string | undefined;
		let depth = 0;
		for (let at = open.index + 1; at < source.length; at++) {
			const char = source[at]!;
			if (quote) {
				if (char === "\\") at++;
				else if (char === quote) quote = undefined;
			} else if (char === '"' || char === "'" || char === "`") quote = char;
			else if (char === "{") depth++;
			else if (char === "}") depth--;
			else if (char === ">" && depth === 0 && source[at - 1] !== "=") {
				yield { tag: source.slice(open.index, at + 1), index: open.index };
				break;
			}
		}
	}
}

/** Each element in `source` that pairs `focus-ring-banded` with an unguarded hover shadow. */
function bandedWithHoverShadow(source: string): Array<{ index: number; shadows: string[] }> {
	const found = [];
	for (const { tag, index } of startTags(source)) {
		const tokens = [...tag.matchAll(CLASS_TOKEN)].map(([token]) => token);
		const shadows = tokens.filter(shadowsOnUnguardedHover);
		if (tokens.includes("focus-ring-banded") && shadows.length > 0) found.push({ index, shadows });
	}
	return found;
}

describe("an element that moves under the pointer", () => {
	it("moves on its group's hover, never on its own", async () => {
		const found: string[] = [];
		for (const { file, source } of await publicSources()) {
			for (const match of source.matchAll(CLASS_TOKEN)) {
				if (translatesOnOwnHover(match[0])) {
					found.push(`${file}:${lineAt(source, match.index)} ${match[0]}`);
				}
			}
		}
		assert.deepEqual(found, [], "classes that translate an element on its own hover");
	});

	it("is told apart from a child that moves on its group's hover", () => {
		assert.equal(translatesOnOwnHover("motion-safe:hover:-translate-y-2"), true);
		assert.equal(translatesOnOwnHover("hover:translate-x-1"), true);
		assert.equal(translatesOnOwnHover("motion-safe:group-hover:-translate-y-2"), false);
		assert.equal(translatesOnOwnHover("hover:bg-brand-primary"), false);
	});
});

describe("an element with the focus ring's white band", () => {
	it("takes no hover shadow unless not-focus-visible guards it", async () => {
		const found: string[] = [];
		for (const { file, source } of await publicSources()) {
			for (const { index, shadows } of bandedWithHoverShadow(source)) {
				found.push(`${file}:${lineAt(source, index)} ${shadows.join(" ")}`);
			}
		}
		assert.deepEqual(found, [], "elements whose hover shadow replaces the focus ring's band");
	});

	it("is told apart from a guarded hover shadow and from a shadow on another element", () => {
		const shadowsOf = (source: string) =>
			bandedWithHoverShadow(source).map(({ shadows }) => shadows);
		// The Quick Access tile's list form before #420 (#408), its class:list across lines.
		assert.deepEqual(
			shadowsOf(`<a
	class:list={[
		"flex shadow-card hover:shadow-deep max-sm:[&>svg]:self-end",
		kind === "list" && "focus-ring-banded",
	]}
	href={href}
>`),
			[["hover:shadow-deep"]],
		);
		assert.deepEqual(shadowsOf('<a class="focus-ring-banded motion-safe:hover:shadow-deep">'), [
			["motion-safe:hover:shadow-deep"],
		]);
		// The ITA landing's year card since #393.
		assert.deepEqual(
			shadowsOf('<a class="focus-ring-banded shadow-card hover:not-focus-visible:shadow-deep">'),
			[],
		);
		// A MOIT row: the hover shadow on the article, the band on the title's link.
		assert.deepEqual(
			shadowsOf(
				'<article class="shadow-card hover:shadow-deep"><h2><a class="focus-ring-banded" href={moitPath(id)}>',
			),
			[],
		);
		// A row whose surface takes the shadow on its group's hover.
		assert.deepEqual(
			shadowsOf('<a class="focus-ring-banded motion-safe:group-hover:shadow-deep">'),
			[],
		);
	});
});
