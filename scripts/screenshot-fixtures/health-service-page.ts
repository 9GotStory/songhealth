// Screenshot content for a Health Service's page (Feature 011 #345; spec #338 "The three pages") in
// the states the demo dataset does not hold: an inactive Health Service with a display name, its
// location without coordinates, two Areas and three Services; one without a location, with its
// details and two Services; and one with no detail at all, which has no card. Captures each at the
// five widths the feature's tickets name, as health-service-inactive-<width>,
// health-service-no-location-<width> and health-service-bare-<width>.
//
//   scripts/dev-runtime-env.sh \
//     node scripts/capture-with-fixtures.ts \
//     scripts/screenshot-fixtures/health-service-page.ts <out-dir>

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	const north = await term("area", "ตำบลตัวอย่างเหนือ");
	const south = await term("area", "ตำบลตัวอย่างใต้");
	const clinic = await term("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");

	const publishHealthService = async (fields: {
		data: Record<string, unknown>;
		taxonomies?: Record<string, string[]>;
		services?: string[];
	}) => {
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, "health_services", {
			slug,
			data: fields.data,
			...(fields.taxonomies ? { taxonomies: fields.taxonomies } : {}),
			// The demo dataset's Services, by slug.
			...(fields.services ? { references: { offered_services: fields.services } } : {}),
		});
		if (!entry.result.ok) {
			throw new Error(`health service: ${helpers.nativeRefusalOf(entry.result)}`);
		}
		const published = await helpers.publishEntry(admin, "health_services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		return slug;
	};

	const inactive = await publishHealthService({
		data: {
			title: "[ตัวอย่าง] สถานีอนามัยเฉลิมพระเกียรติบ้านตัวอย่างเหนือ",
			display_name: "[ตัวอย่าง] สอ.บ้านตัวอย่างเหนือ",
			facility_code: "09999",
			affiliation_text: "องค์การบริหารส่วนจังหวัดแพร่",
			operational_status: "inactive",
			address: "12 หมู่ 4 ตำบลตัวอย่างเหนือ อำเภอสอง จังหวัดแพร่ 54120",
			opening_hours: "ย้ายการให้บริการไปที่ รพ.สต.บ้านตัวอย่างใต้",
			public_contact: "โทร 054 000 900",
		},
		taxonomies: { facility_type: [clinic], area: [north, south] },
		services: ["demo-service-flu-vaccine", "demo-service-health-problem", "demo-service-complaint"],
	});
	const noLocation = await publishHealthService({
		data: {
			title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านตัวอย่างใต้",
			display_name: "[ตัวอย่าง] รพ.สต.บ้านตัวอย่างใต้",
			facility_code: "09998",
			affiliation_text: "องค์การบริหารส่วนจังหวัดแพร่",
			operational_status: "active",
		},
		taxonomies: { facility_type: [clinic], area: [south] },
		services: ["demo-service-flu-vaccine", "demo-service-vhv"],
	});
	const bare = await publishHealthService({
		data: { title: "[ตัวอย่าง] หน่วยบริการสุขภาพบ้านตัวอย่าง" },
	});

	return [
		["health-service-inactive", inactive],
		["health-service-no-location", noLocation],
		["health-service-bare", bare],
	].flatMap(([name, slug]) =>
		HOMEPAGE_WIDTHS.map((width) => ({
			name: `${name}-${width}`,
			path: `/health-services/${slug}@${width}`,
		})),
	);
};

export default fixtures;
