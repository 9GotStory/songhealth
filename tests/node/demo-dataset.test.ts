// The demo dataset's planner (#66; spec #51 "Demo dataset", approved Q4; seam: #66 comment
// 6539906996).
//
// `add` installs the dataset on the development runtime and `remove` takes it away. Each reads the
// runtime through the native API, plans with these pure functions, applies the plan, and plans
// again to confirm that nothing is left to do. A runtime that already holds the dataset therefore
// plans nothing, which makes `add` idempotent.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { demoDataset } from "../../scripts/demo-dataset/content.ts";
import {
	addSteps,
	entryName,
	mediaOf,
	menuItemFields,
	planAdd,
	planRemove,
	removeSteps,
	type DemoDataset,
	type DemoEntry,
	type LiveEntry,
	type LiveMenuItem,
	type LiveState,
} from "../../scripts/demo-dataset/plan.ts";

const NOW = new Date("2026-10-31T03:00:00.000Z");

/**
 * The Basic Pages at reserved slugs, which /about, /about/organization and the footer show (spec
 * #51 "Public reads"): the dataset's own pages there cannot carry the demo prefix.
 */
const RESERVED_PAGES = ["about", "organization", "privacy", "accessibility"];
const dataset = demoDataset(NOW);

/** The files the dataset removes from the library once their entries exist (#126). */
const REMOVED = dataset.media.filter((media) => media.removed);

/** The News item and the Activity whose picture is the demo One Page (#149). */
const ONE_PAGE_NEWS = "news/demo-news-health-fair";
const ONE_PAGE_ACTIVITY = "activities/demo-activity-health-fair";

/** The dataset's entry named `collection/slug`. */
const entryNamed = (name: string) => dataset.entries.find((entry) => entryName(entry) === name)!;

/** The dataset's media item `filename`. */
const mediaNamed = (filename: string) =>
	dataset.media.find((media) => media.filename === filename)!;

/** The menus staff curate the Homepage with (seed/seed.json), which the model-update step adds. */
const HOMEPAGE_MENUS = ["homepage-featured", "homepage-services", "homepage-quick-access"];

/** The Office Contact plugin's settings keys (src/plugins/office-contact.ts). */
const OFFICE_CONTACT_KEYS = [
	"address",
	"telephone",
	"email",
	"opening_hours",
	"latitude",
	"longitude",
	"line_url",
];

/**
 * A runtime without content: the Document Type reference terms and the empty Homepage menus that
 * the model-update step adds, no Office Contact value and empty `social` handles.
 */
function emptyRuntime(): LiveState {
	return {
		entries: [],
		terms: REFERENCE_TERMS,
		media: [],
		menus: Object.fromEntries(HOMEPAGE_MENUS.map((name) => [name, []])),
		officeContact: Object.fromEntries(OFFICE_CONTACT_KEYS.map((key) => [key, null])),
		social: { twitter: "", facebook: "", youtube: "" },
	};
}

/** A menu item on the runtime; one the dataset made carries its class. */
function liveItem(id: string, fields: Partial<LiveMenuItem>): LiveMenuItem {
	return {
		id,
		parentId: null,
		type: "custom",
		label: id,
		referenceCollection: null,
		referenceId: null,
		customUrl: null,
		cssClasses: null,
		...fields,
	};
}

const REFERENCE_TERMS = ["policy", "plan", "result"].map((slug) => ({
	taxonomy: "document_type",
	slug,
}));

/**
 * The runtime after `add`: every term, media item and entry of the dataset, each entry published,
 * its menu items in the Homepage menus, and its Office Contact values and handles. The files the
 * dataset removes are gone from the library.
 */
function installed(data: DemoDataset): LiveState {
	const entries = data.entries.map((entry, index): LiveEntry => ({
		collection: entry.collection,
		id: `id-${index}`,
		slug: entry.slug,
		title: String(entry.data.title),
		status: "published",
		trashed: false,
	}));
	const empty = emptyRuntime();
	return {
		terms: [...REFERENCE_TERMS, ...data.terms],
		media: data.media.flatMap(({ filename, removed }, index) =>
			removed ? [] : [{ id: `media-${index}`, filename }],
		),
		entries,
		menus: {
			...empty.menus,
			...Object.fromEntries(
				Object.entries(data.menus).map(([name, items]) => [
					name,
					items.map((item, index) => ({
						...menuItemFields(
							item,
							"entry" in item ? entries.find(({ slug }) => slug === item.entry) : undefined,
						),
						id: `${name}-${index}`,
						parentId: null,
						cssClasses: "demo-dataset",
					})),
				]),
			),
		},
		officeContact: { ...empty.officeContact, ...data.officeContact },
		social: { ...empty.social, ...data.social },
	};
}

/** An entry on the runtime. */
function liveEntry(
	collection: string,
	slug: string,
	{ status = "published", trashed = false, title = "" } = {},
): LiveEntry {
	return { collection, id: `${collection}-${slug}`, slug, title, status, trashed };
}

