// The icon a search result's row shows for its kind (Feature 015 #434; spec #432 decision 10, "A
// result's row"; prototype P2).
//
// - A result's row holds the light row tile with one icon, its kind's list heading icon: News
//   `message-square`, an Activity `heart`, an Announcement `file-text`, a Service `users`, a Health
//   Service `hospital`, Health Content `heart-pulse`, a Health Report `file-chart-column`, a
//   Document `folder-open` and a MOIT `shield-check`.
// - A Basic Page has no list, so its row shows `info`. A reserved Basic Page's result, which leads
//   to its /about address, shows it too: the table goes by the kind alone, and the browser suite
//   reads that row (`public-search.spec.ts`, the reserved Basic Page's case).
// - Every kind the search finds has its icon, and no other kind is named (the table's type holds
//   each kind of KIND_LABELS).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KIND_ICONS } from "../../src/lib/search-matcher.ts";

describe("a search result's icon", () => {
	it("is its kind's list heading icon, and a Basic Page's is info", () => {
		assert.deepEqual(KIND_ICONS, {
			news: "message-square",
			activity: "heart",
			announcement: "file-text",
			service: "users",
			health_service: "hospital",
			health_content: "heart-pulse",
			health_report: "file-chart-column",
			document: "folder-open",
			page: "info",
			moit: "shield-check",
		});
	});
});
