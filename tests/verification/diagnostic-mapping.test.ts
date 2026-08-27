/**
 * T038 — real command-path mapping of application, orchestration, Podman,
 * Compose, and database failures to the closed Safe Diagnostic contract.
 *
 * References: FR-007, SC-004; quickstart.md §3 (closed-shape/nondisclosure
 * outcomes on command standard output/error and application logs);
 * contracts/foundation-operations.md §Safe diagnostic contract / §Failure
 * behavior; data-model.md §Safe Diagnostic; plan.md §Configuration and
 * startup (raw child-process output is never passed through);
 * authorization commit `875c8650e98789084c46f2abaa9bd0cde7616d58`
 * (PROJECT-STATUS.md `Authorized Implementation`); Constitution Principles
 * I–VI (esp. I security by design, IV privacy and data minimization, V
 * proportionate verification); accepted T023 injected-collaborator contract
 * `tests/verification/diagnostic-surfaces.test.ts` and the accepted T037
 * real-CLI sandbox pattern `tests/verification/foundation-command-adapters.test.ts`.
 *
 * The T023 suite proves the closed diagnostic-surface contract through
 * INJECTED collaborators. This suite completes the T038 evidence on the REAL
 * command path — the actual script, not a mock — in a throwaway sandbox
 * checkout (the script derives its repository root, its ignored local
 * `.env.development.local` source, and its `.foundation-state/` journal,
 * lock, and retained-process-log paths from its own location, so a copied
 * script exercises the exact real command path without touching the
 * developer's real local files or runtime state):
 *   - APPLICATION FAILURE (the spawned daily server process): a startup
 *     failure of the native server application (a failed entry import — the
 *     class Node would otherwise dump as a raw exception/stack/module-path
 *     report) maps to EXACTLY ONE closed Safe Diagnostic on the retained
 *     application log the child's stdio is bound to, and to the closed
 *     `STARTUP_FAILED` diagnostic on the command surfaces; the command fails
 *     non-zero with no readiness claim.
 *   - PODMAN/COMPOSE TOOL FAILURE: a real `compose up` child-process failure
 *     (a stub `podman` on the sandbox PATH exiting non-zero with raw standard
 *     error text) maps to the closed `STARTUP_FAILED` database diagnostic and
 *     never passes the raw child-process output, exit text, or host/container
 *     detail through to any surface; no application process is started.
 *   - NONDISCLOSURE: the injected configuration credential sentinel, the raw
 *     child-process standard-error sentinel, and the sandbox filesystem path
 *     (the detail raw dumps carry) are absent from every named surface — the
 *     command surfaces and the retained application log — in exact form and
 *     in every deterministic encoded form (URI/URI-component,
 *     base64/base64url, hex, JSON-escaped, unicode-escaped).
 *   - CLOSED SHAPE: every unit every in-scope surface emits is exactly one
 *     closed Safe Diagnostic — allowlisted fields and values only, no
 *     additional or free-form field (additional-field rejection), and no
 *     success output accompanies a failure.
 *
 * No real engine is required or contacted, no real Podman mutation path
 * runs, and no listener survives a probe: the database adapter is a stub
 * `podman` on the sandbox PATH, and the application process is the real
 * spawned server child failing closed before it binds anything. This suite
 * adds no Verification lifecycle/Compose behavior, no `foundation:cleanup`
 * exposure, and no T039+ adapter coverage.
 */

import { execFile } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Bounded wall-clock budget for one real CLI invocation (milliseconds). */
const CLI_TIMEOUT_MS = 90_000;

/** An uncommon daily application port so endpoint probes stay deterministic. */
const SANDBOX_APP_PORT = 4197;

/** The retained application-log directory of the daily server process. */
const SERVER_LOG_RELATIVE_PATH = path.join(
  ".foundation-state",
  "development",
  "logs",
  "server.log",
);

/**
 * Unique synthetic nondisclosure sentinels (SC-004). None is a real secret or
 * Production value; each transforms under the exercised encodings.
 */
