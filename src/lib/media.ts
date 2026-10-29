// Media on public pages (Feature 003 #55; spec #51 "Public reads", `03` §17).
//
// A CMS image or a Document's file is shown only while its file can be served. EmDash serves local
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
