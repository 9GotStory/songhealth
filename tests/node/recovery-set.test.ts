// The Recovery Set's planning module (#221): scripts/recovery-set/plan.ts, which
// scripts/recovery-set.ts runs for its backup, restore and integrity check of either runtime.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

/** A SHA-256 of 64 hex digits that starts with the given digit. */
const sha = (digit: string): string => digit.repeat(64);
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const IMAGE = `localhost/songhealth-app:0.0.1@sha256:${sha("4")}`;

/** The observations of a small dev runtime, as the backup gathers them. */
function observed() {
	return {
		runtime: RUNTIMES.dev,
		serves: COMMIT,
		createdAt: new Date("2026-11-25T10:20:30.456Z"),
		versions: {
			pgDump: "pg_dump (PostgreSQL) 18.6 (Debian 18.6-1.pgdg13+2)",
			server: "18.6 (Debian 18.6-1.pgdg13+2)",
			emdash: "1.1.0",
		},
		archives: {
			database: { size: 4096, sha256: sha("a") },
			media: { size: 10240, sha256: sha("b") },
		},
		tables: [
			{ name: "media", rows: 2, sha256: sha("c") },
			{ name: "_emdash_migrations", rows: 91, sha256: sha("d") },
			{ name: "ec_news", rows: 0, sha256: sha("e") },
		],
		migrations: ["002_media", "001_initial"],
		media: [
			{ path: "a.png", size: 31700, sha256: sha("1") },
			{ path: "Z.pdf", size: 12577, sha256: sha("2") },
			{ path: "2026/11/x.jpg", size: 1, sha256: sha("3") },
		],
	};
}

import {
	admitSet,
	appStateRefusal,
	databaseRefusal,
	describeTotals,
	buildManifest,
	compareHoldings,
	directoryRefusal,
	errorTail,
	EXIT,
	listStore,
	markerRefusal,
	mediaDifferences,
	parseAppRole,
	parseCommand,
	parseDatabaseNames,
	parseManifest,
	parseServes,
	parseTableDigests,
	partialTarget,
	RUNTIMES,
	serializeManifest,
	totals,
	type StoreReads,
	walkUstar,
} from "../../scripts/recovery-set/plan.ts";

describe("the runtime map", () => {
	it("maps dev to the songhealth-qdev resources and production to the production Quadlet's units", () => {
		assert.deepEqual(RUNTIMES, {
			dev: {
				name: "dev",
				dbContainer: "songhealth-qdev-db",
				dbService: "songhealth-dev-db.service",
				dbVolume: "songhealth-qdev-db-data",
				mediaVolume: "songhealth-qdev-media",
				appService: "songhealth-dev-app.service",
				mediaMarker: ".songhealth-qdev-media-store",
				markerRemedy:
					"create it as dev-runtime-install.sh does for a new store, " +
					"podman unshare touch <the volume's mountpoint>/.songhealth-qdev-media-store, then restore again " +
					'(development-quadlet.md "Backup and restore")',
				appRole: { kind: "fixed", name: "songhealth_qdev_app" },
				serves: { kind: "marker", path: "dev/songhealth-quadlet/.songhealth-qdev-source-identity" },
				emdash: {
					kind: "checkout",
					path: "dev/songhealth-quadlet/node_modules/emdash/package.json",
				},
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
					"provision the store first (production-foundation.md §5.3), then restore again",
				appRole: { kind: "env-file", path: ".config/containers/systemd/songhealth-app.env" },
				serves: { kind: "unit-image", path: ".config/containers/systemd/songhealth-app.container" },
				emdash: { kind: "image" },
			},
		});
	});

	it("takes production's app role from its configuration and dev's from the dev units", () => {
		assert.deepEqual(RUNTIMES.production.appRole, {
			kind: "env-file",
			path: ".config/containers/systemd/songhealth-app.env",
		});
		assert.deepEqual(RUNTIMES.dev.appRole, { kind: "fixed", name: "songhealth_qdev_app" });
	});
});

describe("parseCommand", () => {
	it("takes a command, a runtime's name and a directory", () => {
		const command = parseCommand(["backup", "dev", "/var/backups/set"]);
		assert.deepEqual(command, {
			command: "backup",
			runtime: RUNTIMES.dev,
			dir: "/var/backups/set",
		});
		assert.deepEqual(parseCommand(["restore", "production", "set"]), {
			command: "restore",
			runtime: RUNTIMES.production,
			dir: "set",
		});
		assert.deepEqual(parseCommand(["check", "dev", "set"]), {
			command: "check",
			runtime: RUNTIMES.dev,
			dir: "set",
		});
	});

	it("refuses any other runtime, command or argument, so nothing else names a resource", () => {
		const refused = [
			[],
			["backup"],
			["backup", "dev"],
			["backup", "songhealth-qdev-db", "set"],
			["backup", "Dev", "set"],
			["dump", "dev", "set"],
			["backup", "dev", "set", "songhealth-media"],
			["backup", "dev", "--volume=songhealth-media"],
			["backup", "dev", ""],
		].map((argv) => [argv.join(" "), "error" in parseCommand(argv)]);
		assert.deepEqual(
			refused,
			refused.map(([argv]) => [argv, true]),
		);
	});
});