/** Each entry as `collection/slug`. */
const names = (entries: ReadonlyArray<{ collection: string; slug: string | null }>) =>
	entries.map(({ collection, slug }) => `${collection}/${slug}`);

describe("demo dataset: add", () => {
	it("creates and publishes every entry on a runtime without the dataset", () => {
		const plan = planAdd(dataset, emptyRuntime());
		assert.deepEqual(names(plan.create).sort(), names(dataset.entries).sort());
		assert.deepEqual(names(plan.publish).sort(), names(dataset.entries).sort());
	});

	it("plans nothing on a runtime that holds the dataset", () => {
		assert.deepEqual(addSteps(planAdd(dataset, installed(dataset))), []);
	});

	it("uploads the pictures and files the runtime lacks", () => {
		const [missing] = dataset.media;
		const plan = planAdd(dataset, {
			...installed(dataset),
			media: installed(dataset).media.filter(({ filename }) => filename !== missing!.filename),
		});
		assert.deepEqual(plan.upload, [missing]);
	});

	it("uploads a file the dataset removes for the entry it creates, and deletes it after (#126)", () => {
		const plan = planAdd(dataset, emptyRuntime());
		assert.deepEqual(
			REMOVED.filter((media) => !plan.upload.includes(media)),
			[],
		);
		assert.deepEqual(
			plan.discard,
			REMOVED.map(({ filename }) => filename),
		);
	});

	it("deletes a file the dataset removes that the runtime still holds, as after an add interrupted once its entry existed", () => {
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			media: [
				...live.media,
				...REMOVED.map(({ filename }, index) => ({ id: `removed-${index}`, filename })),
			],
		});
		assert.deepEqual(
			addSteps(plan),
			REMOVED.map(({ filename }) => `delete ${filename}`),
		);
	});

	it("uses a file the dataset removes that an add interrupted before its entry uploaded, then deletes it", () => {
		const plan = planAdd(dataset, {
			...emptyRuntime(),
			media: REMOVED.map(({ filename }, index) => ({ id: `removed-${index}`, filename })),
		});
		assert.deepEqual(
			plan.upload.filter(({ removed }) => removed),
			[],
		);
		assert.deepEqual(
			plan.discard,
			REMOVED.map(({ filename }) => filename),
		);
	});

	it("uploads no file the dataset removes for an entry it restores from the trash", () => {
		// A restored entry keeps its fields, the removed file's value among them.
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			entries: live.entries.map((entry) => ({ ...entry, trashed: true })),
		});
		assert.deepEqual(plan.upload, []);
		assert.deepEqual(plan.discard, []);
	});

	it("installs the One Page's News item and Activity, the One Page and the twelve photos, and nothing else, on a runtime that holds the rest of the dataset (#149)", () => {
		const added = [ONE_PAGE_NEWS, ONE_PAGE_ACTIVITY];
		const addedMedia = new Set(added.flatMap((name) => mediaOf(entryNamed(name).data)));
		assert.equal(addedMedia.size, 13, "the One Page and the twelve photos");
		assert.deepEqual(
			dataset.entries
				.filter((entry) => !added.includes(entryName(entry)))
				.flatMap(({ data }) => mediaOf(data))
				.filter((filename) => addedMedia.has(filename)),
			[],
			"no other entry uses them",
		);
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			entries: live.entries.filter((entry) => !added.includes(entryName(entry))),
			media: live.media.filter(({ filename }) => !addedMedia.has(filename)),
		});
		assert.deepEqual(
			addSteps(plan).sort(),
			[
				...[...addedMedia].map((filename) => `upload ${filename}`),
				...added.map((name) => `create ${name}`),
				...added.map((name) => `publish ${name}`),
			].sort(),
		);
	});

	it("points every picture and file field at a media item of the dataset", () => {
		const media = new Set(dataset.media.map(({ filename }) => filename));
		const unknown = dataset.entries.flatMap(({ slug, data }) =>
			mediaOf(data)
				.filter((filename) => !media.has(filename))
				.map((filename) => `${slug}: ${filename}`),
		);
		assert.deepEqual(unknown, []);
	});

	it("creates the terms the runtime lacks, before the entries that use them", () => {
		const plan = planAdd(dataset, {
			...installed(dataset),
			terms: installed(dataset).terms.filter(({ slug }) => slug !== "demo-topic-dengue"),
		});
		assert.deepEqual(plan.terms, [
			{ taxonomy: "topic", slug: "demo-topic-dengue", label: "ไข้เลือดออก" },
		]);
	});

	it("restores the dataset's entries from the trash, as drafts to publish again", () => {
		const live = installed(dataset);
		const trashed = live.entries
			.filter(({ slug }) => slug === "demo-news-flu-vaccine" || slug === "about")
			.map((entry) => ({ ...entry, trashed: true }));
		const plan = planAdd(dataset, {
			...live,
			entries: [
				...live.entries.filter(({ slug }) => slug !== "demo-news-flu-vaccine" && slug !== "about"),
				...trashed,
			],
		});
		assert.deepEqual(plan.restore, trashed);
		assert.deepEqual(plan.create, []);
		assert.deepEqual(names(plan.publish).sort(), ["news/demo-news-flu-vaccine", "pages/about"]);
	});

	it("fills the Homepage menus it has items for, Office Contact and the handles on a runtime without them", () => {
		const plan = planAdd(dataset, emptyRuntime());
		// Quick Access has no item in the dataset, and stays as empty as it is.
		assert.deepEqual(
			plan.menus,
			["homepage-featured", "homepage-services"].map((name) => ({
				name,
				items: dataset.menus[name],
			})),
		);
		assert.deepEqual(plan.officeContact, dataset.officeContact);
		assert.deepEqual(plan.social, dataset.social);
	});

	it("empties Quick Access of the two shortcuts an earlier dataset gave it (#247)", () => {
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			menus: {
				...live.menus,
				"homepage-quick-access": ["/documents", "/health"].map((customUrl) =>
					liveItem(customUrl, { customUrl, cssClasses: "demo-dataset" }),
				),
			},
		});
		assert.deepEqual(plan.menus, [{ name: "homepage-quick-access", items: [] }]);
	});

	it("writes a menu again that holds only part of the dataset's items", () => {
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			menus: { ...live.menus, "homepage-services": live.menus["homepage-services"]!.slice(1) },
		});
		assert.deepEqual(plan.menus, [
			{ name: "homepage-services", items: dataset.menus["homepage-services"] },
		]);
	});

	it("keeps a menu with an item of the office's own, and Office Contact values of its own", () => {
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			menus: {
				...emptyRuntime().menus,
				"homepage-featured": [liveItem("office-item", { label: "ข่าวเด่น", customUrl: "/news" })],
			},
			officeContact: { ...emptyRuntime().officeContact, telephone: "054 111 111" },
			social: { ...emptyRuntime().social, facebook: "songhealth.office" },
		});
		assert.deepEqual(
			plan.menus.map(({ name }) => name),
			["homepage-services"],
		);
		const { telephone: _, ...contact } = dataset.officeContact;
		assert.deepEqual(plan.officeContact, contact);
		assert.equal(plan.social.facebook, undefined);
		assert.deepEqual(plan.kept, [
			"menu homepage-featured",
			"Office Contact telephone",
			"the social handle facebook",
		]);
	});

	it("keeps a Basic Page of the office's own at a reserved slug", () => {
		const live = installed(dataset);
		const plan = planAdd(dataset, {
			...live,
			entries: [
				...live.entries.filter(({ slug }) => slug !== "about" && slug !== "privacy"),
				liveEntry("pages", "about", { title: "เกี่ยวกับสำนักงานสาธารณสุขอำเภอสอง" }),
				liveEntry("pages", "privacy", { title: "นโยบายความเป็นส่วนตัว", status: "draft" }),
			],
		});
		assert.deepEqual(addSteps(plan), []);
		assert.deepEqual(plan.kept, ["pages/about", "pages/privacy"]);
	});

	it("creates each entry after the entries it refers to", () => {
		const document = (slug: string, successor?: string): DemoEntry => ({
			collection: "documents",
			slug,
			data: { title: `[ตัวอย่าง] ${slug}` },
			...(successor ? { references: { successor: [successor] } } : {}),
			publishedAt: NOW.toISOString(),
		});
		const plan = planAdd(
			{
				terms: [],
				media: [],
				menus: {},
				officeContact: {},
				social: {},
				entries: [
					document("demo-plan-2568", "demo-plan-2569"),
					document("demo-plan-2569", "demo-plan-2570"),
					document("demo-plan-2570"),
				],
			},
			emptyRuntime(),
		);
		assert.deepEqual(names(plan.create), [
			"documents/demo-plan-2570",
			"documents/demo-plan-2569",
			"documents/demo-plan-2568",
		]);
	});

	it("gives every entry its own slug, and refers only to entries of the dataset", () => {
		const slugs = dataset.entries.map(({ slug }) => slug);
		assert.equal(new Set(slugs).size, slugs.length);
		const unknown = dataset.entries.flatMap(({ slug, references = {} }) =>
			Object.values(references)
				.flat()
				.filter((target) => !slugs.includes(target))
				.map((target) => `${slug} -> ${target}`),
		);
		assert.deepEqual(unknown, []);
	});

	it("gives every entry only terms that the dataset or the reference terms hold", () => {
		const terms = new Set(
			[...REFERENCE_TERMS, ...dataset.terms].map(({ taxonomy, slug }) => `${taxonomy}/${slug}`),
		);
		const unknown = dataset.entries.flatMap(({ slug, taxonomies = {} }) =>
			Object.entries(taxonomies).flatMap(([taxonomy, slugs]) =>
				slugs.filter((term) => !terms.has(`${taxonomy}/${term}`)).map((term) => `${slug}: ${term}`),
			),
		);
		assert.deepEqual(unknown, []);
	});
});

