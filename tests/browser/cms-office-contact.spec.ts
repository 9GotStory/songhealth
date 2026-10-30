// The Office Contact plugin in the CMS (#62; spec #51 "Office Contact plugin", approved Q10).
//
// Staff maintain Office Contact on one settings form, which EmDash's Admin generates from the
// Songhealth Office Contact plugin's settings schema. The suite checks, on the single development
// runtime, that:
// - the plugin is registered and enabled, with a settings form for every Office Contact value;
// - editing Office Contact is an Administrator task: the settings API needs the native
//   `plugins:manage` permission, which only the Administrator role holds (@emdash-cms/auth 1.1.0
//   src/rbac.ts), so an Editor is refused both reading and saving;
// - the Admin shows the form with its Thai labels.
//
// The Admin journey signs in through EmDash's development-only GET /_emdash/api/auth/dev-bypass,
// opted in with SONGHEALTH_ADMIN_SESSION=dev-bypass (scripts/dev-runtime-env.sh sets it), and logs
// out afterwards; without the opt-in it skips. The Editor phase switches the role fixture account
// with withNativeRole and restores it. The suite changes no setting: the Editor's refused save
// carries the values already stored.

import { expect, test } from "@playwright/test";

import {
	ADMIN_SESSION_ENV,
	closeDevAdminSession,
	cmsRequest,
	createPatActor,
	devAdminSessionRequested,
	loadDevAccessToken,
	nativeDataOf,
	nativeItemsOf,
	NATIVE_ROLES,
	OFFICE_CONTACT_PLUGIN_ID,
	openDevAdminSession,
	readOfficeContact,
	withNativeRole,
	writeOfficeContact,
	type CmsActor,
	type OfficeContactValues,
} from "./cms.helpers";

/** The Office Contact settings form's fields and their Thai labels, in form order. */
const FORM_FIELDS = [
	["address", "ที่อยู่สำนักงาน"],
	["telephone", "โทรศัพท์"],
	["email", "อีเมล"],
	["opening_hours", "เวลาทำการ"],
	["latitude", "ละติจูด"],
	["longitude", "ลองจิจูด"],
	["line_url", "ลิงก์ LINE"],
] as const;

const ROLE_FIXTURE_CREDENTIAL_ENV = "SONGHEALTH_ROLE_FIXTURE_ACCESS";

let admin: CmsActor;
let roleFixture: CmsActor | undefined;

test.beforeAll(async ({}, testInfo) => {
	const baseURL = testInfo.project.use.baseURL;
	if (baseURL === undefined) {
		throw new Error("this suite needs a configured baseURL (PLAYWRIGHT_BASE_URL)");
	}
	admin = await createPatActor({
		baseUrl: baseURL,
		token: await loadDevAccessToken(),
		expected: { role: NATIVE_ROLES.administrator },
	});
	const processSpecifier = "node:process";
	const { env } = (await import(processSpecifier)) as unknown as {
		env: Record<string, string | undefined>;
	};
	const fixturePath = env[ROLE_FIXTURE_CREDENTIAL_ENV]?.trim();
	if (fixturePath) {
		roleFixture = await createPatActor({
			baseUrl: baseURL,
			token: await loadDevAccessToken(fixturePath),
		});
	}
});

test("the Office Contact plugin is registered and enabled, with a settings field for every Office Contact value", async () => {
	const list = await cmsRequest(admin, "/_emdash/api/admin/plugins");
	expect(list.ok, `the native plugin list must answer (status ${list.status})`).toBe(true);
	const plugin = nativeItemsOf(list).find(
		(item) => (item as { id?: unknown }).id === OFFICE_CONTACT_PLUGIN_ID,
	);
	expect(plugin, `${OFFICE_CONTACT_PLUGIN_ID} must be registered`).toMatchObject({
		enabled: true,
		hasSettings: true,
	});

	const settings = await readOfficeContact(admin);
	expect(settings.ok, `the settings must read (status ${settings.status})`).toBe(true);
	const schema = (nativeDataOf(settings)?.schema ?? {}) as Record<string, { label?: string }>;
	expect(Object.entries(schema).map(([key, field]) => [key, field.label])).toEqual(
		FORM_FIELDS.map(([key, label]) => [key, label]),
	);
});

test("only an Administrator can read or save Office Contact: an Editor is refused", async () => {
	test.skip(
		roleFixture === undefined,
		`set ${ROLE_FIXTURE_CREDENTIAL_ENV} to the role fixture PAT`,
	);
	const stored = await readOfficeContact(admin);
	expect(stored.ok, "the Administrator reads Office Contact").toBe(true);
	const values = (nativeDataOf(stored)?.values ?? {}) as OfficeContactValues;

	await withNativeRole(admin, roleFixture!, NATIVE_ROLES.editor, async (editor) => {
		expect((await readOfficeContact(editor)).status, "an Editor reading").toBe(403);
		expect((await writeOfficeContact(editor, values)).status, "an Editor saving").toBe(403);
	});
});

test("the Admin shows the Office Contact settings form with its Thai labels", async ({
	page,
	context,
}) => {
	test.skip(
		!(await devAdminSessionRequested()),
		`set ${ADMIN_SESSION_ENV}=dev-bypass to open the native Admin with the development Admin session`,
	);
	await openDevAdminSession(context);
	try {
		await page.goto(`/_emdash/admin/plugins-manager/${OFFICE_CONTACT_PLUGIN_ID}/settings`);
		await page.locator("#emdash-boot-loader").waitFor({ state: "detached", timeout: 20_000 });
		for (const [, label] of FORM_FIELDS) {
			await expect(page.getByLabel(label, { exact: true }), `the ${label} field`).toBeVisible();
		}
	} finally {
		expect(await closeDevAdminSession(context), "the native logout").toBe(200);
	}
});