const S_CREDENTIAL = "NDT038~safe!credential(4c8f)";
const S_TOOL_STDERR = "NDT038/podman-raw-stderr 9e4d=";

/** The canonical Development identity with the sentinel credential embedded. */
function developmentEnvironmentRecord(): string {
  return [
    "APP_ENVIRONMENT=development",
    "RUNTIME_PROFILE=daily",
    "APP_HOST=127.0.0.1",
    `APP_PORT=${SANDBOX_APP_PORT}`,
    `PUBLIC_ORIGIN=http://127.0.0.1:${SANDBOX_APP_PORT}`,
    `DATABASE_URL=mysql://songhealth_dev:${S_CREDENTIAL}@127.0.0.1:3306/songhealth_development`,
    "DATABASE_POOL_MAX=5",
    "PROXY_POLICY=none",
    "LOG_LEVEL=info",
    "FIXTURE_PROVENANCE=synthetic",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// The closed SafeDiagnostic sets this suite enforces (mirrored from the
// accepted closed schema: apps/server/src/config.ts SAFE_DIAGNOSTIC_SCHEMA /
// foundation-http.openapi.yaml SafeDiagnostic).
// ---------------------------------------------------------------------------

const SAFE_DIAGNOSTIC_REASON_CODES = [
  "OPERATIONAL_FAILURE",
  "BUILD_FAILED",
  "STARTUP_FAILED",
  "CONFIG_MISSING",
  "CONFIG_EMPTY",
  "CONFIG_MALFORMED",
  "CONFIG_UNSUPPORTED",
  "CONFIG_OUT_OF_RANGE",
  "CONFIG_IDENTITY_CONFLICT",
  "CONFIG_REJECTION_NOT_ENFORCED",
  "DATABASE_UNAVAILABLE",
  "MIGRATION_FAILED",
  "MIGRATIONS_PENDING",
  "MIGRATION_STATUS_FAILED",
  "LIVENESS_FAILED",
  "READINESS_FAILED",
  "ISOLATION_FAILED",
  "PROXY_CONTRACT_FAILED",
  "ROUTE_UNREACHABLE",
  "OPERATION_INTERRUPTED",
  "RESOURCE_OWNERSHIP_UNPROVEN",
  "RESOURCE_INVENTORY_CHANGED",
  "DATA_INTEGRITY_UNPROVEN",
  "DATA_RECONSTRUCTIBILITY_UNPROVEN",
  "NON_DESTRUCTIVE_REPAIR_UNAVAILABLE",
  "MANUAL_REVIEW_REQUIRED",
  "PREREQUISITE_FAILED",
  "CLEANUP_FAILED",
  "REPORT_INVALID",
  "REPORT_EMISSION_FAILED",
  "SECRET_SCANNER_FAILED",
  "COMMITTED_SECRET_DETECTED",
  "DEPENDENCY_FINDING_UNREVIEWED",
  "DEPENDENCY_FINDING_BLOCKING",
  "DEPENDENCY_EXCEPTION_EXPIRED",
  "DEPENDENCY_EVIDENCE_MISMATCH",
  "ASVS_EVIDENCE_INCOMPLETE",
] as const;

const SAFE_DIAGNOSTIC_SCOPES = ["foundation", "daily", "verification"] as const;

const SAFE_DIAGNOSTIC_COMPONENTS = [
  "orchestration",
  "configuration",
  "application",
  "database",
  "migration",
  "proxy",
  "public",
  "admin",
  "reporting",
  "cleanup",
  "security",
] as const;

const SAFE_DIAGNOSTIC_REMEDIATIONS = [
  "CHECK_PREREQUISITES",
  "FIX_CONFIGURATION",
  "CHECK_DATABASE",
  "RUN_MIGRATION",
  "INSPECT_OWNERSHIP",
  "RETRY_SAFE_OPERATION",
  "RUN_CONFIRMED_RECOVERY",
  "RUN_CONFIRMED_RESET",
  "REVIEW_MANUALLY",
  "REVIEW_SECURITY_EVIDENCE",
  "NONE",
] as const;

const SAFE_CONFIGURATION_KEYS = [
  "APP_ENVIRONMENT",
  "RUNTIME_PROFILE",
  "APP_HOST",
  "APP_PORT",
  "PUBLIC_ORIGIN",
  "DATABASE_URL",
  "DATABASE_POOL_MAX",
  "PROXY_POLICY",
  "LOG_LEVEL",
  "FIXTURE_PROVENANCE",
] as const;

/** The exact closed field set; nothing else may appear on any surface. */
const SAFE_DIAGNOSTIC_KEYS = [
  "reasonCode",
  "diagnosticScope",
  "component",
  "configurationKey",
  "remediation",
] as const;

const REQUIRED_DIAGNOSTIC_KEYS = [
  "reasonCode",
  "diagnosticScope",
  "component",
  "remediation",
] as const;

// ---------------------------------------------------------------------------
// Surface assertions.
// ---------------------------------------------------------------------------

/** One closed Safe Diagnostic as emitted on the command surfaces. */
interface DiagnosticRecord {
  reasonCode: string;
  diagnosticScope: string;
  component: string;
  remediation: string;
  configurationKey?: string;
}

/**
 * Prove one emitted surface unit is EXACTLY one closed Safe Diagnostic and
 * return the validated record. A non-object, an object with any additional
 * field, a missing required field, or any non-allowlisted value fails here —
 * free-form messages, invented fields, and raw values are prohibited.
 */
function expectClosedDiagnostic(unit: unknown): DiagnosticRecord {
  expect(
    typeof unit === "object" && unit !== null && !Array.isArray(unit),
    "every surface unit must be exactly one closed SafeDiagnostic object",
  ).toBe(true);
  const record = unit as Record<string, unknown>;
  const keys = Object.keys(record);
  expect(keys.length).toBeGreaterThan(0);
  for (const key of keys) {
    expect(SAFE_DIAGNOSTIC_KEYS).toContain(key);
  }
  for (const key of REQUIRED_DIAGNOSTIC_KEYS) {
    expect(keys).toContain(key);
  }
  expect(SAFE_DIAGNOSTIC_REASON_CODES).toContain(record.reasonCode);
  expect(SAFE_DIAGNOSTIC_SCOPES).toContain(record.diagnosticScope);
  expect(SAFE_DIAGNOSTIC_COMPONENTS).toContain(record.component);
  expect(SAFE_DIAGNOSTIC_REMEDIATIONS).toContain(record.remediation);
  if (record.configurationKey !== undefined) {
    expect(SAFE_CONFIGURATION_KEYS).toContain(record.configurationKey);
  }
  return record as unknown as DiagnosticRecord;
}

/** Parse one emitted surface into its closed diagnostic units (one per line). */
function parseSurfaceUnits(text: string): unknown[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line));
}

