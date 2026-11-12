// How the Homepage lays out its latest Activities (Feature 008 #247; spec #239 "Activities").
//
// Five Activities are one large tile beside four small ones, two by two: from `lg` the large tile
// stands at the right, and below it spans the row above them. Fewer are equal tiles in one row
// from `lg`. Below `lg` the tiles go two to a row, and the first spans the row only when the
// others are an even number, so no cell is empty: two stand side by side and four two by two
// (Product Owner, 2026-11-12: #247 comment 6820174924, in place of spec #239's "the first across
// the row").

/** The layout of the Homepage's Activities. */
export interface ActivitiesLayout {
	/** The newest Activity is the large tile, two rows high, beside the four others. */
	large: boolean;
	/** How many columns the grid has from `lg`. */
	columns: 1 | 2 | 3 | 4;
	/** Below `lg`, where the grid has two columns, the first tile spans the row. */
	firstSpansRow: boolean;
}

/** The layout for `count` Activities, 1 to 5. */
export function activitiesLayout(count: number): ActivitiesLayout {
	const large = count >= 5;
	return {
		large,
		columns: large ? 4 : (Math.max(count, 1) as ActivitiesLayout["columns"]),
		firstSpansRow: count % 2 === 1,
	};
}
