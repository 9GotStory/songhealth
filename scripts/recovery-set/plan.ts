// The Recovery Set's rules (#221), which scripts/recovery-set.ts applies to the runtime: the two
// runtimes it knows by name, what it admits, the manifest it writes and reads, and how it compares
// a runtime with a set. Nothing here runs a command or touches a file, so node:test covers it
// (tests/node/recovery-set.test.ts). Decisions: #221 comments 7151779369 and 7152073609.

/** The two runtimes, by the only names the command takes. */
export type RuntimeName = "dev" | "production";

/** One runtime's resources. A path is relative to the Operator's home directory. */
export interface Runtime {
	name: RuntimeName;
	dbContainer: string;
	dbService: string;
	dbVolume: string;
	mediaVolume: string;
	appService: string;
	/** The media store's provisioning record: the restore keeps the target's, and no set holds it. */
	mediaMarker: string;
	/** What the Operator does for a store without its marker, which the restore refuses: the marker
	 * is a provisioning record, never created by hand (#221 comment 7153300185). */
	markerRemedy: string;
	/** The app role, which owns what a restore writes. The database's and its administrator's names
	 * are the db container's own POSTGRES_DB and POSTGRES_USER. */
	appRole: { kind: "fixed"; name: string } | { kind: "env-file"; path: string };
	/** What the runtime serves: the promoted commit's marker, or the app unit's pinned image. */
	serves: { kind: "marker"; path: string } | { kind: "unit-image"; path: string };
	/** Where EmDash's version is read: the runtime checkout, or the image the runtime serves. */
	emdash: { kind: "checkout"; path: string } | { kind: "image" };
}

const QUADLET = ".config/containers/systemd";

/**
 * The command's one map of each runtime's names, as deploy/dev-quadlet/ and deploy/quadlet/ give
 * them; scripts/dev-runtime-common.sh names dev's again for the shell scripts.
 */
export const RUNTIMES: Record<RuntimeName, Runtime> = {
	dev: {
		name: "dev",
		dbContainer: "songhealth-qdev-db",
		dbService: "songhealth-dev-db.service",
		dbVolume: "songhealth-qdev-db-data",
		mediaVolume: "songhealth-qdev-media",
		appService: "songhealth-dev-app.service",
		mediaMarker: ".songhealth-qdev-media-store",
		markerRemedy:
			"a lost marker is an incident to investigate, never created by hand (production-foundation.md §5.3); " +
			"on the Product Owner's word, remove the volume with the app stopped and run dev-runtime-install.sh, " +
			'which creates it with its marker, then restore again (development-quadlet.md "Backup and restore")',
		appRole: { kind: "fixed", name: "songhealth_qdev_app" },
		serves: { kind: "marker", path: "dev/songhealth-quadlet/.songhealth-qdev-source-identity" },
		emdash: { kind: "checkout", path: "dev/songhealth-quadlet/node_modules/emdash/package.json" },
	},
	production: {
		name: "production",
		dbContainer: "systemd-songhealth-db",
		dbService: "songhealth-db.service",
		dbVolume: "songhealth-db-data",
		mediaVolume: "songhealth-media",
		appService: "songhealth-app.service",
		mediaMarker: ".songhealth-media-store",
		markerRemedy:
			"provision a recreated store first; a store that lost its marker is an incident to investigate, " +
			"never marked by hand (production-foundation.md §5.3); then restore again",
		// The Operator sets the role in the app's environment file (production-foundation.md §4.3).
		appRole: { kind: "env-file", path: `${QUADLET}/songhealth-app.env` },
		serves: { kind: "unit-image", path: `${QUADLET}/songhealth-app.container` },
		emdash: { kind: "image" },
	},
};

export type CommandName = "backup" | "restore" | "check";

const USAGE = "usage: node scripts/recovery-set.ts backup|restore|check production|dev <directory>";

/** The command line: a command, a runtime's name and a directory, and nothing else. */
export function parseCommand(
	argv: readonly string[],
): { command: CommandName; runtime: Runtime; dir: string } | { error: string } {
	const [command, name, dir] = argv;
	if (
		argv.length !== 3 ||
		(command !== "backup" && command !== "restore" && command !== "check") ||
		(name !== "dev" && name !== "production") ||
		dir === undefined ||
		dir === "" ||
		dir.startsWith("-")
	) {
		return { error: USAGE };
	}
	return { command, runtime: RUNTIMES[name], dir };
}

