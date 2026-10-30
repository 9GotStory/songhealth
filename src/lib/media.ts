// Media on public pages (Feature 003 #55, #59; spec #51 "Public reads", `03` §17).
//
// A CMS image, an image in a rich-text body or a Document's file is shown only while its file can
// be served. EmDash serves local
// media from its storage adapter by storage key (emdash 1.1.0
// src/astro/routes/api/media/file/[...key].ts), and deleting a media item in Admin removes its
// stored file too (src/api/handlers/media.ts handleMediaDelete). So the stored file under the key
// decides whether the page's picture or link would work: an image asks whether it exists, and a
// file reads its size from it as well. EmDash puts the adapter and its URL resolver on
// `Astro.locals.emdash` for anonymous and signed-in requests alike (src/astro/middleware.ts);
// pages pass that object in.
//
// Only local media counts. Another provider's media lives on another origin, and loading it would
// send the visit to a third party (#51 user story 11); Songhealth configures no other provider.

import type { FileValue, MediaValue, Storage } from "emdash";

/** The part of `Astro.locals.emdash` that serves media. */
export interface MediaRuntime {
	storage?: Pick<Storage, "exists" | "download"> | null;
	getPublicMediaUrl?: (storageKey: string) => string;
}

/** What a page shows where a Document's file cannot be served. */
export const FILE_UNAVAILABLE = "ไฟล์ไม่พร้อมให้บริการ";

/**
 * The storage key a local media value is served from, or undefined for another provider's media:
 * its cached storage key, else its id, the fallback EmDash's own image URL uses
 * (src/media/url.ts buildRenderMediaUrl).
 */
function localKeyOf(value: MediaValue | FileValue | null | undefined): string | undefined {
	if (!value || (value.provider ?? "local") !== "local") return undefined;
	const key = value.meta?.storageKey;
	if (typeof key === "string" && key !== "") return key;
	return value.id || undefined;
}

/** The media value while its file can be served, else undefined. */
export async function availableMedia<T extends MediaValue | FileValue>(
	value: T | null | undefined,
	runtime: MediaRuntime | undefined,
): Promise<T | undefined> {
	const key = localKeyOf(value);
	if (key === undefined || !runtime?.storage || !(await runtime.storage.exists(key))) {
		return undefined;
	}
	return value ?? undefined;
}

/** EmDash's route for a local media file, which a body image's URL names with its storage key. */
const MEDIA_FILE_ROUTE = "/_emdash/api/media/file/";

/** The image of a body's image block or gallery picture, as the Admin editor saves it. */
interface BodyImage {
	asset?: {
		_ref?: string;
		url?: string;
		provider?: string;
		meta?: { storageKey?: unknown };
	};
}

/**
 * A body image as the media value whose stored file EmDash's renderer would show, or undefined
 * when it is not local media. The renderer takes the image's URL, else a URL built from a cached
 * storage key, and serves its own media route by the key in it; without either it falls back to
 * the media id (emdash 1.1.0 src/content/converters/gallery.ts resolveImageMedia,
 * src/media/url.ts buildRenderMediaUrl). Any other URL is another origin's, like another
 * provider's media.
 */
function bodyImageMedia(image: BodyImage): MediaValue | undefined {
	const asset = image.asset ?? {};
	if ((asset.provider ?? "local") !== "local") return undefined;
	const storageKey = typeof asset.meta?.storageKey === "string" ? asset.meta.storageKey : "";
	const url = asset.url || (storageKey && `${MEDIA_FILE_ROUTE}${storageKey}`);
	if (url) {
		if (!url.startsWith(MEDIA_FILE_ROUTE)) return undefined;
		const key = url.slice(MEDIA_FILE_ROUTE.length);
		return { id: key, provider: "local", meta: { storageKey: key } };
	}
	return asset._ref ? { id: asset._ref, provider: "local" } : undefined;
}

/** Whether a body image's stored file can be served (availableMedia). */
async function bodyImageAvailable(image: BodyImage, runtime: MediaRuntime | undefined) {
	return (await availableMedia(bodyImageMedia(image), runtime)) !== undefined;
}

/**
 * A rich-text body as a page can show it: an image block whose stored file cannot be served is
 * left out, and so is such a picture of a gallery block, and a gallery left with none. EmDash's
 * renderer would show a broken image for each (Product Owner, 2026-10-29, on #55; #59). Every
 * other block stays as it is, in order.
 */
export async function availableBody<B extends { _type: string }>(
	blocks: readonly B[],
	runtime: MediaRuntime | undefined,
): Promise<B[]> {
	const shown = await Promise.all(
		blocks.map(async (block): Promise<B | undefined> => {
			if (block._type === "image") {
				return (await bodyImageAvailable(block as BodyImage, runtime)) ? block : undefined;
			}
			if (block._type === "gallery") {
				const images = ((block as { images?: unknown }).images ?? []) as BodyImage[];
				const available = await Promise.all(
					images.map((image) => bodyImageAvailable(image, runtime)),
				);
				const kept = images.filter((_, index) => available[index]);
				return kept.length > 0 ? { ...block, images: kept } : undefined;
			}
			return block;
		}),
	);
	return shown.filter((block) => block !== undefined);
}

/** A Document's file as a page offers it for download. */
export interface DownloadableFile {
	/** EmDash's own URL for the stored file. */
	href: string;
	/** The file's type, from its extension, and its size, such as "PDF, 1.2 MB". */
	label: string;
	/** The name the file was uploaded with, offered as the saved file's name. */
	filename?: string;
}

/** A file extension of one to eight letters or digits, without its dot. */
const EXTENSION = /\.([a-z0-9]{1,8})$/i;

/**
 * A size in bytes the way EmDash's Admin writes it beside a picked file: 1024-based units with at
 * most one decimal (@emdash-cms/admin 1.1.0 dist/index.js formatFileSize).
 */
function formatFileSize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB"];
	const unit = bytes < 1 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
	return `${Number.parseFloat((bytes / 1024 ** unit).toFixed(1))} ${units[unit]}`;
}

/**
 * The download a file field value offers, or undefined when its file cannot be served.
 *
 * EmDash keeps no size on a saved file value (emdash 1.1.0 src/media/normalize.ts
 * recordToMediaValue), so the size is the stored file's own, read the way EmDash's file route reads
 * it to send as Content-Length: the storage adapter's download, whose stream is released unread.
 * A missing file fails that download with the code NOT_FOUND (src/storage/local.ts); any other
 * storage failure is passed on. The stored file's key keeps the uploaded file's extension
 * (src/astro/routes/api/media.ts), so it names the type when the filename does not.
 */
export async function downloadableFile(
	value: FileValue | null | undefined,
	runtime: MediaRuntime | undefined,
): Promise<DownloadableFile | undefined> {
	const key = localKeyOf(value);
	if (key === undefined || !runtime?.storage || !runtime.getPublicMediaUrl) return undefined;
	let size: number;
	try {
		const stored = await runtime.storage.download(key);
		size = stored.size;
		await stored.body.cancel();
	} catch (error) {
		if ((error as { code?: unknown }).code === "NOT_FOUND") return undefined;
		throw error;
	}
	const filename = value?.filename;
	const extension = EXTENSION.exec(filename ?? "")?.[1] ?? EXTENSION.exec(key)?.[1];
	return {
		href: runtime.getPublicMediaUrl(key),
		label: [extension?.toUpperCase(), formatFileSize(size)].filter(Boolean).join(", "),
		...(filename ? { filename } : {}),
	};
}
