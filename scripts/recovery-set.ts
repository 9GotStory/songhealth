// The Recovery Set of a Songhealth runtime (#221; GLOSSARY.md "Recovery Set"): the whole database
// and every media file, taken while the app is stopped, with a manifest of what both held, from
// which the same runtime is restored and checked.
//
//   node scripts/recovery-set.ts backup  production|dev <an existing empty directory, mode 0700>
//   node scripts/recovery-set.ts restore production|dev <a Recovery Set's directory>
//   node scripts/recovery-set.ts check   production|dev <a Recovery Set's directory>
//
// The runtime's name is the only thing that names a resource; scripts/recovery-set/plan.ts maps it
// to its db container, volumes and app service, and holds every rule this file applies.
//
// The native gap: EmDash 1.1.0's own backup (src/api/handlers/backup.ts) exports content as JSON,
// without users, sessions, secrets or media files, and current/10-system-blueprint.md §18 rules
// such an export out as the only backup; this command takes the whole database and media store.
//
// - backup: refuses while the app's service runs, and prints the stop and start commands. Writes a
//   complete custom-format pg_dump made inside the db container (database.dump), a ustar archive
//   of the media volume made under `podman unshare` (media.tar), and manifest.json last. The
//   manifest records the runtime, the commit or image it serves, the time, the pg_dump, server and
//   EmDash versions, both archives' sizes and SHA-256, every table's row count and the SHA-256 of
//   its rows in primary-key order, EmDash's applied migrations, and every media file's path, size
//   and SHA-256. Files are owner-only and never overwritten; a failed backup removes what it wrote.
// - restore: admits the whole set first (its three files, the manifest's grammar, the target's
//   runtime and what it serves now, every checksum, a readable dump and archive), refuses while
//   the app runs, and asks for a typed "yes" for each replacement before it changes anything. Then
//   it drops and recreates the public schema owned by the app role, restores the dump as that role
//   (`pg_restore --no-owner --no-privileges --exit-on-error --single-transaction`), empties the
//   media volume but for its marker, extracts the archive, and runs the integrity check. The
//   Operator starts the app afterwards.
// - check: the integrity check on its own: every table's count and digest, the migrations and every
//   media file, against the set's manifest. It names each difference by table or path, and prints
//   no row content.
//
// Exits: 0 done; 1 refused or failed with nothing changed; 3 failed after the restore's reset
// began, so the target is partial (plan.ts EXIT). No secret is read, printed or stored: the
// database is reached through `podman exec` on the container's local socket, and production's app
// role comes from a `grep` of its environment file's PGUSER line. Run it on the runtime's host, as
// the runtime's user; production: docs/operations/production-foundation.md §7.6; dev:
// docs/operations/development-quadlet.md "Backup and restore". Internally the command runs itself
// under `podman unshare` as `media-list <mountpoint> <marker>` to read the media store.

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	fstatSync,
	fsyncSync,
	linkSync,
	lstatSync,
	openSync,
	readdirSync,
	readFileSync,
	readSync,
	realpathSync,
	statSync,
	type Stats,
	unlinkSync,
	writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import {
	admitSet,
	appStateRefusal,
	buildManifest,
	compareHoldings,
	DATABASE_FILE,
	describeTotals,
	databaseRefusal,
	directoryRefusal,
	errorTail,
	EXIT,
	type Holdings,
	listStore,
	type Manifest,
	MANIFEST_FILE,
	MEDIA_FILE,
	markerRefusal,
	type MediaEntry,
	mediaDifferences,
	parseAppRole,
	parseCommand,
	parseDatabaseNames,
	parseManifest,
	parseServes,
	parseTableDigests,
	partialTarget,
	recordedHoldings,
	type Runtime,
	serializeManifest,
	walkUstar,
} from "./recovery-set/plan.ts";

const SELF = fileURLToPath(import.meta.url);
const CHUNK = 1 << 20;
const HOME = homedir();
/** Stable tool output: the development host's locale is th_TH. */
const ENV = { ...process.env, LC_ALL: "C" };