/**
 * Why the command stops, given `systemctl --user is-active` of the app's service, or nothing when
 * the service is stopped. The database and the media are one state only while nobody writes, and
 * the Operator stops and starts the app (#221 decisions 6 and 14).
 */
export function appStateRefusal(runtime: Runtime, state: string): string | undefined {
	if (state === "inactive" || state === "failed") return undefined;
	const service = runtime.appService;
	if (["active", "activating", "deactivating", "reloading", "refreshing"].includes(state)) {
		return (
			`${service} is ${state}: the database and the media are one state only while it is stopped.\n` +
			`  stop it first:    systemctl --user stop ${service}\n` +
			`  start it after:   systemctl --user start ${service}`
		);
	}
	return `cannot tell whether ${service} runs (systemctl says: ${state || "nothing"}): refusing`;
}

/** The restore keeps the target's marker, so it refuses a media volume without one. */
export function markerRefusal(runtime: Runtime, present: boolean): string | undefined {
	if (present) return undefined;
	return `the media volume ${runtime.mediaVolume} has no ${runtime.mediaMarker}: ${runtime.markerRemedy}`;
}

/** Why the command stops, given `podman container inspect --format {{.State.Running}}` of the db
 * container ("" when it does not exist), or nothing when it runs. */
export function databaseRefusal(runtime: Runtime, running: string): string | undefined {
	if (running === "true") return undefined;
	const state = running === "" ? "does not exist" : "is not running";
	return `the database container ${runtime.dbContainer} ${state}: start ${runtime.dbService} first`;
}

/**
 * What the backup reads of its target directory; isDirectory is undefined when nothing is there.
 */
export interface DirectoryFacts {
	path: string;
	realPath: string;
	isDirectory: boolean | undefined;
	entries: number;
	mode: number;
	uid: number;
	userUid: number;
	volumes: readonly { name: string; mountpoint: string }[];
}

/** Why the backup refuses its directory, or nothing: it takes an existing, empty directory of the
 * Operator's that only they can open, outside the runtime's two volumes. */
export function directoryRefusal(dir: DirectoryFacts): string | undefined {
	const { path } = dir;
	if (dir.isDirectory === undefined) {
		return `${path} does not exist: make it first, mode 0700 (install -d -m 0700 ${path})`;
	}
	if (!dir.isDirectory) return `${path} is not a directory`;
	if (dir.entries > 0) {
		return `${path} is not empty: a Recovery Set goes into an empty directory, and the backup overwrites no file`;
	}
	if (dir.uid !== dir.userUid) return `${path} belongs to another user (uid ${dir.uid})`;
	if ((dir.mode & 0o077) !== 0) {
		const mode = (dir.mode & 0o777).toString(8).padStart(4, "0");
		return `${path} is open to other users (mode ${mode}): chmod 700 ${path} first`;
	}
	const volume = dir.volumes.find(
		({ mountpoint }) => dir.realPath === mountpoint || dir.realPath.startsWith(`${mountpoint}/`),
	);
	if (volume !== undefined) {
		return `${path} is inside the ${volume.name} volume (${volume.mountpoint}): a Recovery Set lives outside the runtime's persistence`;
	}
	return undefined;
}

/** An archive of the set: its fixed file name, size in bytes and SHA-256. */
interface ArchiveEntry {
	file: string;
	size: number;
	sha256: string;
}

/** A table of the public schema: its row count and the SHA-256 of its rows in primary-key order. */
export interface TableEntry {
	name: string;
	rows: number;
	sha256: string;
}

/** A file of the media store, by its path inside the volume. */
export interface MediaEntry {
	path: string;
	size: number;
	sha256: string;
}

/** What a runtime holds, as the backup records it and the integrity check reads it again. */
export interface Holdings {
	tables: readonly TableEntry[];
	/** EmDash's applied migrations, by name (the `_emdash_migrations` table). */
	migrations: readonly string[];
	media: readonly MediaEntry[];
}

const FORMAT = "songhealth-recovery-set/1";
export const MANIFEST_FILE = "manifest.json";
export const DATABASE_FILE = "database.dump";
export const MEDIA_FILE = "media.tar";

