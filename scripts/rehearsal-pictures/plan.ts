// The pictures' evidence script on the rehearsal machine (#458; spec #450 "Testing Decisions": a
// Playwright evidence script kept in the repository, run on the rehearsal machine only, never a CI
// gate): what the command takes, the views it opens, and when a view's pictures pass. Nothing here
// opens a browser, so node:test covers it (tests/node/rehearsal-pictures.test.ts);
// scripts/rehearsal-pictures.ts runs it on the workstation.

import { isIP } from "node:net";

/** Phone and desktop (spec #450, "The proxy and #218"). */
export const WIDTHS = [390, 1440] as const;

/** Each kind of public page that shows a picture, with the demo dataset installed: a list's own
 * path, or the first entry its list links to. */
export const PUBLIC_PAGES: readonly { name: string; path: string; firstEntryOf?: string }[] = [
	{ name: "home", path: "/" },
	{ name: "news", path: "/news" },
	{ name: "news-health", path: "/news/health" },
	{ name: "news-item", path: "/news", firstEntryOf: "/news/" },
	{ name: "activities", path: "/activities" },
	{ name: "activity", path: "/activities", firstEntryOf: "/activities/" },
	{ name: "health-content", path: "/health/content" },
	{ name: "health-content-item", path: "/health/content", firstEntryOf: "/health/content/" },
	{ name: "leadership", path: "/about/leadership" },
	{ name: "personnel", path: "/about/personnel" },
];

/** One `img` as the page holds it once loading has settled. */
export interface Picture {
	src: string;
	/** `complete` with a natural width above 0: the browser decoded a picture. */
	shown: boolean;
}

/** The status of each `/_image` request the view made. */
export type ImageAnswers = readonly number[];

/** The path of a picture's address, for the evidence: the query (a content hash) left out. */
function pathOf(src: string): string {
	try {
		return new URL(src).pathname;
	} catch {
		return src;
	}
}

function counted(answers: ImageAnswers): string {
	if (answers.length === 0) return "no /_image request";
	const by = new Map<number, number>();
	for (const status of answers) by.set(status, (by.get(status) ?? 0) + 1);
	return `/_image ${[...by].map(([status, count]) => `${status}×${count}`).join(", ")}`;
}

/**
 * Whether a view's pictures pass. Every picture shows. In the Admin, each `/_image` request is
 * redirected to its original (302): none is refused or rendered. A public page asks for none
 * (ADR 0003).
 */
export function pictureVerdict(
	where: "admin" | "public",
	pictures: readonly Picture[],
	answers: ImageAnswers,
): { pass: boolean; evidence: string } {
	const broken = pictures.filter((picture) => !picture.shown);
	const imagesOk =
		where === "public" ? answers.length === 0 : answers.every((status) => status === 302);
	const shown =
		pictures.length === 0
			? "no picture"
			: broken.length === 0
				? `${pictures.length} pictures, all shown`
				: `${broken.length} of ${pictures.length} not shown (${broken.map((p) => pathOf(p.src)).join(", ")})`;
	return {
		pass: pictures.length > 0 && broken.length === 0 && imagesOk,
		evidence: `${shown}; ${counted(answers)}`,
	};
}

const STEPS = ["token", "admin", "public", "upload"] as const;
type Step = (typeof STEPS)[number];

export interface Command {
	step: Step;
	address: string;
	ca: string;
	/** The evidence folder, or for `token` the file the PAT is written to. */
	out: string;
}

const USAGE = `usage: node scripts/rehearsal-pictures.ts <step> <machine address> <test CA certificate> <out>
  token   the stored rehearsal Administrator makes an API token for the demo dataset; <out> is the
          file it is written to (mode 0600)
  admin   the Media Library (grid and list), a picture's detail and focal point, the picture picker
          and the gallery picker's selection tray, at 390 and 1440 px; <out> the evidence folder
  public  each kind of public page with a picture, at 390 and 1440 px; <out> the evidence folder
  upload  an upload of the Admin's largest size passes the proxy and one over its limit is refused,
          as the signed-in Administrator; the item made is deleted; <out> the evidence folder`;

export function parseCommand(argv: readonly string[]): Command | { error: string } {
	const [step, address, ca, out, ...rest] = argv;
	if (
		!(STEPS as readonly string[]).includes(step ?? "") ||
		!address ||
		isIP(address) === 0 ||
		!ca ||
		!out ||
		rest.length > 0
	) {
		return { error: USAGE };
	}
	return { step: step as Step, address, ca, out };
}
