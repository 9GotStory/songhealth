// The pictures' evidence script on the rehearsal machine (#458; spec #450 "Testing Decisions": a
// Playwright evidence script kept in the repository, run on the rehearsal machine only, never a CI
// gate), with the proxy's /_image rule in place (deploy/caddy/songhealth.caddy). Run on the
// workstation:
//
//   node scripts/rehearsal-pictures.ts token  <address> <ca> <token file>
//   node scripts/rehearsal-pictures.ts admin  <address> <ca> <out>
//   node scripts/rehearsal-pictures.ts public <address> <ca> <out>
//   node scripts/rehearsal-pictures.ts upload <address> <ca> <out>
//
// <address> is the rehearsal machine's on the private network and <ca> its Internal Test CA's
// certificate, as for scripts/rehearsal-admins.ts, whose browser, stored Administrator and refusal
// of any other machine this script shares (scripts/rehearsal-admins/browser.ts, plan.ts). Each
// check prints one PASS or FAIL line, which <out>/results.txt keeps beside the screenshots; no
// address, token or key is printed.
//
// - token: the stored Administrator signs in with their passkey and makes an API token for the demo
//   dataset (scripts/demo-dataset.ts, SONGHEALTH_REHEARSAL_ACCESS), written to <token file>, 0600.
// - admin: the Media Library in its grid and its list, a picture's detail and its image editor,
//   the picture picker and the gallery picker's selection tray, at each width
//   (rehearsal-pictures/plan.ts WIDTHS). Nothing is saved: the editor is a new, unsaved entry.
// - public: each kind of public page that shows a picture (plan.ts PUBLIC_PAGES), at each width.
// - upload: an upload of the Admin's largest size (50 MiB) passes the proxy, and the same upload
//   one byte over the proxy's limit is refused with its own answer; both media items are deleted.

import { readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
	loadState,
	openBrowser,
	openDevice,
	ORIGIN,
	peer,
	signIn,
	STATE,
} from "./rehearsal-admins/browser.ts";
import { targetRefusal } from "./rehearsal-admins/plan.ts";
import {
	parseCommand,
	type Picture,
	pictureVerdict,
	PUBLIC_PAGES,
	WIDTHS,
} from "./rehearsal-pictures/plan.ts";
import { ADMIN_UPLOAD_BYTES, BODY_LIMIT_BYTES } from "./stack-check/plan.ts";

const results: string[] = [];

function record(pass: boolean, id: string, what: string, evidence: string): void {
	const line = `${pass ? "PASS" : "FAIL"} ${id} ${what}: ${evidence}`;
	results.push(line);
	process.stdout.write(`${line}\n`);
}

/** Brings each picture in `scope` into view in turn, so a lazy one loads, then waits until every
 * one has finished, shown or failed (30 s at most), and reads them. */
async function settle(page: Page, scope: Locator): Promise<Picture[]> {
	const pictures = scope.locator("img");
	const count = await pictures.count();
	for (let index = 0; index < count; index++) {
		await pictures
			.nth(index)
			.scrollIntoViewIfNeeded({ timeout: 2000 })
			.catch(() => undefined);
	}
	await page
		.waitForFunction(
			(elements) => elements.every((element) => (element as HTMLImageElement).complete),
			await pictures.elementHandles(),
			{ timeout: 30_000 },
		)
		.catch(() => undefined);
	await page.waitForLoadState("networkidle").catch(() => undefined);
	return pictures.evaluateAll((elements) =>
		elements.map((element) => {
			const image = element as HTMLImageElement;
			return {
				src: image.currentSrc || image.src,
				shown: image.complete && image.naturalWidth > 0,
			};
		}),
	);
}

/**
 * Records the status of each `/_image` answer the page gets from now on, until `take` is called.
 */
function watchImages(page: Page): { take(): number[] } {
	let answers: number[] = [];
	page.on("response", (response) => {
		if (new URL(response.url()).pathname.toLowerCase().startsWith("/_image")) {
			answers.push(response.status());
		}
	});
	return {
		take() {
			const taken = answers;
			answers = [];
			return taken;
		},
	};
}

async function view(
	page: Page,
	images: { take(): number[] },
	out: string,
	id: string,
	what: string,
	scope: Locator,
	where: "admin" | "public",
): Promise<void> {
	const pictures = await settle(page, scope);
	const verdict = pictureVerdict(where, pictures, images.take());
	record(verdict.pass, id, what, verdict.evidence);
	await page.screenshot({ path: join(out, `${id}.png`), fullPage: where === "public" });
}

async function signedIn(address: string, ca: string) {
	const state = loadState();
	const passkeys = state?.devices.R;
	if (!passkeys) throw new Error(`no stored Administrator's device R in ${STATE}`);
	const opened = await openBrowser(address, ca);
	const device = await openDevice(opened.browser, passkeys);
	const outcome = await signIn(device.page);
	if (outcome !== "signed in")
		throw new Error(`the stored Administrator did not sign in: ${outcome}`);
	return { opened, device };
}