/** The manifest: one JSON document, written last, beside the two archives. */
export interface Manifest {
	format: typeof FORMAT;
	runtime: RuntimeName;
	/** The commit (dev) or the pinned image (production) the runtime served. */
	serves: string;
	createdUtc: string;
	versions: { pgDump: string; server: string; emdash: string };
	archives: { database: ArchiveEntry; media: ArchiveEntry };
	database: { tables: TableEntry[]; migrations: string[] };
	media: MediaEntry[];
}

/** Code-unit order, the same on every host (localeCompare follows the host's locale). */
function byCodeUnit(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/** The manifest of what the backup observed, with its lists in code-unit order. */
export function buildManifest(input: {
	runtime: Runtime;
	serves: string;
	createdAt: Date;
	versions: Manifest["versions"];
	archives: Record<"database" | "media", { size: number; sha256: string }>;
	tables: readonly TableEntry[];
	migrations: readonly string[];
	media: readonly MediaEntry[];
}): Manifest {
	return {
		format: FORMAT,
		runtime: input.runtime.name,
		serves: input.serves,
		createdUtc: input.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
		versions: { ...input.versions },
		archives: {
			database: { file: DATABASE_FILE, ...input.archives.database },
			media: { file: MEDIA_FILE, ...input.archives.media },
		},
		database: {
			tables: [...input.tables].sort((a, b) => byCodeUnit(a.name, b.name)),
			migrations: [...input.migrations].sort(byCodeUnit),
		},
		media: [...input.media].sort((a, b) => byCodeUnit(a.path, b.path)),
	};
}

export function serializeManifest(manifest: Manifest): string {
	return `${JSON.stringify(manifest, null, "\t")}\n`;
}

/** The set's size, for the Operator's record: tables, rows and media files. */
/** What a set holds, in one line: its tables, rows, media files and migrations. */
export function describeTotals(manifest: Manifest): string {
	const { tables, rows, mediaFiles } = totals(manifest);
	return `${tables} tables, ${rows} rows, ${mediaFiles} media files, ${manifest.database.migrations.length} migrations`;
}

/** What the integrity check expects a runtime to hold: the set's tables, migrations and media. */
export function recordedHoldings(manifest: Manifest): Holdings {
	return {
		tables: manifest.database.tables,
		migrations: manifest.database.migrations,
		media: manifest.media,
	};
}

export function totals(manifest: Manifest): { tables: number; rows: number; mediaFiles: number } {
	return {
		tables: manifest.database.tables.length,
		rows: manifest.database.tables.reduce((sum, table) => sum + table.rows, 0),
		mediaFiles: manifest.media.length,
	};
}

class GrammarError extends Error {}

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT_ID = /^[0-9a-f]{40}$/;
const PINNED_IMAGE = /^[a-z0-9][a-z0-9._/:-]*@sha256:[0-9a-f]{64}$/;
const UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/;
const MIGRATION_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,199}$/;
/** A media path's segment: the characters the archive's walker admits (walkUstar). */
const PATH_SEGMENT = /^[A-Za-z0-9._ -]+$/;
const VERSION = /^[\x20-\x7e]{1,200}$/;

/** A path inside the media store: relative, never climbing, of the characters an archive admits. */
function isStorePath(path: string): boolean {
	return path
		.split("/")
		.every((segment) => segment !== "." && segment !== ".." && PATH_SEGMENT.test(segment));
}

function record(value: unknown, at: string, keys: readonly string[]): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new GrammarError(`${at} is not an object`);
	}
	const unknown = Object.keys(value).filter((key) => !keys.includes(key));
	if (unknown.length > 0)
		throw new GrammarError(`${at} has a key it does not know: ${unknown.join(", ")}`);
	const missing = keys.filter((key) => !(key in value));
	if (missing.length > 0) throw new GrammarError(`${at} lacks ${missing.join(", ")}`);
	return value as Record<string, unknown>;
}

function text(value: unknown, at: string, pattern: RegExp, what: string): string {
	if (typeof value !== "string" || !pattern.test(value))
		throw new GrammarError(`${at} is not ${what}`);
	return value;
}

function count(value: unknown, at: string, what: string): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
		throw new GrammarError(`${at} is not ${what}`);
	}
	return value;
}