/** Stops the command with a refusal: nothing was changed. */
class Refusal extends Error {}
/** Stops a restore after its reset began: the target is partial. */
class Partial extends Error {}
/** Ends a check that found a difference: it changed nothing, and the runtime is not the set's. */
class Differs extends Error {}

function say(line: string): void {
	process.stdout.write(`recovery-set: ${line}\n`);
}

/** Runs a command and returns its output; a failure throws the given kind with its stderr. */
function run(
	command: string,
	args: readonly string[],
	what: string,
	options: SpawnSyncOptions & { fail?: typeof Refusal } = {},
): string {
	const { fail = Refusal, ...spawn } = options;
	const result = spawnSync(command, args, {
		encoding: "utf8",
		env: ENV,
		maxBuffer: 1 << 28,
		...spawn,
	});
	if (result.error !== undefined || result.status !== 0) {
		const detail = errorTail(result.error?.message ?? String(result.stderr ?? "")).join("\n  ");
		throw new fail(
			`${what} failed (exit ${result.status ?? "none"})${detail === "" ? "" : `:\n  ${detail}`}`,
		);
	}
	return String(result.stdout ?? "");
}

function sha256(): { update(data: Uint8Array): void; digest(): string } {
	const hash = createHash("sha256");
	return { update: (data) => void hash.update(data), digest: () => hash.digest("hex") };
}

/** A file's size and SHA-256, read in chunks. */
function digestFile(path: string): { size: number; sha256: string } {
	const fd = openSync(path, "r");
	try {
		const hash = sha256();
		const buffer = Buffer.alloc(CHUNK);
		let size = 0;
		for (let read; (read = readSync(fd, buffer, 0, CHUNK, size)) > 0; size += read) {
			hash.update(buffer.subarray(0, read));
		}
		return { size, sha256: hash.digest() };
	} finally {
		closeSync(fd);
	}
}

/** The media archive's files, by the planning module's strict walker. */
function walkArchive(path: string): ReturnType<typeof walkUstar> {
	const fd = openSync(path, "r");
	try {
		return walkUstar(
			fstatSync(fd).size,
			(offset, length) => {
				const buffer = Buffer.alloc(length);
				const read = readSync(fd, buffer, 0, length, offset);
				return buffer.subarray(0, read);
			},
			sha256,
		);
	} finally {
		closeSync(fd);
	}
}

// ----------------------------------------------------------------------------- the media store

/** `media-list`: the store's files under `podman unshare`, but its marker, as JSON. */
function readStore(root: string, marker: string): ReturnType<typeof listStore> {
	return listStore(marker, {
		names: (dir) => readdirSync(join(root, dir)),
		kind: (path) => {
			const entry = lstatSync(join(root, path));
			return entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other";
		},
		digest: (path) => digestFile(join(root, path)),
	});
}

function mountpoint(volume: string): string {
	const path = run(
		"podman",
		["volume", "inspect", "--format", "{{.Mountpoint}}", volume],
		`podman volume inspect ${volume}`,
	).trim();
	if (path === "") throw new Refusal(`the volume ${volume} has no mountpoint`);
	return path;
}

function storeFiles(runtime: Runtime, root: string, fail: typeof Refusal): MediaEntry[] {
	const out = run(
		"podman",
		["unshare", process.execPath, SELF, "media-list", root, runtime.mediaMarker],
		"reading the media store",
		{ fail },
	);
	const listed = JSON.parse(out) as { files: MediaEntry[] } | { error: string };
	if ("error" in listed) throw new fail(listed.error);
	return listed.files;
}

function hasMarker(runtime: Runtime, root: string): boolean {
	return (
		spawnSync("podman", ["unshare", "test", "-f", join(root, runtime.mediaMarker)], { env: ENV })
			.status === 0
	);
}

// ----------------------------------------------------------------------------- the database

interface Names {
	database: string;
	admin: string;
	app: string;
}

