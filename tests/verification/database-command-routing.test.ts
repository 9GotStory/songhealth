/**
 * T036-B01 — real CLI target-routing regression contract for `db:status` and
 * `db:migrate`.
 *
 * References: FR-004, FR-008, FR-009; contracts/foundation-operations.md
 * §Commands (`--target <development|verification>`) and §Configuration
 * examples / §Safe diagnostic contract; specs/001-application-foundation
 * quickstart.md §4; accepted T010 canonical configuration boundary
 * `apps/server/src/config.ts` (`loadRuntimeConfiguration` invoked with the
 * requested operation target); accepted T013 migration boundary; rework
 * authorization `0e0597e76cb5b12641a5fc1b1a6d13aa8fac3e66` (T036-B01);
 * Constitution Principles I–VI (esp. I security by design, III
 * traceability, V proportionate verification).
 *
 * Unlike the deterministic injected-collaborator T036 suite
 * (`tests/verification/database-commands.test.ts`), this suite drives the
 * REAL command-line wiring: each case spawns the actual operations entry
 * point (`node scripts/foundation-operations.mjs … --target …`) against the
 * repository's real target-routed configuration sources — the ignored local
 * `.env.development.local` / `.env.verification.local` copies. Temporary
 * synthetic (non-secret, sentinel-bearing) local copies are installed for
 * each case and the previous state — including a developer's real local
 * files, if any — is always restored.
 *
 * No real engine is required or contacted successfully: the connection
 * attempts address an absent engine and fail closed, which is exactly the
 * observable the routing proof needs (the command reached its target-bound
 * adapter). No Podman/Compose is invoked, no process is started or stopped,
 * and no mutation path runs — `db:status` is read-only, and the one
 * `db:migrate` case that reaches its adapter does so against a database
 * identity whose engine is absent, failing closed without applying
 * anything.
 *
 * Pinned contract (T036-B01):
 *   - ONE TARGET, ONE FILE: the Development command reads only
 *     `.env.development.local` and the Verification command only
 *     `.env.verification.local`; a present Verification file never
 *     satisfies the Development command and vice versa (each missing-file
 *     case is that target's own `CONFIG_MISSING` under its own diagnostic
 *     scope).
 *   - CANONICAL VALIDATION IS TARGET-ROUTED: a Development record placed in
 *     the Verification file is refused by the Verification command as a
 *     cross-target identity (`CONFIG_IDENTITY_CONFLICT` on `RUNTIME_PROFILE`
 *     under the `verification` scope) before ANY adapter work — including
 *     `db:migrate`'s apply; a Verification-scoped `DATABASE_URL` in the
 *     Development file is refused under the `daily` scope on
 *     `DATABASE_URL`, proving the Development command selects only the
 *     Development database identity.
 *   - THE ADAPTERS ADDRESS THE REQUESTED TARGET: with a canonically valid
 *     Verification record and no Verification engine, `db:status` reports
 *     the closed `DATABASE_UNAVAILABLE` and `db:migrate` the closed
 *     `MIGRATION_FAILED`, both under the `verification` scope — the
 *     commands reached their target-bound read/apply adapters instead of
 *     rejecting the identity or silently using the Development database.
 *   - An invalid target is refused by the real CLI before any file work.
 *   - Only closed Safe Diagnostics are emitted; the synthetic URL sentinel
 *     never appears on any output surface in exact or encoded form.
 *
 * This suite adds no Verification lifecycle/Compose behavior, no T037+
 * adapter coverage, and no Product migration content.
 */

import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const OPERATIONS_SCRIPT = path.join(REPOSITORY_ROOT, "scripts/foundation-operations.mjs");

/** Bounded wall-clock budget for one real CLI invocation (milliseconds). */
const CLI_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Synthetic, non-secret local configuration records. The values are the
// committed examples' canonical identities; the passwords are unique
// sentinels so nondisclosure assertions can scan every output surface.
// ---------------------------------------------------------------------------

