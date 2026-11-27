# #459 evidence: T022 rehearsed on Ubuntu (Feature 016) — a rehearsal

**This is a rehearsal, not T022.** It is the T016 lifecycle harness,
[`tests/operations/verify-foundation.sh`](../../tests/operations/verify-foundation.sh), run from
start to finish on the Ubuntu rehearsal machine against the validation state (spec #450 "The
rehearsal", "Testing Decisions"). T022 is that harness run on the Production host (#467), and its
evidence file, `specs/001-platform-foundation/evidence/T022-us2-production-durability.md`, is not
written here. Run on 2026-11-27 by Claude Code; a self-run record, not an independent review, and
not the Product Owner's acceptance. The procedure the run followed is
[`production-foundation.md`](../operations/production-foundation.md) §7.8.

- **The machine:** the rehearsal machine of #456 (4 vCPU, 6 GB), as the Deployment account, with
  no other load on it. Ubuntu 26.04.1 LTS, kernel 7.0.0-44-generic, Podman 5.7.0
  (`5.7.0+ds2-3build1`), systemd 259 (`259.9-0ubuntu0.1`), conmon 2.1.13, crun 1.21, netavark
  1.16.1, aardvark-dns 1.16.0, passt `0.0~git20260120`, catatonit 0.2.1, Node v26.13.0 under
  `~/.local/opt` (`install-node.sh`, no npm). `/usr/bin/stat`, `sha256sum`, `timeout` and `mktemp`
  are uutils coreutils 0.10.0 (`rust-coreutils 0.10.0-1ubuntu2~26.04.1`), with GNU's 9.7 beside
  them.
- **The Release:** 1.0.0-rc.1, build commit `38bc570`, image
  `localhost/songhealth-app:1.0.0-rc.1@sha256:316d4f748127ad1314d48190b7e2baaac3063a3eaecdad6678b9076138eca1c7`,
  deployment configuration `879d0a0`; the five units on the machine are byte-equal to
  `879d0a0`'s.
- **The checkout:** a git clone, made from a bundle copied over SSH, detached at
  `b56cbacb0c8cb1026dcf76f3e3fbaa8812bfd3a7`, this ticket's fix of the harness (below), clean. Its
  `package.json` (`a6ab9bb1…11a6`) and `tests/operations/verify-startup.sh` (`907d8516…fcc2b`) are
  byte-equal to the build commit's, the two files by which the harness binds a checkout to the
  running image; the harness itself is `346c9399…3658`. Product Owner, #459 comment 7213181563,
  item 1: the record runs from the fix commit, not from `38bc570`.
- **The transcript:** [`459-t022-rehearsal-transcript.txt`](459-t022-rehearsal-transcript.txt),
  whole and unedited (SHA-256 `76acd2d9…6a32`). It holds no token or secret and no address of the
  host; its one address is the database container's on Podman's private network.

## The validation state (AC1)

Set through API tokens, as the Deployment account against the application's loopback publication
(`http://127.0.0.1:4321`), with each token passed to `curl` through a file descriptor. The tokens
were made with the rehearsal's own demo-dataset token, in place of the Operator's step on the
Admin's API Tokens page, with 24 h expiries:

| Token | Scopes | Used for |
| --- | --- | --- |
| "T022 rehearsal validation setup (#459)" | `settings:manage`, `media:write` | the tagline and the picture |
| "T022 rehearsal harness read (#459)" | `settings:read` | the read-back and the harness |

| Step | Result |
| --- | --- |
| Tagline before | `""` |
| The harness token's `POST /_emdash/api/settings` | HTTP 403 |
| The setup token's `POST /_emdash/api/settings`, `{"tagline": "Songhealth Feature 001 foundation validation"}` (the body built with `node`, `JSON.stringify`) | HTTP 200 |
| The setup token's `POST /_emdash/api/media`, `tests/operations/fixtures/validation-picture.png` (SHA-256 `2c7b5116…f396`) unchanged | HTTP 201, media `01M8DZSZFGZ5AJA48G71QDRD9A`, `/_emdash/api/media/file/01M8DZSZFEWR0CK7CA11E16S20.png`, `image/png`, 9,316 bytes |
| The tagline read back with the harness token | `"Songhealth Feature 001 foundation validation"`, 44 bytes, SHA-256 `84753035c0ee9863ab9cd4fa18bf797e6776fbf3280e606a579d827a938a4415` |
| The picture's public path, no token | HTTP 200, `image/png`, 9,316 bytes, SHA-256 `2c7b5116a8498892ccabd13a03e253fd4d55b9c0714cce51509196f0df0ef396` |

Every token made for the runs was revoked after it (`DELETE …/api-tokens/{id}`, HTTP 200), and a
revoked token's `GET /_emdash/api/settings` answered 401. The validation tagline and picture stay on
the machine for T028's rehearsal (#461).

## The run (AC2)

`SONGHEALTH_APP_ORIGIN=http://127.0.0.1:4321`, `SONGHEALTH_VALIDATION_MEDIA_PATH` the picture's
path above, `SONGHEALTH_APP_IMAGE=localhost/songhealth-app:1.0.0-rc.1`, the harness token read
into `SONGHEALTH_VALIDATION_TOKEN` from its file; run as the transient user unit
`t016-rehearsal-run`: **323.3 s, exit 0**, 42 stage verdicts `PASS`, the closing `PASS` banner,
and no `FAIL`. The 323.3 s is the run's script's own clock (`date +%s.%N` before and after the
harness); the journal shows the unit
from 2026-11-27T08:17:37.059Z to 08:23:00.437Z, and systemd counted "5min 23.378s wall clock
time", the script's start and end inside it. The start time the script also wrote as text
(`date +%3N`, 08:17:37.979Z, in `times.txt`) disagrees with both clocks by about 0.85 s, which a
retry on the machine did not reproduce; the times here are the journal's. The transcript's
closing lines:

```text
t016: three lifecycle cycles + missing-attachment negative passed with full integrity retention
t016: tested tree: b56cbacb0c8cb1026dcf76f3e3fbaa8812bfd3a7
```

| Stage | Result (transcript) |
| --- | --- |
| P0 | the Containerfile, the five units and the T013 authority present |
| R1 | the targets resolved and their unit cgroups proven before any change; the development resources guarded |
| C1 | the T013 gate's wiring proven (the container form); the container bound to the image `…:1.0.0-rc.1@sha256:316d…c1c7` and to the in-container gate sources; the gate's six stage markers and banner in the current invocation's journal; the tagline's value and SHA-256; readiness private and non-mutating |
| C2 | both containers on the private network `songhealth`; the application reaches the database through it |
| C3 | no published database port, and the host's connect to the database's private address refused |
| C4 | `songhealth-db-data` at `/var/lib/postgresql`, `songhealth-media` at `/app/media`, as named volumes |
| baseline | the tagline and the picture's bytes match their SHA-256 |
| cycles 1, 2, 3 | start, stop, restart and recreate in each, with readiness probed and both integrity checks passing at the start, restart and recreate checkpoints; "exactly three consecutive lifecycle cycles completed with 100% retention of the canonical validation state" |
| C7 | with the media volume left out of the unit, the start is refused: STARTUP REFUSAL, invocation-scoped and media-specific, no gate completion, no healthy empty replacement; the unit's source then restored byte-exact (SHA-256 `3c4f8563…08bb`) and the platform ready with both integrity checks passing |
| C8 | ready, both volumes retained, the tagline and the picture intact |

After the run both units were `active`, result `success`, the application's unit source again
`3c4f8563…08bb`, and one `pasta` process ran.

The database unit's store guard, which runs `/usr/bin/stat` (uutils) under `podman unshare`
(#456's note), passed at each of the nine database starts: each reached `Started`, and the run's
journal holds no `songhealth-db: refusing to start` and no skipped condition.

## The figures (AC4)

From the run's user journal (`Starting` to `Started`, `Stopping` to `Stopped`, systemd's own
`memory peak` at each stop) and from the services' cgroup `memory.peak` and `/proc/meminfo`, read
every second through the run (311 samples):

| What | Measured |
| --- | --- |
| The whole run | 323.3 s |
| The application's start, the database already healthy (to `Started`, which is healthy) | 22.5 to 24.2 s, ten starts |
| The database's start | 6.0 to 6.5 s, nine starts |
| The application's stop | 0.36 to 0.53 s, ten stops, each ending `inactive` |
| The database's stop | 0.51 to 0.63 s, nine stops, each ending `failed` (below) |
| The application not serving | 301.0 s of the run, in ten stretches, the longest 31.8 s |
| The application service's peak memory | 2,526 MiB at most (`memory.peak`); 2.4G for each invocation by systemd's count |
| The database service's peak memory | 86.8 to 88.8 MiB for each invocation by systemd's count |
| The whole machine | at most 3,023 MiB used of 5,919 MiB |

The first sample's reading, 2,497 MiB, and systemd's first figures belong to the invocation the run
found running, which also began with the startup build.

## What the runs found (AC3)

Five runs led to this record; the first four are in the ticket's evidence log, not here.

1. **The harness's input.** The first run gave `SONGHEALTH_APP_IMAGE` the digest as well, and C1
   refused the unit's image token before any change. The harness wants `<repository>:<tag>` and
   reads the pin from the unit; its header now says so.
2. **The harness could not pass C1 on any Podman we have.** Podman reports a container run from
   `<repository>:<tag>@sha256:<digest>` as `<repository>@sha256:<digest>`, on Ubuntu's 5.7.0 and on
   the workstation's 6.2.0 alike, and the harness compared it with the unit's `tag@digest` token: it
   had never run against a stack, since Feature 001's T022 never ran. The fix, `b56cbac`, keeps the
   criterion: the reported form or the pinned token is the identity, and the image the container
   runs must carry the intended tag. A digest under another repository, a different digest and an
   image without the tag each fail closed. The self-test shows each (169 demonstrations), and two
   mutations of the fix are each caught.
3. **The record came from a git checkout.** A run from a `git archive` tree of `b56cbac` passed
   every stage, but its transcript named the tree "unknown (git unavailable)".
4. **The self-test belongs to the workstation.** On the machine it passes 164 of 165:
   `wiring-npm-resolution` finds no npm, which the host does not have by design. The same tree
   passes 166 of 166 on the workstation, and the other 164 verdicts match under uutils. It runs on
   the workstation and in CI (Product Owner, item 2).
5. **The database unit ends each stop `failed`.** The database is the last container on the
   rootless network, and its `ExecStop`'s `podman rm` exits 125 on
   `rootless netns: kill network process: permission denied`: AppArmor's `pasta` denial #456
   recorded (Launchpad 2154379). Nine stops of nine; the teardown completes, and the next start
   leaves the unit `active`, result `success`. Recorded, unchanged (Product Owner, item 3;
   `production-foundation.md` §4.7).
6. **Explained, not failures:** at each cycle's restart step the application logs
   `Failed with result 'signal'` once. The database's restart restarts the application through
   its dependency, and the harness's own restart replaces that start job. The missing-volume
   case's `Failed to start` is its intended refusal.

No stage failed because of Ubuntu, and no criterion of the harness was weakened: the one change to
it adds a check.
