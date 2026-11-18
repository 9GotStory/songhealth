// Screenshot content for a Service's page (Feature 011 #344; spec #338 "The three pages") in the
// states the demo dataset does not hold: a Service with two Service Categories, whose offering
// Health Services are an inactive one without coordinates and one closed for now with a display
// name, and a Service with no detail and no external link, which has no card. Captures each at the
// five widths the feature's tickets name, as service-categories-<width> and
// service-no-card-<width>.
//
//   scripts/dev-runtime-env.sh \
//     node scripts/capture-with-fixtures.ts scripts/screenshot-fixtures/service-page.ts <out-dir>

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ admin, helpers, term, block }) => {
	const categories = [
		await term("service_category", "แจ้งปัญหาสุขภาพ"),
		await term("service_category", "ขอข้อมูลและบริการอื่น"),
	];

	const publishService = async (
		title: string,
		fields: { data: Record<string, unknown>; taxonomies?: Record<string, string[]> },
	) => {
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, "services", {
			slug,
			data: { title, ...fields.data },
			...(fields.taxonomies ? { taxonomies: fields.taxonomies } : {}),
		});
		if (!entry.result.ok) throw new Error(`service: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		return { slug, id: entry.entryId! };
	};

	const categorised = await publishService("[ตัวอย่าง] ตรวจคัดกรองสุขภาพประจำปี", {
		data: {
			summary: "ตรวจคัดกรองโรคเรื้อรังตามสิทธิ\nที่หน่วยบริการสุขภาพในพื้นที่ของท่าน",
			ownership_type: "related_health_service",
			channels: [{ label: "ติดต่อหน่วยบริการสุขภาพที่ให้บริการด้วยตนเอง" }],
			steps: [block("นำบัตรประจำตัวประชาชนไปที่หน่วยบริการ"), block("รับการตรวจตามนัด")],
		},
		taxonomies: { service_category: categories },
	});
	const bare = await publishService("[ตัวอย่าง] สอบถามขั้นตอนการรับบริการ", {
		data: { duration: "ตอบกลับภายใน 3 วันทำการ" },
	});

	const area = await term("area", "ตำบลตัวอย่างเหนือ");
	const clinic = await term("facility_type", "โรงพยาบาลส่งเสริมสุขภาพตำบล");
	for (const healthService of [
		{
			data: {
				title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านตัวอย่าง",
				display_name: "[ตัวอย่าง] รพ.สต.บ้านตัวอย่าง",
				operational_status: "temporarily_closed",
				address: "99 หมู่ 9 ตำบลตัวอย่าง อำเภอสอง จังหวัดแพร่ 54120",
				latitude: 18.471,
				longitude: 100.191,
			},
		},
		{
			data: {
				title: "[ตัวอย่าง] สถานีอนามัยบ้านตัวอย่างใต้",
				operational_status: "inactive",
				address: "12 หมู่ 4 ตำบลตัวอย่าง อำเภอสอง จังหวัดแพร่ 54120",
			},
		},
	]) {
		const entry = await helpers.createSyntheticEntry(admin, "health_services", {
			slug: helpers.syntheticSlug("shot"),
			data: healthService.data,
			taxonomies: { facility_type: [clinic], area: [area] },
			references: { offered_services: [categorised.id] },
		});
		if (!entry.result.ok) {
			throw new Error(`health service: ${helpers.nativeRefusalOf(entry.result)}`);
		}
		const published = await helpers.publishEntry(admin, "health_services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
	}

	return [
		["service-categories", categorised.slug],
		["service-no-card", bare.slug],
	].flatMap(([name, slug]) =>
		HOMEPAGE_WIDTHS.map((width) => ({
			name: `${name}-${width}`,
			path: `/services/${slug}@${width}`,
		})),
	);
};

export default fixtures;
