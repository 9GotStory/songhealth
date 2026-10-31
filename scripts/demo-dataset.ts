// The demo dataset's commands (#66; spec #51 "Demo dataset", approved Q4): install the dataset that
// scripts/demo-dataset/content.ts defines on the development runtime, or take it away.
//
//   scripts/dev-runtime-env.sh node scripts/demo-dataset.ts add
//   scripts/dev-runtime-env.sh node scripts/demo-dataset.ts remove
//
// Each command reads the runtime through the native API, plans with scripts/demo-dataset/plan.ts,
// applies the plan, then reads the runtime again and plans once more: anything still planned fails
// the command (exit 1). A second `add` therefore finds nothing to do. The commands act as the
// development Administrator dev@emdash.local, whose PAT file SONGHEALTH_DEV_ACCESS names
// (cms.helpers.ts devAdminActor). Only the development-only setup/dev-bypass makes that account, so
// the commands cannot run against production. The PAT is never printed. The origin is
// PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import * as helpers from "../tests/browser/cms.helpers.ts";
import { demoDataset } from "./demo-dataset/content.ts";
import {
	DEMO_MENU_CLASS,
	DEMO_PREFIX,
	addSteps,
	entryName,
	menuItemFields,
	planAdd,
	planRemove,
	removeSteps,
	type LiveEntry,
	type LiveMedia,
	type LiveMenuItem,
	type LiveState,
	type LiveTerm,
	type MediaRef,
} from "./demo-dataset/plan.ts";

const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";
const USAGE = "usage: node scripts/demo-dataset.ts add|remove";

/**
 * A media item as the native media API lists or uploads it (emdash 1.1.0
 * src/database/repositories/media.ts MediaItem).
 */
interface MediaItem extends LiveMedia {
	mimeType: string;
	size: number | null;
	storageKey: string;
}

/** The runtime's state, with each demo media item in full. */
interface RuntimeState extends LiveState {
	media: MediaItem[];
}

/** One native request. A refusal throws, saying what was being done. */
async function call(
	admin: helpers.CmsActor,
	what: string,
	path: string,
	options: helpers.CmsRequestOptions = {},
): Promise<helpers.NativeResult> {
	const result = await helpers.cmsRequest(admin, path, options);
	if (!result.ok) throw new Error(`${what}: ${helpers.nativeRefusalOf(result)}`);
	return result;
}

/** The runtime's state, as the planner reads it, with each demo media item in full. */
async function readRuntime(admin: helpers.CmsActor): Promise<RuntimeState> {
	const schema = await call(admin, "listing the collections", "/_emdash/api/schema/collections");
	const entries: LiveEntry[] = [];
	for (const { slug: collection } of helpers.nativeItemsOf(schema) as { slug: string }[]) {
		for (const trashed of [false, true]) {
			const path = `/_emdash/api/content/${collection}${trashed ? "/trash" : ""}`;
			for (const item of await helpers.listNativeItems(admin, path)) {
				entries.push({
					collection,
					id: String(item.id),
					slug: typeof item.slug === "string" ? item.slug : null,
					title: String(helpers.dataOfItem(item).title ?? ""),
					status: String(item.status),
					trashed,
				});
			}
		}
	}
	const taxonomies = await call(admin, "listing the taxonomies", "/_emdash/api/taxonomies");
	const terms: LiveTerm[] = [];
	for (const { name } of helpers.nativeDataOf(taxonomies)!.taxonomies as { name: string }[]) {
		const listed = await call(
			admin,
			`listing the ${name} terms`,
			`/_emdash/api/taxonomies/${name}/terms`,
			{
				searchParams: { includeCounts: "false" },
			},
		);
		// A hierarchical taxonomy lists its terms as a tree (emdash 1.1.0
		// src/api/handlers/taxonomies.ts).
		type TermNode = { slug: string; children?: TermNode[] };
		const walk = (nodes: TermNode[]): void => {
			for (const node of nodes) {
				terms.push({ taxonomy: name, slug: node.slug });
				walk(node.children ?? []);
			}
		};
		walk(helpers.nativeDataOf(listed)!.terms as TermNode[]);
	}
	// `q` matches part of a filename (emdash 1.1.0 src/database/repositories/media.ts
	// applyListFilters).
	const media = (await helpers.listNativeItems(admin, "/_emdash/api/media", {
		q: DEMO_PREFIX,
	})) as unknown as MediaItem[];
	const menus: Record<string, LiveMenuItem[]> = {};
	for (const { name } of helpers.nativeItemsOf(
		await call(admin, "listing the menus", "/_emdash/api/menus"),
	) as { name: string }[]) {
		const read = await call(admin, `reading the menu ${name}`, `/_emdash/api/menus/${name}`);
		menus[name] = helpers.nativeDataOf(read)!.items as LiveMenuItem[];
	}
	const contact = await call(
		admin,
		"reading Office Contact",
		`/_emdash/api/admin/plugins/${helpers.OFFICE_CONTACT_PLUGIN_ID}/settings`,
	);
	const settings = await call(admin, "reading the site settings", "/_emdash/api/settings");
	return {
		entries,
		terms,
		media,
		menus,
		officeContact: helpers.nativeDataOf(contact)!.values as LiveState["officeContact"],
		social: (helpers.nativeDataOf(settings)!.social ?? {}) as Record<string, string>,
	};
}