function list<T>(
	value: unknown,
	at: string,
	item: (value: unknown, at: string) => T,
	key: (item: T) => string,
): T[] {
	if (!Array.isArray(value)) throw new GrammarError(`${at} is not a list`);
	const items = value.map((each, index) => item(each, `${at}[${index}]`));
	const ordered = items.every(
		(each, index) => index === 0 || byCodeUnit(key(items[index - 1]!), key(each)) < 0,
	);
	if (!ordered) throw new GrammarError(`${at} is not in order, or names one twice`);
	return items;
}

function archive(value: unknown, at: string, file: string): ArchiveEntry {
	const entry = record(value, at, ["file", "size", "sha256"]);
	if (entry.file !== file) throw new GrammarError(`${at}.file is not ${file}`);
	return {
		file,
		size: count(entry.size, `${at}.size`, "a size in bytes"),
		sha256: text(entry.sha256, `${at}.sha256`, SHA256, "a SHA-256"),
	};
}

function readManifest(value: unknown): Manifest {
	const top = record(value, "manifest", [
		"format",
		"runtime",
		"serves",
		"createdUtc",
		"versions",
		"archives",
		"database",
		"media",
	]);
	if (top.format !== FORMAT) throw new GrammarError(`manifest.format is not ${FORMAT}`);
	if (top.runtime !== "dev" && top.runtime !== "production") {
		throw new GrammarError("manifest.runtime is neither dev nor production");
	}
	const runtime = RUNTIMES[top.runtime];
	const serves =
		runtime.serves.kind === "marker"
			? text(top.serves, "manifest.serves", COMMIT_ID, "a dev commit (40 hex digits)")
			: text(top.serves, "manifest.serves", PINNED_IMAGE, "a production image pinned by digest");
	const versions = record(top.versions, "manifest.versions", ["pgDump", "server", "emdash"]);
	const archives = record(top.archives, "manifest.archives", ["database", "media"]);
	const database = record(top.database, "manifest.database", ["tables", "migrations"]);
	return {
		format: FORMAT,
		runtime: runtime.name,
		serves,
		createdUtc: text(top.createdUtc, "manifest.createdUtc", UTC_SECOND, "a UTC time to the second"),
		versions: {
			pgDump: text(versions.pgDump, "manifest.versions.pgDump", VERSION, "a version"),
			server: text(versions.server, "manifest.versions.server", VERSION, "a version"),
			emdash: text(versions.emdash, "manifest.versions.emdash", VERSION, "a version"),
		},
		archives: {
			database: archive(archives.database, "manifest.archives.database", DATABASE_FILE),
			media: archive(archives.media, "manifest.archives.media", MEDIA_FILE),
		},
		database: {
			tables: list(
				database.tables,
				"manifest.database.tables",
				(each, at) => {
					const table = record(each, at, ["name", "rows", "sha256"]);
					return {
						name: text(table.name, `${at}.name`, TABLE_NAME, "a table's name"),
						rows: count(table.rows, `${at}.rows`, "a row count"),
						sha256: text(table.sha256, `${at}.sha256`, SHA256, "a SHA-256"),
					};
				},
				(table) => table.name,
			),
			migrations: list(
				database.migrations,
				"manifest.database.migrations",
				(each, at) => text(each, at, MIGRATION_NAME, "a migration's name"),
				(name) => name,
			),
		},
		media: list(
			top.media,
			"manifest.media",
			(each, at) => {
				const file = record(each, at, ["path", "size", "sha256"]);
				if (file.path === runtime.mediaMarker) {
					throw new GrammarError(`${at}.path is the store's marker, which no set holds`);
				}
				if (typeof file.path !== "string" || !isStorePath(file.path)) {
					throw new GrammarError(`${at}.path is not a path inside the media store`);
				}
				return {
					path: file.path,
					size: count(file.size, `${at}.size`, "a size in bytes"),
					sha256: text(file.sha256, `${at}.sha256`, SHA256, "a SHA-256"),
				};
			},
			(file) => file.path,
		),
	};
}

/** The manifest, or what in it is out of grammar. */
export function parseManifest(json: string): { manifest: Manifest } | { error: string } {
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch {
		return { error: "the manifest is not JSON" };
	}
	try {
		return { manifest: readManifest(value) };
	} catch (error) {
		if (error instanceof GrammarError) return { error: error.message };
		throw error;
	}
}

