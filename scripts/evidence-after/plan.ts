// A folder of captures staged as after images for scripts/evidence-branch.sh --after (#395 retro:
// two tickets renamed their captures with `mv` and filtered captures.txt with `grep` by hand).
// Pure: scripts/evidence-after.ts reads the folder and copies the files this plan names.

/** One capture's copy, from its name in the folder to its after- name. */
export interface Copy {
	from: string;
	to: string;
}

/**
 * Each PNG of a folder named after-<name>, and the folder's captures.txt lines for those PNGs with
 * the same names, in the file's order. A line for an image the folder does not hold is left out;
 * `captures` is undefined when no line is left. A folder that already holds a before- or after-
 * image, or no PNG, is refused.
 */
export function afterImages(
	pngs: string[],
	captures: string | undefined,
): { copies: Copy[]; captures: string | undefined } {
	if (pngs.length === 0) throw new Error("evidence-after: no PNG in the folder");
	const named = pngs.filter((file) => /^(before|after)-/.test(file));
	if (named.length > 0) {
		throw new Error(
			`evidence-after: ${named.join(", ")} already carry a before-/after- name; run without --after`,
		);
	}
	const held = new Set(pngs);
	const lines = (captures ?? "")
		.split("\n")
		.filter((line) => held.has(line.split("\t")[0] ?? ""))
		.map((line) => `after-${line}`);
	return {
		copies: pngs.map((file) => ({ from: file, to: `after-${file}` })),
		captures: lines.length === 0 ? undefined : `${lines.join("\n")}\n`,
	};
}