describe("demo dataset: remove", () => {
	it("takes away the demo entries, live or in the trash, and leaves every other entry", () => {
		const plan = planRemove(dataset, {
			...emptyRuntime(),
			entries: [
				liveEntry("news", "demo-news-flu-vaccine"),
				liveEntry("news", "demo-news-unlisted", { status: "draft", trashed: true }),
				liveEntry("services", "demo-service-renamed", { status: "draft" }),
				liveEntry("news", "flu-vaccine-2569"),
				liveEntry("news", "songhealth-f002-synthetic-news-1a2b3c"),
				liveEntry("news", "news-demo-day", { trashed: true }),
			],
		});
		assert.deepEqual(names(plan.entries), [
			"news/demo-news-flu-vaccine",
			"news/demo-news-unlisted",
			"services/demo-service-renamed",
		]);
	});

	it("takes away the dataset's own Basic Pages at the reserved slugs, by their mark", () => {
		const plan = planRemove(dataset, {
			...emptyRuntime(),
			entries: [
				liveEntry("pages", "about", { title: "[ตัวอย่าง] เกี่ยวกับสำนักงานสาธารณสุขอำเภอสอง" }),
				liveEntry("pages", "organization", { title: "[ตัวอย่าง] โครงสร้างองค์กร", trashed: true }),
				liveEntry("pages", "privacy", { title: "นโยบายความเป็นส่วนตัว" }),
				liveEntry("pages", "history", { title: "[ตัวอย่าง] ประวัติสำนักงาน" }),
			],
		});
		assert.deepEqual(names(plan.entries), ["pages/about", "pages/organization"]);
	});

	it("takes the dataset's items out of the menus, and leaves the office's own", () => {
		const live = installed(dataset);
		const featured = live.menus["homepage-featured"]!;
		const office = liveItem("office-item", { label: "ข่าวเด่น", customUrl: "/news" });
		const picked = liveItem("picked-demo", {
			type: "collection",
			label: "ข่าวที่เลือกเอง",
			referenceCollection: "news",
			referenceId: live.entries.find(({ collection }) => collection === "news")!.id,
		});
		const plan = planRemove(dataset, {
			...live,
			menus: { ...emptyRuntime().menus, "homepage-featured": [...featured, office, picked] },
		});
		assert.deepEqual(
			plan.menuItems.map(({ menu, item }) => `${menu}/${item.id}`),
			featured.map(({ id }) => `homepage-featured/${id}`),
		);
	});

	it("empties the Office Contact values and handles that still hold the dataset's", () => {
		const live = installed(dataset);
		const plan = planRemove(dataset, {
			...live,
			officeContact: { ...live.officeContact, telephone: "054 111 111" },
			social: { ...live.social, facebook: "songhealth.office" },
		});
		assert.deepEqual(
			plan.officeContact,
			Object.keys(dataset.officeContact).filter((key) => key !== "telephone"),
		);
		assert.deepEqual(
			plan.social,
			Object.keys(dataset.social).filter((network) => network !== "facebook"),
		);
	});

	it("takes away the demo terms and leaves every other term", () => {
		const plan = planRemove(dataset, {
			...emptyRuntime(),
			terms: [
				...REFERENCE_TERMS,
				{ taxonomy: "topic", slug: "demo-topic-dengue" },
				{ taxonomy: "area", slug: "demo-area-unlisted" },
				{ taxonomy: "topic", slug: "dengue" },
				{ taxonomy: "topic", slug: "songhealth-f002-synthetic-topic-1a2b3c" },
			],
		});
		assert.deepEqual(plan.terms, [
			{ taxonomy: "topic", slug: "demo-topic-dengue" },
			{ taxonomy: "area", slug: "demo-area-unlisted" },
		]);
	});

	it("deletes the demo pictures and files and leaves every other media item", () => {
		const plan = planRemove(dataset, {
			...emptyRuntime(),
			media: [
				{ id: "m1", filename: "demo-news-flu-vaccine.png" },
				{ id: "m2", filename: "demo-unlisted.pdf" },
				{ id: "m3", filename: "flu-vaccine.png" },
				{ id: "m4", filename: "songhealth-f002-synthetic-media-1a2b3c4d.png" },
				{ id: "m5", filename: "clinic-demo-day.png" },
			],
		});
		assert.deepEqual(
			plan.media.map(({ filename }) => filename),
			["demo-news-flu-vaccine.png", "demo-unlisted.pdf"],
		);
	});

	it("plans nothing on a runtime without the dataset", () => {
		assert.deepEqual(removeSteps(planRemove(dataset, emptyRuntime())), []);
	});

	it("takes away every entry and media item of the installed dataset, its MOITs and their Evidence files (#126) and the One Page's entries, the One Page and the photos (#149) among them", () => {
		const live = installed(dataset);
		const plan = planRemove(dataset, live);
		assert.deepEqual(names(plan.entries), names(live.entries));
		assert.deepEqual(plan.media, live.media);
		assert.ok(names(plan.entries).includes("moit/demo-moit-2-2570"));
		assert.ok(plan.media.some(({ filename }) => filename === "demo-ita-document.pdf"));
		for (const name of [ONE_PAGE_NEWS, ONE_PAGE_ACTIVITY]) {
			assert.ok(names(plan.entries).includes(name), name);
		}
		const media = new Set(plan.media.map(({ filename }) => filename));
		const photos = mediaOf(entryNamed(ONE_PAGE_ACTIVITY).data.gallery);
		assert.equal(photos.length, 12);
		for (const filename of ["demo-one-page-health-fair.jpg", ...photos]) {
			assert.ok(media.has(filename), filename);
		}
	});
});