describe("appStateRefusal", () => {
	it("refuses while the app's service runs, and names the stop command and the start for afterwards", () => {
		assert.equal(
			appStateRefusal(RUNTIMES.production, "active"),
			"songhealth-app.service is active: the database and the media are one state only while it is stopped.\n" +
				"  stop it first:    systemctl --user stop songhealth-app.service\n" +
				"  start it after:   systemctl --user start songhealth-app.service",
		);
		const seen = ["activating", "deactivating", "reloading", "refreshing"].map((state) =>
			appStateRefusal(RUNTIMES.dev, state)?.startsWith(`songhealth-dev-app.service is ${state}:`),
		);
		assert.deepEqual(seen, [true, true, true, true]);
	});

	it("goes on when the service is stopped or failed", () => {
		assert.deepEqual(
			["inactive", "failed"].map((state) => appStateRefusal(RUNTIMES.dev, state)),
			[undefined, undefined],
		);
	});

	it("refuses when systemd cannot tell", () => {
		assert.equal(
			appStateRefusal(RUNTIMES.dev, ""),
			"cannot tell whether songhealth-dev-app.service runs (systemctl says: nothing): refusing",
		);
	});
});

describe("databaseRefusal", () => {
	it("needs the db container running", () => {
		assert.deepEqual(
			["true", "false", ""].map((running) => databaseRefusal(RUNTIMES.production, running)),
			[
				undefined,
				"the database container systemd-songhealth-db is not running: start songhealth-db.service first",
				"the database container systemd-songhealth-db does not exist: start songhealth-db.service first",
			],
		);
	});
});

describe("directoryRefusal", () => {
	const fit = {
		path: "/home/op/sets/one",
		realPath: "/home/op/sets/one",
		isDirectory: true,
		entries: 0,
		mode: 0o700,
		uid: 1000,
		userUid: 1000,
		volumes: [
			{
				name: "songhealth-media",
				mountpoint: "/home/op/.local/share/containers/storage/volumes/songhealth-media/_data",
			},
			{
				name: "songhealth-db-data",
				mountpoint: "/home/op/.local/share/containers/storage/volumes/songhealth-db-data/_data",
			},
		],
	};

	it("takes an existing, empty, owner-only directory of the Operator's outside both volumes", () => {
		assert.equal(directoryRefusal(fit), undefined);
	});

	it("refuses a missing, non-empty, shared or foreign directory, or one inside a volume, and says why", () => {
		const media = fit.volumes[0]!.mountpoint;
		const seen = [
			directoryRefusal({ ...fit, isDirectory: undefined }),
			directoryRefusal({ ...fit, isDirectory: false }),
			directoryRefusal({ ...fit, entries: 1 }),
			directoryRefusal({ ...fit, uid: 0 }),
			directoryRefusal({ ...fit, mode: 0o750 }),
			directoryRefusal({ ...fit, mode: 0o701 }),
			directoryRefusal({ ...fit, realPath: media }),
			directoryRefusal({ ...fit, realPath: `${media}/sets` }),
			directoryRefusal({ ...fit, realPath: `${media}-old/sets` }),
		];
		assert.deepEqual(seen, [
			"/home/op/sets/one does not exist: make it first, mode 0700 (install -d -m 0700 /home/op/sets/one)",
			"/home/op/sets/one is not a directory",
			"/home/op/sets/one is not empty: a Recovery Set goes into an empty directory, and the backup overwrites no file",
			"/home/op/sets/one belongs to another user (uid 0)",
			"/home/op/sets/one is open to other users (mode 0750): chmod 700 /home/op/sets/one first",
			"/home/op/sets/one is open to other users (mode 0701): chmod 700 /home/op/sets/one first",
			`/home/op/sets/one is inside the songhealth-media volume (${media}): a Recovery Set lives outside the runtime's persistence`,
			`/home/op/sets/one is inside the songhealth-media volume (${media}): a Recovery Set lives outside the runtime's persistence`,
			undefined,
		]);
	});
});

