// T022 — focused native Admin UI coverage for US6 (native-editorial contract:
// "Acceptance evidence must exercise trusted direct APIs as well as UI").
// The direct-API depth lives in cms-lifecycle.spec.ts (T019) and
// cms-revisions.spec.ts (T020); this file proves the same native outcomes
// through the native Admin UI on the single development runtime:
//
// - publish: the editor's native "Publish now" action, once confirmed in its
//   native dialog, publishes a draft, and the API reads it back as published;
// - locks: an entry another account holds the edit lease for opens with the
//   native lock choice; "Open read-only" shows who is editing, and the
//   holder keeps the lease (the UI never silently takes it over);
// - mandatory reference: a Health Report without its required Document is
//   held by the native editor with its own message and is never created.
//
// Session: the browser signs in through EmDash's development-only
// GET /_emdash/api/auth/dev-bypass (Product Owner decision 2026-10-29),
// opted in with SONGHEALTH_ADMIN_SESSION=dev-bypass; each test logs out
// through the native logout route. Without the opt-in every test skips with
// that prerequisite. No passkey automation, no setup/dev-bypass, no cookie
// forging, no custom Admin control; fixtures are synthetic, created through
// the native API and removed by the owned-fixture cleanup.

import { expect, test } from "@playwright/test";

import {
	ADMIN_SESSION_ENV,
	CmsActor,
	DEFAULT_DEVELOPMENT_ORIGIN,
	NATIVE_ROLES,
	SYNTHETIC_FIXTURE_MARK,
	assertDistinctActors,
	assertSameNativeApp,
	cleanupOwnedFixtures,
	closeDevAdminSession,
	cmsRequest,
	createPatActor,
	createSyntheticEntry,
	devAdminSessionRequested,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemOf,
	nativeItemsOf,
	openDevAdminSession,
	readEntry,
} from "./cms.helpers";

const PAGES = "pages";
const HEALTH_REPORTS = "health_reports";
const ROLE_FIXTURE_CREDENTIAL_ENV = "SONGHEALTH_ROLE_FIXTURE_ACCESS";

let admin: CmsActor;
let roleFixture: CmsActor | undefined;
let sessionRequested = false;

async function processEnv(): Promise<Record<string, string | undefined>> {
	const specifier = "node:process";
	return ((await import(specifier)) as unknown as { env: Record<string, string | undefined> }).env;
}

function uniqueTitle(kind: string): string {
	return `${SYNTHETIC_FIXTURE_MARK} ui ${kind} ${crypto.randomUUID().slice(0, 8)}`;
}

/** Skip with the session prerequisite unless the runner opted in. */
function requireSessionOptIn(): void {
	test.skip(
		!sessionRequested,
		`set ${ADMIN_SESSION_ENV}=dev-bypass to run the native Admin UI journeys with the development Admin session`,
	);
}

/** Open an entry editor and wait for the Admin app to mount (boot loader gone). */
async function openEditor(page: import("@playwright/test").Page, path: string): Promise<void> {
	await page.goto(path);
	await page.locator("#emdash-boot-loader").waitFor({ state: "detached", timeout: 20_000 });
}