/**
 * Every deterministic encoded form of a sentinel value: exact, URI and
 * URI-component encodings, base64 and base64url, lowercase and uppercase hex,
 * the JSON string-escaped form, and the fully unicode-escaped form.
 */
function encodedForms(value: string): string[] {
  const utf8 = Buffer.from(value, "utf8");
  const unicodeEscaped = [...value]
    .map((char) => `\\u${char.codePointAt(0)!.toString(16).padStart(4, "0")}`)
    .join("");
  const forms = new Set<string>([
    value,
    encodeURI(value),
    encodeURIComponent(value),
    utf8.toString("base64"),
    utf8.toString("base64url"),
    utf8.toString("hex"),
    utf8.toString("hex").toUpperCase(),
    JSON.stringify(value).slice(1, -1),
    unicodeEscaped,
  ]);
  return [...forms];
}

/**
 * Prove a surface carries no sentinel (exact or encoded) and no forbidden
 * detail (FR-007/SC-004): no raw configuration value, credential, connection
 * string, exception/stack text, filesystem path, or host/container detail.
 */
function expectSurfaceSanitized(surfaceText: string, sentinels: readonly string[]): void {
  for (const sentinel of sentinels) {
    for (const form of encodedForms(sentinel)) {
      expect(
        surfaceText.includes(form),
        `sentinel form leaked onto the surface: ${form}`,
      ).toBe(false);
    }
  }
  const lowered = surfaceText.toLowerCase();
  for (const marker of [" at ", "error:", "econnrefused", "mysql://", "podman", "compose", "stack", "throw "]) {
    expect(
      lowered.includes(marker),
      `forbidden detail leaked onto the surface: ${marker}`,
    ).toBe(false);
  }
}

