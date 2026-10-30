// The breadcrumb the shell derives for an inner page (#86; spec #51 user story 5, `03` §14).
//
// - It leads with หน้าแรก and the main-navigation section the page declares, then the page's own
//   crumbs, and ends with the current page as text without a link.
// - A section's landing page has no crumbs of its own, so its breadcrumb ends at the section.
// - A page that belongs to no section follows หน้าแรก directly.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { breadcrumbTrail } from "../../src/lib/navigation.ts";

describe("breadcrumbTrail", () => {
	it("leads a page with หน้าแรก and its section, as `03` §14's examples read", () => {
		assert.deepEqual(breadcrumbTrail("news", [{ label: "ชื่อข่าว" }]), [
			{ label: "หน้าแรก", href: "/" },
			{ label: "ข่าวสาร", href: "/news" },
			{ label: "ชื่อข่าว" },
		]);
		assert.deepEqual(
			breadcrumbTrail("health", [
				{ label: "ความรู้สุขภาพ", href: "/health/content" },
				{ label: "ชื่อเรื่อง" },
			]),
			[
				{ label: "หน้าแรก", href: "/" },
				{ label: "ข้อมูลสุขภาพ", href: "/health" },
				{ label: "ความรู้สุขภาพ", href: "/health/content" },
				{ label: "ชื่อเรื่อง" },
			],
		);
	});

	it("ends a section's landing page at the section, as the current page", () => {
		assert.deepEqual(breadcrumbTrail("services", []), [
			{ label: "หน้าแรก", href: "/" },
			{ label: "บริการประชาชน" },
		]);
	});

	it("follows หน้าแรก directly on a page that belongs to no section", () => {
		assert.deepEqual(breadcrumbTrail(undefined, [{ label: "ติดต่อเรา" }]), [
			{ label: "หน้าแรก", href: "/" },
			{ label: "ติดต่อเรา" },
		]);
	});
});