/**
 * A one-page A4 PDF that names itself a demo document, in a standard PDF font, so its text is
 * ASCII only.
 */
function demoPdf(filename: string): Uint8Array<ArrayBuffer> {
	const text = `BT /F1 16 Tf 72 760 Td (Songhealth demo dataset: ${filename}) Tj ET`;
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		`<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
	];
	let pdf = "%PDF-1.4\n";
	const offsets = objects.map((object, index) => {
		const offset = pdf.length;
		pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
		return offset;
	});
	const xref = pdf.length;
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return new TextEncoder().encode(pdf) as Uint8Array<ArrayBuffer>;
}

async function add(admin: helpers.CmsActor): Promise<boolean> {
	const dataset = demoDataset(new Date());
	const live = await readRuntime(admin);
	const plan = planAdd(dataset, live);
	for (const { taxonomy, slug, label } of plan.terms) {
		await call(
			admin,
			`creating the ${taxonomy} term ${slug}`,
			`/_emdash/api/taxonomies/${taxonomy}/terms`,
			{
				method: "POST",
				body: { slug, label },
			},
		);
		console.log(`created the ${taxonomy} term ${slug}`);
	}
	const media = new Map(live.media.map((item) => [item.filename, item]));
	for (const item of plan.upload) {
		const uploaded =
			"colours" in item
				? await helpers.uploadMediaItem(
						admin,
						item.filename,
						{ bytes: helpers.gradientPng(...item.colours), type: "image/png" },
						item.alt,
					)
				: await helpers.uploadMediaItem(admin, item.filename, {
						bytes: demoPdf(item.filename),
						type: "application/pdf",
					});
		media.set(item.filename, uploaded as unknown as MediaItem);
		console.log(`uploaded ${item.filename}`);
	}
	/**
	 * `value` with each MediaRef replaced by its media item: `{ id }` for a picture, which takes its
	 * alt text from the library (emdash 1.1.0 src/media/normalize.ts mergeProviderData), and for a
	 * PDF the file value the Admin's file picker saves (cms.helpers.ts fileFieldValue).
	 */
	const withMedia = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(withMedia);
		if (value === null || typeof value !== "object") return value;
		if ("demoMedia" in value) {
			const item = media.get((value as MediaRef).demoMedia)!;
			return item.mimeType === "application/pdf" ? helpers.fileFieldValue(item) : { id: item.id };
		}
		return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, withMedia(inner)]));
	};
	/** Each entry's id by `collection/slug`: the live ones, those restored, then those created. */
	const ids = new Map(
		live.entries.filter((entry) => !entry.trashed).map((entry) => [entryName(entry), entry.id]),
	);
	for (const entry of plan.restore) {
		const name = entryName(entry);
		const restored = await helpers.restoreEntry(admin, entry.collection, entry.id);
		if (!restored.ok) throw new Error(`restoring ${name}: ${helpers.nativeRefusalOf(restored)}`);
		ids.set(name, entry.id);
		console.log(`restored ${name}`);
	}
	/** The dataset's entry `slug`, with its id on the runtime. */
	const placed = (slug: string) => {
		const entry = dataset.entries.find((candidate) => candidate.slug === slug)!;
		return { collection: entry.collection, id: ids.get(entryName(entry))! };
	};
	for (const entry of plan.create) {
		const name = entryName(entry);
		const created = await call(
			admin,
			`creating ${name}`,
			`/_emdash/api/content/${entry.collection}`,
			{
				method: "POST",
				body: {
					slug: entry.slug,
					data: withMedia(entry.data),
					taxonomies: entry.taxonomies ?? {},
					// The dataset's slugs are its own, so a slug names one entry of any collection.
					references: Object.fromEntries(
						Object.entries(entry.references ?? {}).map(([field, slugs]) => [
							field,
							slugs.map((slug) => placed(slug).id),
						]),
					),
				},
			},
		);
		ids.set(name, String(helpers.nativeItemOf(created)!.id));
		console.log(`created ${name}`);
	}
	for (const entry of plan.publish) {
		const name = entryName(entry);
		const published = await helpers.publishEntry(admin, entry.collection, ids.get(name)!, {
			publishedAt: entry.publishedAt,
		});
		if (!published.ok) throw new Error(`publishing ${name}: ${helpers.nativeRefusalOf(published)}`);
		console.log(`published ${name}`);
	}
	for (const { name, items } of plan.menus) {
		// A menu the planner writes holds only the dataset's items, which this replaces.
		await helpers.setMenuItems(
			admin,
			name,
			items.map((item, sortOrder) => ({
				...menuItemFields(item, "entry" in item ? placed(item.entry) : undefined),
				parentId: null,
				sortOrder,
				target: null,
				titleAttr: null,
				cssClasses: DEMO_MENU_CLASS,
			})),
		);
		console.log(`filled the menu ${name} with the dataset's items`);
	}
	if (Object.keys(plan.officeContact).length > 0) {
		const written = await helpers.writeOfficeContactSettings(admin, plan.officeContact);
		if (!written.ok) throw new Error(`setting Office Contact: ${helpers.nativeRefusalOf(written)}`);
		console.log(`set Office Contact: ${Object.keys(plan.officeContact).join(", ")}`);
	}
	if (Object.keys(plan.social).length > 0) {
		const written = await helpers.writeSiteSettings(admin, { social: plan.social });
		if (!written.ok) throw new Error(`setting the handles: ${helpers.nativeRefusalOf(written)}`);
		console.log(`set the social handles: ${Object.keys(plan.social).join(", ")}`);
	}
	for (const what of plan.kept) {
		console.log(`left ${what} as it is: it holds what the dataset did not make`);
	}
	const pending = addSteps(planAdd(dataset, await readRuntime(admin)));
	if (pending.length > 0) {
		console.log(`FAIL: still to do: ${pending.join("; ")}`);
		return false;
	}
	console.log(
		`the demo dataset is installed: ${dataset.entries.length} entries, ${dataset.terms.length} terms, ${dataset.media.length} pictures and files`,
	);
	return true;
}

