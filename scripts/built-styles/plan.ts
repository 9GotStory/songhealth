// What scripts/check-built-styles.ts reads in a built stylesheet (#249 retro). No runtime import,
// so tests/node/built-styles.test.ts loads it with plain node.
//
// The build's minifier, lightningcss 1.33.0, folded `animation-timeline` into the `animation`
// shorthand, and Chromium 153 drops such a declaration whole: the Homepage's reveal would have
// been gone from a built page while every browser suite passed, since the development runtime
// serves the stylesheet unminified (docs/design/DESIGN.md §8.12).

/**
 * Each `animation` shorthand in `css` that names a scroll or view timeline, which browsers drop.
 */
export function droppedAnimations(css: string): string[] {
	return [...css.matchAll(/(?<![-\w])animation\s*:\s*([^;}]*)/g)]
		.map(([, value]) => value!.trim())
		.filter((value) => /\b(?:view|scroll)\(/.test(value))
		.map((value) => `animation: ${value}`);
}

/**
 * Whether `css` gives the Homepage's reveal its view timeline: undefined where the stylesheet has
 * no reveal at all.
 */
export function revealHasTimeline(css: string): boolean | undefined {
	const rule = /\.scroll-reveal\s*\{([^}]*)\}/.exec(css)?.[1];
	return rule === undefined ? undefined : /animation-timeline\s*:\s*view\(\)/.test(rule);
}