/** Each name of two keyed lists, in code-unit order, with its entry in each. */
function pairs<T>(set: readonly T[], runtime: readonly T[], key: (item: T) => string) {
	const inSet = new Map(set.map((item) => [key(item), item]));
	const inRuntime = new Map(runtime.map((item) => [key(item), item]));
	return [...new Set([...inSet.keys(), ...inRuntime.keys()])]
		.sort(byCodeUnit)
		.map((name) => ({ name, set: inSet.get(name), runtime: inRuntime.get(name) }));
}

/** The two sides a comparison names, such as "the set" and "the runtime". */
export type Sides = readonly [string, string];

function presence(
	kind: string,
	name: string,
	a: unknown,
	b: unknown,
	[one, other]: Sides,
): string | undefined {
	if (b === undefined) return `${kind} ${name}: in ${one}, not in ${other}`;
	if (a === undefined) return `${kind} ${name}: in ${other}, not in ${one}`;
	return undefined;
}

/** Each media file in one list and not the other, or with another size or content, by path. */
export function mediaDifferences(
	a: readonly MediaEntry[],
	b: readonly MediaEntry[],
	sides: Sides,
): string[] {
	return pairs(a, b, (file) => file.path).flatMap(({ name, set: one, runtime: other }) => {
		const absent = presence("media", name, one, other, sides);
		if (absent !== undefined) return [absent];
		if (one!.size !== other!.size)
			return [`media ${name}: ${one!.size} bytes in ${sides[0]}, ${other!.size} in ${sides[1]}`];
		if (one!.sha256 !== other!.sha256)
			return [`media ${name}: its content differs from ${sides[0]}'s`];
		return [];
	});
}

/**
 * The integrity check: each difference between what a set recorded and what a runtime holds, by
 * table, migration or media path. A line names counts and sizes only, never a row's content.
 */
export function compareHoldings(set: Holdings, runtime: Holdings): string[] {
	const sides: Sides = ["the set", "the runtime"];
	const tables = pairs(set.tables, runtime.tables, (table) => table.name).flatMap(
		({ name, set: a, runtime: b }) => {
			const absent = presence("table", name, a, b, sides);
			if (absent !== undefined) return [absent];
			if (a!.rows !== b!.rows)
				return [`table ${name}: ${a!.rows} rows in the set, ${b!.rows} in the runtime`];
			if (a!.sha256 !== b!.sha256) return [`table ${name}: its rows differ from the set's`];
			return [];
		},
	);
	const migrations = pairs(set.migrations, runtime.migrations, (name) => name).flatMap(
		({ name, set: a, runtime: b }) => {
			const absent = presence("migration", name, a, b, sides);
			return absent === undefined ? [] : [absent];
		},
	);
	return [...tables, ...migrations, ...mediaDifferences(set.media, runtime.media, sides)];
}

/** An archive of the set as the restore read it: its size and SHA-256. */
export interface ReadArchive {
	size: number;
	sha256: string;
}

const SET_FILES = [MANIFEST_FILE, DATABASE_FILE, MEDIA_FILE];

function archiveRefusal(file: string, read: ReadArchive, entry: ArchiveEntry): string | undefined {
	if (read.size !== entry.size)
		return `${file} is ${read.size} bytes, and the manifest says ${entry.size}`;
	if (read.sha256 !== entry.sha256) return `${file} does not match its SHA-256 in the manifest`;
	return undefined;
}

/**
 * The restore's admission of a whole set, before it changes anything: the set's three files and no
 * other, the manifest's grammar, the target's runtime and what it serves now, both archives' sizes
 * and SHA-256, and a media archive the walker admits, holding the manifest's files exactly.
 * A set restores only the runtime it came from, while that runtime serves what it served then
 * (#221 decision 12; comment 7152073609 item 1).
 */
