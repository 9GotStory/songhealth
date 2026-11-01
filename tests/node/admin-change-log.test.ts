// The admin change log (#115; ADR 0005): one JSON line per state-changing request to EmDash's
// API, so publishing, schema and Admin changes, and user-access changes show who made them and
// when. Routine editing that EmDash records itself writes no line.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AnsweredRequest, adminChangeLine } from "../../src/lib/admin-change-log.ts";

const ENTRY = "/_emdash/api/content/news/01JAAAAAAAAAAAAAAAAAAAAAAA";
const EDITOR = { id: "01JEDITOR0000000000000000", role: "EDITOR" };

function answered(overrides: Partial<AnsweredRequest>): AnsweredRequest {
	return {
		method: "POST",
		route: "/_emdash/api/content/[collection]/[id]/publish",
		path: `${ENTRY}/publish`,
		status: 200,
		user: EDITOR,
		time: new Date("2026-11-01T03:04:05.678Z"),
		...overrides,
	};
}

/** The request's line, parsed; fails when the request writes none. */
function loggedLine(request: AnsweredRequest): Record<string, unknown> {
	const line = adminChangeLine(request);
	assert.ok(line !== undefined, `${request.method} ${request.path} writes no line`);
	assert.ok(!line.includes("\n"), "the line is a single line");
	return JSON.parse(line);
}

