// The pages a person opened on the development runtime, from the app's log (#250 retro: a
// walkthrough's record could not tell the Product Owner's Homepage from the container's health
// check, which asks for / every HealthInterval).
//
// A line of `podman logs --timestamps` reads "<ISO time> HH:MM:SS [<status>] <path> <n>ms". The
// log drops query strings and holds no window width, so neither is read here.

/** A page other than the Homepage that a request named. */
export interface OpenedPage {
	at: string;
	status: number;
	path: string;
}

/** A stretch of requests for / closer together than the health check's interval. */
export interface HomepageStretch {
	from: string;
	to: string;
	/** The requests in the stretch beyond the health checks it has room for: at least this many. */
	loads: number;
}

const REQUEST = /^(\S+T\S+) \S+ \[(\d{3})\] (\/\S*) \d+ms$/;

/** What a page loads by itself: the framework's and the CMS's own paths, and files. */
function isAsset(path: string): boolean {
	return path.startsWith("/_") || path.startsWith("/@") || /\.[a-z0-9]+$/i.test(path);
}

function seconds(time: string): number {
	// The log writes nine fraction digits; a Date reads three.
	return Math.floor(Date.parse(time.replace(/(\.\d{3})\d+/, "$1")) / 1000);
}

function stamp(at: number): string {
	return new Date(at * 1000).toISOString().replace(".000Z", "Z");
}

/**
 * The pages the log's lines name, and the requests for / that the health check cannot explain.
 * The health check's requests are `healthIntervalSeconds` apart or more, so two requests for /
 * closer than that hold at least one other load.
 */
export function openedPages(
	lines: readonly string[],
	healthIntervalSeconds: number,
): { pages: OpenedPage[]; homepage: HomepageStretch[] } {
	const pages: OpenedPage[] = [];
	const stretches: number[][] = [];
	for (const line of lines) {
		const match = REQUEST.exec(line.trim());
		if (match === null) continue;
		const [, time, status, path] = match;
		if (isAsset(path)) continue;
		const at = seconds(time);
		if (path !== "/") {
			pages.push({ at: stamp(at), status: Number(status), path });
			continue;
		}
		const stretch = stretches.at(-1);
		const last = stretch?.at(-1);
		if (stretch !== undefined && last !== undefined && at - last < healthIntervalSeconds) {
			stretch.push(at);
		} else {
			stretches.push([at]);
		}
	}
	const homepage = stretches.flatMap((stretch) => {
		const from = stretch[0];
		const to = stretch[stretch.length - 1];
		const loads = stretch.length - (Math.floor((to - from) / healthIntervalSeconds) + 1);
		return loads > 0 ? [{ from: stamp(from), to: stamp(to), loads }] : [];
	});
	return { pages, homepage };
}