describe("demo dataset: content (#66)", () => {
	/** The dataset's entries of `collection`. */
	const entriesOf = (collection: string) =>
		dataset.entries.filter((entry) => entry.collection === collection);

	/** The dataset's MOIT numbered `number`. */
	const moitOf = (number: number) => entriesOf("moit").find(({ data }) => data.number === number)!;

	/** The type of each Evidence block of `moit`, in block order. */
	const blockTypesOf = (moit: DemoEntry) =>
		(moit.data.evidence as { _type: string }[]).map(({ _type }) => _type);

	it("starts every title with the demo mark and every slug with the demo prefix", () => {
		assert.deepEqual(
			dataset.entries
				.filter(({ data }) => !String(data.title).startsWith("[ตัวอย่าง] "))
				.map(({ slug }) => slug),
			[],
		);
		assert.deepEqual(
			[
				...dataset.entries.map(({ slug }) => slug),
				...dataset.terms.map(({ slug }) => slug),
				...dataset.media.map(({ filename }) => filename),
			].filter((slug) => !slug.startsWith("demo-") && !RESERVED_PAGES.includes(slug)),
			[],
		);
	});

	it("has the reserved Basic Pages", () => {
		assert.deepEqual(
			entriesOf("pages")
				.map(({ slug }) => slug)
				.filter((slug) => RESERVED_PAGES.includes(slug))
				.sort(),
			[...RESERVED_PAGES].sort(),
		);
	});

	it("starts no body with its entry's Summary, which News and Health Content posts show under their titles (#147, #149)", () => {
		const repeated = dataset.entries.flatMap(({ slug, data }) => {
			const [first] = (data.body ?? []) as { style?: string; children?: { text: string }[] }[];
			const text =
				first?.style === "normal" ? first.children?.map((span) => span.text).join("") : "";
			return text && text === data.summary ? [slug] : [];
		});
		assert.deepEqual(repeated, []);
	});

	it("has News, some of it Health News", () => {
		const news = entriesOf("news");
		assert.ok(news.length >= 3, `${news.length} News`);
		assert.ok(news.some(({ taxonomies }) => taxonomies?.topic?.length));
		assert.ok(news.some(({ taxonomies }) => !taxonomies?.topic?.length));
	});

	it("gives each Document's PDF the Document's own title and summary", () => {
		// Product Owner, 2026-10-31: #66 comment 6541144669, item 6.
		const pdfs = new Map(
			dataset.media.flatMap((media) => ("pdf" in media ? [[media.filename, media.pdf]] : [])),
		);
		for (const { slug, data } of entriesOf("documents")) {
			const [filename] = mediaOf(data.file);
			assert.deepEqual(pdfs.get(filename!), { title: data.title, summary: data.summary }, slug);
		}
	});

	it("has Documents of each Document Type the About pages list, one superseded by its successor", () => {
		const documents = entriesOf("documents");
		for (const type of ["policy", "plan", "result"]) {
			assert.ok(
				documents.some(({ taxonomies }) => taxonomies?.document_type?.includes(type)),
				`a Document of type ${type}`,
			);
		}
		const superseded = documents.filter(({ data }) => data.domain_status === "superseded");
		assert.equal(superseded.length, 1);
		const [successor] = superseded[0]!.references?.successor ?? [];
		assert.ok(
			documents.some(({ slug }) => slug === successor),
			"its successor is a Document",
		);
		assert.ok(
			documents.every(({ data }) => mediaOf(data.file).length === 1),
			"each has its file",
		);
	});

	it("has Announcements current and closed", () => {
		const closing = entriesOf("announcements").map(({ data }) =>
			data.closes_at === undefined ? Infinity : Date.parse(String(data.closes_at)),
		);
		assert.ok(
			closing.some((at) => at > NOW.getTime()),
			"a current Announcement",
		);
		assert.ok(
			closing.some((at) => at < NOW.getTime()),
			"a closed Announcement",
		);
	});

	it("has Services, one of them offered by Health Services", () => {
		const services = entriesOf("services");
		assert.ok(services.length >= 6, `${services.length} Services`);
		const offered = entriesOf("health_services").flatMap(
			({ references }) => references?.offered_services ?? [],
		);
		assert.ok(services.some(({ slug }) => offered.includes(slug)));
	});

	it("gives each Service an icon of its own, so the Homepage's six differ (#248)", () => {
		// Each demo Service's icon, by the Thai name staff choose it by (#248 comment 6826430670).
		const icons = {
			"demo-service-complaint": "ข้อความแจ้งเตือน",
			"demo-service-feedback": "หลอดไฟ",
			"demo-service-health-problem": "หัวใจและชีพจร",
			"demo-service-environment": "ใบไม้",
			"demo-service-flu-vaccine": "เข็มฉีดยา",
			"demo-service-information-request": "เอกสาร",
			"demo-service-vhv": "กลุ่มคน",
			"demo-service-general-inquiry": "เครื่องหมายคำถาม",
			"demo-service-health-rights": "โล่",
		};
		assert.deepEqual(
			Object.fromEntries(entriesOf("services").map(({ slug, data }) => [slug, data.icon])),
			icons,
		);
		const onHomepage = dataset.menus["homepage-services"]!.map((item) =>
			"entry" in item ? icons[item.entry as keyof typeof icons] : undefined,
		);
		// The six of the prototype the Product Owner chose, in the menu's order.
		assert.deepEqual(onHomepage, [
			"ข้อความแจ้งเตือน",
			"หลอดไฟ",
			"หัวใจและชีพจร",
			"เอกสาร",
			"กลุ่มคน",
			"เครื่องหมายคำถาม",
		]);
	});

	it("has Health Services across two or three demo Areas", () => {
		const areas = new Set(
			entriesOf("health_services").flatMap(({ taxonomies }) => taxonomies?.area ?? []),
		);
		assert.ok(areas.size >= 2 && areas.size <= 3, `${areas.size} Areas`);
		assert.ok([...areas].every((slug) => slug.startsWith("demo-")));
	});

	it("has Health Content for the Homepage's four places, each on a Health Topic", () => {
		const content = entriesOf("health_content");
		assert.ok(content.length >= 4, `${content.length} Health Content items`);
		assert.ok(content.every(({ taxonomies }) => taxonomies?.topic?.length === 1));
	});

	it("has Health Reports, each with its Document", () => {
		const reports = entriesOf("health_reports");
		const documents = entriesOf("documents").map(({ slug }) => slug);
		assert.ok(reports.length >= 2, `${reports.length} Health Reports`);
		for (const { slug, references } of reports) {
			assert.equal(references?.report_document?.length, 1, slug);
			assert.ok(documents.includes(references!.report_document![0]!), slug);
		}
	});

	it("has Personnel with two Leadership, each name starting with the mark, without a prefix", () => {
		const personnel = entriesOf("personnel");
		assert.equal(personnel.filter(({ data }) => data.leadership_order !== undefined).length, 2);
		// Product Owner, 2026-10-30: #61 comment 6514145827.
		assert.deepEqual(
			personnel.filter(({ data }) => data.prefix).map(({ slug }) => slug),
			[],
		);
		assert.ok(personnel.every(({ data }) => data.public_visible === true));
	});

	it("fills the Homepage menus: a Featured News with a picture, six Services, no shortcut", () => {
		const entry = (slug: string) => dataset.entries.find((candidate) => candidate.slug === slug);
		const [featured] = dataset.menus["homepage-featured"]!;
		const news = featured && "entry" in featured ? entry(featured.entry) : undefined;
		assert.equal(news?.collection, "news");
		assert.equal(mediaOf(news?.data.featured_image).length, 1);
		const services = dataset.menus["homepage-services"]!;
		assert.equal(services.length, 6);
		assert.ok(
			services.every((item) => "entry" in item && entry(item.entry)?.collection === "services"),
		);
		// Quick Access shows only once staff add a shortcut (spec #239 "Quick Access"; #247).
		assert.deepEqual(dataset.menus["homepage-quick-access"], []);
	});

	it("has Office Contact values, the address marked as a demo", () => {
		assert.deepEqual(Object.keys(dataset.officeContact).sort(), [...OFFICE_CONTACT_KEYS].sort());
		assert.match(String(dataset.officeContact.address), /^\[ตัวอย่าง\] /);
	});

	it("lists News and Activities newest first, so each list's first entry is the newest, which the demo-dataset suite sweeps (#149 retro)", () => {
		// News by publication, Activities by when they were held (ADR 0004), as their lists show them.
		const outOfOrder = (collection: string, date: (entry: DemoEntry) => string) => {
			const times = entriesOf(collection).map((entry) => Date.parse(date(entry)));
			return entriesOf(collection)
				.filter((_, index) => index > 0 && times[index]! > times[index - 1]!)
				.map(({ slug }) => slug);
		};
		assert.deepEqual(
			[
				...outOfOrder("news", ({ publishedAt }) => publishedAt),
				...outOfOrder("activities", ({ data }) => String(data.activity_at)),
			],
			[],
		);
	});

	it("has Activities with and without a picture", () => {
		const activities = entriesOf("activities");
		assert.ok(activities.length >= 3, `${activities.length} Activities`);
		assert.ok(activities.some(({ data }) => mediaOf(data.featured_image).length === 1));
		assert.ok(activities.some(({ data }) => data.featured_image === undefined));
	});

	it("has one One Page, marked as a demo, as the picture of one News item and one Activity, each with a Summary (#149)", () => {
		const onePages = dataset.media.filter((media) => "onePage" in media);
		assert.equal(onePages.length, 1);
		const [onePage] = onePages;
		assert.ok("onePage" in onePage! && onePage.onePage.title.startsWith("[ตัวอย่าง] "), "the mark");
		assert.ok(onePage.alt, "alt text");
		const users = dataset.entries.filter(({ data }) =>
			Object.values(data).some((value) => mediaOf(value).includes(onePage.filename)),
		);
		assert.deepEqual(names(users).sort(), [ONE_PAGE_ACTIVITY, ONE_PAGE_NEWS]);
		assert.ok(
			users.every(({ data }) => mediaOf(data.featured_image).includes(onePage.filename)),
			"as the picture",
		);
		assert.ok(
			users.every(({ data }) => typeof data.summary === "string" && data.summary.length > 0),
			"each with a Summary",
		);
	});

	it("gives the One Page its Activity's title, date, place and Summary (#149)", () => {
		const { data } = entryNamed(ONE_PAGE_ACTIVITY);
		const media = mediaNamed(mediaOf(data.featured_image)[0]!);
		assert.ok("onePage" in media);
		const { title, heldAt, place, summary } = media.onePage;
		assert.deepEqual(
			{ title, heldAt, place, summary },
			{
				title: data.title,
				heldAt: data.activity_at,
				place: data.location_text,
				summary: data.summary,
			},
		);
	});

	it("keeps the Featured item's picture, a landscape blend rather than the One Page (#149)", () => {
		const [featured] = dataset.menus["homepage-featured"]!;
		const news = entryNamed(`news/${featured && "entry" in featured ? featured.entry : ""}`);
		const [filename] = mediaOf(news.data.featured_image);
		assert.ok("colours" in mediaNamed(filename!), filename);
	});

	it("has twelve photos on the One Page's Activity, each a generated picture of its own with alt text and a caption (#149)", () => {
		const photos = entryNamed(ONE_PAGE_ACTIVITY).data.gallery as {
			image: unknown;
			caption?: string;
		}[];
		assert.equal(photos.length, 12);
		const pictures = photos.map(({ image }) => mediaNamed(mediaOf(image)[0]!));
		assert.equal(new Set(pictures.map(({ filename }) => filename)).size, 12, "a picture each");
		// The alt text names the photo's link and the caption shows under it (#148): the example
		// staff copy says what the photo shows, then what it is about.
		const wrong = photos.flatMap(({ caption }, index) => {
			const picture = pictures[index]!;
			if (!("colours" in picture)) return [`${picture.filename} is not a generated picture`];
			return picture.alt && caption && picture.alt !== caption
				? []
				: [`${picture.filename}: alt text "${picture.alt}", caption "${caption}"`];
		});
		assert.deepEqual(wrong, []);
	});

	it("has MOIT 1 and MOIT 2 of fiscal year 2570, each slug moit-{number}-{fiscal_year} behind the demo prefix (#126)", () => {
		assert.deepEqual(
			entriesOf("moit").map(({ slug, data }) => [slug, data.number, data.fiscal_year]),
			[
				["demo-moit-1-2570", 1, 2570],
				["demo-moit-2-2570", 2, 2570],
			],
		);
	});

	it("has MOIT 1 as the prototype's: two Requirements of four and three files (#126)", () => {
		// R is a Requirement block, F a file block.
		const R = "ita_requirement";
		const F = "ita_file";
		assert.deepEqual(blockTypesOf(moitOf(1)), [R, F, F, F, F, R, F, F, F]);
	});

	it("has MOIT 2 as the prototype's long form: about 60 blocks with sub-Requirements, both Rounds, current site pages and external links (#126)", () => {
		const blocks = moitOf(2).data.evidence as Record<string, unknown>[];
		assert.ok(blocks.length >= 55 && blocks.length <= 70, `${blocks.length} blocks`);
		assert.ok(
			blocks.some(({ _type, number }) => _type === "ita_requirement" && /\./.test(String(number))),
			"a sub-Requirement",
		);
		const rounds = new Set(blocks.map(({ round }) => round));
		assert.ok(rounds.has("รอบ 6 เดือน") && rounds.has("รอบ 12 เดือน"), "both Rounds");
		const links = blocks.filter(({ _type }) => _type === "ita_link");
		assert.ok(
			links.some(({ url, current }) => String(url).startsWith("/") && current === true),
			"a site page marked current",
		);
		assert.ok(
			links.some(({ url }) => String(url).startsWith("https://")),
			"an external link",
		);
	});

	it("removes from the library one file, that of MOIT 1's Evidence 2.3 alone (#126)", () => {
		assert.equal(REMOVED.length, 1);
		// Each field, or each block of a blocks field, that holds the file.
		const users = dataset.entries.flatMap(({ slug, data }) =>
			Object.values(data).flatMap((value) =>
				(Array.isArray(value) ? value : [value])
					.filter((part) => mediaOf(part).includes(REMOVED[0]!.filename))
					.map((part) => `${slug}: ${String((part as { label?: unknown }).label ?? "")}`),
			),
		);
		assert.deepEqual(users, ["demo-moit-1-2570: 2.3 ฟอร์มเผยแพร่"]);
	});
});