describe("adminChangeLine", () => {
	it("writes a publish as one JSON line with its marker, time, user, role, method, path and status", () => {
		assert.deepEqual(loggedLine(answered({})), {
			log: "songhealth-admin-change",
			time: "2026-11-01T03:04:05.678Z",
			userId: "01JEDITOR0000000000000000",
			role: "EDITOR",
			method: "POST",
			path: `${ENTRY}/publish`,
			status: 200,
		});
	});

	it("writes nothing for a read", () => {
		assert.equal(
			adminChangeLine(
				answered({ method: "GET", route: "/_emdash/api/settings", path: "/_emdash/api/settings" }),
			),
			undefined,
		);
	});

	it("writes nothing for a request outside EmDash's API", () => {
		assert.equal(adminChangeLine(answered({ route: "/search", path: "/search" })), undefined);
		assert.equal(
			adminChangeLine(
				answered({ route: "/_emdash/admin/[...path]", path: "/_emdash/admin/settings" }),
			),
			undefined,
		);
	});

	it("writes nothing for routine editing that EmDash records itself", () => {
		const routine: Array<[method: string, route: string, path: string]> = [
			// An entry's create and update save a revision with its author and time.
			["POST", "/_emdash/api/content/[collection]", "/_emdash/api/content/news"],
			["PUT", "/_emdash/api/content/[collection]/[id]", ENTRY],
			// The Admin takes, refreshes and releases the edit lock while someone edits.
			["POST", "/_emdash/api/content/[collection]/[id]/lock", `${ENTRY}/lock`],
			["DELETE", "/_emdash/api/content/[collection]/[id]/lock", `${ENTRY}/lock`],
			["PUT", "/_emdash/api/content/[collection]/[id]/lock", `${ENTRY}/lock`],
			// A new media item keeps its uploader and time: a direct upload, or the Admin's
			// upload URL, upload and confirm.
			["POST", "/_emdash/api/media", "/_emdash/api/media"],
			["POST", "/_emdash/api/media/upload-url", "/_emdash/api/media/upload-url"],
			["PUT", "/_emdash/api/media/[id]/upload", "/_emdash/api/media/01JMEDIA/upload"],
			["POST", "/_emdash/api/media/[id]/confirm", "/_emdash/api/media/01JMEDIA/confirm"],
		];
		for (const [method, route, path] of routine) {
			assert.equal(
				adminChangeLine(answered({ method, route, path })),
				undefined,
				`${method} ${path}`,
			);
		}
	});

	it("writes one line for each publishing, schema, settings, menu and user-access change", () => {
		const user = "/_emdash/api/admin/users/01JUSER";
		const logged: Array<[method: string, route: string, path: string]> = [
			["POST", "/_emdash/api/content/[collection]/[id]/publish", `${ENTRY}/publish`],
			["POST", "/_emdash/api/content/[collection]/[id]/unpublish", `${ENTRY}/unpublish`],
			["POST", "/_emdash/api/content/[collection]/[id]/schedule", `${ENTRY}/schedule`],
			["DELETE", "/_emdash/api/content/[collection]/[id]/schedule", `${ENTRY}/schedule`],
			[
				"POST",
				"/_emdash/api/schema/collections/[slug]/fields",
				"/_emdash/api/schema/collections/news/fields",
			],
			[
				"DELETE",
				"/_emdash/api/schema/collections/[slug]/fields/[fieldSlug]",
				"/_emdash/api/schema/collections/news/fields/subtitle",
			],
			["POST", "/_emdash/api/settings", "/_emdash/api/settings"],
			[
				"PUT",
				"/_emdash/api/admin/plugins/[id]/settings",
				"/_emdash/api/admin/plugins/songhealth-office-contact/settings",
			],
			["POST", "/_emdash/api/menus/[name]/items", "/_emdash/api/menus/primary/items"],
			["PUT", "/_emdash/api/admin/users/[id]", user],
			["POST", "/_emdash/api/admin/users/[id]/disable", `${user}/disable`],
			["POST", "/_emdash/api/admin/users/[id]/enable", `${user}/enable`],
			["POST", "/_emdash/api/auth/invite", "/_emdash/api/auth/invite"],
			["POST", "/_emdash/api/admin/api-tokens", "/_emdash/api/admin/api-tokens"],
			["DELETE", "/_emdash/api/admin/api-tokens/[id]", "/_emdash/api/admin/api-tokens/01JTOKEN"],
			["POST", "/_emdash/api/admin/allowed-domains", "/_emdash/api/admin/allowed-domains"],
			[
				"PATCH",
				"/_emdash/api/admin/allowed-domains/[domain]",
				"/_emdash/api/admin/allowed-domains/example.go.th",
			],
			// Replacing or deleting a media item is not an upload.
			["PUT", "/_emdash/api/media/[id]/replace", "/_emdash/api/media/01JMEDIA/replace"],
			["DELETE", "/_emdash/api/media/[id]", "/_emdash/api/media/01JMEDIA"],
		];
		for (const [method, route, path] of logged) {
			assert.equal(loggedLine(answered({ method, route, path })).path, path, `${method} ${path}`);
		}
	});

	it("decides by the route Astro ran, so a percent-encoded path is still logged", () => {
		// astro 7.3.5 routes on the decoded path (dist/core/routing/match-request.js), while the
		// request's own path keeps its encoding.
		const line = loggedLine(
			answered({ route: "/_emdash/api/settings", path: "/_emdash/%61pi/settings" }),
		);
		assert.equal(line.path, "/_emdash/%61pi/settings");
	});

	it("never carries a query string or fragment into the line", () => {
		const line = adminChangeLine(
			answered({
				route: "/_emdash/api/auth/invite/complete",
				path: "/_emdash/api/auth/invite/complete?token=secret-invite-token#top",
			}),
		);
		assert.ok(line !== undefined);
		assert.equal(JSON.parse(line).path, "/_emdash/api/auth/invite/complete");
		assert.ok(!line.includes("secret-invite-token"));
		assert.ok(!line.includes("#top"));
	});

	it("carries a refused request's status", () => {
		for (const status of [401, 403, 409]) {
			assert.equal(loggedLine(answered({ status })).status, status);
		}
	});

	it("writes a null user and role for a request without a signed-in user", () => {
		const line = loggedLine(
			answered({
				route: "/_emdash/api/auth/invite/complete",
				path: "/_emdash/api/auth/invite/complete",
				user: null,
			}),
		);
		assert.equal(line.userId, null);
		assert.equal(line.role, null);
	});
});