/** An API call from the signed-in page, as the Admin makes it. */
async function api(
	page: Page,
	method: string,
	path: string,
	body?: unknown,
): Promise<{
	status: number;
	json: { data?: Record<string, unknown>; error?: { code?: string } };
}> {
	return page.evaluate(
		async ({ method, path, body }) => {
			const response = await fetch(path, {
				method,
				headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			});
			return { status: response.status, json: await response.json().catch(() => ({})) };
		},
		{ method, path, body },
	);
}

const TOKEN_NAME = "Rehearsal demo dataset (#458)";

async function token(address: string, ca: string, file: string): Promise<void> {
	const { opened, device } = await signedIn(address, ca);
	try {
		// One token of this name at a time: an earlier one is revoked first.
		const listed = await api(device.page, "GET", "/_emdash/api/admin/api-tokens");
		const earlier = ((listed.json.data?.items ?? []) as { id: string; name: string }[]).filter(
			(item) => item.name === TOKEN_NAME,
		);
		for (const { id } of earlier) {
			const revoked = await api(device.page, "DELETE", `/_emdash/api/admin/api-tokens/${id}`);
			record(
				revoked.status === 200,
				"T0",
				"an earlier demo dataset token revoked",
				`HTTP ${revoked.status}`,
			);
		}
		// 30 days, the Internal Test CA's own life (scripts/rehearsal/stand-in.sh CA_DAYS).
		const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
		const made = await api(device.page, "POST", "/_emdash/api/admin/api-tokens", {
			name: TOKEN_NAME,
			scopes: ["admin"],
			expiresAt,
		});
		const value = made.json.data?.token;
		if (made.status !== 201 || typeof value !== "string") {
			record(
				false,
				"T1",
				"an API token for the demo dataset",
				`HTTP ${made.status} ${made.json.error?.code ?? ""}`,
			);
			return;
		}
		writeFileSync(file, `${value}\n`, { mode: 0o600 });
		record(
			true,
			"T1",
			"an API token for the demo dataset",
			`made, expires ${expiresAt.slice(0, 10)}, written 0600`,
		);
	} finally {
		await opened.close();
	}
}

async function admin(address: string, ca: string, out: string): Promise<void> {
	const { opened, device } = await signedIn(address, ca);
	const page = device.page;
	const images = watchImages(page);
	try {
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			const main = page.locator("main");

			await page.goto(`${ORIGIN}/_emdash/admin/media`, { waitUntil: "networkidle" });
			await main.locator("img").first().waitFor({ timeout: 30_000 });
			images.take();
			await page.reload({ waitUntil: "networkidle" });
			await view(
				page,
				images,
				out,
				`A1-${width}`,
				`the Media Library's grid at ${width} px`,
				main,
				"admin",
			);

			await page.getByRole("tab", { name: "List view" }).click();
			await view(
				page,
				images,
				out,
				`A2-${width}`,
				`the Media Library's list at ${width} px`,
				main,
				"admin",
			);
			await page.getByRole("tab", { name: "Grid view" }).click();

			await main.locator('button[aria-label$=".png"]').first().click();
			const details = page.getByRole("dialog", { name: /Media details/ });
			await details.waitFor();
			await view(
				page,
				images,
				out,
				`A3-${width}`,
				`a picture's detail at ${width} px`,
				details,
				"admin",
			);
			await details.getByRole("tab", { name: "Edit image" }).click();
			await view(
				page,
				images,
				out,
				`A4-${width}`,
				`its image editor (focal point) at ${width} px`,
				details,
				"admin",
			);
			await details.getByRole("button", { name: "Close" }).click();

			await page.goto(`${ORIGIN}/_emdash/admin/content/news/new`, { waitUntil: "networkidle" });
			images.take();
			await page.getByText("browse").first().click();
			const picker = page.getByRole("dialog");
			await picker.locator("img").first().waitFor({ timeout: 30_000 });
			await view(
				page,
				images,
				out,
				`A5-${width}`,
				`the picture picker at ${width} px`,
				picker,
				"admin",
			);
			await picker.getByRole("button", { name: "Cancel" }).click();

			const editor = page.locator('[contenteditable="true"]').first();
			await editor.click();
			await page.keyboard.type("/gall");
			await page.keyboard.press("Enter");
			const gallery = page.getByRole("dialog");
			await gallery.locator("img").first().waitFor({ timeout: 30_000 });
			await settle(page, gallery);
			images.take();
			await gallery.locator("img").nth(0).click();
			await gallery.locator("img").nth(1).click();
			const tray = page.locator('section[aria-labelledby="media-picker-selection"]');
			await tray.waitFor();
			await tray.scrollIntoViewIfNeeded();
			await view(
				page,
				images,
				out,
				`A6-${width}`,
				`the gallery picker's selection tray at ${width} px`,
				tray,
				"admin",
			);
			await gallery.getByRole("button", { name: "Cancel" }).click();
		}
	} finally {
		await opened.close();
	}
}