/** The canonical Development identity (the `.env.development.example` shape). */
const DEVELOPMENT_RECORD = [
  "APP_ENVIRONMENT=development",
  "RUNTIME_PROFILE=daily",
  "APP_HOST=127.0.0.1",
  "APP_PORT=4173",
  "PUBLIC_ORIGIN=http://127.0.0.1:4173",
  "DATABASE_URL=mysql://songhealth_dev:routing-sentinel-dev-4c19@127.0.0.1:3306/songhealth_development",
  "DATABASE_POOL_MAX=5",
  "PROXY_POLICY=none",
  "LOG_LEVEL=info",
  "FIXTURE_PROVENANCE=synthetic",
].join("\n");

/** The canonical Verification identity (the `.env.verification.example` shape). */
const VERIFICATION_RECORD = [
  "APP_ENVIRONMENT=development",
  "RUNTIME_PROFILE=verification",
  "APP_HOST=songhealth-app",
  "APP_PORT=3000",
  "PUBLIC_ORIGIN=http://songhealth-verification.test",
  "DATABASE_URL=mysql://songhealth_ver:routing-sentinel-ver-8a2f@songhealth-db:3306/songhealth_verification",
  "DATABASE_POOL_MAX=5",
  "PROXY_POLICY=one-hop",
  "LOG_LEVEL=info",
  "FIXTURE_PROVENANCE=synthetic",
].join("\n");

/**
 * The Development record with the VERIFICATION database credential scope in
 * its `DATABASE_URL`: canonically valid shape, wrong target's database
 * identity — the Development command must refuse it on the `DATABASE_URL`
 * key (the Development canonical identity pins the Development user/name).
 */
const DEVELOPMENT_RECORD_WITH_VERIFICATION_DATABASE = DEVELOPMENT_RECORD.replace(
  "mysql://songhealth_dev:routing-sentinel-dev-4c19@127.0.0.1:3306/songhealth_development",
  "mysql://songhealth_ver:routing-sentinel-ver-8a2f@127.0.0.1:3306/songhealth_verification",
);

/** The ignored local environment file each selectable target reads. */
const ENV_FILE_BY_TARGET = {
  development: ".env.development.local",
  verification: ".env.verification.local",
} as const;

type OperationTarget = keyof typeof ENV_FILE_BY_TARGET;

/** One closed Safe Diagnostic as emitted on the command surfaces. */
interface CliDiagnostic {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  remediation: string;
  configurationKey?: string;
}