describe("buildManifest", () => {
	it("records the runtime, what it serves, the time, the versions, both archives, every table, the migrations and every media file", () => {
		assert.deepEqual(buildManifest(observed()), {
			format: "songhealth-recovery-set/1",
			runtime: "dev",
			serves: COMMIT,
			createdUtc: "2026-11-25T10:20:30Z",
			versions: {
				pgDump: "pg_dump (PostgreSQL) 18.6 (Debian 18.6-1.pgdg13+2)",
				server: "18.6 (Debian 18.6-1.pgdg13+2)",
				emdash: "1.1.0",
			},
			archives: {
				database: { file: "database.dump", size: 4096, sha256: sha("a") },
				media: { file: "media.tar", size: 10240, sha256: sha("b") },
			},
			database: {
				// Sorted by code unit, never by the host's locale: "Z" before "a", "_" before "e".
				tables: [
					{ name: "_emdash_migrations", rows: 91, sha256: sha("d") },
					{ name: "ec_news", rows: 0, sha256: sha("e") },
					{ name: "media", rows: 2, sha256: sha("c") },
				],
				migrations: ["001_initial", "002_media"],
			},
			media: [
				{ path: "2026/11/x.jpg", size: 1, sha256: sha("3") },
				{ path: "Z.pdf", size: 12577, sha256: sha("2") },
				{ path: "a.png", size: 31700, sha256: sha("1") },
			],
		});
	});

	it("counts its tables, rows and media files, and says so in one line with its migrations", () => {
		assert.deepEqual(totals(buildManifest(observed())), { tables: 3, rows: 93, mediaFiles: 3 });
		assert.equal(
			describeTotals(buildManifest(observed())),
			"3 tables, 93 rows, 3 media files, 2 migrations",
		);
	});
});

describe("parseManifest", () => {
	it("reads back what serializeManifest wrote, for either runtime", () => {
		const dev = buildManifest(observed());
		const production = buildManifest({
			...observed(),
			runtime: RUNTIMES.production,
			serves: IMAGE,
		});
		assert.deepEqual(parseManifest(serializeManifest(dev)), { manifest: dev });
		assert.deepEqual(parseManifest(serializeManifest(production)), { manifest: production });
	});

	it("refuses a manifest out of grammar, and names the field", () => {
		const good = buildManifest(observed());
		const variants: [string, unknown][] = [
			["not JSON", "{"],
			["another format", { ...good, format: "songhealth-recovery-set/2" }],
			["an extra key", { ...good, note: "x" }],
			["a missing key", { ...good, media: undefined }],
			["another runtime's name", { ...good, runtime: "staging" }],
			["an image for dev", { ...good, serves: IMAGE }],
			["a commit for production", { ...good, runtime: "production" }],
			["a time with milliseconds", { ...good, createdUtc: "2026-11-25T10:20:30.456Z" }],
			[
				"an archive under another name",
				{
					...good,
					archives: { ...good.archives, media: { ...good.archives.media, file: "../media.tar" } },
				},
			],
			[
				"a negative size",
				{
					...good,
					archives: { ...good.archives, database: { ...good.archives.database, size: -1 } },
				},
			],
			[
				"a short digest",
				{
					...good,
					database: { ...good.database, tables: [{ name: "media", rows: 1, sha256: "abc" }] },
				},
			],
			[
				"tables out of order",
				{ ...good, database: { ...good.database, tables: [...good.database.tables].reverse() } },
			],
			[
				"a fractional row count",
				{
					...good,
					database: { ...good.database, tables: [{ name: "media", rows: 1.5, sha256: sha("c") }] },
				},
			],
			[
				"a duplicate migration",
				{ ...good, database: { ...good.database, migrations: ["001_initial", "001_initial"] } },
			],
			[
				"a media path that climbs",
				{ ...good, media: [{ path: "../etc/passwd", size: 1, sha256: sha("1") }] },
			],
			[
				"an absolute media path",
				{ ...good, media: [{ path: "/etc/passwd", size: 1, sha256: sha("1") }] },
			],
			[
				"the store's marker as media",
				{ ...good, media: [{ path: ".songhealth-qdev-media-store", size: 1, sha256: sha("1") }] },
			],
			["a duplicate media path", { ...good, media: [good.media[0], good.media[0]] }],
		];
		const seen = variants.map(([what, value]) => {
			const result = parseManifest(typeof value === "string" ? value : JSON.stringify(value));
			return [what, "error" in result ? result.error : "admitted"];
		});
		assert.deepEqual(seen, [
			["not JSON", "the manifest is not JSON"],
			["another format", "manifest.format is not songhealth-recovery-set/1"],
			["an extra key", "manifest has a key it does not know: note"],
			["a missing key", "manifest lacks media"],
			["another runtime's name", "manifest.runtime is neither dev nor production"],
			["an image for dev", "manifest.serves is not a dev commit (40 hex digits)"],
			["a commit for production", "manifest.serves is not a production image pinned by digest"],
			["a time with milliseconds", "manifest.createdUtc is not a UTC time to the second"],
			["an archive under another name", "manifest.archives.media.file is not media.tar"],
			["a negative size", "manifest.archives.database.size is not a size in bytes"],
			["a short digest", "manifest.database.tables[0].sha256 is not a SHA-256"],
			["tables out of order", "manifest.database.tables is not in order, or names one twice"],
			["a fractional row count", "manifest.database.tables[0].rows is not a row count"],
			["a duplicate migration", "manifest.database.migrations is not in order, or names one twice"],
			["a media path that climbs", "manifest.media[0].path is not a path inside the media store"],
			["an absolute media path", "manifest.media[0].path is not a path inside the media store"],
			[
				"the store's marker as media",
				"manifest.media[0].path is the store's marker, which no set holds",
			],
			["a duplicate media path", "manifest.media is not in order, or names one twice"],
		]);
	});
});

