// Which Homepage section takes the sections' space above and below itself (Feature 008 #247;
// Product Owner, 2026-11-12: #247 comment 6820010972; docs/design/DESIGN.md §8).
//
// After the deep field the Homepage shows, in order and each only with content: the Leadership
// strip, Latest News, the Current Announcements, Health Information, the Health Service Discovery
// band, the Activities, Quick Access, and always the Contact Summary. Between two neighbours there
// is exactly one space. The Current Announcements are a band with their space inside it, so a
// section before or after them brings the space outside. The Leadership strip has its own smaller
// space above and hands the space below it to Latest News.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	HOMEPAGE_SECTIONS,
	homepageSpacing,
	type HomepageSection,
} from "../../src/lib/homepage-spacing.ts";

/** Every set of sections the Homepage can show: the Contact Summary always, the others or not. */
function everyCombination(): HomepageSection[][] {
	const optional = HOMEPAGE_SECTIONS.filter((section) => section !== "contact");
	return Array.from({ length: 2 ** optional.length }, (_, bits) => [
		...optional.filter((_, index) => bits & (1 << index)),
		"contact" as const,
	]);
}

describe("the Homepage sections' space", () => {
	it("covers the seven optional sections and the Contact Summary", () => {
		assert.equal(everyCombination().length, 128);
	});

	it("is exactly one space between two neighbours, in every combination", () => {
		for (const shown of everyCombination()) {
			const spacing = homepageSpacing(shown);
			for (let index = 1; index < shown.length; index++) {
				const [before, after] = [shown[index - 1]!, shown[index]!];
				const spaces = Number(spacing[before].below) + Number(spacing[after].above);
				assert.equal(spaces, 1, `between ${before} and ${after} of ${shown.join(", ")}`);
			}
		}
	});

	it("gives the first section after the deep field its space above, the strip and the band aside", () => {
		for (const shown of everyCombination()) {
			const first = shown[0]!;
			const own = first === "leadership" || first === "announcements";
			assert.equal(homepageSpacing(shown)[first].above, !own, `${first} of ${shown.join(", ")}`);
		}
	});

	it("ends with the Contact Summary's space below", () => {
		for (const shown of everyCombination()) {
			assert.equal(homepageSpacing(shown).contact.below, true, shown.join(", "));
		}
	});

	it("hands the strip's space below to Latest News, and keeps it without the News", () => {
		assert.deepEqual(homepageSpacing(["leadership", "news", "contact"]).leadership, {
			above: false,
			below: false,
		});
		assert.deepEqual(homepageSpacing(["leadership", "news", "contact"]).news, {
			above: true,
			below: true,
		});
		assert.deepEqual(homepageSpacing(["leadership", "health", "contact"]).leadership, {
			above: false,
			below: true,
		});
	});

	it("leaves the space around the Announcements band to its neighbours", () => {
		const spacing = homepageSpacing(["news", "announcements", "health", "contact"]);
		assert.deepEqual(spacing.announcements, { above: false, below: false });
		assert.equal(spacing.news.below, true);
		assert.equal(spacing.health.above, true);
	});

	it("with every section, takes the space above only after the field and after the band", () => {
		const spacing = homepageSpacing(HOMEPAGE_SECTIONS);
		assert.deepEqual(
			HOMEPAGE_SECTIONS.filter((section) => spacing[section].above),
			["news", "health"],
		);
		assert.deepEqual(
			HOMEPAGE_SECTIONS.filter((section) => !spacing[section].below),
			["leadership", "announcements"],
		);
	});

	it("gives the Contact Summary its space above right after the band or the deep field", () => {
		assert.equal(homepageSpacing(["contact"]).contact.above, true);
		assert.equal(homepageSpacing(["announcements", "contact"]).contact.above, true);
		assert.equal(homepageSpacing(["activities", "contact"]).contact.above, false);
		assert.equal(homepageSpacing(["discovery", "contact"]).contact.above, false);
	});
});
