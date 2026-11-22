// The widths Feature 008's tickets capture the Homepage at (spec #239 "Testing Decisions"), and
// what a fixtures module of cases builds on them (Feature 012 #366, Feature 013 #393).

import type { Capture } from "../capture-with-fixtures.ts";

export const HOMEPAGE_WIDTHS = [1440, 1024, 768, 375, 320];

/** `path` at the five widths, each named `${name}-${width}`. */
export const atWidths = (name: string, path: string): Capture[] =>
	HOMEPAGE_WIDTHS.map((width) => ({ name: `${name}-${width}`, path: `${path}@${width}` }));

/** The case the CASE variable names among `cases`; any other value throws. */
export function caseOf<Case extends string>(cases: readonly Case[]): Case {
	const which = process.env.CASE as Case;
	if (!cases.includes(which)) {
		throw new Error(`CASE must be one of ${cases.join(", ")}: ${process.env.CASE}`);
	}
	return which;
}