function names(runtime: Runtime): Names {
	const env = parseDatabaseNames(
		run(
			"podman",
			["exec", runtime.dbContainer, "printenv", "POSTGRES_DB", "POSTGRES_USER"],
			"reading the db container's names",
		),
	);
	if ("error" in env) throw new Refusal(env.error);
	if (runtime.appRole.kind === "fixed") return { ...env, app: runtime.appRole.name };
	// grep prints the PGUSER line alone: PGPASSWORD never reaches this process.
	const file = join(HOME, runtime.appRole.path);
	const lines =
		spawnSync("grep", ["-E", "^PGUSER=", file], { encoding: "utf8", env: ENV }).stdout ?? "";
	const app = parseAppRole(lines, runtime.appRole.path);
	if (typeof app !== "string") throw new Refusal(app.error);
	return { ...env, app };
}

/** One psql script as the administrator, over the db container's local socket. */
function psql(
	runtime: Runtime,
	db: Names,
	script: string,
	what: string,
	fail: typeof Refusal = Refusal,
): string {
	return run(
		"podman",
		[
			"exec",
			"-i",
			runtime.dbContainer,
			"psql",
			"-X",
			"-q",
			"-At",
			"-v",
			"ON_ERROR_STOP=1",
			"-v",
			`app=${db.app}`,
			"-U",
			db.admin,
			"-d",
			db.database,
			"-f",
			"-",
		],
		what,
		{ input: script, fail },
	);
}

/**
 * Each table of the public schema: its row count and the SHA-256 of its rows' text, joined by
 * newlines, in primary-key order (each key column's text in the C collation, so the order does not
 * hang on the database's collation; a table without a key orders by the whole row). The session
 * pins the settings that change a row's text: time zone, date and interval styles, float digits,
 * bytea and money output, and the search path reg* types print against (PostgreSQL 18,
 * runtime-config-client.html). All in the server: no row leaves the container.
 */
const TABLE_DIGESTS = String.raw`
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
SET IntervalStyle = 'postgres';
SET extra_float_digits = 1;
SET bytea_output = 'hex';
SET lc_monetary = 'C';
SET search_path = public;
SELECT format(
  'SELECT %L || ''|'' || count(*) || ''|'' || encode(sha256(convert_to(coalesce(string_agg(recovery_row::text, E''\n'' ORDER BY %s), ''''), ''UTF8'')), ''hex'') FROM public.%I AS recovery_row',
  c.relname,
  coalesce(
    (SELECT string_agg(format('(recovery_row.%I)::text COLLATE "C"', a.attname), ', ' ORDER BY k.ord)
       FROM pg_index AS i
       CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
       JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE i.indrelid = c.oid AND i.indisprimary),
    'recovery_row::text COLLATE "C"'),
  c.relname)
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname COLLATE "C" \gexec
`;

/**
 * EmDash's applied migrations (`_emdash_migrations`, EmDash 1.1.0
 * src/database/migrations/runner.ts).
 */
const MIGRATIONS = String.raw`
SELECT to_regclass('public._emdash_migrations') IS NOT NULL AS has_migrations \gset
\if :has_migrations
SELECT name FROM public._emdash_migrations ORDER BY name COLLATE "C";
\endif
`;

function holdings(runtime: Runtime, db: Names, store: string, fail: typeof Refusal): Holdings {
	const tables = parseTableDigests(
		psql(runtime, db, TABLE_DIGESTS, "reading the tables' digests", fail),
	);
	if ("error" in tables) throw new fail(tables.error);
	const migrations = psql(runtime, db, MIGRATIONS, "reading the migrations", fail)
		.split("\n")
		.filter((line) => line !== "");
	return { tables, migrations, media: storeFiles(runtime, store, fail) };
}

// ----------------------------------------------------------------------------- what the runtime
// serves

function serves(runtime: Runtime): string {
	const path = join(HOME, runtime.serves.path);
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch {
		throw new Refusal(
			`${path} cannot be read: is the ${runtime.name} runtime installed on this host?`,
		);
	}
	const served = parseServes(runtime, text);
	if (typeof served !== "string") throw new Refusal(served.error);
	return served;
}

