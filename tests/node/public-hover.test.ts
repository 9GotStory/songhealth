// What moves under the pointer on public pages (#242 retro; CODING_STANDARDS "Public pages").
//
// An element that moves away from the pointer when it is hovered ends its own hover: it drops
// back, takes the hover again, and flickers at its edge, as the Homepage's Service card did in
// #242's first review. So no element translates on its own `hover:`. The element that takes the
// hover keeps its place as a `group`, and a child moves on `group-hover:`. This test reads the
// public pages' source under src/ and fails on a class that carries the `hover:` variant on a
// translate utility.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lineAt, publicSources } from "./public-sources.helpers.ts";

/** A class token: a run without whitespace, quotes or the brackets a template wraps classes in. */
const CLASS_TOKEN = /[^\s"'`{}[\](),]+/g;

/** Whether `token` is a translate utility under the element's own `hover:` variant. */
function translatesOnOwnHover(token: string): boolean {
	const parts = token.split(":");
	const utility = parts.pop()!;
	return parts.includes("hover") && /^-?translate-/.test(utility);
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
