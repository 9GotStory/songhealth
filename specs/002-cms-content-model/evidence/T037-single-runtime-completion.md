# T037 — Single-runtime completion: T021 on 4324, then the UID-1001 runtime deleted

**Status: EXECUTED; awaiting Product Owner acceptance.**
- T021 runs on the single runtime and passes 14/14.
- Every Songhealth runtime of UID 1001 was deleted on 2026-10-29T00:20Z.
- The accepted Feature 001 production image was moved to UID 1000 first, with its digest
  preserved.

This is a Claude Code self-review only (Constitution 5.0.0).

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
  - `756831e`: documentation, retirement scripts and evidence.
  - `6603a63`: plan fixes found by the first `plan` run.
  - The commit adding this section: the deletion record and documentation.

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

## UID-1001 retirement (executed 2026-10-29)

The local workspace user (UID 1000) has no access to UID 1001 and no passwordless sudo. The
Product Owner therefore ran every step as `multica-agent`, through sudo:

- [t037/uid1001-retire.sh](t037/uid1001-retire.sh), mode `plan`: read-only.
- The same script, mode `delete`: runs after the typed confirmation
  "delete songhealth uid1001".

Before any use, the plan logic was dry-run read-only against UID 1000's own runtime, with the
guard and names adapted. That run caught two over-broad selectors (an image pattern and a
directory pattern).

### Plan, round 1

Output: [t037/uid1001-plan-1-output.txt](t037/uid1001-plan-1-output.txt). Read-only; it showed
four defects before anything was deleted. All were fixed in `6603a63`:

- The superseded `songhealth-dev-db` container (from `scripts/dev-db.sh`) was missing.
- The stable source's git store, `projects/.songhealth-dev.git`, was only listed for review.
- An image was listed twice, once by its short ID and once by its full ID.
- Multi-tagged images would have needed `podman rmi --force`, which also removes containers.
  The script now untags them name by name.

Per "songhealth ทั้งหมด", two kinds of leftovers were added:

- **Caches:** the Songhealth caches.
- **Checkout:** `projects/songhealth`, removed only when git reports no modified or untracked
  files, no commits outside the remote-tracking branches, no stashes and no linked worktrees.

These git checks were exercised read-only on UID-1000 repositories first. The dirty,
unpushed, worktree and bare-store cases were all kept; a worktree-free store was removable.

### Plan, round 2

Output: [t037/uid1001-plan-2-output.txt](t037/uid1001-plan-2-output.txt).

| Item | To remove |
| --- | --- |
| Containers | `songhealth-dev-app`, `songhealth-dev-postgres`, `systemd-songhealth-app`, `systemd-songhealth-db`, `songhealth-dev-db` |
| Units and files | 5 production-foundation units; 7 Quadlet and environment files |
| Volumes | `songhealth-db-data`, `songhealth-dev-db-data`, `songhealth-dev-media-v1`, `songhealth-dev-postgres-data-v1`, `songhealth-media` |
| Networks | `songhealth`, `songhealth-dev-app-net`, `songhealth-dev-db-net` |
| Secrets | 3 production-foundation podman secrets (names only) |
| Images | `songhealth-dev-tooling`, `songhealth-app:0.0.1`, and the `songhealth-app` t017 build (3 tags) |
| Directories | the Runtime Controller (412K), the stable source (853M) and its git store (6.9M), `projects/songhealth` (3.3M; git `modified=0 unpushed=0 stashes=0 worktrees=1`), 2 caches |

- **Kept:** the `postgres:18.6-alpine` image, because s2-assets containers also use it. Crontab
  had no Songhealth lines.
- **Untouched:** s2-assets, two unnamed postgres containers, Multica and Codex.

### The accepted Feature 001 production image (moved before deletion)

The plan included `localhost/songhealth-app:0.0.1`, the accepted artifact pinned in
`deploy/quadlet/songhealth-app.container` as `@sha256:4cfccf41…`.
`production-foundation.md` §4.5 states that a rebuild cannot reproduce that digest. The Product
Owner chose to move the image to UID 1000 before deleting it.