describe("compareHoldings", () => {
	const set = buildManifest(observed());
	const holdings = () => ({
		tables: set.database.tables.map((table) => ({ ...table })),
		migrations: [...set.database.migrations],
		media: set.media.map((file) => ({ ...file })),
	});
	const expected = {
		tables: set.database.tables,
		migrations: set.database.migrations,
		media: set.media,
	};

	it("passes a runtime that holds what the set recorded", () => {
		assert.deepEqual(compareHoldings(expected, holdings()), []);
	});

	it("fails a changed row, a missing or an extra table, and names each table", () => {
		const runtime = holdings();
		runtime.tables[2]!.sha256 = sha("f");
		runtime.tables.splice(1, 1);
		runtime.tables.push({ name: "zz_new", rows: 0, sha256: sha("0") });
		runtime.tables[0]!.rows = 90;
		assert.deepEqual(compareHoldings(expected, runtime), [
			"table _emdash_migrations: 91 rows in the set, 90 in the runtime",
			"table ec_news: in the set, not in the runtime",
			"table media: its rows differ from the set's",
			"table zz_new: in the runtime, not in the set",
		]);
	});

	it("fails a different migration state, and names each migration", () => {
		const runtime = holdings();
		runtime.migrations = ["001_initial", "003_menus"];
		assert.deepEqual(compareHoldings(expected, runtime), [
			"migration 002_media: in the set, not in the runtime",
			"migration 003_menus: in the runtime, not in the set",
		]);
	});

	it("fails a missing, an extra or a changed media file, and names each path", () => {
		const runtime = holdings();
		runtime.media.splice(0, 1);
		runtime.media[0]!.size = 12576;
		runtime.media[1]!.sha256 = sha("9");
		runtime.media.push({ path: "zz.png", size: 5, sha256: sha("5") });
		assert.deepEqual(compareHoldings(expected, runtime), [
			"media 2026/11/x.jpg: in the set, not in the runtime",
			"media Z.pdf: 12577 bytes in the set, 12576 in the runtime",
			"media a.png: its content differs from the set's",
			"media zz.png: in the runtime, not in the set",
		]);
	});
});

/** One entry of a POSIX ustar archive, as GNU tar --format=ustar writes it. */
interface UstarEntry {
	name: string;
	data?: string;
	/** The typeflag: "0" a file, "5" a directory, "2" a symlink, "x" a PAX header… */
	type?: string;
	prefix?: string;
	/** Overrides of raw header bytes, by offset, applied before the checksum. */
	patch?: Record<number, string>;
	/** A checksum to write instead of the right one. */
	checksum?: number;
}

function field(header: Uint8Array, offset: number, value: string): void {
	header.set(new TextEncoder().encode(value), offset);
}

function octal(value: number, width: number): string {
	return `${value.toString(8).padStart(width - 1, "0")}\0`;
}

/** A ustar archive of the entries, ending in its two zero blocks. */
function ustar(entries: readonly UstarEntry[], end = new Uint8Array(1024)): Uint8Array {
	const blocks: Uint8Array[] = [];
	for (const entry of entries) {
		const data = new TextEncoder().encode(entry.data ?? "");
		const header = new Uint8Array(512);
		field(header, 0, entry.name);
		field(header, 100, octal(0o644, 8));
		field(header, 108, octal(1000, 8));
		field(header, 116, octal(1000, 8));
		field(header, 124, octal(data.length, 12));
		field(header, 136, octal(1764066030, 12));
		field(header, 148, "        ");
		field(header, 156, entry.type ?? "0");
		field(header, 257, "ustar\0");
		field(header, 263, "00");
		field(header, 345, entry.prefix ?? "");
		for (const [offset, value] of Object.entries(entry.patch ?? {}))
			field(header, Number(offset), value);
		const sum = header.reduce((total, byte) => total + byte, 0);
		field(header, 148, `${(entry.checksum ?? sum).toString(8).padStart(6, "0")}\0 `);
		const payload = new Uint8Array(Math.ceil(data.length / 512) * 512);
		payload.set(data);
		blocks.push(header, payload);
	}
	blocks.push(end);
	const archive = new Uint8Array(blocks.reduce((size, block) => size + block.length, 0));
	let at = 0;
	for (const block of blocks) {
		archive.set(block, at);
		at += block.length;
	}
	return archive;
}