/** One real CLI invocation's outcome. */
interface CliOutcome {
  exitCode: number;
  stdout: string;
  stderr: string;
}

// ---------------------------------------------------------------------------
// Sandbox: a throwaway checkout-scoped copy of the real repository.
// ---------------------------------------------------------------------------

/**
 * The sandbox harness. `repositoryPath` is the copied checkout the script
 * derives its root from; `run` executes the REAL operations entry point inside
 * it with the sandbox `PATH` (stub `podman`) applied; `readServerLog` reads
 * the retained application log of the daily server process; `resetState`
 * removes the copied checkout's `.foundation-state` so each probe starts from
 * the documented clean local state.
 */
interface Sandbox {
  repositoryPath: string;
  run: (args: string[]) => Promise<CliOutcome>;
  readServerLog: () => Promise<string | null>;
  removeServerSourceModule: (relativePath: string) => Promise<void>;
  resetState: () => Promise<void>;
  pathText: string;
}

async function createSandbox(): Promise<Sandbox> {
  const root = await mkdtemp(path.join(os.tmpdir(), "songhealth-t038-"));
  const repositoryPath = path.join(root, "repo");

  // The CURRENT working tree of the checkout — the exact modified sources the
  // implementation under review consists of — minus `.git`, the installed
  // `node_modules`, and any ignored local runtime state.
  await mkdir(repositoryPath, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const pack = execFile(
      "tar",
      [
        "-C",
        REPOSITORY_ROOT,
        "-cf",
        "-",
        "--exclude=./.git",
        "--exclude=./node_modules",
        "--exclude=./.foundation-state",
        ".",
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    const extract = execFile("tar", ["-x", "-C", repositoryPath], {
      maxBuffer: 64 * 1024 * 1024,
    });
    pack.on("error", reject);
    if (pack.stdout === null || extract.stdin === null) {
      reject(new Error("tar pipe could not be established"));
      return;
    }
    pack.stdout.pipe(extract.stdin);
    extract.on("error", reject);
    extract.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`tar exited with code ${code}`)),
    );
  });

  // The installed dependency tree is reused read-only through a symlink, so
  // the spawned server child resolves the real fastify/kysely modules without
  // a second install.
  await symlink(
    path.join(REPOSITORY_ROOT, "node_modules"),
    path.join(repositoryPath, "node_modules"),
    "dir",
  );

  // The ignored local Development configuration copy (sentinel credential).
  await writeFile(
    path.join(repositoryPath, ".env.development.local"),
    `${developmentEnvironmentRecord()}\n`,
    "utf8",
  );

  // A stub `podman` on the sandbox PATH: exiting zero models the tool
  // succeeding without any engine; its behavior is swapped per probe.
  const stubBin = path.join(root, "stubbin");
  await mkdir(stubBin, { recursive: true });
  const stubPodman = path.join(stubBin, "podman");
  await writeFile(stubPodman, "#!/bin/sh\nexit 0\n", "utf8");
  await chmod(stubPodman, 0o755);

  const run = async (args: string[]): Promise<CliOutcome> => {
    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [path.join(repositoryPath, "scripts", "foundation-operations.mjs"), ...args],
        {
          cwd: repositoryPath,
          timeout: CLI_TIMEOUT_MS,
          env: { ...process.env, PATH: `${stubBin}:${process.env.PATH ?? ""}` },
        },
      );
      return { exitCode: 0, stdout, stderr };
    } catch (error) {
      const failure = error as { code?: number; stdout?: string; stderr?: string; killed?: boolean };
      if (failure.killed === true) {
        throw new Error(`real CLI invocation exceeded its ${CLI_TIMEOUT_MS}ms bound`);
      }
      return {
        exitCode: typeof failure.code === "number" ? failure.code : 1,
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? "",
      };
    }
  };

  return {
    repositoryPath,
    run,
    readServerLog: async () => {
      try {
        return await readFile(path.join(repositoryPath, SERVER_LOG_RELATIVE_PATH), "utf8");
      } catch {
        return null;
      }
    },
    removeServerSourceModule: async (relativePath) => {
      await rm(path.join(repositoryPath, relativePath), { force: true });
    },
    resetState: async () => {
      await rm(path.join(repositoryPath, ".foundation-state"), { recursive: true, force: true });
    },
    pathText: repositoryPath,
  };
}