function emdashVersion(runtime: Runtime, served: string): string {
	const json =
		runtime.emdash.kind === "checkout"
			? readFileSync(join(HOME, runtime.emdash.path), "utf8")
			: run(
					"podman",
					[
						"run",
						"--rm",
						"--pull=never",
						"--network=none",
						"--entrypoint",
						"cat",
						served,
						"/app/node_modules/emdash/package.json",
					],
					"reading EmDash's version from the image",
				);
	const version = (JSON.parse(json) as { version?: unknown }).version;
	if (typeof version !== "string") throw new Refusal("EmDash's package.json gives no version");
	return version;
}

// ----------------------------------------------------------------------------- refusals

function requireStopped(runtime: Runtime): void {
	const state = spawnSync("systemctl", ["--user", "is-active", runtime.appService], {
		encoding: "utf8",
		env: ENV,
	});
	const refusal = appStateRefusal(runtime, (state.stdout ?? "").trim());
	if (refusal !== undefined) throw new Refusal(refusal);
}

function requireDatabase(runtime: Runtime): void {
	const inspect = spawnSync(
		"podman",
		["container", "inspect", "--format", "{{.State.Running}}", runtime.dbContainer],
		{
			encoding: "utf8",
			env: ENV,
		},
	);
	const refusal = databaseRefusal(
		runtime,
		inspect.status === 0 ? (inspect.stdout ?? "").trim() : "",
	);
	if (refusal !== undefined) throw new Refusal(refusal);
}

// ----------------------------------------------------------------------------- backup