function concat(...parts: Uint8Array[]): Uint8Array {
	const whole = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
	parts.reduce((at, part) => (whole.set(part, at), at + part.length), 0);
	return whole;
}

function walk(archive: Uint8Array) {
	return walkUstar(
		archive.length,
		(offset, length) => archive.subarray(offset, offset + length),
		() => {
			const hash = createHash("sha256");
			return { update: (data) => void hash.update(data), digest: () => hash.digest("hex") };
		},
	);
}

const sha256Of = (text: string) => createHash("sha256").update(text).digest("hex");

describe("walkUstar", () => {
	it("reads each file's path, size and SHA-256 as tar -C <store> . names it", () => {
		const big = "x".repeat(1300);
		const archive = ustar([
			{ name: "./", type: "5" },
			{ name: "./a.png", data: "png" },
			{ name: "./2026/", type: "5" },
			{ name: "./2026/big file.pdf", data: big },
			{ name: "x.jpg", prefix: "./2026/11", data: "" },
		]);
		assert.deepEqual(walk(archive), {
			files: [
				{ path: "a.png", size: 3, sha256: sha256Of("png") },
				{ path: "2026/big file.pdf", size: 1300, sha256: sha256Of(big) },
				{ path: "2026/11/x.jpg", size: 0, sha256: sha256Of("") },
			],
		});
	});

	it("refuses every entry that is not a plain file or directory, and every malformed archive", () => {
		const file = { name: "./a.png", data: "png" };
		const variants: [string, Uint8Array][] = [
			["a symlink", ustar([{ name: "./link", type: "2" }])],
			["a hard link", ustar([{ name: "./link", type: "1" }])],
			["a PAX header", ustar([{ name: "./PaxHeaders/a", type: "x" }, file])],
			["a GNU long name", ustar([{ name: "././@LongLink", type: "L" }, file])],
			["a FIFO", ustar([{ name: "./fifo", type: "6" }])],
			["a name that climbs", ustar([{ name: "./../a.png", data: "x" }])],
			["an absolute name", ustar([{ name: "/etc/passwd", data: "x" }])],
			["a name of other characters", ustar([{ name: "./a;b.png", data: "x" }])],
			["a name given twice", ustar([file, file])],
			["another format", ustar([{ ...file, patch: { 257: "ustar ", 263: " \0" } }])],
			["a wrong checksum", ustar([{ ...file, checksum: 1 }])],
			["a size that is not octal", ustar([{ ...file, patch: { 124: "0000000009\0" } }])],
			["bytes after a numeric field's end", ustar([{ ...file, patch: { 100: "0644\0x" } }])],
			["a directory with a size", ustar([{ name: "./d/", type: "5", data: "x" }])],
			["a cut-off payload", ustar([{ name: "./a.png", data: "x".repeat(600) }]).subarray(0, 1024)],
			["no end blocks", ustar([file], new Uint8Array(0))],
			[
				"one end block, then data",
				concat(ustar([file], new Uint8Array(512)), ustar([{ name: "./b.png", data: "b" }])),
			],
			[
				"bytes after the end",
				ustar(
					[file],
					Uint8Array.from({ length: 1536 }, (_, i) => (i === 1100 ? 1 : 0)),
				),
			],
			["a size not a multiple of 512", ustar([file]).subarray(0, 2047)],
			["an empty file", new Uint8Array(0)],
		];
		const seen = variants.map(([what, archive]) => {
			const result = walk(archive);
			return [what, "error" in result ? result.error : "admitted"];
		});
		assert.deepEqual(seen, [
			[
				"a symlink",
				"the media archive holds ./link, a symlink: it admits plain files and directories only",
			],
			[
				"a hard link",
				"the media archive holds ./link, a hard link: it admits plain files and directories only",
			],
			[
				"a PAX header",
				"the media archive holds ./PaxHeaders/a, a PAX header: it admits plain files and directories only",
			],
			[
				"a GNU long name",
				"the media archive holds ././@LongLink, a GNU long name: it admits plain files and directories only",
			],
			[
				"a FIFO",
				"the media archive holds ./fifo, a FIFO: it admits plain files and directories only",
			],
			[
				"a name that climbs",
				"the media archive names ./../a.png, which is no path inside the media store",
			],
			[
				"an absolute name",
				"the media archive names /etc/passwd, which is no path inside the media store",
			],
			[
				"a name of other characters",
				"the media archive names ./a;b.png, which is no path inside the media store",
			],
			["a name given twice", "the media archive names a.png twice"],
			["another format", "the media archive is not POSIX ustar (block at 0)"],
			["a wrong checksum", "the media archive's header at 0 fails its checksum"],
			["a size that is not octal", "the media archive's header at 0 has a malformed size"],
			["bytes after a numeric field's end", "the media archive's header at 0 has a malformed mode"],
			["a directory with a size", "the media archive's directory ./d/ has a size"],
			["a cut-off payload", "the media archive is cut off inside ./a.png"],
			["no end blocks", "the media archive lacks its two end blocks"],
			["one end block, then data", "the media archive has one end block, then more"],
			["bytes after the end", "the media archive has bytes after its end"],
			[
				"a size not a multiple of 512",
				"the media archive is not a whole number of 512-byte blocks",
			],
			["an empty file", "the media archive is not a whole number of 512-byte blocks"],
		]);
	});
});

