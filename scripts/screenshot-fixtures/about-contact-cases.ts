// Screenshot content for Feature 012's pages (spec #365; #366's before screenshots), the cases the
// demo dataset lacks. CASE names one, since each needs the runtime in its own state:
//
// - plans-full: the demo dataset's Documents returned to draft and twenty-one synthetic plans in
//   their place, so /about/plans shows a full first page and a second page; the second has a long
//   title, every fifth is superseded, every fourth has no summary and every third no fiscal year.
//   Captured as plans-full-<width> and plans-full-page-2-<width>.
// - people: the demo dataset's Personnel returned to draft and twenty-eight synthetic people in
//   their place: six Leadership, the second and fifth without a picture, and the others in five
//   units, three of them without a unit. Captured as leadership-six-<width> and
//   personnel-many-<width>.
// - leadership-one: one Leadership with a picture and a public contact, and two staff. Captured as
//   leadership-one-<width>.
// - pages: three Basic Pages, one without a summary, one with a title alone and one with related
//   Documents, the second of them superseded; and the demo dataset's `about` returned to draft, so
//   /about shows its sub-pages without its Basic Page. Captured as page-no-summary-<width>,
//   page-title-only-<width>, page-related-<width> and about-no-page-<width>.
// - contact-empty: Office Contact with nothing set and no official channel. Captured as
//   contact-empty-<width>.
// - contact-no-channels: every detail of Office Contact and no official channel. Captured as
//   contact-no-channels-<width>.
//
//   CASE=people scripts/dev-runtime-env.sh node scripts/capture-with-fixtures.ts \
//     scripts/screenshot-fixtures/about-contact-cases.ts <out-dir>

import type { Capture, Fixtures, FixtureKit } from "../capture-with-fixtures.ts";
import { atWidths, caseOf } from "./homepage-widths.ts";

const CASES = [
	"plans-full",
	"people",
	"leadership-one",
	"pages",
	"contact-empty",
	"contact-no-channels",
] as const;

type Case = (typeof CASES)[number];

const which = caseOf(CASES);

const DAY = 24 * 60 * 60 * 1000;

/** The instant `days` days before now. */
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** Create an entry of `collection` and publish it, at `publishedAt` when given; returns its id. */
async function published(
	{ admin, helpers }: FixtureKit,
	collection: string,
	input: Parameters<FixtureKit["helpers"]["createSyntheticEntry"]>[2],
	publishedAt?: string,
): Promise<string> {
	const entry = await helpers.createSyntheticEntry(admin, collection, input);
	if (!entry.result.ok) throw new Error(`${collection}: ${helpers.nativeRefusalOf(entry.result)}`);
	await helpers.publishEntryAt(admin, collection, entry.entryId!, publishedAt);
	return entry.entryId!;
}

async function plansFull(kit: FixtureKit): Promise<Capture[]> {
	await kit.borrow("documents");
	const file = await kit.helpers.uploadSyntheticPdf(kit.admin);
	const topics = [
		"แผนปฏิบัติการด้านสาธารณสุขประจำปี",
		"แผนพัฒนาระบบบริการสุขภาพปฐมภูมิ",
		"แผนป้องกันและควบคุมโรคติดต่อในชุมชน",
		"แผนส่งเสริมสุขภาพผู้สูงอายุในพื้นที่",
	];
	for (let index = 0; index < 21; index += 1) {
		const title =
			index === 1
				? "[ตัวอย่าง] แผนยุทธศาสตร์การพัฒนางานสาธารณสุขของเครือข่ายบริการสุขภาพอำเภอสองร่วมกับองค์กรปกครองส่วนท้องถิ่นและภาคประชาชนทุกตำบลระยะห้าปี"
				: `[ตัวอย่าง] ${topics[index % topics.length]} ลำดับที่ ${21 - index}`;
		await published(
			kit,
			"documents",
			{
				slug: kit.helpers.syntheticSlug("shot"),
				data: {
					title,
					file: file.value,
					...(index % 4 === 3
						? {}
						: { summary: "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง" }),
					document_at: daysAgo(index + 2),
					...(index % 3 === 2 ? {} : { fiscal_year: index < 10 ? 2570 : 2569 }),
					...(index % 5 === 4 ? { domain_status: "superseded" } : {}),
				},
				taxonomies: { document_type: ["plan"] },
			},
			daysAgo(index + 1),
		);
	}
	return [
		...atWidths("plans-full", "/about/plans"),
		...atWidths("plans-full-page-2", "/about/plans?page=2"),
	];
}