function backup(runtime: Runtime, dir: string): void {
	requireStopped(runtime);
	requireDatabase(runtime);
	const volumes = [runtime.dbVolume, runtime.mediaVolume].map((name) => ({
		name,
		mountpoint: realpathSync(mountpoint(name)),
	}));
	let facts: Stats | undefined;
	try {
		facts = statSync(dir);
	} catch {
		facts = undefined;
	}
	const refusal = directoryRefusal({
		path: dir,
		realPath: facts === undefined ? dir : realpathSync(dir),
		isDirectory: facts?.isDirectory(),
		entries: facts?.isDirectory() ? readdirSync(dir).length : 0,
		mode: facts?.mode ?? 0,
		uid: facts?.uid ?? -1,
		userUid: process.getuid?.() ?? -1,
		volumes,
	});
	if (refusal !== undefined) throw new Refusal(refusal);

	const createdAt = new Date();
	const served = serves(runtime);
	const db = names(runtime);
	const store = volumes[1]!.mountpoint;
	const written: string[] = [];
	/** A new owner-only file of the set, which the backup never overwrites. */
	const create = (file: string): number => {
		const fd = openSync(join(dir, file), "wx", 0o600);
		written.push(join(dir, file));
		return fd;
	};
	const staged = `/tmp/songhealth-recovery-${process.pid}.dump`;
	try {
		const versions = {
			pgDump: run(
				"podman",
				["exec", runtime.dbContainer, "pg_dump", "--version"],
				"pg_dump --version",
			).trim(),
			server: psql(runtime, db, "SHOW server_version;", "reading the server's version").trim(),
			emdash: emdashVersion(runtime, served),
		};
		say(`backing up the ${runtime.name} runtime (it serves ${served}) into ${dir}`);
		run(
			"podman",
			[
				"exec",
				runtime.dbContainer,
				"pg_dump",
				"-U",
				db.admin,
				"-d",
				db.database,
				"--format=custom",
				"-f",
				staged,
			],
			"pg_dump",
		);
		run(
			"podman",
			["exec", runtime.dbContainer, "pg_restore", "--list", staged],
			"reading the dump back (pg_restore --list)",
		);
		const dumpFd = create(DATABASE_FILE);
		try {
			run("podman", ["exec", runtime.dbContainer, "cat", staged], "copying the dump out", {
				stdio: ["ignore", dumpFd, "pipe"],
			});
			fsyncSync(dumpFd);
		} finally {
			closeSync(dumpFd);
		}
		const held = holdings(runtime, db, store, Refusal);
		const mediaFd = create(MEDIA_FILE);
		try {
			run(
				"podman",
				[
					"unshare",
					"tar",
					"--format=ustar",
					"-cf",
					"-",
					"-C",
					store,
					"--anchored",
					`--exclude=./${runtime.mediaMarker}`,
					".",
				],
				"archiving the media store",
				{ stdio: ["ignore", mediaFd, "pipe"] },
			);
			fsyncSync(mediaFd);
		} finally {
			closeSync(mediaFd);
		}
		const walked = walkArchive(join(dir, MEDIA_FILE));
		if ("error" in walked) throw new Refusal(walked.error);
		const missed = mediaDifferences(held.media, walked.files, ["the store", "the archive"]);
		if (missed.length > 0)
			throw new Refusal(`the media archive does not hold the store's files: ${missed.join("; ")}`);
		// Checked again: an app that runs now may have written while the set was read.
		requireStopped(runtime);

		const manifest = buildManifest({
			runtime,
			serves: served,
			createdAt,
			versions,
			archives: {
				database: digestFile(join(dir, DATABASE_FILE)),
				media: digestFile(join(dir, MEDIA_FILE)),
			},
			...held,
		});
		const text = serializeManifest(manifest);
		const reread = parseManifest(text);
		if ("error" in reread)
			throw new Refusal(`the manifest would be out of grammar: ${reread.error}`);
		// Written under another name, then linked into place: a set without manifest.json, or with
		// the partial file, is refused as incomplete, so no partial set looks complete.
		const partial = `.${MANIFEST_FILE}.partial`;
		const manifestFd = create(partial);
		try {
			writeSync(manifestFd, text);
			fsyncSync(manifestFd);
		} finally {
			closeSync(manifestFd);
		}
		linkSync(join(dir, partial), join(dir, MANIFEST_FILE));
		written.push(join(dir, MANIFEST_FILE));
		unlinkSync(join(dir, partial));
		written.splice(written.indexOf(join(dir, partial)), 1);
		report(runtime, dir, manifest, text);
	} catch (error) {
		for (const file of written.reverse()) {
			try {
				unlinkSync(file);
			} catch {
				say(`could not remove ${file}: remove it by hand`);
			}
		}
		if (written.length > 0) say(`removed the incomplete set's files from ${dir}`);
		throw error;
	} finally {
		spawnSync("podman", ["exec", runtime.dbContainer, "rm", "-f", staged], { env: ENV });
	}
}

function report(runtime: Runtime, dir: string, manifest: Manifest, text: string): void {
	const { database, media } = manifest.archives;
	say(`wrote the ${runtime.name} Recovery Set ${dir}:`);
	process.stdout.write(
		[
			`  ${MANIFEST_FILE}  sha256 ${createHash("sha256").update(text).digest("hex")}`,
			`  ${DATABASE_FILE}  ${database.size} bytes  sha256 ${database.sha256}`,
			`  ${MEDIA_FILE}      ${media.size} bytes  sha256 ${media.sha256}`,
			`  ${describeTotals(manifest)}`,
			`  serves ${manifest.serves}; ${manifest.versions.pgDump}; server ${manifest.versions.server}; EmDash ${manifest.versions.emdash}; ${manifest.createdUtc}`,
			"",
		].join("\n"),
	);
	say(`start the app again: systemctl --user start ${runtime.appService}`);
	if (runtime.name === "production")
		say("copy the set off the host over a private channel: it holds no runtime secret");
}

// ----------------------------------------------------------------------------- restore and check

