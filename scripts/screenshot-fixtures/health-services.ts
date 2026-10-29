// Screenshot content for the Health Service Directory (#57): published Health Services across two
// Areas, one temporarily closed and one inactive, and Services one of them offers. Captures
// /health-services, the list filtered by Area and name, and two Health Service pages.

import type { Fixtures } from "../capture-with-fixtures.ts";

const SERVICES = [
	"[ตัวอย่าง] ฉีดวัคซีนไข้หวัดใหญ่ประจำปี",
	"[ตัวอย่าง] ตรวจคัดกรองเบาหวานและความดันโลหิตสูง",
	"[ตัวอย่าง] ฝากครรภ์และตรวจสุขภาพหญิงตั้งครรภ์",
];

const HEALTH_SERVICES = [
	{
		key: "hospital",
		title: "[ตัวอย่าง] โรงพยาบาลสอง",
		code: "00000",
		displayName: undefined,
		type: "โรงพยาบาลชุมชน",
		areas: ["ตำบลบ้านกลาง", "ตำบลห้วยหม้าย"],
		affiliation: "สำนักงานสาธารณสุขจังหวัดแพร่ กระทรวงสาธารณสุข",
		status: "active",
		address: "123 หมู่ 1 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120",
		hours: "ผู้ป่วยนอก จันทร์–ศุกร์ 08.00–16.00 น.\nห้องฉุกเฉิน ทุกวัน 24 ชั่วโมง",
		contact: "โทร 054 000 100\nห้องฉุกเฉิน โทร 1669",
		coordinates: [18.4719, 100.1953],
		offers: [0, 1, 2],
	},
	{
		key: "ban-klang",
		code: undefined,
		title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านกลาง",
		displayName: "[ตัวอย่าง] รพ.สต.บ้านกลาง",
		type: "โรงพยาบาลส่งเสริมสุขภาพตำบล",
		areas: ["ตำบลบ้านกลาง"],
		affiliation: "องค์การบริหารส่วนจังหวัดแพร่",
		status: "temporarily_closed",
		address: "45 หมู่ 3 ตำบลบ้านกลาง อำเภอสอง จังหวัดแพร่ 54120",
		hours: "จันทร์–ศุกร์ 08.30–16.30 น.",
		contact: "โทร 054 000 200",
		coordinates: [18.4602, 100.1801],
		offers: [1, 0],
	},
	{
		key: "huai-mai",
		code: undefined,
		title: "[ตัวอย่าง] โรงพยาบาลส่งเสริมสุขภาพตำบลห้วยหม้าย",
		displayName: "[ตัวอย่าง] รพ.สต.ห้วยหม้าย",
		type: "โรงพยาบาลส่งเสริมสุขภาพตำบล",
		areas: ["ตำบลห้วยหม้าย"],
		affiliation: "องค์การบริหารส่วนจังหวัดแพร่",
		status: "active",
		address: "7 หมู่ 5 ตำบลห้วยหม้าย อำเภอสอง จังหวัดแพร่ 54120",
		hours: "จันทร์–ศุกร์ 08.30–16.30 น.",
		contact: "โทร 054 000 300",
		coordinates: [18.5011, 100.2207],
		offers: [],
	},
	{
		key: "old-station",
		code: undefined,
		title: "[ตัวอย่าง] สถานีอนามัยบ้านเหล่า",
		displayName: undefined,
		type: "สถานีอนามัย",
		areas: ["ตำบลห้วยหม้าย"],
		affiliation: undefined,
		status: "inactive",
		address: undefined,
		hours: undefined,
		contact: undefined,
		coordinates: undefined,
		offers: [],
	},
] as const;

const fixtures: Fixtures = async ({ admin, helpers, term }) => {
	const terms = new Map<string, string>();
	const termOf = async (taxonomy: string, label: string) => {
		const key = `${taxonomy}:${label}`;
		if (!terms.has(key)) terms.set(key, await term(taxonomy, label));
		return terms.get(key)!;
	};
	const services: string[] = [];
	for (const title of SERVICES) {
		const entry = await helpers.createSyntheticEntry(admin, "services", {
			slug: helpers.syntheticSlug("shot"),
			data: { title },
		});
		if (!entry.result.ok) throw new Error(`service: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		services.push(entry.entryId!);
	}
	const slugs = new Map<string, string>();
	for (const healthService of HEALTH_SERVICES) {
		const slug = helpers.syntheticSlug("shot");
		const areas: string[] = [];
		for (const area of healthService.areas) areas.push(await termOf("area", area));
		const entry = await helpers.createSyntheticEntry(admin, "health_services", {
			slug,
			data: {
				title: healthService.title,
				...(healthService.code ? { facility_code: healthService.code } : {}),
				...(healthService.displayName ? { display_name: healthService.displayName } : {}),
				operational_status: healthService.status,
				...(healthService.affiliation ? { affiliation_text: healthService.affiliation } : {}),
				...(healthService.address ? { address: healthService.address } : {}),
				...(healthService.hours ? { opening_hours: healthService.hours } : {}),
				...(healthService.contact ? { public_contact: healthService.contact } : {}),
				...(healthService.coordinates
					? { latitude: healthService.coordinates[0], longitude: healthService.coordinates[1] }
					: {}),
			},
			taxonomies: {
				facility_type: [await termOf("facility_type", healthService.type)],
				area: areas,
			},
			references: { offered_services: healthService.offers.map((index) => services[index]!) },
		});
		if (!entry.result.ok)
			throw new Error(`health service: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, "health_services", entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		slugs.set(healthService.key, slug);
	}
	const banKlang = await termOf("area", "ตำบลบ้านกลาง");
	return [
		"/health-services",
		{
			name: "health-services-filtered",
			path: `/health-services?area=${banKlang}&name=${encodeURIComponent("รพ.สต.")}`,
		},
		{ name: "health-service-hospital", path: `/health-services/${slugs.get("hospital")}` },
		{ name: "health-service-closed", path: `/health-services/${slugs.get("ban-klang")}` },
	];
};

export default fixtures;
