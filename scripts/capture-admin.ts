// Pull-request screenshots of the Admin's sidebar on the development runtime (#169 retro, item 4):
// sign in as the development Administrator, open every folder, and capture the whole sidebar in
// Thai, as the role given sees it, into admin-sidebar-<role>.png.
//
//   scripts/dev-runtime-env.sh \
//     node scripts/capture-admin.ts <out-dir> [administrator|editor|author]
//
// Only the development Administrator signs in without a passkey (cms.helpers.ts
// openDevAdminSession). An Editor's or an Author's sidebar is shown by answering the Admin's
// question for the current user with that role: the Admin filters the sidebar by it in the browser,
// from a manifest that is the same for every user (docs/agents/emdash-1.1.0.md "Admin sidebar").
// Everything else still answers as the Administrator, so only the sidebar is captured this way.
// The session ends with the native logout, and its window is recorded through
// scripts/dev-runtime-env.sh, so the runtime's Admin-activity guard does not take it for a person.
//
// scripts/evidence-branch.sh then puts the screenshots on an image-only branch for the PR.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { Role } from "@emdash-cms/auth";
import { chromium } from "@playwright/test";

import { closeDevAdminSession, openDevAdminSession } from "../tests/browser/cms.helpers.ts";

/** The roles a sidebar is captured as, with their levels. */
const ROLES = { administrator: Role.ADMIN, editor: Role.EDITOR, author: Role.AUTHOR } as const;

const [outDir, role = "administrator"] = process.argv.slice(2);
if (outDir === undefined || !Object.hasOwn(ROLES, role)) {
	console.error("usage: node scripts/capture-admin.ts <out-dir> [administrator|editor|author]");
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
// The referrer every test request carries (playwright.config.ts), so a miss counts as the tests'.
const context = await browser.newContext({
	baseURL: origin,
	viewport: { width: 1440, height: 2200 },
	extraHTTPHeaders: { referer: "http://songhealth-unknown-referrer.invalid/" },
});
try {
	// The Admin's language switch stores the locale in this cookie
	// (@emdash-cms/admin/dist/LocaleDirectionProvider-Bed7WppM.js).
	await context.addCookies([{ name: "emdash-locale", value: "th", url: origin }]);
	await openDevAdminSession(context);
	const page = await context.newPage();
	if (role !== "administrator") {
		await page.route("**/_emdash/api/auth/me", async (route) => {
			const response = await route.fetch();
			const body = await response.json();
			body.data.role = ROLES[role as keyof typeof ROLES];
			await route.fulfill({ response, json: body });
		});
	}
	await page.goto("/_emdash/admin/");
	const sidebar = page.locator(".emdash-sidebar");
	// The sidebar shows Calendar from the Contributor role up (docs/agents/emdash-1.1.0.md "Admin
	// sidebar"), so its link means the manifest and the current user have both loaded.
	await sidebar.locator('a[href$="/calendar"]').waitFor();
	// A closed folder is a button with aria-expanded false and its label. Each click opens one and
	// changes the list, so the next closed one is looked up again, at most 20 times should a click
	// open nothing.
	const closed = sidebar.getByRole("button", { expanded: false }).filter({ hasText: /\S/ });
	for (let left = 20; left > 0 && (await closed.count()) > 0; left--) await closed.first().click();
	// Off the last folder clicked, so no item shows hovered, and with the folders' opening
	// transitions run to their end.
	await page.mouse.move(1439, 0);
	const file = join(outDir, `admin-sidebar-${role}.png`);
	await sidebar.screenshot({ path: file, animations: "disabled" });
	console.log(file);
} finally {
	const status = await closeDevAdminSession(context).catch(() => undefined);
	await browser.close();
	if (status !== 200) {
		console.error(`capture-admin: the logout answered ${status ?? "nothing"}`);
		process.exitCode = 1;
	}
}