async function publicPages(address: string, ca: string, out: string): Promise<void> {
	const opened = await openBrowser(address, ca);
	try {
		const context = await opened.browser.newContext();
		const page = await context.newPage();
		const images = watchImages(page);
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			for (const { name, path, firstEntryOf } of PUBLIC_PAGES) {
				await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle" });
				if (firstEntryOf !== undefined) {
					const entry = page
						.locator(`main :is(article, li):has(img) a[href^="${firstEntryOf}"]`)
						.first();
					const href = await entry.getAttribute("href", { timeout: 10_000 }).catch(() => null);
					if (href === null) {
						record(
							false,
							`U-${name}-${width}`,
							`${name} at ${width} px`,
							`no entry with a picture under ${firstEntryOf}`,
						);
						continue;
					}
					await page.goto(`${ORIGIN}${href}`, { waitUntil: "networkidle" });
				}
				images.take();
				await page.reload({ waitUntil: "networkidle" });
				// An Activity folds its later photos behind "ดูรูปทั้งหมด"
				// (src/components/ActivityPhotos.astro): opened, so every photo is read.
				const folded = page.locator("main details:not([open]) > summary", {
					hasText: "ดูรูปทั้งหมด",
				});
				if (await folded.count()) await folded.first().click();
				const shown = new URL(page.url()).pathname;
				await view(
					page,
					images,
					out,
					`U-${name}-${width}`,
					`${shown} at ${width} px`,
					page.locator("body"),
					"public",
				);
			}
		}
	} finally {
		await opened.close();
	}
}

async function upload(address: string, ca: string): Promise<void> {
	const { opened, device } = await signedIn(address, ca);
	const page = device.page;
	// A PNG the Admin would accept: the committed validation picture, padded to the size asked for
	// (a PNG reader stops at its end chunk).
	const picture = readFileSync(
		new URL("../tests/operations/fixtures/validation-picture.png", import.meta.url),
	);
	const put = (bytes: number) =>
		page.evaluate(
			async ({ bytes, picture }) => {
				const made = await fetch("/_emdash/api/media/upload-url", {
					method: "POST",
					headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
					body: JSON.stringify({
						filename: `rehearsal-upload-${bytes}.png`,
						contentType: "image/png",
						size: Math.min(bytes, 50 * 1024 * 1024),
						deduplicate: false,
					}),
				});
				const info = (await made.json()).data as {
					uploadUrl: string;
					method: string;
					headers: Record<string, string>;
					mediaId: string;
				};
				const body = new Uint8Array(bytes);
				body.set(Uint8Array.from(atob(picture), (c) => c.charCodeAt(0)));
				const sent = await fetch(info.uploadUrl, {
					method: info.method,
					headers: { ...info.headers, "Content-Type": "image/png", "X-EmDash-Request": "1" },
					body,
				});
				const answer = await sent.text();
				return {
					mediaId: info.mediaId,
					status: sent.status,
					code: /"code":"([A-Z_]+)"/.exec(answer)?.[1] ?? "",
				};
			},
			{ bytes, picture: picture.toString("base64") },
		);
	const made: string[] = [];
	try {
		const within = await put(ADMIN_UPLOAD_BYTES);
		made.push(within.mediaId);
		record(
			within.status >= 200 && within.status < 300,
			"L1",
			`an upload of ${ADMIN_UPLOAD_BYTES} bytes (the Admin's largest) through the proxy`,
			`HTTP ${within.status}${within.code ? ` ${within.code}` : ""}`,
		);
		const over = await put(BODY_LIMIT_BYTES + 1);
		made.push(over.mediaId);
		record(
			over.status === 413 && over.code === "REQUEST_BODY_TOO_LARGE",
			"L2",
			`the same upload at ${BODY_LIMIT_BYTES + 1} bytes, one over the proxy's limit`,
			`HTTP ${over.status} ${over.code}`,
		);
	} finally {
		for (const id of made) {
			const deleted = await api(page, "DELETE", `/_emdash/api/media/${id}`);
			record(
				deleted.status === 200,
				"L3",
				"the upload's media item deleted",
				`HTTP ${deleted.status}`,
			);
		}
		await opened.close();
	}
}

async function main(): Promise<void> {
	const command = parseCommand(process.argv.slice(2));
	if ("error" in command) throw new Error(command.error);
	const ca = readFileSync(command.ca, "utf8");
	const refusal = targetRefusal(await peer(command.address, ca));
	if (refusal) throw new Error(`refused: ${refusal}`);
	process.stdout.write(
		"rehearsal-pictures: the machine is the rehearsal machine (Internal Test CA)\n",
	);

	if (command.step === "token") {
		await token(command.address, command.ca, command.out);
		return;
	}
	await mkdir(command.out, { recursive: true });
	try {
		if (command.step === "admin") await admin(command.address, command.ca, command.out);
		else if (command.step === "public") await publicPages(command.address, command.ca, command.out);
		else await upload(command.address, command.ca);
	} finally {
		writeFileSync(join(command.out, "results.txt"), `${results.join("\n")}\n`);
	}
}

try {
	await main();
	process.exitCode = results.every((line) => line.startsWith("PASS")) ? 0 : 1;
} catch (error) {
	process.stderr.write(
		`rehearsal-pictures: ${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
}
