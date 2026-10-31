// What the demo dataset's commands change (#66; spec #51 "Demo dataset"). scripts/demo-dataset.ts
// reads the development runtime into a LiveState, plans with these functions, applies the plan, and
// plans again to confirm. The dataset is development-only, so this module lives in scripts/ rather
// than src/lib. It imports nothing at run time, so node:test checks it directly
// (tests/node/demo-dataset.test.ts; Product Owner, 2026-10-31: #66 comment 6539906996).

/** What starts the slug of everything the dataset makes, the reserved Basic Pages aside. */
export const DEMO_PREFIX = "demo-";

/** What starts the title of every entry the dataset makes. */
export const DEMO_MARK = "[ตัวอย่าง]";

/**
 * The CSS class of every menu item the dataset makes. The Homepage renders no class of a menu item
 * (src/lib/homepage-curation.ts).
 */
export const DEMO_MENU_CLASS = "demo-dataset";

/** A taxonomy term, as the native taxonomy API creates it. */
export interface DemoTerm {
	taxonomy: string;
	slug: string;
	label: string;
}

/**
 * A picture or a PDF of the dataset, uploaded under its filename. A picture is a diagonal blend of
 * two hex colours, with alt text in the media library. A PDF is a one-page Thai document with its
 * Document's title and summary.
 */
export type DemoMedia =
	| { filename: string; alt: string; colours: readonly [string, string] }
	| { filename: string; pdf: { title: string; summary: string | undefined } };

/**
 * A field value that stands for a media item of the dataset, by filename. `add` gives the field the
 * uploaded item instead: `{ id }` for a picture, the file value for a PDF.
 */
export interface MediaRef {
	demoMedia: string;
}

/** An entry of the dataset, as `add` creates it. */
export interface DemoEntry {
	collection: string;
	slug: string;
	/** Its fields, as the native content API takes them, with a MediaRef for each picture or file. */
	data: Record<string, unknown>;
	/** Its terms' slugs by taxonomy. */
	taxonomies?: Record<string, string[]>;
	/** The slugs of the dataset's entries it refers to, by reference field. */
	references?: Record<string, string[]>;
	/** When `add` publishes it. */
	publishedAt: string;
}

/** A menu item of the dataset: one of its entries by slug, or a link. */
export type DemoMenuItem = { label: string; entry: string } | { label: string; url: string };

/** A value the Office Contact plugin's settings take (src/plugins/office-contact.ts). */
type SettingValue = string | number;

export interface DemoDataset {
	terms: DemoTerm[];
	media: DemoMedia[];
	entries: DemoEntry[];
	/** The Homepage menus' items, by menu name. */
	menus: Record<string, DemoMenuItem[]>;
	/** Office Contact values, by settings key. */
	officeContact: Record<string, SettingValue>;
	/** The site settings' `social` handles, by network. */
	social: Record<string, string>;
}

/** A term on the runtime. */
export interface LiveTerm {
	taxonomy: string;
	slug: string;
}

/** A media item on the runtime. */
export interface LiveMedia {
	id: string;
	filename: string;
}

/** An entry on the runtime, live or in the trash, as the native content lists give it. */
export interface LiveEntry {
	collection: string;
	id: string;
	slug: string | null;
	title: string;
	status: string;
	trashed: boolean;
}

/** What a menu item points at, and how it is labelled. */
export interface MenuItemFields {
	type: string;
	label: string;
	referenceCollection: string | null;
	referenceId: string | null;
	customUrl: string | null;
}

/**
 * A menu item on the runtime, as GET /_emdash/api/menus/{name} lists it (emdash 1.1.0
 * src/api/schemas/menus.ts menuItemSchema).
 */
export interface LiveMenuItem extends MenuItemFields {
	id: string;
	parentId: string | null;
	cssClasses: string | null;
}

/** What the runtime holds. */
export interface LiveState {
	entries: LiveEntry[];
	terms: LiveTerm[];
	media: LiveMedia[];
	/** Each menu's items, in menu order, by menu name. */
	menus: Record<string, LiveMenuItem[]>;
	/** Office Contact values by settings key, `null` when unset. */
	officeContact: Record<string, SettingValue | null>;
	/** The `social` handles by network, empty when unset. */
	social: Record<string, string>;
}

/** What `add` does, in this order. */
export interface AddPlan {
	/** The terms to create. */
	terms: DemoTerm[];
	/** The pictures and files to upload. */
	upload: DemoMedia[];
	/** The dataset's entries to take out of the trash, which brings each back as a draft. */
	restore: LiveEntry[];
	/** The entries to create, as drafts, each after the entries it refers to. */
	create: DemoEntry[];
	/** The entries to publish, created ones included. */
	publish: DemoEntry[];
	/** The menus to give exactly these items, in place of the dataset's items they hold. */
	menus: { name: string; items: DemoMenuItem[] }[];
	/** The Office Contact values to set. */
	officeContact: Record<string, SettingValue>;
	/** The `social` handles to set. */
	social: Record<string, string>;
	/**
	 * What `add` leaves as it is because it holds what the dataset did not make: a reserved slug
	 * (as `collection/slug`), a menu, an Office Contact value or a handle.
	 */
	kept: string[];
}

