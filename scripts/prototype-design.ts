// PROTOTYPE (throwaway, branch prototype/design): Feature 006's stand-ins on the development
// runtime (grill 2026-11-04, Q5, Q6, Q14). It uploads real One Pages and landscape pictures from
// the legacy site, publishes an Activity or a News item for each One Page with the Summary typed
// from it, a Featured News item with a landscape picture in the Homepage's Featured menu, and the
// MOPH emblem as the site logo. `remove` takes all of it away and puts the logo and the Featured
// menu back as `add` found them. The pictures and the texts stay in <dir>, outside the
// repository (the repository is public); nothing here is production code.
//
//   scripts/dev-runtime-env.sh node scripts/prototype-design.ts add <dir>
//   scripts/dev-runtime-env.sh node scripts/prototype-design.ts remove <dir>
//
// <dir>/standins.json names each file under <dir> and gives its entry; <dir>/state.json is what
// `add` found, which `remove` restores. The commands act as the development Administrator through
// the PAT that SONGHEALTH_DEV_ACCESS names (cms.helpers.ts devAdminActor); the PAT is never
// printed.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as helpers from "../tests/browser/cms.helpers.ts";

const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";
const USAGE = "usage: node scripts/prototype-design.ts add|remove <dir>";
const PREFIX = "proto-design-";
const FEATURED_MENU = "homepage-featured";

interface Picture {
	file: string;
	width: number;
	height: number;
	alt: string;
}

/** A gallery picture: a photo that is not part of the One Page, with its caption. */
interface GalleryPicture extends Picture {
	caption?: string;
}

interface StandIn extends Picture {
	/** The legacy item's id, which names the entry and its picture. */
	key: string;
	collection: "activities" | "news";
	title: string;
	/** The legacy publication instant, which the entry is published at. */
	publishedAt: string;
	summary: string;
	/** An Activity's date, location and participants, as the One Page states them. */
	activityAt?: string;
	location?: string;
	participants?: string;
	/** An Activity's gallery field (the repeater "ภาพกิจกรรม"). */
	gallery?: GalleryPicture[];
	/** A News item's body: one gallery block of these pictures. */
	bodyGallery?: GalleryPicture[];
}

interface StandIns {
	logo: Picture;
	featured: Omit<StandIn, "collection">;
	items: StandIn[];
}

interface State {
	logo: { mediaId: string; alt?: string } | null;
	featuredMenu: Record<string, unknown>[];
}

/** One native request; a refusal throws with what was being done. */
async function must(
	admin: helpers.CmsActor,
	doing: string,
	path: string,
	options: helpers.CmsRequestOptions = {},
): Promise<helpers.NativeResult> {
	const result = await helpers.cmsRequest(admin, path, options);
	if (!result.ok) throw new Error(`${doing}: ${helpers.nativeRefusalOf(result)}`);
	return result;
}

async function upload(admin: helpers.CmsActor, dir: string, name: string, picture: Picture) {
	const extension = picture.file.endsWith(".jpg") ? "jpg" : "webp";
	const filename = `${PREFIX}${name}.${extension}`;
	const existing = (await helpers.listNativeItems(admin, "/_emdash/api/media")).find(
		(item) => item.filename === filename,
	);
	if (existing) return existing as { id: string; url?: string };
	const form = new FormData();
	const bytes = await readFile(join(dir, picture.file));
	const type = extension === "jpg" ? "image/jpeg" : "image/webp";
	form.append("file", new File([bytes], filename, { type }));
	form.append("width", String(picture.width));
	form.append("height", String(picture.height));
	form.append("deduplicate", "false");
	const uploaded = await must(admin, `uploading ${picture.file}`, "/_emdash/api/media", {
		method: "POST",
		form,
	});
	const item = helpers.nativeItemOf(uploaded) as { id: string; url?: string };
	await must(admin, `describing ${picture.file}`, `/_emdash/api/media/${item.id}`, {
		method: "PUT",
		body: { alt: picture.alt },
	});
	console.log(`uploaded ${filename}`);
	return item;
}

