// The first page of the News, Health News and Health Content lists (Feature 009 #284; spec #280
// "The first page"; docs/design/DESIGN.md §7.3).
//
// A first page that no Health Topic narrows shows its newest item as the large card, laid out by
// the number of items the page shows. From `lg`, where the grid has three columns, one item spans
// the row; two make the large card two columns wide beside the other; three or more make it two
// columns wide and two rows high beside the next two, the rest three to a row. From `sm` it spans
// the row of two, and below `sm` it leads the rows. A later page, and a list narrowed by a Health
// Topic, show even cards.

/** Where a list page stands: its page number, from 1, and whether a Health Topic narrows it. */
export interface ListPage {
	page: number;
	narrowed: boolean;
}

/** The large card's place in the grid and its least height. */
export interface LargeCard {
	/** How many of the three columns it spans from `lg`. */
	columnsFromLg: 2 | 3;
	/** How many rows it spans from `lg`: two, beside the next two cards. */
	rowsFromLg: 1 | 2;
	/** Its least height in px: below `sm`, from `sm` and from `lg`. */
	minHeight: { base: 300; sm: 380; lg: 380 | 440 | 520 };
}

/** The large card of a page showing `count` items, or none when the page shows even cards. */
export function firstPageLargeCard(
	count: number,
	{ page, narrowed }: ListPage,
): LargeCard | undefined {
	if (count === 0 || page > 1 || narrowed) return undefined;
	if (count === 1)
		return { columnsFromLg: 3, rowsFromLg: 1, minHeight: { base: 300, sm: 380, lg: 440 } };
	if (count === 2)
		return { columnsFromLg: 2, rowsFromLg: 1, minHeight: { base: 300, sm: 380, lg: 380 } };
	return { columnsFromLg: 2, rowsFromLg: 2, minHeight: { base: 300, sm: 380, lg: 520 } };
}

/** The page container's width from `lg`, in rem (src/styles/global.css --container-content). */
const CONTAINER_REM = 75;

/**
 * The `sizes` of the large card's picture: its columns' share of the container from `lg`, and the
 * row below, where the card spans it.
 */
export function largeCardPictureSizes({ columnsFromLg }: LargeCard): string {
	return `(min-width: 64rem) ${(CONTAINER_REM / 3) * columnsFromLg}rem, 100vw`;
}