/** What `remove` does, in this order. */
export interface RemovePlan {
	/** The menu items the dataset made. */
	menuItems: { menu: string; item: LiveMenuItem }[];
	/** The demo entries, live or in the trash: those live go to the trash, then all are purged. */
	entries: LiveEntry[];
	/** The demo terms, deleted after the demo entries. An entry of the office's own loses one. */
	terms: LiveTerm[];
	/** The demo pictures and files, deleted after the demo entries, whatever still uses them. */
	media: LiveMedia[];
	/** The Office Contact keys that still hold the dataset's values, to unset. */
	officeContact: string[];
	/** The `social` networks whose handle is still the dataset's, to empty. */
	social: string[];
}

/** An entry's name in plans and messages: `collection/slug`. */
export const entryName = ({ collection, slug }: { collection: string; slug: string | null }) =>
	`${collection}/${slug}`;

const termName = ({ taxonomy, slug }: LiveTerm) => `${taxonomy}/${slug}`;

/**
 * What a menu item of the dataset points at, as the menu stores it: a link's address, or the
 * entry's collection and id, typed as the Admin's picker types it, `page` for a Basic Page (emdash
 * 1.1.0 @emdash-cms/admin/dist/index.js handleAddContent).
 */
export function menuItemFields(
	item: DemoMenuItem,
	entry?: { collection: string; id: string },
): MenuItemFields {
	if ("url" in item) {
		return {
			type: "custom",
			label: item.label,
			referenceCollection: null,
			referenceId: null,
			customUrl: item.url,
		};
	}
	return {
		type: entry!.collection === "pages" ? "page" : "collection",
		label: item.label,
		referenceCollection: entry!.collection,
		referenceId: entry!.id,
		customUrl: null,
	};
}

const MENU_ITEM_FIELDS = [
	"type",
	"label",
	"referenceCollection",
	"referenceId",
	"customUrl",
] as const;

/**
 * `entries` reordered so that each comes after the entries it refers to, or that `present` holds.
 * A reference that never resolves throws.
 */
function inReferenceOrder(entries: DemoEntry[], present: Set<string>): DemoEntry[] {
	const ordered: DemoEntry[] = [];
	const done = new Set(present);
	let pending = entries;
	while (pending.length > 0) {
		const ready = pending.filter(({ references = {} }) =>
			Object.values(references).every((slugs) => slugs.every((slug) => done.has(slug))),
		);
		if (ready.length === 0) {
			throw new Error(`unresolved references: ${pending.map(({ slug }) => slug).join(", ")}`);
		}
		for (const { slug } of ready) done.add(slug);
		ordered.push(...ready);
		pending = pending.filter((entry) => !ready.includes(entry));
	}
	return ordered;
}

/**
 * The test for whether a runtime entry is the dataset's: its slug carries the demo prefix, or it
 * holds a slug that the dataset uses without one, a reserved Basic Page's, under a title with the
 * demo mark.
 */
function isDemoEntryOf(dataset: DemoDataset): (entry: LiveEntry) => boolean {
	const unprefixed = new Set(
		dataset.entries.filter(({ slug }) => !slug.startsWith(DEMO_PREFIX)).map(entryName),
	);
	return (entry) =>
		(entry.slug?.startsWith(DEMO_PREFIX) ?? false) ||
		(unprefixed.has(entryName(entry)) && entry.title.startsWith(DEMO_MARK));
}

/**
 * What `add` does on a runtime in state `live`: create the dataset's terms, media and entries the
 * runtime lacks, take its entries out of the trash, and publish each one that is not published. A
 * term, media item or entry the runtime holds keeps its label, file or fields. An entry of the
 * office's own at a reserved slug stays as it is, and the dataset's entry there is left out.
 */