async function entryIds(admin: helpers.CmsActor, collection: string) {
	const items = await helpers.listNativeItems(admin, `/_emdash/api/content/${collection}`);
	return new Map(items.map((item) => [String(item.slug), String(item.id)]));
}

async function publishStandIn(
	admin: helpers.CmsActor,
	dir: string,
	collection: string,
	standIn: Omit<StandIn, "collection">,
	mediaId: string,
): Promise<string> {
	const slug = `${PREFIX}${standIn.key}`;
	const present = (await entryIds(admin, collection)).get(slug);
	if (present) return present;
	const pictures = async (list: GalleryPicture[]) =>
		Promise.all(
			list.map(async (picture, index) => ({
				picture,
				item: await upload(admin, dir, `${standIn.key}-g${index + 1}`, picture),
			})),
		);
	const data: Record<string, unknown> = {
		title: standIn.title,
		summary: standIn.summary,
		featured_image: { id: mediaId },
	};
	if (collection === "activities") {
		if (standIn.activityAt) data.activity_at = standIn.activityAt;
		if (standIn.location) data.location_text = standIn.location;
		if (standIn.participants) data.participants_text = standIn.participants;
		if (standIn.gallery) {
			data.gallery = (await pictures(standIn.gallery)).map(({ picture, item }) => ({
				image: { id: item.id },
				caption: picture.caption,
			}));
		}
	} else {
		data.source_text = "สำนักงานสาธารณสุขอำเภอสอง";
		if (standIn.bodyGallery) {
			data.body = [
				{
					_type: "gallery",
					_key: crypto.randomUUID().slice(0, 8),
					columns: 2,
					images: (await pictures(standIn.bodyGallery)).map(({ picture, item }) => ({
						_type: "image",
						_key: crypto.randomUUID().slice(0, 8),
						asset: { _ref: item.id, url: item.url },
						alt: picture.alt,
						caption: picture.caption,
						width: picture.width,
						height: picture.height,
					})),
				},
			];
		}
	}
	const created = await helpers.createSyntheticEntry(admin, collection, { slug, data });
	if (!created.entryId) {
		throw new Error(`creating ${slug}: ${helpers.nativeRefusalOf(created.result)}`);
	}
	const published = await helpers.publishEntry(admin, collection, created.entryId, {
		publishedAt: standIn.publishedAt,
	});
	if (!published.ok) throw new Error(`publishing ${slug}: ${helpers.nativeRefusalOf(published)}`);
	console.log(`published ${collection}/${slug}`);
	return created.entryId;
}

async function readState(admin: helpers.CmsActor): Promise<State> {
	const settings = helpers.nativeDataOf(
		await must(admin, "reading the site settings", "/_emdash/api/settings"),
	);
	const logo = settings?.logo as { mediaId?: string; alt?: string } | undefined;
	const menu = helpers.nativeDataOf(
		await must(admin, "reading the Featured menu", `/_emdash/api/menus/${FEATURED_MENU}`),
	);
	return {
		logo: logo?.mediaId ? { mediaId: logo.mediaId, alt: logo.alt } : null,
		featuredMenu: (menu?.items ?? []) as Record<string, unknown>[],
	};
}