describe("demo dataset: the content model of seed/seed.json (#66 retro)", () => {
	interface SeedField {
		slug: string;
		type: string;
		required?: boolean;
		validation?: {
			relation?: string;
			relationSide?: "parent" | "child";
			options?: string[];
			allowedTypes?: string[];
			maxItems?: number;
		};
	}
	const seed = JSON.parse(
		readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8"),
	) as {
		collections: { slug: string; fields: SeedField[] }[];
		blockTypes: {
			slug: string;
			currentVersion: number;
			versions: { version: number; fields: SeedField[] }[];
		}[];
		taxonomies: { name: string; collections: string[] }[];
		relations: { slug: string; parentCollection: string; childCollection: string }[];
	};
	const fieldsOf = (collection: string) =>
		seed.collections.find(({ slug }) => slug === collection)?.fields ?? [];
	const collectionOf = (slug: string) =>
		dataset.entries.find((entry) => entry.slug === slug)?.collection;

	it("sets only its collection's fields on each entry, every required one included", () => {
		const wrong = dataset.entries.flatMap(({ collection, slug, data, references = {} }) => {
			const fields = fieldsOf(collection);
			return [
				...Object.keys(data)
					.filter(
						(key) => !fields.some((field) => field.slug === key && field.type !== "reference"),
					)
					.map((key) => `${slug}: ${key} is no field of ${collection}`),
				...fields
					.filter(({ slug: key, required }) => required && !(key in data) && !(key in references))
					.map(({ slug: key }) => `${slug}: required ${key} is not set`),
			];
		});
		assert.deepEqual(wrong, []);
	});

	it("fills each blocks field with the types it allows, each block with its type's fields, every required one included (#126)", () => {
		// The native API refuses a block field its type's version does not declare, and a select
		// value that is not one of its options (docs/agents/emdash-1.1.0.md, blocks).
		const wrong = dataset.entries.flatMap(({ collection, slug, data }) =>
			fieldsOf(collection)
				.filter(({ type, slug: key }) => type === "blocks" && key in data)
				.flatMap(({ slug: key, validation }) => {
					const blocks = data[key] as Record<string, unknown>[];
					const tooMany =
						blocks.length > validation!.maxItems! ? [`${slug}: ${blocks.length} blocks`] : [];
					return [
						...tooMany,
						...blocks.flatMap(({ _type, ...values }, index) => {
							const at = `${slug} ${key}[${index}]`;
							const type = seed.blockTypes.find((candidate) => candidate.slug === _type);
							if (type === undefined || !validation!.allowedTypes!.includes(String(_type))) {
								return [`${at}: ${String(_type)} is not allowed`];
							}
							const { fields } = type.versions.find(
								({ version }) => version === type.currentVersion,
							)!;
							return [
								...Object.keys(values)
									.filter((field) => !fields.some((candidate) => candidate.slug === field))
									.map((field) => `${at}: ${field} is no field of ${String(_type)}`),
								...fields
									.filter((field) => field.required && !(field.slug in values))
									.map((field) => `${at}: required ${field.slug} is not set`),
								...fields
									.filter(
										(field) =>
											field.type === "select" &&
											field.slug in values &&
											!field.validation!.options!.includes(String(values[field.slug])),
									)
									.map((field) => `${at}: ${field.slug} is no option`),
							];
						}),
					];
				}),
		);
		assert.deepEqual(wrong, []);
	});

	it("files each entry under its collection's taxonomies only", () => {
		const wrong = dataset.entries.flatMap(({ collection, slug, taxonomies = {} }) =>
			Object.keys(taxonomies)
				.filter(
					(name) =>
						!seed.taxonomies.some(
							(taxonomy) => taxonomy.name === name && taxonomy.collections.includes(collection),
						),
				)
				.map((name) => `${slug}: ${name}`),
		);
		assert.deepEqual(wrong, []);
	});

	it("refers through its collection's reference fields to entries of the related collection", () => {
		const wrong = dataset.entries.flatMap(({ collection, slug, references = {} }) =>
			Object.entries(references).flatMap(([key, targets]) => {
				const field = fieldsOf(collection).find((candidate) => candidate.slug === key);
				const relation = seed.relations.find(
					({ slug: name }) => name === field?.validation?.relation,
				);
				if (field?.type !== "reference" || relation === undefined) {
					return [`${slug}: ${key} is no reference field of ${collection}`];
				}
				const related =
					field.validation!.relationSide === "child"
						? relation.parentCollection
						: relation.childCollection;
				return targets
					.filter((target) => collectionOf(target) !== related)
					.map((target) => `${slug}: ${key} -> ${target} is not a ${related} entry`);
			}),
		);
		assert.deepEqual(wrong, []);
	});
});