describe("mediaDifferences", () => {
	it("names the two sides it compares, such as the backup's store and its archive", () => {
		const store = [
			{ path: "a.png", size: 3, sha256: sha("1") },
			{ path: "b.png", size: 1, sha256: sha("2") },
		];
		const archive = [{ path: "a.png", size: 3, sha256: sha("1") }];
		assert.deepEqual(mediaDifferences(store, archive, ["the store", "the archive"]), [
			"media b.png: in the store, not in the archive",
		]);
	});
});

describe("listStore", () => {
	/** A store's reads over a tree of paths: a string is a file's content. */
	function reads(tree: Record<string, string | "directory" | "link" | "fifo">): StoreReads {
		return {
			names: (dir) =>
				Object.keys(tree).flatMap((path) => {
					const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
					return path !== "" && parent === dir
						? [path.slice(parent === "" ? 0 : parent.length + 1)]
						: [];
				}),
			kind: (path) =>
				tree[path] === "directory"
					? "directory"
					: tree[path] === "link" || tree[path] === "fifo"
						? "other"
						: "file",
			digest: (path) => ({ size: tree[path]!.length, sha256: sha256Of(tree[path]!) }),
		};
	}
	const marker = RUNTIMES.dev.mediaMarker;

	it("lists every file of the store by its path, in code-unit order, but the marker at its root", () => {
		assert.deepEqual(
			listStore(
				marker,
				reads({
					"": "directory",
					[marker]: "",
					"a.png": "png",
					"2026": "directory",
					"2026/11": "directory",
					"2026/11/x 1.jpg": "jpeg",
					[`2026/${marker}`]: "kept",
				}),
			),
			{
				files: [
					{ path: `2026/${marker}`, size: 4, sha256: sha256Of("kept") },
					{ path: "2026/11/x 1.jpg", size: 4, sha256: sha256Of("jpeg") },
					{ path: "a.png", size: 3, sha256: sha256Of("png") },
				],
			},
		);
	});

	it("refuses a link, a special file and a name a Recovery Set cannot hold, and names it", () => {
		const base = { "": "directory", "2026": "directory" } as const;
		assert.deepEqual(listStore(marker, reads({ ...base, "2026/a.jpg": "link" })), {
			error: "media 2026/a.jpg is neither a file nor a directory",
		});
		assert.deepEqual(listStore(marker, reads({ ...base, "2026/pipe": "fifo" })), {
			error: "media 2026/pipe is neither a file nor a directory",
		});
		assert.deepEqual(listStore(marker, reads({ ...base, "2026/photo#1.jpg": "x" })), {
			error: 'media "2026/photo#1.jpg" has a name a Recovery Set cannot hold',
		});
	});
});

describe("markerRefusal", () => {
	it("goes on when the media volume holds its marker", () => {
		assert.equal(markerRefusal(RUNTIMES.dev, true), undefined);
		assert.equal(markerRefusal(RUNTIMES.production, true), undefined);
	});

	it("refuses a media volume without its marker, and says how each runtime's store gets one", () => {
		assert.equal(
			markerRefusal(RUNTIMES.dev, false),
			"the media volume songhealth-qdev-media has no .songhealth-qdev-media-store: " +
				"create it as dev-runtime-install.sh does for a new store, " +
				"podman unshare touch <the volume's mountpoint>/.songhealth-qdev-media-store, then restore again " +
				'(development-quadlet.md "Backup and restore")',
		);
		assert.equal(
			markerRefusal(RUNTIMES.production, false),
			"the media volume songhealth-media has no .songhealth-media-store: " +
				"provision the store first (production-foundation.md §5.3), then restore again",
		);
	});
});