export function admitSet(set: {
	target: Runtime;
	serves: string;
	entries: readonly string[];
	manifestText: string | undefined;
	database: ReadArchive | undefined;
	media: (ReadArchive & { walk: ReturnType<typeof walkUstar> }) | undefined;
}): { manifest: Manifest } | { error: string } {
	const lacking = SET_FILES.find((file) => !set.entries.includes(file));
	if (lacking !== undefined) return { error: `the set is incomplete: it lacks ${lacking}` };
	const extra = set.entries.filter((entry) => !SET_FILES.includes(entry));
	if (extra.length > 0)
		return { error: `the set holds a file a Recovery Set does not: ${extra.join(", ")}` };
	if (set.manifestText === undefined || set.database === undefined || set.media === undefined) {
		return { error: "the set is incomplete: a file could not be read" };
	}
	const parsed = parseManifest(set.manifestText);
	if ("error" in parsed) return parsed;
	const { manifest } = parsed;
	const target = set.target.name;
	if (manifest.runtime !== target) {
		return {
			error: `the set is ${manifest.runtime}'s, and this restores ${target}: a Recovery Set restores only the runtime it came from`,
		};
	}
	if (manifest.serves !== set.serves) {
		return {
			error: `the set was taken while ${target} served ${manifest.serves}, and it serves ${set.serves} now: point the runtime back at ${manifest.serves} first`,
		};
	}
	const archive =
		archiveRefusal(DATABASE_FILE, set.database, manifest.archives.database) ??
		archiveRefusal(MEDIA_FILE, set.media, manifest.archives.media);
	if (archive !== undefined) return { error: archive };
	if ("error" in set.media.walk) return { error: set.media.walk.error };
	const differences = mediaDifferences(manifest.media, set.media.walk.files, [
		"the manifest",
		"the archive",
	]);
	if (differences.length > 0) {
		return { error: `the media archive differs from the manifest: ${differences.join("; ")}` };
	}
	return { manifest };
}

const BLOCK = 512;
const CHUNK = 1 << 20;
const decoder = new TextDecoder("latin1");

/** The typeflags an archive may not hold, by name: a set holds plain files and directories only. */
const REFUSED_TYPES: Record<string, string> = {
	"1": "a hard link",
	"2": "a symlink",
	"3": "a character device",
	"4": "a block device",
	"6": "a FIFO",
	"7": "a contiguous file",
	g: "a PAX global header",
	x: "a PAX header",
	L: "a GNU long name",
	K: "a GNU long link name",
};

class ArchiveError extends Error {}

/** A strict octal field: digits, then a NUL, then nothing but NUL or space to its end. */
function octalField(
	header: Uint8Array,
	offset: number,
	width: number,
	what: string,
	at: number,
): number {
	const raw = header.subarray(offset, offset + width);
	const nul = raw.indexOf(0);
	const head = nul < 0 ? raw : raw.subarray(0, nul);
	const tail = nul < 0 ? new Uint8Array(0) : raw.subarray(nul + 1);
	const digits = decoder.decode(head).trim();
	if (tail.some((byte) => byte !== 0 && byte !== 0x20) || !/^[0-7]+$/.test(digits)) {
		throw new ArchiveError(`the media archive's header at ${at} has a malformed ${what}`);
	}
	return Number.parseInt(digits, 8);
}

function cString(bytes: Uint8Array): string {
	const nul = bytes.indexOf(0);
	return decoder.decode(nul < 0 ? bytes : bytes.subarray(0, nul));
}

function isZero(block: Uint8Array): boolean {
	return block.every((byte) => byte === 0);
}

/**
 * The files and directories of a media archive, each file with its size and SHA-256, read through
 * `read(offset, length)`. It admits only what `tar --format=ustar -C <store> .` writes for plain
 * files and directories, with names inside the store, and refuses anything else: links, devices,
 * PAX and GNU extension headers, other formats, bad checksums and numbers, unsafe or repeated
 * names, cut-off payloads and trailing bytes.
 */