/** The manifest of the set a check compares with: its grammar and its runtime, nothing else. */
function manifestToCheck(runtime: Runtime, dir: string): Manifest {
	let text: string;
	try {
		text = readFileSync(join(dir, MANIFEST_FILE), "utf8");
	} catch {
		throw new Refusal(`${join(dir, MANIFEST_FILE)} cannot be read: is ${dir} a Recovery Set?`);
	}
	const parsed = parseManifest(text);
	if ("error" in parsed) throw new Refusal(parsed.error);
	if (parsed.manifest.runtime !== runtime.name) {
		throw new Refusal(
			`the set is ${parsed.manifest.runtime}'s, and this checks ${runtime.name}: a set checks only the runtime it came from`,
		);
	}
	return parsed.manifest;
}

function check(runtime: Runtime, dir: string): void {
	requireDatabase(runtime);
	const manifest = manifestToCheck(runtime, dir);
	const differences = compareHoldings(
		recordedHoldings(manifest),
		holdings(runtime, names(runtime), mountpoint(runtime.mediaVolume), Refusal),
	);
	if (differences.length > 0) {
		process.stderr.write(differences.map((line) => `  ${line}\n`).join(""));
		throw new Differs(
			`the ${runtime.name} runtime differs from the set ${dir} in ${differences.length} places`,
		);
	}
	say(`PASS: the ${runtime.name} runtime holds the set ${dir}: ${describeTotals(manifest)}`);
}

async function confirmations(questions: readonly string[]): Promise<boolean> {
	const input = createInterface({ input: process.stdin, terminal: false });
	try {
		const lines = input[Symbol.asyncIterator]();
		for (const question of questions) {
			process.stdout.write(`recovery-set: ${question} [type yes]: `);
			const answer = await lines.next();
			if (answer.done === true || answer.value.trim() !== "yes") return false;
		}
		return true;
	} finally {
		// Released, or a terminal's standard input keeps the process waiting after its last line
		// (measured on a pseudo-terminal under Node 26.13.0, #221).
		input.close();
	}
}

