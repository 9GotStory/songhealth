// The verdict of scripts/check-built-reveal.ts on what it read in the browser (#276). No runtime
// import, so tests/node/built-reveal.test.ts loads it with plain node.
//
// A part of the Homepage that reveals (docs/design/DESIGN.md §8.12) is read three times on the
// built page: with motion allowed at the page's top, where it lies below the window and waits;
// with motion allowed once it is scrolled to; and with reduced motion preferred at the page's top.

/** One part as the page shows it at its top. */
interface PartAtTop {
	/** Its top edge, in px below the window's top. */
	top: number;
	/** How opaque it shows through everything that holds it: 0 to 1. */
	opacity: number;
}

export interface RevealReadings {
	/** The window's height in px. */
	windowHeight: number;
	/** With motion allowed, at the page's top; `timeline` is its computed `animation-timeline`. */
	waiting: PartAtTop & { timeline: string };
	/** How opaque it shows with motion allowed once it is in the window. */
	shown: number;
	/** With reduced motion preferred, at the page's top. */
	still: PartAtTop;
}

/** What is wrong with the readings, one line each: none for a reveal that works. */
export function revealFailures({ windowHeight, waiting, shown, still }: RevealReadings): string[] {
	const failures: string[] = [];
	const expect = (state: string, holds: boolean, failure: string) => {
		if (!holds) failures.push(`${state}: ${failure}`);
	};
	// A part whose top edge is at the window's bottom edge has not begun to come in.
	const expectBelow = (state: string, { top }: PartAtTop) =>
		expect(
			state,
			top >= windowHeight,
			`the part is not below the window (${top} px down, the window is ${windowHeight} px)`,
		);

	const waits = "motion allowed, at the page's top";
	expectBelow(waits, waiting);
	expect(
		waits,
		waiting.timeline === "view()",
		`animation-timeline is ${waiting.timeline}, not view()`,
	);
	expect(waits, waiting.opacity === 0, `opacity is ${waiting.opacity}, not 0`);
	expect("motion allowed, scrolled to", shown === 1, `opacity is ${shown}, not 1`);
	const stands = "reduced motion, at the page's top";
	expectBelow(stands, still);
	expect(stands, still.opacity === 1, `opacity is ${still.opacity}, not 1`);
	return failures;
}