export function walkUstar(
	size: number,
	read: (offset: number, length: number) => Uint8Array,
	sha256: () => { update(data: Uint8Array): void; digest(): string },
): { files: MediaEntry[] } | { error: string } {
	const files: MediaEntry[] = [];
	const seen = new Set<string>();
	try {
		if (size === 0 || size % BLOCK !== 0) {
			throw new ArchiveError("the media archive is not a whole number of 512-byte blocks");
		}
		let at = 0;
		while (at < size) {
			const header = read(at, BLOCK);
			if (isZero(header)) {
				if (at + BLOCK >= size)
					throw new ArchiveError("the media archive lacks its two end blocks");
				if (!isZero(read(at + BLOCK, BLOCK)))
					throw new ArchiveError("the media archive has one end block, then more");
				for (let rest = at + 2 * BLOCK; rest < size; rest += CHUNK) {
					if (!isZero(read(rest, Math.min(CHUNK, size - rest)))) {
						throw new ArchiveError("the media archive has bytes after its end");
					}
				}
				return { files };
			}
			if (decoder.decode(header.subarray(257, 265)) !== "ustar\u000000") {
				throw new ArchiveError(`the media archive is not POSIX ustar (block at ${at})`);
			}
			octalField(header, 100, 8, "mode", at);
			octalField(header, 108, 8, "uid", at);
			octalField(header, 116, 8, "gid", at);
			octalField(header, 136, 12, "mtime", at);
			const stored = octalField(header, 148, 8, "checksum", at);
			const sum = header.reduce(
				(total, byte, index) => total + (index >= 148 && index < 156 ? 0x20 : byte),
				0,
			);
			if (stored !== sum)
				throw new ArchiveError(`the media archive's header at ${at} fails its checksum`);
			const prefix = cString(header.subarray(345, 500));
			const raw = cString(header.subarray(0, 100));
			const name = prefix === "" ? raw : `${prefix}/${raw}`;
			const type = String.fromCharCode(header[156]!);
			if (REFUSED_TYPES[type] !== undefined || !["0", "\0", "5"].includes(type)) {
				const what = REFUSED_TYPES[type] ?? `an entry of type ${JSON.stringify(type)}`;
				throw new ArchiveError(
					`the media archive holds ${name}, ${what}: it admits plain files and directories only`,
				);
			}
			const path = name.replace(/^(\.\/)+/, "").replace(/\/$/, "");
			const isRoot = type === "5" && (path === "" || path === ".");
			if (raw === "" || (!isRoot && !isStorePath(path))) {
				throw new ArchiveError(
					`the media archive names ${name}, which is no path inside the media store`,
				);
			}
			const length = octalField(header, 124, 12, "size", at);
			if (type === "5" && length !== 0)
				throw new ArchiveError(`the media archive's directory ${name} has a size`);
			if (!isRoot) {
				if (seen.has(path)) throw new ArchiveError(`the media archive names ${path} twice`);
				seen.add(path);
			}
			at += BLOCK;
			const end = at + Math.ceil(length / BLOCK) * BLOCK;
			if (end > size) throw new ArchiveError(`the media archive is cut off inside ${name}`);
			if (type !== "5") {
				const hash = sha256();
				for (let offset = 0; offset < length; offset += CHUNK) {
					hash.update(read(at + offset, Math.min(CHUNK, length - offset)));
				}
				files.push({ path, size: length, sha256: hash.digest() });
			}
			at = end;
		}
		throw new ArchiveError("the media archive lacks its two end blocks");
	} catch (error) {
		if (error instanceof ArchiveError) return { error: error.message };
		throw error;
	}
}

/** The reads of a media store, by path in the store ("" for its root). */
export interface StoreReads {
	names(dir: string): readonly string[];
	/** What `lstat` says the path is: a link or a special file is "other". */
	kind(path: string): "file" | "directory" | "other";
	digest(path: string): { size: number; sha256: string };
}

/**
 * Every file of a media store but the marker at its root, with its size and SHA-256, in code-unit
 * order of its path. It refuses a
 * link, a special file and a name a set cannot hold, as the walker refuses them in an archive.
 */
export function listStore(
	marker: string,
	reads: StoreReads,
): { files: MediaEntry[] } | { error: string } {
	const files: MediaEntry[] = [];
	const visit = (dir: string): string | undefined => {
		for (const name of reads.names(dir)) {
			const path = dir === "" ? name : `${dir}/${name}`;
			if (path === marker) continue;
			if (!isStorePath(path))
				return `media ${JSON.stringify(path)} has a name a Recovery Set cannot hold`;
			const kind = reads.kind(path);
			if (kind === "directory") {
				const inner = visit(path);
				if (inner !== undefined) return inner;
			} else if (kind === "file") {
				files.push({ path, ...reads.digest(path) });
			} else {
				return `media ${path} is neither a file nor a directory`;
			}
		}
		return undefined;
	};
	const error = visit("");
	return error === undefined
		? { files: files.sort((a, b) => byCodeUnit(a.path, b.path)) }
		: { error };
}

