/**
 * T037 — real package/CLI command-adapter contract for the exposed
 * status/inventory, interruption-injection, Development recovery, confirmed
 * Development reset, and Development persistence-check commands.
 *
 * References: FR-003–FR-004, FR-008, FR-017; contracts/foundation-operations.md
 * §Commands (`foundation:status`, `foundation:inventory`, `dev:reset`,
 * `foundation:recover`, `foundation:test-interruption`,
 * `dev:persistence-check`) and §Safe diagnostic contract; quickstart §2/§5;
 * authorization commit `18b440cc28cd409c41eb85035d91a0c72bc4d91b`
 * (PROJECT-STATUS.md `Authorized Implementation`); Constitution Principles
 * I–VI (esp. I security by design, III traceability, V proportionate
 * verification).
 *
 * The package assertions read the committed `package.json`. The CLI
 * assertions drive the REAL operations entry point — the actual script, not
 * a mock — in a throwaway sandbox checkout: the script derives its
 * repository root, its ignored local `.env.development.local` source, and
 * its `.foundation-state/` journal/lock/confirmation paths from its own
 * location (the checkout-scoped design), so a copied script exercises the
 * exact real command path without touching the developer's real local
 * files, real runtime state, or the files the parallel T036-B01 routing
 * suite manipulates. No real engine is required or contacted successfully,
 * and no Podman mutation path runs: the refusal probes prove each entry
 * point ROUTES to its correct bounded operation and refuses closed
 * (invalid target/action/phase/repair arguments, missing or cross-target or
 * hosted configuration, missing/stale confirmations) before any mutation;
 * the one journal-writing probe (the acceptance-only injector, whose
 * requested `(action, phase)` IS the injection point and therefore performs
 * no service work) proves the interrupted journal, the immutable
 * `OPERATION_INTERRUPTED` primary failure, and the read-only
 * single-decision `foundation:status` derivation. Where the exact refusal
 * reason code depends on whether a Podman CLI exists on the machine (both
 * outcomes are closed refusals of the same read-only gate), the assertion
 * pins the closed value set instead of one value.
 *
 * This suite adds no Verification lifecycle/Compose behavior, no
 * `foundation:cleanup` exposure (not this task's scope), and no T038+
 * adapter coverage.
 */

import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
const OPERATIONS_SCRIPT = path.join(REPOSITORY_ROOT, "scripts", "foundation-operations.mjs");

/** Bounded wall-clock budget for one real CLI invocation (milliseconds). */
const CLI_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Synthetic, non-secret local state. The configuration values are the
// committed example's canonical identity; the password is a unique sentinel
// so nondisclosure assertions can scan every output surface.
// ---------------------------------------------------------------------------

/** The canonical Development identity (the `.env.development.example` shape). */
const DEVELOPMENT_RECORD = [
  "APP_ENVIRONMENT=development",
  "RUNTIME_PROFILE=daily",
  "APP_HOST=127.0.0.1",
  "APP_PORT=4173",
  "PUBLIC_ORIGIN=http://127.0.0.1:4173",
  "DATABASE_URL=mysql://songhealth_dev:adapter-sentinel-dev-77c1@127.0.0.1:3306/songhealth_development",
  "DATABASE_POOL_MAX=5",
  "PROXY_POLICY=none",
  "LOG_LEVEL=info",
  "FIXTURE_PROVENANCE=synthetic",
].join("\n");

/** The hosted/Production environment refusal fixture (quickstart §3). */
const HOSTED_ENVIRONMENT_RECORD = DEVELOPMENT_RECORD.replace(
  "APP_ENVIRONMENT=development",
  "APP_ENVIRONMENT=production",
);

/** The cross-target runtime-profile refusal fixture. */
const CROSS_TARGET_PROFILE_RECORD = DEVELOPMENT_RECORD.replace(
  "RUNTIME_PROFILE=daily",
  "RUNTIME_PROFILE=verification",
);

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
 * The throwaway sandbox checkout: one copied operations script whose module
 * path makes every checkout-scoped path (environment file, journal, lock,
 * confirmation store) resolve inside the sandbox. Created once for the
 * suite; removed in `afterAll`.
 */
const sandbox = {
  root: "",
  script: "",
  envFile: "",
  journalFile: "",
  lockFile: "",
  confirmationFile: "",
};