1. **Default `podman save --format oci-archive`.**
   - The archive's manifest was `sha256:b729d2c5…` with gzip layers: the save had rewritten the
     manifest.
   - The loaded copy did not resolve the pinned reference, so it was removed.
2. **Format test on a locally built probe image, with isolated stores.**
   - Only `--format oci-archive --uncompressed` and `--format oci-dir --uncompressed` preserved
     the digest.
   - The default `oci-archive`, `docker-dir` and `docker-archive` formats changed it.
3. **`podman save --format oci-archive --uncompressed`.**
   - The archive's index names manifest `sha256:4cfccf41…`, and the manifest blob hashes to that
     name.
   - After `podman load` on UID 1000 the image has ID `8fbe6e02d2e2` and digest
     `sha256:4cfccf41d4e10fc32f1f9dc76d5b7a69bed049b7b03556eb82059f5278de7407`.
   - The unit's exact reference `localhost/songhealth-app:0.0.1@sha256:4cfccf41…` resolves.

### Delete

Output: [t037/uid1001-delete-output.txt](t037/uid1001-delete-output.txt). The run took place on
2026-10-29T00:20:40Z, with the typed confirmation.

- **Removed.** Every listed item, with one exception below:
  - units stopped;
  - Quadlet and environment files removed, followed by `daemon-reload`;
  - 5 volumes, 3 networks and 3 secrets removed;
  - all image tags removed, and the images deleted;
  - 6 directories removed.
  - The production-foundation containers were already gone once their units stopped (Quadlet
    `--rm`).
- **Two `FAILED` lines.**
  - **Error.** `podman rm --force` of `songhealth-dev-app` and `songhealth-dev-postgres` exited
    non-zero. netavark could not tear down their networks: "failed to get bridge interface: No
    such device", and "aardvark-dns runs in a different netns".
  - **Cause.** These containers had been started under a Multica task's temporary runroot,
    `/tmp/multica-task-3662115369/storage-run-1001`, whose rootless network namespace this session
    does not see.
  - **Why they were removed anyway.**
    - Their records are gone: the run reports `containers: 0`.
    - Their volumes were then removed without error, which podman refuses while a container
      still uses them.
    - No conmon, port forwarder or listener of theirs remains.
  - **Result.** The run printed `RETIRE: INCOMPLETE` only because of these exit codes. Its
    "what remains" section reports 0 everywhere: containers, volumes, networks, secrets, images,
    units, files and directories, and listeners on 4321/4322.
- **Post-check from UID 1000** ([t037/post-deletion-check.txt](t037/post-deletion-check.txt)):
  - no listener on 127.0.0.1:4321 or 4322;
  - no UID-1001 process mentions songhealth;
  - the only running UID-1001 containers are `s2-assets-dev-postgres`, `s2-assets-dev-web` and the
    two unnamed postgres containers;
  - the accepted image resolves on UID 1000;
  - the single runtime's VERIFY: PASS.
- **Not cleaned, by design.** The Multica task's shared `aardvark-dns` (running for 15 days) and
  its rootless network namespace also serve other containers. Stale DNS or bridge entries of the
  deleted networks may remain there. They carry no traffic and disappear when that namespace is
  torn down, for example at a reboot.

## Limits and open items

- **Not T022.** These T021 runs are not the T022 serial join. US6 acceptance stays with T022
  (T019 and T020 were not run here).
- **Merge.** The runtime serves `76b1d30`. Later commits on this branch change documentation,
  evidence and the UID-1001 retirement scripts only; none of it runs in the runtime.
- **Temporary archive.** The 816 MB `/var/tmp/songhealth-app-0.0.1-uncompressed.oci.tar` is
  owned by `multica-agent`. That account removes it (`sudo -u multica-agent rm -f …`).
- **Image pruning.** UID 1000 must never run `podman image prune -a` or
  `podman system prune -a`. They would delete the only copy of the accepted Feature 001 image.