/** A line that quotes a row: PostgreSQL's DETAIL or CONTEXT, alone or after a tool's name. */
const QUOTES_A_ROW = /^\s*(?:[\w.-]+:\s+)?(?:detail|context):/i;
/** A line that starts a message of its own, where a DETAIL's or CONTEXT's further lines end. */
const STARTS_A_MESSAGE =
	/^(?:pg_restore|pg_dump|psql|tar|find|rm|cat|podman|Error|ERROR|WARNING|NOTICE|HINT|FATAL|PANIC|LOG|STATEMENT)\b/;

/**
 * The last lines of a failed command's standard error for the Operator, without what can quote a
 * row's values: PostgreSQL's DETAIL and CONTEXT lines with their further lines (a failing COPY's
 * column, a failing row), and a value an error quotes after a colon, as in `for type integer: "…"`.
 */
export function errorTail(stderr: string, lines = 8): string[] {
	const kept: string[] = [];
	let dropping = false;
	for (const line of stderr.trim().split("\n")) {
		if (QUOTES_A_ROW.test(line)) dropping = true;
		else if (STARTS_A_MESSAGE.test(line)) dropping = false;
		if (!dropping) kept.push(line.replace(/: "(?:[^"\\]|\\.)*"/g, ': "…"'));
	}
	return kept.slice(-lines);
}

/** The command's exit codes: a refusal changes nothing, nor does a check that finds a difference;
 * a failure after the reset began leaves the target partial, which the Operator must tell apart. */
export const EXIT = { ok: 0, refused: 1, partial: 3 } as const;

/** What a failure after the reset began tells the Operator. */
export function partialTarget(runtime: Runtime, setDir: string): string {
	return (
		`the ${runtime.name} runtime is partial now: keep ${runtime.appService} stopped, and restore it from ${setDir} again ` +
		"(or from the Recovery Set taken before it)"
	);
}

const ROLE_NAME = /^[A-Za-z0-9_]+$/;

/**
 * The database and its administrator, from `printenv POSTGRES_DB POSTGRES_USER` in the db
 * container.
 */
export function parseDatabaseNames(
	output: string,
): { database: string; admin: string } | { error: string } {
	const lines = output.split("\n");
	if (
		lines.length === 3 &&
		lines[2] === "" &&
		ROLE_NAME.test(lines[0]!) &&
		ROLE_NAME.test(lines[1]!)
	) {
		return { database: lines[0]!, admin: lines[1]! };
	}
	return {
		error:
			"the db container's POSTGRES_DB and POSTGRES_USER are not two names of letters, digits and underscores",
	};
}

/** The app role, from the PGUSER lines a `grep '^PGUSER='` of the app's environment file printed:
 * the command never reads the file itself, which holds PGPASSWORD too. */
export function parseAppRole(lines: string, file: string): string | { error: string } {
	const role = lines.startsWith("PGUSER=") && lines.endsWith("\n") ? lines.slice(7, -1) : "";
	if (ROLE_NAME.test(role)) return role;
	return {
		error: `${file} does not hold one unquoted PGUSER=<role> line of letters, digits and underscores`,
	};
}

/** What the runtime serves: the commit in dev's marker, or the image production's app unit pins. */
export function parseServes(runtime: Runtime, text: string): string | { error: string } {
	if (runtime.serves.kind === "marker") {
		const commit = text.endsWith("\n") ? text.slice(0, -1) : "";
		if (COMMIT_ID.test(commit)) return commit;
		return { error: `${runtime.serves.path} is not one 40-hex commit and a newline` };
	}
	const images = text
		.split("\n")
		.flatMap((line) => (line.startsWith("Image=") ? [line.slice(6)] : []));
	if (images.length === 1 && PINNED_IMAGE.test(images[0]!)) return images[0]!;
	return { error: `${runtime.serves.path} does not pin one image by digest` };
}

/** The tables' digests, from the query's `<table>|<rows>|<SHA-256>` lines. */
export function parseTableDigests(output: string): TableEntry[] | { error: string } {
	const tables: TableEntry[] = [];
	for (const line of output.split("\n")) {
		if (line === "") continue;
		const [name = "", rows = "", digest = "", ...rest] = line.split("|");
		if (rest.length > 0 || !TABLE_NAME.test(name) || !/^\d+$/.test(rows) || !SHA256.test(digest)) {
			return { error: "the database's table digests are not lines of <table>|<rows>|<SHA-256>" };
		}
		tables.push({ name, rows: Number(rows), sha256: digest });
	}
	return tables;
}