beforeAll(async () => {
  sandbox.root = await mkdtemp(path.join(os.tmpdir(), "songhealth-t037-adapters-"));
  // The script resolves its checkout-scoped paths (environment file,
  // canonical boundary import, runtime state) from its own location, so the
  // sandbox carries the exact committed script plus the repository trees
  // that script references: the server sources of the canonical
  // configuration boundary and the infra manifest.
  await cp(path.join(REPOSITORY_ROOT, "scripts"), path.join(sandbox.root, "scripts"), {
    recursive: true,
  });
  await cp(path.join(REPOSITORY_ROOT, "apps"), path.join(sandbox.root, "apps"), {
    recursive: true,
  });
  await cp(path.join(REPOSITORY_ROOT, "infra"), path.join(sandbox.root, "infra"), {
    recursive: true,
  });
  // The canonical boundary imports its locked workspace dependencies
  // (`@sinclair/typebox`), resolved from the repository's installed
  // node_modules — symlinked, never reinstalled, so the sandbox exercises
  // the exact locked graph.
  await symlink(
    path.join(REPOSITORY_ROOT, "node_modules"),
    path.join(sandbox.root, "node_modules"),
  );
  sandbox.script = path.join(sandbox.root, "scripts", "foundation-operations.mjs");
  sandbox.envFile = path.join(sandbox.root, ".env.development.local");
  const stateDirectory = path.join(sandbox.root, ".foundation-state", "development");
  sandbox.journalFile = path.join(stateDirectory, "operation.json");
  sandbox.lockFile = path.join(stateDirectory, "operation.lock");
  sandbox.confirmationFile = path.join(stateDirectory, "confirmations.json");
});

afterAll(async () => {
  if (sandbox.root !== "") {
    await rm(sandbox.root, { recursive: true, force: true });
  }
});

/**
 * Run the REAL operations entry point (the sandboxed copy of the exact
 * committed script) with one argument vector. The non-zero exit of a refused
 * command surfaces through the execFile error, whose captured stdout/stderr
 * are the command's owned surfaces.
 */
async function runCommand(args: string[]): Promise<CliOutcome> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [sandbox.script, ...args], {
      cwd: sandbox.root,
      timeout: CLI_TIMEOUT_MS,
    });
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

/**
 * Install EXACTLY the requested synthetic sandbox environment file: written
 * when `record` is a string, removed when `undefined`, and the previous
 * sandbox content is always restored. The sandbox runtime-state paths are
 * removed with it, so every case starts from a clean local state.
 */
async function installLocalState(record: string | undefined): Promise<() => Promise<void>> {
  let saved: string | null = null;
  try {
    saved = await readFile(sandbox.envFile, "utf8");
  } catch {
    saved = null;
  }
  for (const absolute of [sandbox.journalFile, sandbox.lockFile, sandbox.confirmationFile]) {
    await rm(absolute, { force: true });
  }
  if (record === undefined) {
    await rm(sandbox.envFile, { force: true });
  } else {
    await writeFile(sandbox.envFile, `${record}\n`, "utf8");
  }
  return async () => {
    if (saved === null) {
      await rm(sandbox.envFile, { force: true });
    } else {
      await writeFile(sandbox.envFile, saved, "utf8");
    }
    for (const absolute of [
      sandbox.journalFile,
      sandbox.lockFile,
      sandbox.confirmationFile,
    ]) {
      await rm(absolute, { force: true });
    }
  };
}

/** Parse the first JSON diagnostic line the command emitted on stdout. */
function firstDiagnostic(stdout: string): CliDiagnostic {
  const line = stdout.split(/\r?\n/).find((candidate) => candidate.startsWith("{"));
  expect(line).toBeDefined();
  return JSON.parse(line as string) as CliDiagnostic;
}

/** The synthetic URL sentinel is absent from a surface in exact and encoded form. */
function expectNoSentinel(surface: string): void {
  expect(surface).not.toContain("adapter-sentinel");
  expect(surface).not.toContain(encodeURIComponent("adapter-sentinel"));
}

/** Assert one full refusal outcome: non-zero exit, closed diagnostic, no sentinel. */
function expectRefused(
  outcome: CliOutcome,
  expected: {
    reasonCodes: readonly string[];
    diagnosticScope: string;
    component: string;
    remediations?: readonly string[];
    configurationKey?: string;
  },
): CliDiagnostic {
  expect(outcome.code).not.toBe(0);
  const diagnostic = firstDiagnostic(outcome.stdout);
  expect(expected.reasonCodes).toContain(diagnostic.reasonCode);
  expect(diagnostic.diagnosticScope).toBe(expected.diagnosticScope);
  expect(diagnostic.component).toBe(expected.component);
  if (expected.remediations !== undefined) {
    expect(expected.remediations).toContain(diagnostic.remediation);
  } else {
    expect(typeof diagnostic.remediation).toBe("string");
    expect(diagnostic.remediation.length).toBeGreaterThan(0);
  }
  if (expected.configurationKey !== undefined) {
    expect(diagnostic.configurationKey).toBe(expected.configurationKey);
  }
  // The diagnostic is emitted on BOTH command surfaces, and nothing else —
  // no values, no sentinel, no raw error text.
  expectNoSentinel(outcome.stdout);
  expectNoSentinel(outcome.stderr);
  return diagnostic;
}