/** The single shared sandbox (created once; state is reset per probe). */
let sandbox: Sandbox;

beforeAll(async () => {
  sandbox = await createSandbox();
}, 120_000);

afterAll(async () => {
  await rm(path.dirname(sandbox.repositoryPath), { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Application failure: the spawned daily server process fails to start.
// ---------------------------------------------------------------------------

describe("Real dev:start application-failure mapping — T038", () => {
  it("a server application startup failure maps to exactly one closed Safe Diagnostic on the retained application log and to closed STARTUP_FAILED diagnostics on the command surfaces — no raw passthrough, non-zero, no readiness claim", async () => {
    await sandbox.resetState();
    // The raw-input side: the spawned server child fails its entry import —
    // the failure class Node otherwise reports as a raw exception/stack/
    // module-path dump on the child's bound stdio (the retained application
    // log). The CLI-side validation still accepts (it imports only the
    // canonical configuration boundary), so the spawned child is what fails.
    await sandbox.removeServerSourceModule(
      path.join("apps", "server", "src", "migrations.ts"),
    );

    const outcome = await sandbox.run(["dev:start"]);

    // The command fails non-zero and makes no ready/started claim.
    expect(outcome.exitCode).not.toBe(0);
    expect(outcome.stdout).not.toContain("dev:start:");

    // The command surfaces carry the failure as closed SafeDiagnostic units
    // (one per line, exactly the closed shape — additional-field rejection),
    // including the documented startup failure of the application process.
    for (const text of [outcome.stdout, outcome.stderr]) {
      const units = parseSurfaceUnits(text);
      expect(units.length).toBeGreaterThan(0);
      const records = units.map((unit) => expectClosedDiagnostic(unit));
      expect(
        records.some(
          (record) =>
            record.reasonCode === "STARTUP_FAILED" &&
            record.diagnosticScope === "daily" &&
            record.component === "application",
        ),
        "the command surfaces carry the closed STARTUP_FAILED application diagnostic",
      ).toBe(true);
    }

    // The retained application log of the spawned server process carries
    // EXACTLY ONE closed Safe Diagnostic — never the raw exception, stack,
    // module path, or host/port detail the unhandled failure would print.
    const serverLog = await sandbox.readServerLog();
    expect(serverLog).not.toBeNull();
    const logUnits = parseSurfaceUnits(serverLog ?? "");
    expect(logUnits.length).toBe(1);
    const logRecord = expectClosedDiagnostic(logUnits[0]);
    expect(logRecord.reasonCode).toBe("STARTUP_FAILED");
    expect(logRecord.diagnosticScope).toBe("daily");
    expect(logRecord.component).toBe("application");
    expect(logRecord.remediation).toBe("RETRY_SAFE_OPERATION");

    // Nondisclosure (SC-004) on every named surface of this failure: the
    // configuration credential sentinel, the sandbox filesystem path (the
    // detail raw dumps carry), and every forbidden marker are absent in exact
    // and encoded form from the command surfaces and the application log.
    for (const surface of [outcome.stdout, outcome.stderr, serverLog ?? ""]) {
      expectSurfaceSanitized(surface, [S_CREDENTIAL, sandbox.pathText]);
    }
  }, 180_000);

  it("the retained application log of a failed server start records no framework request logging and no listener was bound — the failure precedes readiness", async () => {
    await sandbox.resetState();
    await sandbox.removeServerSourceModule(
      path.join("apps", "server", "src", "migrations.ts"),
    );

    const outcome = await sandbox.run(["dev:start"]);

    expect(outcome.exitCode).not.toBe(0);
    const serverLog = await sandbox.readServerLog();
    expect(serverLog ?? "").not.toContain("incoming request");
    expect(serverLog ?? "").not.toContain("request completed");
    // No ready claim anywhere on the failure surfaces.
    expect(outcome.stdout).not.toContain("ready");
    expect(outcome.stderr).not.toContain("ready");
    // The failed child leaves no recorded PID handles behind on the log
    // surface (the supervisor observed the exit; the log stays one unit).
    const logDirectory = path.join(
      sandbox.repositoryPath,
      path.dirname(SERVER_LOG_RELATIVE_PATH),
    );
    const entries = await readdir(logDirectory).catch(() => [] as string[]);
    expect(entries).toEqual(["server.log"]);
  }, 180_000);
});

// ---------------------------------------------------------------------------
// Podman/Compose tool failure: the real child process fails.
// ---------------------------------------------------------------------------

describe("Real dev:start Podman/Compose tool-failure mapping — T038", () => {
  it("a failing compose child process maps to the closed STARTUP_FAILED database diagnostic — the raw tool output, exit text, and container detail never reach any surface, and no application process starts", async () => {
    await sandbox.resetState();
    // Restore the full checkout (the previous probe removed a server source
    // module) and swap the stub `podman` to fail with raw standard error.
    await cp(
      path.join(REPOSITORY_ROOT, "apps", "server", "src", "migrations.ts"),
      path.join(sandbox.repositoryPath, "apps", "server", "src", "migrations.ts"),
    );
    const stubPodman = path.join(path.dirname(sandbox.repositoryPath), "stubbin", "podman");
    await writeFile(
      stubPodman,
      `#!/bin/sh\nif [ "$1" = "compose" ]; then echo "time=\\"2026-08-27T00:00:00Z\\" level=error msg=\\"${S_TOOL_STDERR} failed\\"" >&2; exit 1; fi\nexit 0\n`,
      "utf8",
    );

    const outcome = await sandbox.run(["dev:start"]);

    // The mapped tool failure is actionable and non-zero.
    expect(outcome.exitCode).not.toBe(0);
    for (const text of [outcome.stdout, outcome.stderr]) {
      const units = parseSurfaceUnits(text);
      expect(units.length).toBeGreaterThan(0);
      const records = units.map((unit) => expectClosedDiagnostic(unit));
      expect(
        records.some(
          (record) =>
            record.reasonCode === "STARTUP_FAILED" &&
            record.diagnosticScope === "daily" &&
            record.component === "database",
        ),
        "the command surfaces carry the closed STARTUP_FAILED database diagnostic",
      ).toBe(true);
    }

    // No application process was started: no retained application log exists.
    const serverLog = await sandbox.readServerLog();
    expect(serverLog).toBeNull();

    // The raw child-process standard error never passes through to any
    // surface — exact or encoded — and no host/container detail appears.
    for (const surface of [outcome.stdout, outcome.stderr]) {
      expectSurfaceSanitized(surface, [S_TOOL_STDERR, S_CREDENTIAL, sandbox.pathText]);
    }

    // Restore the succeeding stub for any later probe.
    await writeFile(stubPodman, "#!/bin/sh\nexit 0\n", "utf8");
  }, 180_000);
});