async function restore(runtime: Runtime, dir: string): Promise<void> {
	requireStopped(runtime);
	requireDatabase(runtime);
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		throw new Refusal(`${dir} cannot be read: is it a Recovery Set?`);
	}
	const read = (file: string) => (entries.includes(file) ? join(dir, file) : undefined);
	const dumpPath = read(DATABASE_FILE);
	const mediaPath = read(MEDIA_FILE);
	const manifestPath = read(MANIFEST_FILE);
	const admitted = admitSet({
		target: runtime,
		serves: serves(runtime),
		entries,
		manifestText: manifestPath === undefined ? undefined : readFileSync(manifestPath, "utf8"),
		database: dumpPath === undefined ? undefined : digestFile(dumpPath),
		media:
			mediaPath === undefined
				? undefined
				: { ...digestFile(mediaPath), walk: walkArchive(mediaPath) },
	});
	if ("error" in admitted) throw new Refusal(admitted.error);
	const { manifest } = admitted;
	const db = names(runtime);
	const role = psql(
		runtime,
		db,
		"SELECT rolcanlogin::text || '|' || rolsuper::text FROM pg_roles WHERE rolname = :'app';",
		"reading the app role",
	).trim();
	if (role !== "true|false")
		throw new Refusal(`the app role ${db.app} is not a login role without superuser here`);
	const store = mountpoint(runtime.mediaVolume);
	const marker = markerRefusal(runtime, hasMarker(runtime, store));
	if (marker !== undefined) throw new Refusal(marker);
	const staged = `/tmp/songhealth-restore-${process.pid}.dump`;
	let changing = false;
	try {
		run(
			"podman",
			["cp", dumpPath!, `${runtime.dbContainer}:${staged}`],
			"copying the dump into the db container",
		);
		run(
			"podman",
			["exec", runtime.dbContainer, "pg_restore", "--list", staged],
			"reading the dump (pg_restore --list)",
		);
		say(
			`the set ${dir} was admitted: ${runtime.name}'s, taken ${manifest.createdUtc} while it served ${manifest.serves}`,
		);
		const yes = await confirmations([
			`replace the whole ${db.database} database of the ${runtime.name} runtime with the set's?`,
			`replace every file of the ${runtime.mediaVolume} volume, but its marker, with the set's?`,
		]);
		if (!yes) throw new Refusal("not confirmed");
		// Someone may have started the app while the answers were awaited.
		requireStopped(runtime);

		// From here on, a failure leaves the target partial.
		changing = true;
		say(`resetting the public schema of ${db.database}, owned by ${db.app}`);
		psql(
			runtime,
			db,
			'DROP SCHEMA public CASCADE;\nCREATE SCHEMA public AUTHORIZATION :"app";\n',
			"resetting the schema",
			Partial,
		);
		run(
			"podman",
			[
				"exec",
				runtime.dbContainer,
				"pg_restore",
				"-U",
				db.app,
				"-d",
				db.database,
				"--no-owner",
				"--no-privileges",
				"--exit-on-error",
				"--single-transaction",
				staged,
			],
			"pg_restore",
			{ fail: Partial },
		);
		const owners = psql(
			runtime,
			db,
			"SELECT count(*) FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND pg_get_userbyid(c.relowner) <> :'app';",
			"reading the restored objects' owners",
			Partial,
		).trim();
		if (owners !== "0") throw new Partial(`${owners} restored objects are not owned by ${db.app}`);
		say(
			`emptying the ${runtime.mediaVolume} volume but for ${runtime.mediaMarker}, then extracting the set's media`,
		);
		run(
			"podman",
			[
				"unshare",
				"find",
				store,
				"-mindepth",
				"1",
				"-maxdepth",
				"1",
				"!",
				"-name",
				runtime.mediaMarker,
				"-exec",
				"rm",
				"-rf",
				"--",
				"{}",
				"+",
			],
			"emptying the media volume",
			{ fail: Partial },
		);
		run("podman", ["unshare", "tar", "-xf", mediaPath!, "-C", store], "extracting the media", {
			fail: Partial,
		});

		const differences = compareHoldings(
			recordedHoldings(manifest),
			holdings(runtime, db, store, Partial),
		);
		if (differences.length > 0) {
			process.stderr.write(differences.map((line) => `  ${line}\n`).join(""));
			throw new Partial(
				`the restored runtime differs from the set in ${differences.length} places`,
			);
		}
	} catch (error) {
		if (!changing) throw error;
		const message = error instanceof Error ? error.message : String(error);
		throw new Partial(`${message}\n${partialTarget(runtime, dir)}`);
	} finally {
		spawnSync("podman", ["exec", runtime.dbContainer, "rm", "-f", staged], { env: ENV });
	}
	say(
		`PASS: restored the ${runtime.name} runtime from ${dir}, and the integrity check passed: ${describeTotals(manifest)}`,
	);
	say(`start the app: systemctl --user start ${runtime.appService}`);
}

// ----------------------------------------------------------------------------- main

async function main(argv: readonly string[]): Promise<number> {
	if (argv[0] === "media-list" && argv.length === 3) {
		process.stdout.write(JSON.stringify(readStore(argv[1]!, argv[2]!)));
		return EXIT.ok;
	}
	const parsed = parseCommand(argv);
	if ("error" in parsed) {
		process.stderr.write(`recovery-set: ${parsed.error}\n`);
		return EXIT.refused;
	}
	const { command, runtime } = parsed;
	const dir = resolve(parsed.dir);
	try {
		if (command === "backup") backup(runtime, dir);
		else if (command === "check") check(runtime, dir);
		else await restore(runtime, dir);
		return EXIT.ok;
	} catch (error) {
		if (error instanceof Partial) {
			process.stderr.write(`recovery-set: FAIL: ${error.message}\n`);
			return EXIT.partial;
		}
		if (error instanceof Differs) {
			process.stderr.write(
				`recovery-set: FAIL: ${error.message}\nrecovery-set: the check changed nothing\n`,
			);
			return EXIT.refused;
		}
		if (error instanceof Refusal) {
			process.stderr.write(
				`recovery-set: REFUSED: ${error.message}\nrecovery-set: nothing was changed\n`,
			);
			return EXIT.refused;
		}
		throw error;
	}
}

process.exitCode = await main(process.argv.slice(2));
