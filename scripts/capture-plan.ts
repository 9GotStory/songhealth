// The plan of scripts/capture-screenshots.mjs, without a browser: each target as the screenshots it
// takes, and the files another source already took into the folder (#346 retro: two fixture
// modules named a capture health-service-inactive, and the second overwrote the first in one
// folder). tests/node/capture-plan.test.ts reads it.

const WIDTHS = [
	{ name: "desktop", viewport: { width: 1440, height: 900 } },
	{ name: "375", viewport: { width: 375, height: 812 } },
	{ name: "320", viewport: { width: 320, height: 640 } },
];

/** A file-name stem for a path: "/" is "home", "/news/x" is "news-x". Thai letters stay. */
function stem(path: string): string {
	const trimmed = path.replace(/^\/+|\/+$/g, "").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-");
	return trimmed === "" ? "home" : trimmed;
}

/**
 * A target as its file-name base, its path, the one width and element it names, if any, and the
 * text of what to click first, if any: "name=/path" names it, a bare "/path" names itself,
 * "@width>selector" follows the path, and "!text" ends the target.
 */
function parseTarget(target: string) {
	const split = target.startsWith("/") ? -1 : target.indexOf("=");
	const name = split === -1 ? undefined : target.slice(0, split);
	const unnamed = split === -1 ? target : target.slice(split + 1);
	const bang = unnamed.indexOf("!");
	const rest = bang === -1 ? unnamed : unnamed.slice(0, bang);
	const one = /^(?<path>.*?)@(?<width>\d+)(?:>(?<selector>.+))?$/.exec(rest)?.groups;
	const path = one?.path ?? rest;
	return {
		base: name ?? (one ? `${stem(path)}-${one.width}` : stem(path)),
		path,
		width: one === undefined ? undefined : Number(one.width),
		selector: one?.selector,
		click: bang === -1 ? undefined : unnamed.slice(bang + 1),
	};
}

/** A file a shot writes, with its target as captures.txt records it. */
type Written = { file: string; target: string };

/** A screenshot to take: the page to open and how, and the file it writes. */
export type Shot = Written & {
	path: string;
	viewport: { width: number; height: number };
	selector?: string | undefined;
	click?: string | undefined;
	/** The same page with the menu open, at the first target's mobile widths. */
	menu?: Written | undefined;
};

/**
 * Each screenshot the targets take, in order: its file name, its target as captures.txt records
 * it, the page to open and how. A target at one width is one screenshot, full-page or a close-up of
 * its selector's element; any other is one at each of the three widths, and the first target, at
 * the mobile widths, also takes `menu`, the same page with the menu open.
 */
export function planShots(targets: string[]): Shot[] {
	return targets.map(parseTarget).flatMap(({ base, path, width, selector, click }, index) => {
		const clicked = click === undefined ? "" : `!${click}`;
		if (width !== undefined) {
			const closeUp = selector === undefined ? "" : `>${selector}`;
			return [
				{
					file: `${base}.png`,
					target: `${path}@${width}${closeUp}${clicked}`,
					path,
					viewport: { width, height: 900 },
					selector,
					click,
				},
			];
		}
		return WIDTHS.map(({ name, viewport }): Shot => {
			const target = `${path}@${viewport.width}${clicked}`;
			const menu =
				index === 0 && name !== "desktop"
					? { file: `${base}-${name}-menu.png`, target: `${target} menu open` }
					: undefined;
			return { file: `${base}-${name}.png`, target, path, viewport, click, menu };
		});
	});
}

/**
 * Each file the shots would write that `takenBy` (captured-by.txt's lines, file to source) gives to
 * another source than `source`, with that source. The source, not the path, tells the runs apart:
 * a synthetic page's slug is new on each run, so the same fixtures taken again have new paths, and
 * two modules' pages of the same kind have paths alike. A file no source took, such as a before
 * image copied in, is free.
 */
export function clashes(
	shots: Shot[],
	takenBy: Map<string, string>,
	source: string,
): { file: string; takenBy: string }[] {
	return shots
		.flatMap((shot): Written[] => (shot.menu ? [shot, shot.menu] : [shot]))
		.flatMap(({ file }) => {
			const other = takenBy.get(file);
			return other === undefined || other === source ? [] : [{ file, takenBy: other }];
		});
}

/**
 * scripts/capture-with-fixtures.ts's captures under `--only <prefix>`: those whose name starts with
 * it, such as one fixture page of a module that makes a whole list, for a close-up its other pages
 * do not hold (#346 retro: a selector the list pages lack failed the run). Every capture without a
 * prefix; a prefix no name starts with stops the run, naming the names there are.
 */
export function onlyNamed<Capture extends string | { name: string }>(
	captures: Capture[],
	prefix: string | undefined,
): Capture[] {
	if (prefix === undefined) return captures;
	const named = captures.filter(
		(page): page is Exclude<Capture, string> => typeof page !== "string",
	);
	const kept = named.filter(({ name }) => name.startsWith(prefix));
	if (kept.length === 0) {
		const names = named.map(({ name }) => name).join(", ");
		throw new Error(`no capture's name starts with ${prefix}: ${names}`);
	}
	return kept;
}