/** A person's own fields; `picture` names the two colours of a portrait. */
interface Person {
	name: string;
	prefix: string;
	assignment: string;
	unit?: string;
	contact?: string;
	picture?: [from: string, to: string];
	leadership?: number;
}

async function publishPeople(kit: FixtureKit, people: Person[]): Promise<void> {
	await kit.borrow("personnel");
	for (const person of people) {
		await published(kit, "personnel", {
			slug: kit.helpers.syntheticSlug("shot"),
			data: {
				title: person.name,
				prefix: person.prefix,
				current_assignment: person.assignment,
				public_visible: true,
				...(person.unit ? { organizational_unit: person.unit } : {}),
				...(person.contact ? { public_contact: person.contact } : {}),
				...(person.picture
					? { profile_image: { id: await kit.picture(`ภาพ ${person.name}`, ...person.picture) } }
					: {}),
				...(person.leadership ? { leadership_order: person.leadership } : {}),
			},
		});
	}
}

const UNITS = [
	"กลุ่มงานบริหารทั่วไป",
	"กลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค",
	"กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข",
	"กลุ่มงานพัฒนาระบบบริการสุขภาพปฐมภูมิ",
	"กลุ่มงานควบคุมโรคไม่ติดต่อและสุขภาพจิต",
];

const GIVEN = ["อรุณี", "ประเสริฐ", "สุนันทา", "วีระพงษ์", "จันทร์เพ็ญ", "ณัฐวุฒิ", "พรทิพย์"];
const FAMILY = ["ศรีสุข", "บุญมา", "แก้วใส", "ทองดี", "สายบัว"];

const PICTURES: Array<[string, string]> = [
	["#bae0cf", "#0b6b57"],
	["#f2d17a", "#bfdcce"],
	["#d1ebde", "#123c33"],
];

async function people(kit: FixtureKit): Promise<Capture[]> {
	const leaders: Person[] = [
		"สาธารณสุขอำเภอสอง",
		"ผู้ช่วยสาธารณสุขอำเภอสอง",
		"ผู้ช่วยสาธารณสุขอำเภอสอง",
		"หัวหน้ากลุ่มงานส่งเสริมสุขภาพและป้องกันควบคุมโรค",
		"หัวหน้ากลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข",
		"หัวหน้ากลุ่มงานบริหารทั่วไป",
	].map((assignment, index) => ({
		name: `[ตัวอย่าง] ${GIVEN[index]} ${FAMILY[index % FAMILY.length]}`,
		prefix: index % 2 === 0 ? "นาย" : "นาง",
		assignment,
		unit: UNITS[index % UNITS.length],
		...(index % 3 === 1 ? {} : { picture: PICTURES[index % PICTURES.length] }),
		...(index % 2 === 0 ? { contact: `โทร 000-000-0000 ต่อ ${101 + index}` } : {}),
		leadership: index + 1,
	}));
	const staff: Person[] = Array.from({ length: 22 }, (_, index) => ({
		name: `[ตัวอย่าง] ${GIVEN[(index + 3) % GIVEN.length]} ${FAMILY[(index + 2) % FAMILY.length]} ${index + 1}`,
		prefix: index % 3 === 0 ? "นางสาว" : index % 3 === 1 ? "นาย" : "นาง",
		assignment: index % 2 === 0 ? "นักวิชาการสาธารณสุขปฏิบัติการ" : "เจ้าพนักงานสาธารณสุขชำนาญงาน",
		// The last three have no unit.
		...(index < 19 ? { unit: UNITS[index % UNITS.length] } : {}),
		...(index % 4 === 0 ? { picture: PICTURES[index % PICTURES.length] } : {}),
		...(index % 5 === 0 ? { contact: `โทร 000-000-0000 ต่อ ${200 + index}` } : {}),
	}));
	await publishPeople(kit, [...leaders, ...staff]);
	return [
		...atWidths("leadership-six", "/about/leadership"),
		...atWidths("personnel-many", "/about/personnel"),
	];
}