/** One real CLI invocation's outcome. */
interface CliOutcome {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run the REAL operations entry point for one database command and target.
 * The non-zero exit of a refused command surfaces through the execFile
 * error, whose captured stdout/stderr are the command's owned surfaces.
 */
async function runDatabaseCommand(command: string, target: string): Promise<CliOutcome> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [OPERATIONS_SCRIPT, command, "--target", target],
      { cwd: REPOSITORY_ROOT, timeout: CLI_TIMEOUT_MS },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

/** The most recent not-yet-run restore, for the afterAll safety net. */
let pendingRestore: (() => Promise<void>) | null = null;

/**
 * Install EXACTLY the requested synthetic local env files for one case: a
 * target present in `files` gets that content written, an absent target gets
 * its local file removed. Any pre-existing local files (a developer's real
 * copies) are captured and restored by the returned function, which every
 * test invokes in its `finally`.
 */
async function installLocalEnv(
  files: Partial<Record<OperationTarget, string>>,
): Promise<() => Promise<void>> {
  const saved: Partial<Record<OperationTarget, string | null>> = {};
  for (const target of Object.keys(ENV_FILE_BY_TARGET) as OperationTarget[]) {
    const absolute = path.join(REPOSITORY_ROOT, ENV_FILE_BY_TARGET[target]);
    try {
      saved[target] = await readFile(absolute, "utf8");
    } catch {
      saved[target] = null;
    }
    try {
      const content = files[target];
      if (content === undefined) {
        await rm(absolute, { force: true });
      } else {
        await writeFile(absolute, `${content}\n`, "utf8");
      }
    } catch {
      // Best effort: the per-test finally and the afterAll net still restore
      // whatever was installed.
    }
  }
  const restore = async () => {
    for (const target of Object.keys(ENV_FILE_BY_TARGET) as OperationTarget[]) {
      const absolute = path.join(REPOSITORY_ROOT, ENV_FILE_BY_TARGET[target]);
      const original = saved[target];
      try {
        if (original === null || original === undefined) {
          await rm(absolute, { force: true });
        } else {
          await writeFile(absolute, original, "utf8");
        }
      } catch {
        // Restoration is best effort; the files are ignored local copies.
      }
    }
  };
  return restore;
}

/** Parse the first JSON diagnostic line the command emitted on stdout. */
function firstDiagnostic(stdout: string): CliDiagnostic {
  const line = stdout.split(/\r?\n/).find((candidate) => candidate.startsWith("{"));
  expect(line).toBeDefined();
  return JSON.parse(line as string) as CliDiagnostic;
}

/** The synthetic URL sentinel is absent from a surface in exact and encoded form. */
function expectNoSentinel(surface: string): void {
  expect(surface).not.toContain("routing-sentinel");
  expect(surface).not.toContain(encodeURIComponent("routing-sentinel"));
}

/** Assert one full refusal outcome: non-zero exit, closed diagnostic, no sentinel. */
function expectRefused(
  outcome: CliOutcome,
  expected: { reasonCode: string; diagnosticScope: string; component: string; remediation: string; configurationKey?: string },
): CliDiagnostic {
  expect(outcome.code).not.toBe(0);
  const diagnostic = firstDiagnostic(outcome.stdout);
  expect(diagnostic.reasonCode).toBe(expected.reasonCode);
  expect(diagnostic.diagnosticScope).toBe(expected.diagnosticScope);
  expect(diagnostic.component).toBe(expected.component);
  expect(diagnostic.remediation).toBe(expected.remediation);
  if (expected.configurationKey !== undefined) {
    expect(diagnostic.configurationKey).toBe(expected.configurationKey);
  } else {
    expect(diagnostic.configurationKey).toBeUndefined();
  }
  // The diagnostic is emitted on BOTH command surfaces, and nothing else —
  // no values, no sentinel, no raw error text.
  expectNoSentinel(outcome.stdout);
  expectNoSentinel(outcome.stderr);
  return diagnostic;
}

afterAll(async () => {
  // Safety net: a test that failed between install and its finally must not
  // leave synthetic local files behind.
  if (pendingRestore !== null) {
    await pendingRestore();
    pendingRestore = null;
  }
});

// ---------------------------------------------------------------------------
// Real CLI target routing — one target, one file, one canonical identity.
// ---------------------------------------------------------------------------

describe("Database command target routing — T036-B01 (real CLI seam)", () => {
  it(
    "the Development command reads only the Development file: a present Verification file does not satisfy it, and its own absent file is its CONFIG_MISSING",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalEnv({ verification: VERIFICATION_RECORD });
      pendingRestore = restore;
      try {
        const development = await runDatabaseCommand("db:status", "development");
        expectRefused(development, {
          reasonCode: "CONFIG_MISSING",
          diagnosticScope: "daily",
          component: "configuration",
          remediation: "FIX_CONFIGURATION",
        });

        // The SAME invocation against the target whose file IS present loads,
        // canonically accepts, and reaches its target-bound adapter.
        const verification = await runDatabaseCommand("db:status", "verification");
        expectRefused(verification, {
          reasonCode: "DATABASE_UNAVAILABLE",
          diagnosticScope: "verification",
          component: "database",
          remediation: "CHECK_DATABASE",
        });
      } finally {
        await restore();
        pendingRestore = null;
      }
    },
  );

  it(
    "the Verification command reads only the Verification file: a present Development file does not satisfy it, and its own absent file is its CONFIG_MISSING",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalEnv({ development: DEVELOPMENT_RECORD });
      pendingRestore = restore;
      try {
        const verification = await runDatabaseCommand("db:status", "verification");
        expectRefused(verification, {
          reasonCode: "CONFIG_MISSING",
          diagnosticScope: "verification",
          component: "configuration",
          remediation: "FIX_CONFIGURATION",
        });

        const development = await runDatabaseCommand("db:status", "development");
        expectRefused(development, {
          reasonCode: "DATABASE_UNAVAILABLE",
          diagnosticScope: "daily",
          component: "database",
          remediation: "CHECK_DATABASE",
        });
      } finally {
        await restore();
        pendingRestore = null;
      }
    },
  );

