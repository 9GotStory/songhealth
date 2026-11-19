// scripts/capture-plan.ts: the screenshots each target of scripts/capture-screenshots.mjs takes,
// and the files another source already took into the folder (#346 retro: two fixture modules named
// a capture health-service-inactive, and the second overwrote the first).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clashes, onlyNamed, planShots } from "../../scripts/capture-plan.ts";

const files = (targets: string[]) => planShots(targets).map(({ file, target }) => [file, target]);

describe("the screenshots a target takes", () => {
	it("takes a named page at one width as one full-page file, and a selector as a close-up", () => {
		assert.deepEqual(files(["services-375=/services@375", "x=/@1440>header"]), [
			["services-375.png", "/services@375"],
			["x.png", "/@1440>header"],
		]);
	});

	it("takes a page without a width at the three widths, the first target's mobile ones with its menu open too", () => {
		const shots = planShots(["/news/a", "/about"]);
		assert.deepEqual(
			shots.map(({ file, menu }) => [file, menu?.file]),
			[
				["news-a-desktop.png", undefined],
				["news-a-375.png", "news-a-375-menu.png"],
				["news-a-320.png", "news-a-320-menu.png"],
				["about-desktop.png", undefined],
				["about-375.png", undefined],
				["about-320.png", undefined],
			],
		);
		assert.equal(shots[1]!.menu!.target, "/news/a@375 menu open");
	});

	it("records a click after the path, and names a bare path at one width by its stem and width", () => {
		assert.deepEqual(files(["/ita@375!ปี 2569"]), [["ita-375.png", "/ita@375!ปี 2569"]]);
	});
});

describe("the files another source took", () => {
	const takenBy = new Map([
		["health-service-inactive-1440.png", "scripts/screenshot-fixtures/lists-by-count.ts"],
		["news-a-375-menu.png", "capture-screenshots.mjs"],
	]);
	const inactive = ["health-service-inactive-1440=/health-services/shot-b@1440"];

	it("names a file another module took, with that module", () => {
		assert.deepEqual(
			clashes(planShots(inactive), takenBy, "scripts/screenshot-fixtures/health-service-page.ts"),
			[
				{
					file: "health-service-inactive-1440.png",
					takenBy: "scripts/screenshot-fixtures/lists-by-count.ts",
				},
			],
		);
	});

	it("passes the same module taken again, whose synthetic page has a new path", () => {
		assert.deepEqual(
			clashes(planShots(inactive), takenBy, "scripts/screenshot-fixtures/lists-by-count.ts"),
			[],
		);
	});

	it("passes a file no source took, such as a before image copied in", () => {
		assert.deepEqual(clashes(planShots(["home-1440=/@1440"]), takenBy, "x.ts"), []);
	});

	it("reads a menu's file too", () => {
		assert.deepEqual(
			clashes(planShots(["/news/a"]), takenBy, "x.ts").map(({ file }) => file),
			["news-a-375-menu.png"],
		);
	});
});

describe("a fixtures module's captures under --only (#346 retro)", () => {
	const captures = [
		"/health/reports@1440",
		{ name: "health-reports-list-4-1440", path: "/health/reports@1440" },
		{ name: "health-report-file-gone-1440", path: "/health/reports/shot-a@1440" },
		{ name: "health-report-file-gone-375", path: "/health/reports/shot-a@375" },
	];

	it("keeps the named captures whose name starts with the prefix, in order", () => {
		assert.deepEqual(
			onlyNamed(captures, "health-report-file-gone").map((page) =>
				typeof page === "string" ? page : page.name,
			),
			["health-report-file-gone-1440", "health-report-file-gone-375"],
		);
	});

	it("keeps every capture without a prefix", () => {
		assert.equal(onlyNamed(captures, undefined), captures);
	});

	it("stops on a prefix no capture's name starts with, naming the names there are", () => {
		assert.throws(
			() => onlyNamed(captures, "health-service"),
			/no capture's name starts with health-service: health-reports-list-4-1440, health-report-file-gone-1440, health-report-file-gone-375/,
		);
	});
});