describe("errorTail", () => {
	it("keeps a failed command's last eight lines, without PostgreSQL's DETAIL and CONTEXT lines, which can quote a row", () => {
		const stderr = [
			...Array.from({ length: 9 }, (_, i) => `line ${i}`),
			'pg_restore: error: COPY failed for table "options": ERROR:  invalid input syntax for type json',
			'DETAIL:  Token "a-value" is invalid.',
			'CONTEXT:  COPY options, line 3, column value: "a-value"',
			"pg_restore: detail: Key (name)=(a-value) already exists.",
			"",
		].join("\n");
		assert.deepEqual(errorTail(stderr), [
			"line 2",
			"line 3",
			"line 4",
			"line 5",
			"line 6",
			"line 7",
			"line 8",
			'pg_restore: error: COPY failed for table "options": ERROR:  invalid input syntax for type json',
		]);
	});

	it("drops a DETAIL's or CONTEXT's further lines up to the next message, and a value an error quotes", () => {
		const stderr = [
			"pg_restore: error: could not execute query: ERROR:  invalid input syntax for type json",
			"CONTEXT:  JSON data, line 1: a-value",
			'COPY options, line 3, column value: "a-value"',
			"DETAIL:  Failing row contains (7, first line",
			"second line of a-value).",
			'psql:<stdin>:3: ERROR:  invalid input syntax for type integer: "a-value"',
			'HINT:  relation "media" stays',
		].join("\n");
		assert.deepEqual(errorTail(stderr), [
			"pg_restore: error: could not execute query: ERROR:  invalid input syntax for type json",
			'psql:<stdin>:3: ERROR:  invalid input syntax for type integer: "…"',
			'HINT:  relation "media" stays',
		]);
	});
});

describe("admitSet", () => {
	const manifest = buildManifest(observed());
	const archiveFiles = () => manifest.media.map((file) => ({ ...file }));
	/**
	 * A whole set of dev's, taken while it served COMMIT, as the restore reads it before any change.
	 */
	const whole = (): Parameters<typeof admitSet>[0] => ({
		target: RUNTIMES.dev,
		serves: COMMIT,
		entries: ["database.dump", "manifest.json", "media.tar"],
		manifestText: serializeManifest(manifest),
		database: { size: 4096, sha256: sha("a") },
		media: {
			size: 10240,
			sha256: sha("b"),
			walk: { files: archiveFiles() },
		},
	});
	const refusal = (set: Parameters<typeof admitSet>[0]) => {
		const result = admitSet(set);
		return "error" in result ? result.error : "admitted";
	};

	it("admits a whole set of the target's, taken while it served what it serves now", () => {
		assert.deepEqual(admitSet(whole()), { manifest });
	});

	it("refuses an incomplete set, or one holding another file", () => {
		const seen = [
			refusal({ ...whole(), entries: ["database.dump", "media.tar"], manifestText: undefined }),
			refusal({ ...whole(), entries: ["manifest.json", "media.tar"] }),
			refusal({ ...whole(), entries: ["database.dump", "manifest.json"] }),
			refusal({ ...whole(), entries: [...whole().entries, "notes.txt"] }),
		];
		assert.deepEqual(seen, [
			"the set is incomplete: it lacks manifest.json",
			"the set is incomplete: it lacks database.dump",
			"the set is incomplete: it lacks media.tar",
			"the set holds a file a Recovery Set does not: notes.txt",
		]);
	});

	it("refuses a manifest out of grammar", () => {
		assert.equal(refusal({ ...whole(), manifestText: "{" }), "the manifest is not JSON");
	});

	it("refuses a set from the other runtime", () => {
		const production = buildManifest({
			...observed(),
			runtime: RUNTIMES.production,
			serves: IMAGE,
		});
		assert.equal(
			refusal({ ...whole(), manifestText: serializeManifest(production) }),
			"the set is production's, and this restores dev: a Recovery Set restores only the runtime it came from",
		);
		assert.equal(
			refusal({ ...whole(), target: RUNTIMES.production, serves: IMAGE }),
			"the set is dev's, and this restores production: a Recovery Set restores only the runtime it came from",
		);
	});

	it("refuses a set taken while the runtime served another commit or image", () => {
		const other = "fedcba9876543210fedcba9876543210fedcba98";
		const production = buildManifest({
			...observed(),
			runtime: RUNTIMES.production,
			serves: IMAGE,
		});
		assert.deepEqual(
			[
				refusal({ ...whole(), serves: other }),
				refusal({
					...whole(),
					target: RUNTIMES.production,
					serves: `localhost/songhealth-app:0.0.2@sha256:${sha("5")}`,
					manifestText: serializeManifest(production),
				}),
			],
			[
				`the set was taken while dev served ${COMMIT}, and it serves ${other} now: point the runtime back at ${COMMIT} first`,
				`the set was taken while production served ${IMAGE}, and it serves localhost/songhealth-app:0.0.2@sha256:${sha("5")} now: point the runtime back at ${IMAGE} first`,
			],
		);
	});

	it("refuses an archive that does not match its size or SHA-256 in the manifest", () => {
		const seen = [
			refusal({ ...whole(), database: { size: 4096, sha256: sha("0") } }),
			refusal({ ...whole(), database: { size: 4095, sha256: sha("a") } }),
			refusal({ ...whole(), media: { ...whole().media!, sha256: sha("0") } }),
		];
		assert.deepEqual(seen, [
			"database.dump does not match its SHA-256 in the manifest",
			"database.dump is 4095 bytes, and the manifest says 4096",
			"media.tar does not match its SHA-256 in the manifest",
		]);
	});

	it("refuses a media archive the walker refuses, or whose files differ from the manifest's", () => {
		const files = archiveFiles();
		files[0]!.sha256 = sha("0");
		files.push({ path: ".songhealth-qdev-media-store", size: 30, sha256: sha("7") });
		const seen = [
			refusal({
				...whole(),
				media: { ...whole().media!, walk: { error: "the media archive has bytes after its end" } },
			}),
			refusal({ ...whole(), media: { ...whole().media!, walk: { files } } }),
		];
		assert.deepEqual(seen, [
			"the media archive has bytes after its end",
			"the media archive differs from the manifest: " +
				"media .songhealth-qdev-media-store: in the archive, not in the manifest; " +
				"media 2026/11/x.jpg: its content differs from the manifest's",
		]);
	});
});