async function add(admin: helpers.CmsActor, dir: string): Promise<void> {
	const standIns = JSON.parse(await readFile(join(dir, "standins.json"), "utf8")) as StandIns;
	const statePath = join(dir, "state.json");
	const saved = await readFile(statePath, "utf8").catch(() => undefined);
	if (saved === undefined) {
		await writeFile(statePath, JSON.stringify(await readState(admin), null, 2));
		console.log(`saved the logo and the Featured menu as found, in ${statePath}`);
	}
	for (const item of standIns.items) {
		const media = await upload(admin, dir, item.key, item);
		await publishStandIn(admin, dir, item.collection, item, media.id);
	}
	const featuredMedia = await upload(admin, dir, standIns.featured.key, standIns.featured);
	const featuredId = await publishStandIn(admin, dir, "news", standIns.featured, featuredMedia.id);
	await helpers.setMenuItems(admin, FEATURED_MENU, [
		{
			parentId: null,
			sortOrder: 0,
			type: "collection",
			label: standIns.featured.title,
			referenceCollection: "news",
			referenceId: featuredId,
			customUrl: null,
			target: null,
			titleAttr: null,
			cssClasses: null,
		},
	]);
	console.log(`put news/${PREFIX}${standIns.featured.key} in the menu ${FEATURED_MENU}`);
	const logo = await upload(admin, dir, "logo-moph", standIns.logo);
	const written = await helpers.writeSiteSettings(admin, {
		logo: { mediaId: logo.id, alt: standIns.logo.alt },
	});
	if (!written.ok) throw new Error(`setting the logo: ${helpers.nativeRefusalOf(written)}`);
	console.log("set the MOPH emblem as the site logo");
	console.log(`\nPages: ${ORIGIN}/?variant=1  (?variant=0|1|2|3, ?onepage=frame|text)`);
}

async function remove(admin: helpers.CmsActor, dir: string): Promise<void> {
	const statePath = join(dir, "state.json");
	const state = JSON.parse(await readFile(statePath, "utf8")) as State;
	await helpers.setMenuItems(
		admin,
		FEATURED_MENU,
		state.featuredMenu.map((item, sortOrder) => ({
			parentId: null,
			sortOrder,
			type: String(item.type),
			label: String(item.label),
			referenceCollection: (item.referenceCollection as string | null) ?? null,
			referenceId: (item.referenceId as string | null) ?? null,
			customUrl: (item.customUrl as string | null) ?? null,
			target: (item.target as string | null) ?? null,
			titleAttr: (item.titleAttr as string | null) ?? null,
			cssClasses: (item.cssClasses as string | null) ?? null,
		})),
	);
	console.log(`put the menu ${FEATURED_MENU} back as add found it`);
	const written = await helpers.writeSiteSettings(admin, { logo: state.logo });
	if (!written.ok) throw new Error(`restoring the logo: ${helpers.nativeRefusalOf(written)}`);
	console.log(`put the site logo back as add found it (${state.logo ? "set" : "none"})`);
	for (const collection of ["activities", "news"]) {
		for (const [slug, id] of await entryIds(admin, collection)) {
			if (!slug.startsWith(PREFIX)) continue;
			const trashed = await helpers.trashEntry(admin, collection, id);
			if (!trashed.ok) throw new Error(`trashing ${slug}: ${helpers.nativeRefusalOf(trashed)}`);
			const purged = await helpers.permanentlyDeleteEntry(admin, collection, id);
			if (!purged.ok) throw new Error(`deleting ${slug}: ${helpers.nativeRefusalOf(purged)}`);
			console.log(`deleted ${collection}/${slug}`);
		}
	}
	for (const item of await helpers.listNativeItems(admin, "/_emdash/api/media")) {
		if (!String(item.filename).startsWith(PREFIX)) continue;
		await must(admin, `deleting ${String(item.filename)}`, `/_emdash/api/media/${item.id}`, {
			method: "DELETE",
		});
		console.log(`deleted ${String(item.filename)}`);
	}
}

async function main(args: string[]): Promise<number> {
	const [command, dir] = args;
	if (args.length !== 2 || dir === undefined || (command !== "add" && command !== "remove")) {
		console.error(USAGE);
		return 2;
	}
	const admin = await helpers.devAdminActor(ORIGIN);
	if (command === "add") await add(admin, dir);
	else await remove(admin, dir);
	return 0;
}

process.exitCode = await main(process.argv.slice(2));