  it(
    "canonical validation is target-routed: a Development record in the Verification file is refused as a cross-target identity before any status or apply work",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalEnv({ verification: DEVELOPMENT_RECORD });
      pendingRestore = restore;
      try {
        const status = await runDatabaseCommand("db:status", "verification");
        expectRefused(status, {
          reasonCode: "CONFIG_IDENTITY_CONFLICT",
          diagnosticScope: "verification",
          component: "configuration",
          remediation: "FIX_CONFIGURATION",
          configurationKey: "RUNTIME_PROFILE",
        });

        // The apply command refuses identically — no migration work can run
        // against another target's record.
        const migrate = await runDatabaseCommand("db:migrate", "verification");
        expectRefused(migrate, {
          reasonCode: "CONFIG_IDENTITY_CONFLICT",
          diagnosticScope: "verification",
          component: "configuration",
          remediation: "FIX_CONFIGURATION",
          configurationKey: "RUNTIME_PROFILE",
        });
      } finally {
        await restore();
        pendingRestore = null;
      }
    },
  );

  it(
    "the Development command selects only the Development database identity: a Verification-scoped DATABASE_URL in the Development file is refused on the DATABASE_URL key",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalEnv({
        development: DEVELOPMENT_RECORD_WITH_VERIFICATION_DATABASE,
      });
      pendingRestore = restore;
      try {
        const status = await runDatabaseCommand("db:status", "development");
        expectRefused(status, {
          reasonCode: "CONFIG_IDENTITY_CONFLICT",
          diagnosticScope: "daily",
          component: "configuration",
          remediation: "FIX_CONFIGURATION",
          configurationKey: "DATABASE_URL",
        });

        const migrate = await runDatabaseCommand("db:migrate", "development");
        expectRefused(migrate, {
          reasonCode: "CONFIG_IDENTITY_CONFLICT",
          diagnosticScope: "daily",
          component: "configuration",
          remediation: "FIX_CONFIGURATION",
          configurationKey: "DATABASE_URL",
        });
      } finally {
        await restore();
        pendingRestore = null;
      }
    },
  );

  it(
    "with a canonically valid Verification record the commands reach their target-bound adapters and fail closed without an engine: status reports DATABASE_UNAVAILABLE and migrate MIGRATION_FAILED under the verification scope",
    { timeout: CLI_TIMEOUT_MS + 60_000 },
    async () => {
      const restore = await installLocalEnv({ verification: VERIFICATION_RECORD });
      pendingRestore = restore;
      try {
        const status = await runDatabaseCommand("db:status", "verification");
        expectRefused(status, {
          reasonCode: "DATABASE_UNAVAILABLE",
          diagnosticScope: "verification",
          component: "database",
          remediation: "CHECK_DATABASE",
        });

        const migrate = await runDatabaseCommand("db:migrate", "verification");
        expectRefused(migrate, {
          reasonCode: "MIGRATION_FAILED",
          diagnosticScope: "verification",
          component: "migration",
          remediation: "RUN_MIGRATION",
        });
      } finally {
        await restore();
        pendingRestore = null;
      }
    },
  );

  it(
    "an invalid target is refused by the real CLI before any local file work",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      // Both local files absent: a routing bug that read ANY file before
      // target validation could turn this into CONFIG_MISSING instead.
      const restore = await installLocalEnv({});
      pendingRestore = restore;
      try {
        const status = await runDatabaseCommand("db:status", "production");
        expectRefused(status, {
          reasonCode: "OPERATIONAL_FAILURE",
          diagnosticScope: "foundation",
          component: "orchestration",
          remediation: "CHECK_PREREQUISITES",
        });

        const migrate = await runDatabaseCommand("db:migrate", "hosted");
        expectRefused(migrate, {
          reasonCode: "OPERATIONAL_FAILURE",
          diagnosticScope: "foundation",
          component: "orchestration",
          remediation: "CHECK_PREREQUISITES",
        });
      } finally {
        await restore();
        pendingRestore = null;
      }
    },
  );
});