// ---------------------------------------------------------------------------
// Package routing — the six authorized commands reach the operations entry
// point (Operations Contract §Commands; quickstart §2/§5).
// ---------------------------------------------------------------------------

describe("T037 package command adapters", () => {
  it("exposes exactly the authorized commands through the operations entry point", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(REPOSITORY_ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const exposed: Record<string, string> = {
      "foundation:status": "node scripts/foundation-operations.mjs foundation:status",
      "foundation:inventory": "node scripts/foundation-operations.mjs foundation:inventory",
      "dev:reset": "node scripts/foundation-operations.mjs dev:reset",
      "foundation:recover": "node scripts/foundation-operations.mjs foundation:recover",
      "foundation:test-interruption":
        "node scripts/foundation-operations.mjs foundation:test-interruption",
      "dev:persistence-check":
        "node scripts/foundation-operations.mjs dev:persistence-check",
    };
    for (const [name, script] of Object.entries(exposed)) {
      expect(manifest.scripts[name]).toBe(script);
    }
  });
});

// ---------------------------------------------------------------------------
// Real CLI seam — argument validation, target routing, and closed refusals
// before any mutation.
// ---------------------------------------------------------------------------

describe("T037 real CLI command adapters — argument and identity refusals", () => {
  it(
    "foundation:status refuses an invalid or hosted target before any journal work",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        for (const target of ["production", "hosted", "staging"]) {
          const outcome = await runCommand(["foundation:status", "--target", target]);
          expectRefused(outcome, {
            reasonCodes: ["OPERATIONAL_FAILURE"],
            diagnosticScope: "foundation",
            component: "orchestration",
            remediations: ["CHECK_PREREQUISITES"],
          });
        }
      } finally {
        await restore();
      }
    },
  );

  it(
    "foundation:inventory refuses unknown targets and actions before any inspection",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        const target = await runCommand([
          "foundation:inventory",
          "--target",
          "production",
          "--action",
          "status",
        ]);
        expectRefused(target, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES"],
        });

        const action = await runCommand([
          "foundation:inventory",
          "--target",
          "development",
          "--action",
          "detonate",
        ]);
        expectRefused(action, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES"],
        });
      } finally {
        await restore();
      }
    },
  );

  it(
    "foundation:recover refuses non-Development targets and non-allowlisted repairs before any collaborator work",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        const crossTarget = await runCommand([
          "foundation:recover",
          "--target",
          "verification",
          "--operation",
          "start",
          "--repair",
          "recreate-database-runtime-preserve-volume",
          "--confirm",
          "synthetic-recovery-token",
        ]);
        expectRefused(crossTarget, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES"],
        });

        const genericRepair = await runCommand([
          "foundation:recover",
          "--target",
          "development",
          "--operation",
          "start",
          "--repair",
          "recreate-everything",
          "--confirm",
          "synthetic-recovery-token",
        ]);
        expectRefused(genericRepair, {
          reasonCodes: ["NON_DESTRUCTIVE_REPAIR_UNAVAILABLE"],
          diagnosticScope: "daily",
          component: "orchestration",
          remediations: ["REVIEW_MANUALLY"],
        });
      } finally {
        await restore();
      }
    },
  );

  it(
    "foundation:test-interruption refuses invalid targets, actions, and phases before any work",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        const target = await runCommand([
          "foundation:test-interruption",
          "--target",
          "hosted",
          "--action",
          "start",
          "--phase",
          "after-journal",
        ]);
        expectRefused(target, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES"],
        });
      } finally {
        await restore();
      }

      const restoreDev = await installLocalState(DEVELOPMENT_RECORD);
      try {
        const action = await runCommand([
          "foundation:test-interruption",
          "--target",
          "development",
          "--action",
          "detonate",
          "--phase",
          "after-journal",
        ]);
        expectRefused(action, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES"],
        });

        const phase = await runCommand([
          "foundation:test-interruption",
          "--target",
          "development",
          "--action",
          "start",
          "--phase",
          "before-journal",
        ]);
        expectRefused(phase, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES"],
        });
      } finally {
        await restoreDev();
      }
    },
  );

  it(
    "foundation:test-interruption refuses missing, cross-target, and hosted configuration before any injection",
    { timeout: CLI_TIMEOUT_MS + 60_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        const missing = await runCommand([
          "foundation:test-interruption",
          "--target",
          "development",
          "--action",
          "start",
          "--phase",
          "after-journal",
        ]);
        expectRefused(missing, {
          reasonCodes: ["CONFIG_MISSING"],
          diagnosticScope: "daily",
          component: "configuration",
          remediations: ["FIX_CONFIGURATION"],
        });
      } finally {
        await restore();
      }

      const crossTargetRestore = await installLocalState(CROSS_TARGET_PROFILE_RECORD);
      try {
        const crossTarget = await runCommand([
          "foundation:test-interruption",
          "--target",
          "development",
          "--action",
          "start",
          "--phase",
          "after-journal",
        ]);
        expectRefused(crossTarget, {
          reasonCodes: ["CONFIG_IDENTITY_CONFLICT"],
          diagnosticScope: "daily",
          component: "configuration",
          remediations: ["FIX_CONFIGURATION"],
          configurationKey: "RUNTIME_PROFILE",
        });
      } finally {
        await crossTargetRestore();
      }

      const hostedRestore = await installLocalState(HOSTED_ENVIRONMENT_RECORD);
      try {
        const hosted = await runCommand([
          "foundation:test-interruption",
          "--target",
          "development",
          "--action",
          "start",
          "--phase",
          "after-journal",
        ]);
        expectRefused(hosted, {
          reasonCodes: ["CONFIG_IDENTITY_CONFLICT"],
          diagnosticScope: "daily",
          component: "configuration",
          remediations: ["FIX_CONFIGURATION"],
          configurationKey: "APP_ENVIRONMENT",
        });
      } finally {
        await hostedRestore();
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Real CLI seam — the injector's journal, the immutable primary failure, and
// the read-only status derivation (quickstart §5's first two commands).
// ---------------------------------------------------------------------------

describe("T037 real CLI command adapters — interruption journal and read-only status", () => {
  it(
    "the injector records the interrupted journal with the immutable primary failure, and foundation:status derives exactly one closed decision without rewriting it",
    { timeout: CLI_TIMEOUT_MS + 90_000 },
    async () => {
      const restore = await installLocalState(DEVELOPMENT_RECORD);
      try {
        const injected = await runCommand([
          "foundation:test-interruption",
          "--target",
          "development",
          "--action",
          "start",
          "--phase",
          "after-journal",
        ]);
        expectRefused(injected, {
          reasonCodes: ["OPERATION_INTERRUPTED"],
          diagnosticScope: "daily",
          component: "orchestration",
          remediations: ["RETRY_SAFE_OPERATION"],
        });

        const journal = JSON.parse(await readFile(sandbox.journalFile, "utf8")) as {
          operationTarget: string;
          runtimeProfile: string;
          action: string;
          phase: string;
          state: string;
          primaryFailure?: { reasonCode: string };
        };
        expect(journal.operationTarget).toBe("development");
        expect(journal.runtimeProfile).toBe("daily");
        expect(journal.action).toBe("start");
        expect(journal.phase).toBe("after-journal");
        expect(journal.state).toBe("interrupted");
        expect(journal.primaryFailure?.reasonCode).toBe("OPERATION_INTERRUPTED");

        const status = await runCommand(["foundation:status", "--target", "development"]);
        expect(status.code).toBe(0);
        expect(status.stdout).toMatch(
          /foundation:status: development recovery decision: (retry|recover|reset|manual-review)\n/,
        );
        expectNoSentinel(status.stdout);
        expectNoSentinel(status.stderr);

        // Read-only means read-only: the journal record the injector wrote
        // is byte-identical after the status observation.
        const journalAfterStatus = await readFile(sandbox.journalFile, "utf8");
        expect(journalAfterStatus).toBe(`${JSON.stringify(journal, null, 2)}\n`);
      } finally {
        await restore();
      }
    },
  );

  it(
    "foundation:status reports the no-pending-state success without fabricating an origin",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(DEVELOPMENT_RECORD);
      try {
        const status = await runCommand(["foundation:status", "--target", "development"]);
        expect(status.code).toBe(0);
        expect(status.stdout).toBe(
          "foundation:status: development has no pending failure or interruption\n",
        );
        expectNoSentinel(status.stdout);
        expectNoSentinel(status.stderr);
      } finally {
        await restore();
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Real CLI seam — confirmed mutation requires a fresh exact token
// (quickstart §2/§5 confirmation boundary; FR-017).
// ---------------------------------------------------------------------------

describe("T037 real CLI command adapters — confirmation-gated mutation refusals", () => {
  it(
    "dev:reset without a fresh exact token refuses read-only before any mutation",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        const missing = await runCommand(["dev:reset"]);
        expectRefused(missing, {
          // Both outcomes are the same read-only unconfirmed-target gate:
          // an unobservable inventory (no Podman CLI) is the closed
          // operational failure; an observable empty one is the closed
          // unproven-ownership refusal. Neither mutates anything.
          reasonCodes: ["OPERATIONAL_FAILURE", "RESOURCE_OWNERSHIP_UNPROVEN"],
          diagnosticScope: "daily",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES", "INSPECT_OWNERSHIP"],
        });

        // A PRESENTED but never-issued token passes the empty-token gate and
        // is refused by the locked drift gate instead: with no Podman CLI the
        // inventory observation itself fails closed as the operational
        // failure; with one and no owned resources the recomputed inventory
        // has changed relative to any issuance. Both are closed refusals
        // that mutate nothing.
        const stale = await runCommand(["dev:reset", "--confirm", "never-issued-token"]);
        expectRefused(stale, {
          reasonCodes: ["OPERATIONAL_FAILURE", "RESOURCE_INVENTORY_CHANGED"],
          diagnosticScope: "daily",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES", "INSPECT_OWNERSHIP"],
        });

        // No confirmation was minted and no durable confirmation state was
        // created by a refused command.
        const confirmations = await readFile(sandbox.confirmationFile, "utf8").catch(
          () => null,
        );
        expect(confirmations).toBeNull();
      } finally {
        await restore();
      }
    },
  );

  it(
    "foundation:inventory --action reset --token-only mints no token without proven exact ownership",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(DEVELOPMENT_RECORD);
      try {
        const outcome = await runCommand([
          "foundation:inventory",
          "--target",
          "development",
          "--action",
          "reset",
          "--token-only",
        ]);
        expectRefused(outcome, {
          reasonCodes: ["OPERATIONAL_FAILURE", "RESOURCE_OWNERSHIP_UNPROVEN"],
          diagnosticScope: "foundation",
          component: "orchestration",
          remediations: ["CHECK_PREREQUISITES", "INSPECT_OWNERSHIP"],
        });
        expect(outcome.stdout).not.toContain("confirmation-");
        expect(outcome.stderr).not.toContain("confirmation-");
      } finally {
        await restore();
      }
    },
  );

  it(
    "foundation:recover with a presented token but no pending origin refuses without repair work and releases the lock",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(DEVELOPMENT_RECORD);
      try {
        const outcome = await runCommand([
          "foundation:recover",
          "--target",
          "development",
          "--operation",
          "start",
          "--repair",
          "recreate-database-runtime-preserve-volume",
          "--confirm",
          "synthetic-recovery-token",
        ]);
        expectRefused(outcome, {
          reasonCodes: ["OPERATIONAL_FAILURE"],
          diagnosticScope: "daily",
          component: "orchestration",
          remediations: ["INSPECT_OWNERSHIP"],
        });

        // The Development lock was released by the refused attempt.
        const lock = await readFile(sandbox.lockFile, "utf8").catch(() => null);
        expect(lock).toBeNull();
      } finally {
        await restore();
      }
    },
  );

  it(
    "dev:persistence-check refuses missing configuration before any marker, restart, or reset work",
    { timeout: CLI_TIMEOUT_MS + 30_000 },
    async () => {
      const restore = await installLocalState(undefined);
      try {
        const missing = await runCommand(["dev:persistence-check"]);
        expectRefused(missing, {
          reasonCodes: ["CONFIG_MISSING"],
          diagnosticScope: "daily",
          component: "configuration",
          remediations: ["FIX_CONFIGURATION"],
        });

        const unconfirmed = await runCommand([
          "dev:persistence-check",
          "--confirm",
          "synthetic-reset-token",
        ]);
        expectRefused(unconfirmed, {
          reasonCodes: ["CONFIG_MISSING"],
          diagnosticScope: "daily",
          component: "configuration",
          remediations: ["FIX_CONFIGURATION"],
        });
      } finally {
        await restore();
      }
    },
  );
});