async function remove(admin: helpers.CmsActor): Promise<boolean> {
	const dataset = demoDataset(new Date());
	const plan = planRemove(dataset, await readRuntime(admin));
	for (const { menu, item } of plan.menuItems) {
		const path = `/_emdash/api/menus/${menu}/items/${item.id}`;
		const deleted = await helpers.cmsRequest(admin, path, { method: "DELETE" });
		// An item whose parent went first went with it.
		if (!deleted.ok && deleted.status !== 404) {
			throw new Error(`taking ${item.label} out of ${menu}: ${helpers.nativeRefusalOf(deleted)}`);
		}
		console.log(`took ${item.label} out of the menu ${menu}`);
	}
	for (const entry of plan.entries) {
		const name = entryName(entry);
		if (!entry.trashed) {
			const trashed = await helpers.trashEntry(admin, entry.collection, entry.id);
			if (!trashed.ok) throw new Error(`trashing ${name}: ${helpers.nativeRefusalOf(trashed)}`);
		}
		const purged = await helpers.permanentlyDeleteEntry(admin, entry.collection, entry.id);
		if (!purged.ok) throw new Error(`purging ${name}: ${helpers.nativeRefusalOf(purged)}`);
		console.log(`deleted ${name}`);
	}
	const failures = await helpers.deleteSyntheticTerms(admin, plan.terms);
	if (failures.length > 0) throw new Error(`deleting terms: ${failures.join("; ")}`);
	for (const { taxonomy, slug } of plan.terms) console.log(`deleted the ${taxonomy} term ${slug}`);
	for (const { id, filename } of plan.media) {
		await call(admin, `deleting ${filename}`, `/_emdash/api/media/${id}`, { method: "DELETE" });
		console.log(`deleted ${filename}`);
	}
	if (plan.officeContact.length > 0) {
		const written = await helpers.writeOfficeContactSettings(
			admin,
			Object.fromEntries(plan.officeContact.map((key) => [key, null])),
		);
		if (!written.ok)
			throw new Error(`unsetting Office Contact: ${helpers.nativeRefusalOf(written)}`);
		console.log(`unset Office Contact: ${plan.officeContact.join(", ")}`);
	}
	if (plan.social.length > 0) {
		// The settings API can empty a handle but not delete it (emdash 1.1.0
		// src/api/schemas/settings.ts); the site shows an empty handle as unset.
		const written = await helpers.writeSiteSettings(admin, {
			social: Object.fromEntries(plan.social.map((network) => [network, ""])),
		});
		if (!written.ok) throw new Error(`emptying the handles: ${helpers.nativeRefusalOf(written)}`);
		console.log(`emptied the social handles: ${plan.social.join(", ")}`);
	}
	const remaining = removeSteps(planRemove(dataset, await readRuntime(admin)));
	if (remaining.length > 0) {
		console.log(`FAIL: still to do: ${remaining.join("; ")}`);
		return false;
	}
	console.log("the demo dataset is removed");
	return true;
}

const COMMANDS: Record<string, (admin: helpers.CmsActor) => Promise<boolean>> = { add, remove };

async function main(args: string[]): Promise<number> {
	const command =
		args.length === 1 && Object.hasOwn(COMMANDS, args[0]!) ? COMMANDS[args[0]!] : undefined;
	if (command === undefined) {
		console.error(USAGE);
		return 2;
	}
	try {
		const admin = await helpers.devAdminActor(ORIGIN);
		return (await command(admin)) ? 0 : 1;
	} catch (error) {
		console.log(
			`FAIL: ${helpers.scrubEmbeddedSecrets(error instanceof Error ? error.message : String(error))}`,
		);
		return 1;
	}
}

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2));
}
