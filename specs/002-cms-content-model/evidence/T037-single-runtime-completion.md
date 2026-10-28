# T037 — Single-runtime completion: T021 on 4324, then the UID-1001 runtime deleted

**Status: IN PROGRESS.** T021 runs on the single runtime and passes 14/14. The UID-1001
deletion is waiting for the Product Owner's sudo run. This is a Claude Code self-review only
(Constitution 5.0.0).

## Authorization and scope

- **Product Owner decisions, 2026-10-29** (Claude Code session):
  - Move the T021 coordinator to `http://127.0.0.1:4324` first, then delete the UID-1001
    runtime ("ลบ runtime UID 1001, T021 coordinator ต้องย้ายมาที่ 4324 ก่อน").
  - Port the three T022 native-expectation fixes (`0c09b5e`, an unmerged T022 branch) into
    the T021 spec.
  - Delete every Songhealth runtime of UID 1001: (a) the controller-managed development
    runtime at `127.0.0.1:4322` and (b) the production-foundation Quadlet stack at
    `127.0.0.1:4321`. Other workloads of that account stay untouched.
  - No final backup.
- **Commits** on `task/002-t037-single-runtime-completion`, stacked on T036 (PR #41):
  - `c416ea9`: T021 on the single runtime.
  - `76b1d30`: the ported fixes.
  - The commit adding this record: documentation, retirement scripts and evidence.

## Changes

| Area | Change |
| --- | --- |
| Dev configuration | `deploy/dev-quadlet/astro.dev.config.mjs` combines the canonical `astro.config.mjs` (imported unchanged) with `cmsPublicReadsIntegration()`, plus `strictPort`. It is modeled on the reviewed UID-1001 development configuration in the T021 Gate A bundle. The entrypoint runs `astro dev --config` with it. |
| Route token | The installer creates the pair (podman secret `songhealth-qdev-t021-route-token` and a 0600 client copy, `~/.local/state/songhealth-qdev/t021-route-access.json`). If half is missing it replaces the pair whole, stopping the app first. `uninstall --purge` removes both. |
| Verify | A 14th check: the fixture route answers its route token with the fixture identity and refuses tokenless requests (`403`). |
| Coordinator | `run-cms-public-reads.mjs` targets 4324. It now observes the runtime source through the runtime's `dev-runtime-verify.sh` (`VERIFY: PASS` and the `runtime source` line) instead of the UID-1001 Runtime Controller `status`. Its HOLD messages name the single runtime's remedies. |
| Spec | `cms-public-reads.spec.ts` targets 4324. The three native-expectation fixes are ported unchanged from `0c09b5e`, adapted only to the origin constant. |
| Loader | `loadDevAccessToken` reads the runtime's bare-token `dev-pat` (an `ec_pat_` token) as well as JSON `{ token }` files. |
| Documentation | `development-quadlet.md`, README, AGENTS and the Feature 002 quickstart document the test commands; `tasks.md` adds T037 and a T021 retarget note. |

The three ported fixes match pinned EmDash 1.1.0, re-verified in `node_modules/emdash/src`:

- **Optional omission.**
  - Native behavior: the public loader copies NULL columns into `data` (`src/loader.ts`), so an omitted optional field reads `null`.
  - Fix: `null` or absent is admitted. Any fabricated value still fails.
- **Expired preview.**
  - Native behavior: `iat`/`exp` and the comparison clock are floored to seconds, and refusal happens only when `exp < now` (`src/preview/tokens.ts`). A fixed 1.5 s sleep can therefore still find a token valid.
  - Fix: the test waits until the floored second exceeds `expiresAt`.
- **Missing files.**
  - Native behavior: the single-media read returns the raw `MediaItem`, which carries no address. Only the LIST endpoint adds `url` (`addUrlToMedia`).
  - Fix: the asset address is taken from the listing, bound to the exact asset id.

## Offline checks

| Check | Result |
| --- | --- |
| `bash -n`, `bash --posix -n` (entrypoint), shellcheck 0.10.0 | clean (runtime scripts, entrypoint, both retirement scripts) |
| Quadlet 5.8.4 dry-run | rc 0. All five services are generated, and the app unit carries `--secret songhealth-qdev-t021-route-token`. The only generator messages are "Loading source unit file". |
| Dev configuration loaded in the pinned image (dummy non-secret inputs, no network) | root `/src` and `strictPort` set. Integrations: `@astrojs/react`, `emdash`, `songhealth-t021-cms-public-reads`. Output and adapter match the canonical configuration, which stays without the T021 integration. |
| Playwright discovery | T021: 14 tests. Ordinary suites: 121 tests in 10 files; T021 is excluded without its opt-in. |
| Loader | Accepts a bare `ec_pat_` token and JSON `{ token }`. Refuses malformed content and a mode-0644 file. |
| Production exclusion | `deploy/Containerfile` copies neither `deploy/dev-quadlet/` nor `tests/browser/`, and the integration refuses every non-`dev` command before injection. |

## Live results (single runtime, UID 1000)

| Run | Result |
| --- | --- |
| Promote `c416ea9` ([t037/update-1-output.txt](t037/update-1-output.txt)) | 28 s. A backup was taken, the route token created and the app unit updated. **VERIFY: PASS (14/14).** |
| T021 coordinator, runs 1 and 2 at `c416ea9` ([1](t037/t021-run-1-output.txt), [2](t037/t021-run-2-output.txt)) | **11 passed / 3 failed** in both runs, with no owned-fixture residue. These are the same three failures the first T022 execution root-caused in pinned EmDash (`f3c30df` T022 evidence, "T021 — coordinator … run 1: 11 passed / 3 failed"). |
| Promote `76b1d30` ([t037/update-2-output.txt](t037/update-2-output.txt)) | Units were already up to date and the route token present. **VERIFY: PASS (14/14).** |
| T021 coordinator, runs 3 and 4 at `76b1d30` ([3](t037/t021-run-3-output.txt), [4](t037/t021-run-4-output.txt)) | **14 passed** each time. The coordinator verified that the runtime source equals the checkout's HEAD. Exit 0, "no owned-fixture residue". |
| Secret leakage (values compared in memory; counts only) | **0** occurrences of the 4 runtime secrets, the route token or the PAT. Sources: the unit journal, both container logs, `podman inspect`, every PR #41 and T037 patch, the T037 working tree, the T021 Playwright artifacts under `.tmp/`, both PR texts, and every session log (22 sources). |

The T021 suite had never run on the UID-1001 runtime: its fixture route was never installed
there (the T021 Gate A bundle `49f9070` recorded `RUNTIME_INTEGRATION=HOLD`). Its only earlier
executions were T022's disposable runtime on port 4323. Deleting the UID-1001 runtime therefore
removes no T021 capability.

## UID-1001 retirement (pending the Product Owner's sudo run)

The local workspace user (UID 1000) has no access to UID 1001 and no passwordless sudo. The
Product Owner runs the retirement as `multica-agent`:

- [t037/uid1001-inventory.sh](t037/uid1001-inventory.sh): a read-only inventory.
- [t037/uid1001-retire.sh](t037/uid1001-retire.sh), mode `plan` (read-only): prints exactly
  what `delete` removes.
- [t037/uid1001-retire.sh](t037/uid1001-retire.sh), mode `delete`: removes that plan after
  the typed confirmation "delete songhealth uid1001".

What the plan covers:

- **Removed:**
  - the four Songhealth containers;
  - Songhealth-named systemd units and unit, Quadlet and environment files;
  - the volumes, networks and images those containers alone use;
  - the `songhealth*` podman secrets;
  - the Runtime Controller and stable-source directories.
- **Never touched:**
  - anything another container uses (it is listed under "kept");
  - other workloads (s2-assets, Multica, Codex, unrelated containers);
  - Songhealth-named paths outside the runtime directories (they are listed for review only).

**Dry run before any use.** The plan logic was run read-only against UID 1000's own runtime,
with the guard and names adapted. That run caught two over-broad selectors, both fixed before
any use:

- a `localhost/songhealth*` image pattern matched another project's image;
- a `*songhealth*` directory pattern matched unrelated caches.

What was known about UID 1001 without access, from process names and loopback probes:

- **Containers** (from `conmon` arguments):
  - Songhealth: `songhealth-dev-app`, `songhealth-dev-postgres`, `systemd-songhealth-app`, `systemd-songhealth-db`;
  - others: `s2-assets-dev-postgres`, `s2-assets-dev-web` and two unnamed containers.
- **Ports.**
  - 4322 serves the Songhealth SSR marker.
  - 4321 resets connections.
  - One unauthenticated `GET /` was sent to each port to identify it. No credential, file or
    data of UID 1001 was read.

## Limits and open items

- **Not T022.** These T021 runs are not the T022 serial join. US6 acceptance stays with T022
  (T019 and T020 were not run here).
- **Merge.** The runtime serves `76b1d30`. Later commits on this branch change documentation
  and evidence only.