describe("what the command reads of a runtime", () => {
	it("takes the database's and its administrator's names from the db container's own environment", () => {
		assert.deepEqual(parseDatabaseNames("songhealth\nsonghealth_admin\n"), {
			database: "songhealth",
			admin: "songhealth_admin",
		});
		assert.deepEqual(
			["songhealth\n", "songhealth\nadmin user\n", "songhealth\n\n", ""].map((output) =>
				parseDatabaseNames(output),
			),
			Array(4).fill({
				error:
					"the db container's POSTGRES_DB and POSTGRES_USER are not two names of letters, digits and underscores",
			}),
		);
	});

	it("takes production's app role from the one PGUSER line of its environment file", () => {
		const file = ".config/containers/systemd/songhealth-app.env";
		assert.equal(parseAppRole("PGUSER=songhealth_app\n", file), "songhealth_app");
		assert.deepEqual(
			["", "PGUSER=a\nPGUSER=b\n", 'PGUSER="songhealth_app"\n', "PGUSER=\n"].map((lines) =>
				parseAppRole(lines, file),
			),
			Array(4).fill({
				error: `${file} does not hold one unquoted PGUSER=<role> line of letters, digits and underscores`,
			}),
		);
	});

	it("reads the commit dev serves from its marker and the image production serves from its unit", () => {
		assert.equal(parseServes(RUNTIMES.dev, `${COMMIT}\n`), COMMIT);
		assert.equal(
			parseServes(
				RUNTIMES.production,
				`[Container]\n# Image=old\nImage=${IMAGE}\nNetwork=songhealth.network\n`,
			),
			IMAGE,
		);
		assert.deepEqual(
			[
				parseServes(RUNTIMES.dev, COMMIT),
				parseServes(RUNTIMES.dev, `${COMMIT}\n\n`),
				parseServes(RUNTIMES.production, "Image=localhost/songhealth-app:latest\n"),
				parseServes(RUNTIMES.production, `Image=${IMAGE}\nImage=${IMAGE}\n`),
			],
			[
				{
					error:
						"dev/songhealth-quadlet/.songhealth-qdev-source-identity is not one 40-hex commit and a newline",
				},
				{
					error:
						"dev/songhealth-quadlet/.songhealth-qdev-source-identity is not one 40-hex commit and a newline",
				},
				{
					error:
						".config/containers/systemd/songhealth-app.container does not pin one image by digest",
				},
				{
					error:
						".config/containers/systemd/songhealth-app.container does not pin one image by digest",
				},
			],
		);
	});

	it("reads each table's name, row count and digest from the database's query", () => {
		assert.deepEqual(
			parseTableDigests(`media|2|${sha("c")}\n_emdash_migrations|91|${sha("d")}\n`),
			[
				{ name: "media", rows: 2, sha256: sha("c") },
				{ name: "_emdash_migrations", rows: 91, sha256: sha("d") },
			],
		);
		assert.deepEqual(parseTableDigests(`media|2|${sha("c")}\nNOTICE: x\n`), {
			error: "the database's table digests are not lines of <table>|<rows>|<SHA-256>",
		});
	});
});

describe("exits", () => {
	it("exits 1 for a refusal before any change, and 3 once the reset began, naming the set to restore from", () => {
		assert.deepEqual(EXIT, { ok: 0, refused: 1, partial: 3 });
		assert.equal(
			partialTarget(RUNTIMES.dev, "/home/op/sets/one"),
			"the dev runtime is partial now: keep songhealth-dev-app.service stopped, and restore it from /home/op/sets/one again " +
				"(or from the Recovery Set taken before it)",
		);
	});
});