async function leadershipOne(kit: FixtureKit): Promise<Capture[]> {
	await publishPeople(kit, [
		{
			name: "[ตัวอย่าง] อรุณี ศรีสุข",
			prefix: "นาง",
			assignment: "สาธารณสุขอำเภอสอง",
			unit: UNITS[0],
			contact: "โทร 000-000-0000 ต่อ 101\nอีเมล director@example.invalid",
			picture: PICTURES[0],
			leadership: 1,
		},
		{
			name: "[ตัวอย่าง] ประเสริฐ บุญมา",
			prefix: "นาย",
			assignment: "นักจัดการงานทั่วไป",
			unit: UNITS[0],
		},
		{
			name: "[ตัวอย่าง] สุนันทา แก้วใส",
			prefix: "นาง",
			assignment: "เภสัชกรชำนาญการ",
			unit: UNITS[2],
		},
	]);
	return atWidths("leadership-one", "/about/leadership");
}

async function pages(kit: FixtureKit): Promise<Capture[]> {
	const { helpers, admin, block } = kit;
	const file = await helpers.uploadSyntheticPdf(admin);
	const document = (title: string, extra: Record<string, unknown> = {}) =>
		published(kit, "documents", {
			slug: helpers.syntheticSlug("shot"),
			data: { title, file: file.value, document_at: daysAgo(30), fiscal_year: 2570, ...extra },
			taxonomies: { document_type: ["plan"] },
		});
	const related = [
		await document("[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข ปีงบประมาณ 2570", {
			summary: "แผนงานและโครงการด้านสุขภาพของเครือข่ายบริการสุขภาพอำเภอสอง",
		}),
		await document("[ตัวอย่าง] แผนปฏิบัติการด้านสาธารณสุข ปีงบประมาณ 2569", {
			domain_status: "superseded",
		}),
	];
	const body = [
		block("หลักการ", "h2"),
		block(
			"สำนักงานสาธารณสุขอำเภอสองเผยแพร่ข้อมูลนี้เพื่อให้ประชาชนเข้าใจขั้นตอนการรับบริการและช่องทางการติดต่อ",
		),
	];
	const slugs = {
		"page-no-summary": helpers.syntheticSlug("shot"),
		"page-title-only": helpers.syntheticSlug("shot"),
		"page-related": helpers.syntheticSlug("shot"),
	};
	await published(kit, "pages", {
		slug: slugs["page-no-summary"],
		data: { title: "[ตัวอย่าง] แนวทางการให้บริการประชาชน", body },
	});
	await published(kit, "pages", {
		slug: slugs["page-title-only"],
		data: { title: "[ตัวอย่าง] หน้าที่มีเพียงชื่อเรื่อง" },
	});
	await published(kit, "pages", {
		slug: slugs["page-related"],
		data: {
			title: "[ตัวอย่าง] แผนงานประจำปีของสำนักงาน",
			summary: "สรุปแผนงานประจำปีและเอกสารที่เกี่ยวข้องสำหรับประชาชน",
			body,
		},
		references: { documents: related },
	});
	await kit.borrow("pages", ["about"]);
	return [
		...Object.entries(slugs).flatMap(([name, slug]) => atWidths(name, `/pages/${slug}`)),
		...atWidths("about-no-page", "/about"),
	];
}

async function contactEmpty(kit: FixtureKit): Promise<Capture[]> {
	await kit.officeContact({}, {});
	return atWidths("contact-empty", "/contact");
}

async function contactNoChannels(kit: FixtureKit): Promise<Capture[]> {
	await kit.officeContact(
		{
			address: "[ตัวอย่าง] 99 หมู่ 1 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120",
			telephone: "054 000 000",
			email: "contact@example.invalid",
			opening_hours: "จันทร์–ศุกร์ 08:30–16:30 น.\nเว้นวันหยุดราชการ",
			latitude: 18.4686,
			longitude: 100.1834,
		},
		{},
	);
	return atWidths("contact-no-channels", "/contact");
}

const RUNS: Record<Case, (kit: FixtureKit) => Promise<Capture[]>> = {
	"plans-full": plansFull,
	people,
	"leadership-one": leadershipOne,
	pages,
	"contact-empty": contactEmpty,
	"contact-no-channels": contactNoChannels,
};

const fixtures: Fixtures = (kit) => RUNS[which](kit);

export default fixtures;