test.beforeAll(async () => {
	const env = await processEnv();
	const origin = env.PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN;
	sessionRequested = await devAdminSessionRequested();
	admin = await createPatActor({
		baseUrl: origin,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	const fixturePath = env[ROLE_FIXTURE_CREDENTIAL_ENV]?.trim();
	if (fixturePath) {
		roleFixture = await createPatActor({ baseUrl: origin, token: await loadDevAccessToken(fixturePath) });
		assertDistinctActors(admin, roleFixture);
		assertSameNativeApp(admin, roleFixture);
	}
});

test.beforeEach(async ({ context }) => {
	await context.addCookies([
		{ name: "emdash-locale", value: "th", url: `${(await processEnv()).PLAYWRIGHT_BASE_URL ?? DEFAULT_DEVELOPMENT_ORIGIN}/` },
	]);
	if (sessionRequested) await openDevAdminSession(context);
});

test.afterEach(async ({ context }) => {
	const failures: string[] = [];
	if (sessionRequested) {
		const status = await closeDevAdminSession(context);
		if (status !== 200) failures.push(`native logout answered ${status}`);
	}
	for (const [label, owner] of [
		["role-fixture", roleFixture],
		["admin", admin],
	] as const) {
		if (owner === undefined) continue;
		const report = await cleanupOwnedFixtures(owner, { adminActor: admin, permanent: true });
		console.log(
			`[cms-lifecycle-ui] ${label} owned-fixture cleanup: ${report.complete ? "complete" : "UNRESOLVED"} (entries ${report.entries.length})`,
		);
		if (!report.complete) failures.push(`${label} cleanup unresolved`);
	}
	expect(failures, "session logout and owned-fixture cleanup must both succeed").toEqual([]);
});

test("native Admin publish: the editor's Publish now action publishes a draft, read back through the API", async ({
	page,
}) => {
	requireSessionOptIn();
	const draft = await createSyntheticEntry(admin, PAGES, { data: { title: uniqueTitle("publish") } });
	expect(draft.result.ok, "the synthetic draft must save").toBe(true);
	expect(nativeItemOf(await readEntry(admin, PAGES, draft.entryId!))?.status).toBe("draft");

	await openEditor(page, `/_emdash/admin/content/${PAGES}/${draft.entryId}`);
	await page.getByRole("button", { name: "Publish now" }).click();
	// The native confirmation ("Publish now?") publishes only when confirmed.
	const confirm = page.getByRole("dialog").filter({ hasText: "Publish now?" });
	await confirm.getByRole("button", { name: "Publish now" }).click();
	await expect(confirm).toBeHidden();

	await expect
		.poll(async () => nativeItemOf(await readEntry(admin, PAGES, draft.entryId!))?.status, {
			message: "the entry published through the native Admin reads back as published",
			timeout: 15_000,
		})
		.toBe("published");
});

test("native Admin lock: another account's lease opens read-only with the holder named, and the holder keeps the lease", async ({
	page,
}) => {
	requireSessionOptIn();
	test.skip(roleFixture === undefined, `set ${ROLE_FIXTURE_CREDENTIAL_ENV} to the role fixture PAT`);
	const fixture = roleFixture!;
	const entry = await createSyntheticEntry(fixture, PAGES, { data: { title: uniqueTitle("lock") } });
	expect(entry.result.ok, "the role fixture's own draft must save").toBe(true);
	const lockPath = `/_emdash/api/content/${PAGES}/${entry.entryId}/lock`;
	expect((await cmsRequest(fixture, lockPath, { method: "POST", body: {} })).ok, "the holder takes the lease").toBe(
		true,
	);
	try {
		await openEditor(page, `/_emdash/admin/content/${PAGES}/${entry.entryId}`);
		await expect(page.getByRole("button", { name: "Take over" })).toBeVisible();
		await page.getByRole("button", { name: "Open read-only" }).click();
		await expect(
			page.getByText(`${fixture.name} is editing this entry. Nothing you change here will be saved.`),
		).toBeVisible();

		const lock = nativeDataOf(await cmsRequest(admin, lockPath));
		const holder = lock?.holder as { userId?: unknown } | undefined;
		expect(holder?.userId, "the lease still belongs to the other account").toBe(fixture.userId);
		expect(lock?.heldByCaller, "opening read-only took no lease").toBe(false);
	} finally {
		await cmsRequest(fixture, lockPath, { method: "DELETE" });
	}
});

test("native Admin mandatory reference: a Health Report without its Document is held by the editor and never created", async ({
	page,
}) => {
	requireSessionOptIn();
	const title = uniqueTitle("report-no-document");
	await openEditor(page, `/_emdash/admin/content/${HEALTH_REPORTS}/new`);
	await page.getByLabel("ชื่อเรื่อง").fill(title);
	await page.getByRole("button", { name: "บันทึก", exact: true }).click();

	await expect(page.getByText("Select at least one entry.")).toBeVisible();
	await page.waitForTimeout(2_000);
	expect(new URL(page.url()).pathname, "the editor stays on the unsaved new entry").toBe(
		`/_emdash/admin/content/${HEALTH_REPORTS}/new`,
	);
	const listed = nativeItemsOf(
		await cmsRequest(admin, `/_emdash/api/content/${HEALTH_REPORTS}`, { searchParams: { limit: "100" } }),
	) as Array<{ data?: { title?: unknown } }>;
	expect(
		listed.some((item) => item.data?.title === title),
		"no Health Report was created without its required Document",
	).toBe(false);
});