export function planAdd(dataset: DemoDataset, live: LiveState): AddPlan {
	const isDemo = isDemoEntryOf(dataset);
	// A slug stays taken in the trash (emdash 1.1.0 src/database/migrations/019_i18n.ts,
	// UNIQUE (slug, locale)), so each slug names one entry of the runtime at most.
	const held = new Map(live.entries.map((entry) => [entryName(entry), entry]));
	const terms = new Set(live.terms.map(termName));
	const media = new Set(live.media.map(({ filename }) => filename));
	const plan: AddPlan = {
		terms: dataset.terms.filter((term) => !terms.has(termName(term))),
		upload: dataset.media.filter(({ filename }) => !media.has(filename)),
		restore: [],
		create: [],
		publish: [],
		menus: [],
		officeContact: {},
		social: {},
		kept: [],
	};
	for (const entry of dataset.entries) {
		const holder = held.get(entryName(entry));
		if (holder !== undefined && !isDemo(holder)) {
			plan.kept.push(entryName(entry));
			continue;
		}
		if (holder === undefined) plan.create.push(entry);
		else if (holder.trashed) plan.restore.push(holder);
		// A restored entry comes back as a draft (emdash 1.1.0 src/database/repositories/content.ts
		// restore).
		if (holder === undefined || holder.trashed || holder.status !== "published") {
			plan.publish.push(entry);
		}
	}
	const creating = new Set(plan.create);
	plan.create = inReferenceOrder(
		plan.create,
		new Set(dataset.entries.filter((entry) => !creating.has(entry)).map(({ slug }) => slug)),
	);

	/** Each dataset entry the runtime holds outside the trash, by slug. */
	const placed = new Map(
		dataset.entries.flatMap((entry) => {
			const holder = held.get(entryName(entry));
			return holder && !holder.trashed && isDemo(holder) ? [[entry.slug, holder] as const] : [];
		}),
	);
	/** A menu item as the menu stores it, or undefined while its entry has no id yet. */
	const stored = (item: DemoMenuItem) => {
		if ("url" in item) return menuItemFields(item);
		const entry = placed.get(item.entry);
		return entry && menuItemFields(item, entry);
	};
	for (const [name, items] of Object.entries(dataset.menus)) {
		const holds = live.menus[name] ?? [];
		if (holds.some(({ cssClasses }) => cssClasses !== DEMO_MENU_CLASS)) {
			plan.kept.push(`menu ${name}`);
			continue;
		}
		const wanted = items.map(stored);
		const same =
			wanted.length === holds.length &&
			wanted.every(
				(fields, index) =>
					fields !== undefined &&
					MENU_ITEM_FIELDS.every((key) => fields[key] === holds[index]![key]),
			);
		if (!same) plan.menus.push({ name, items });
	}

	for (const [key, value] of Object.entries(dataset.officeContact)) {
		const current = live.officeContact[key];
		if (current === null || current === undefined || current === "")
			plan.officeContact[key] = value;
		else if (current !== value) plan.kept.push(`Office Contact ${key}`);
	}
	for (const [network, handle] of Object.entries(dataset.social)) {
		const current = live.social[network];
		if (!current) plan.social[network] = handle;
		else if (current !== handle) plan.kept.push(`the social handle ${network}`);
	}
	return plan;
}

/**
 * What `remove` does on a runtime in state `live`: take away every demo entry, term, media item and
 * menu item, including one the dataset no longer lists, and empty the Office Contact values and
 * handles that still hold the dataset's. An entry of the office's own that uses a demo term or
 * picture loses it; everything else of the office's own stays as it is.
 */
export function planRemove(dataset: DemoDataset, live: LiveState): RemovePlan {
	return {
		menuItems: Object.entries(live.menus).flatMap(([menu, items]) =>
			items
				.filter(({ cssClasses }) => cssClasses === DEMO_MENU_CLASS)
				.map((item) => ({ menu, item })),
		),
		entries: live.entries.filter(isDemoEntryOf(dataset)),
		terms: live.terms.filter(({ slug }) => slug.startsWith(DEMO_PREFIX)),
		media: live.media.filter(({ filename }) => filename.startsWith(DEMO_PREFIX)),
		officeContact: Object.keys(dataset.officeContact).filter(
			(key) => live.officeContact[key] === dataset.officeContact[key],
		),
		social: Object.keys(dataset.social).filter(
			(network) => live.social[network] === dataset.social[network],
		),
	};
}

/** Each change an AddPlan makes, in words, in order. */
export function addSteps(plan: AddPlan): string[] {
	return [
		...plan.terms.map(({ taxonomy, slug }) => `create the ${taxonomy} term ${slug}`),
		...plan.upload.map(({ filename }) => `upload ${filename}`),
		...plan.restore.map((entry) => `restore ${entryName(entry)}`),
		...plan.create.map((entry) => `create ${entryName(entry)}`),
		...plan.publish.map((entry) => `publish ${entryName(entry)}`),
		...plan.menus.map(({ name }) => `fill the menu ${name} with the dataset's items`),
		...Object.keys(plan.officeContact).map((key) => `set Office Contact ${key}`),
		...Object.keys(plan.social).map((network) => `set the social handle ${network}`),
	];
}

/** Each change a RemovePlan makes, in words, in order. */
export function removeSteps(plan: RemovePlan): string[] {
	return [
		...plan.menuItems.map(({ menu, item }) => `take ${item.label} out of the menu ${menu}`),
		...plan.entries.map((entry) => `delete ${entryName(entry)}`),
		...plan.terms.map(({ taxonomy, slug }) => `delete the ${taxonomy} term ${slug}`),
		...plan.media.map(({ filename }) => `delete ${filename}`),
		...plan.officeContact.map((key) => `unset Office Contact ${key}`),
		...plan.social.map((network) => `empty the social handle ${network}`),
	];
}
