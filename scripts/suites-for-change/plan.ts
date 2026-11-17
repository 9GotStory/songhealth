// Which browser suites read what a change touches (#339 retro): scripts/suites-for-change.ts feeds
// it the changed paths and the files' text. A page under src/pages/ is read by the suites that
// name its address; a component or layout, by the suites that name the address of a page that
// imports it, directly or through another component; a suite the change edits is listed as well.
// #339 changed HomeQuickLink for /health, and public-homepage-curation.spec.ts, which reads
// /health, failed only in the full suite.

/** A file of the repository and its text. */
export interface SourceFile {
	path: string;
	text: string;
}

/** A suite to run and why: each changed address it names, or "edited". */
export interface Suite {
	path: string;
	because: string[];
}

/**
 * The address a page under src/pages/ answers, with `[slug]`-style parts as a trailing "/" (any
 * address under it), or undefined for a file that is not a page.
 */
export function addressOf(page: string): string | undefined {
	const match = /^src\/pages\/(.*)\.(astro|ts)$/.exec(page);
	if (!match) return undefined;
	const parts = match[1].split("/");
	if (parts.at(-1) === "index") parts.pop();
	const dynamic = parts.findIndex((part) => part.startsWith("["));
	if (dynamic >= 0) return `/${parts.slice(0, dynamic).join("/")}/`.replace(/^\/\/$/, "/");
	return `/${parts.join("/")}`;
}

/** The pages under src/pages/ that import `changed`, directly or through other source files. */
function pagesImporting(changed: string, sources: SourceFile[]): string[] {
	const pages = new Set<string>();
	const seen = new Set([changed]);
	const queue = [changed];
	while (queue.length > 0) {
		const file = queue.shift()!;
		const name = file.slice(file.lastIndexOf("/") + 1);
		for (const source of sources) {
			if (seen.has(source.path)) continue;
			const imports = source.text.match(/from\s+["'][^"']+["']/g) ?? [];
			if (!imports.some((line) => line.endsWith(`/${name}"`) || line.endsWith(`/${name}'`))) {
				continue;
			}
			seen.add(source.path);
			if (addressOf(source.path) === undefined) queue.push(source.path);
			else pages.add(source.path);
		}
	}
	return [...pages];
}

/** Whether a suite's text names `address` as a string, or, for a "/…/" address, one under it. */
function names(text: string, address: string): boolean {
	const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const end = address.endsWith("/") && address !== "/" ? "" : "(?=[\"'`?#])";
	return new RegExp(`["'\`]${escaped}${end}`).test(text);
}

/**
 * The suites to run for `changed`, in path order, each with its reasons, and the changed source
 * files that bring in no suite, to read by hand.
 */
export function suitesFor(
	changed: string[],
	sources: SourceFile[],
	suites: SourceFile[],
): { suites: Suite[]; unmatched: string[] } {
	const reasons = new Map<string, Set<string>>();
	const add = (suite: string, reason: string) =>
		reasons.set(suite, (reasons.get(suite) ?? new Set()).add(reason));
	const unmatched: string[] = [];
	for (const path of changed) {
		if (suites.some((suite) => suite.path === path)) {
			add(path, "edited");
			continue;
		}
		if (!path.startsWith("src/")) continue;
		const pages = addressOf(path) === undefined ? pagesImporting(path, sources) : [path];
		let found = false;
		for (const page of pages) {
			const address = addressOf(page)!;
			for (const suite of suites) {
				if (!names(suite.text, address)) continue;
				add(suite.path, address);
				found = true;
			}
		}
		if (!found) unmatched.push(path);
	}
	return {
		suites: [...reasons]
			.map(([path, because]) => ({ path, because: [...because] }))
			.sort((a, b) => a.path.localeCompare(b.path)),
		unmatched,
	};
}
