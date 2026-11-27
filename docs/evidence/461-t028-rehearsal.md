# #461 evidence: T028 rehearsed on Ubuntu (Feature 016) — a rehearsal

**This is a rehearsal, not T028.** It is Feature 001's recovery drill
(`specs/001-platform-foundation/tasks.md` T028), run in T028's order on the Ubuntu rehearsal machine
against the validation state, with the one addition the Product Owner asked for: the Recovery Set
that was restored had left the machine and was brought back from the off-site copy (spec #450
"T022, T028 and the validation fixture"). T028 is that drill on the Production host (#469), and its
evidence file, `specs/001-platform-foundation/evidence/T028-us3-recovery.md`, is not written here.
Run on 2026-11-27 by Claude Code; a self-run record, not an independent review, and not the Product
Owner's acceptance. The procedure it followed is
[`production-foundation.md`](../operations/production-foundation.md) §7.10.

- **The machine:** the rehearsal machine of #456 (4 vCPU, 6 GB), as #459's record describes it,
  started again at about 12:32Z after the workstation restarted. The Deployment account ran every
  Songhealth step; the machine's administrator account ran the root steps through `sudo` (the
  stand-in's backup, bringing the set back, reading the secrets' recovery copy: Product Owner, #461
  comment 7217954182 item 1).
- **The Release:** 1.0.0-rc.1, image
  `localhost/songhealth-app:1.0.0-rc.1@sha256:316d4f748127ad1314d48190b7e2baaac3063a3eaecdad6678b9076138eca1c7`,
  database `postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf`.
- **The checkout:** `~/songhealth-checkout`, a git clone moved by a bundle to
  `f69d8573009826ac20dacdd93b6f31a8a216a7d4`, this ticket's runbook commit. `scripts/recovery-set.ts`
  and `scripts/host/provision-stores.sh` there are unchanged since #460's `9e8db7b`; the commit adds
  `scripts/validation-content.ts`.
- **The off-site copy:** the backup stand-in's Restic repository on the machine
  (`scripts/rehearsal/stand-in.sh backup`, #460): no production data and no off-site store.
- **The transcript:** [`461-t028-rehearsal-transcript.txt`](461-t028-rehearsal-transcript.txt),
  each step's whole output as it ran, then two read-backs at 13:20 (parts `run-12-after` and
  `run-13-dev-runtime`) (SHA-256 `bd84c653…feb8`). It holds no secret value, token or
  key; the machine's private-network address was replaced by `<addr>` as the output was captured.

## The drill (AC1, AC2)

In T028's order. Times are UTC, from the transcript.

| # | Step | Result |
| --- | --- | --- |
| 1 | The validation state read back, the application running | the picture `/_emdash/api/media/file/01M8DZSZFEWR0CK7CA11E16S20.png`: HTTP 200, `image/png`, 9,316 bytes, SHA-256 `2c7b5116…f396`; the Homepage shows the tagline "Songhealth Feature 001 foundation validation" |
| 2 | A Recovery Set, the application stopped: the nightly run by hand (12:36:31), then the application stopped at once (12:37:21) | set `2026-11-27T123632Z`, `result` ok, `complete` true; its check `PASS: the production runtime holds the set …: 82 tables, 887 rows, 247 media files, 90 migrations`; the application stopped for 48.9 s by the run, then `inactive` from 12:37:21 |
| 3 | What the set holds | `database.dump` 389,561 bytes, SHA-256 `526aeaf3beaed5dc2749add71a31fc8eb8e8ce5bf774b7c2b388a9f4dd6202e0`; `media.tar` 1,005,230,080 bytes, `d1b4235e03cba00164c439e61104c7547263ee5b59bf5b48e440b18332669ef6`; `manifest.json` `e03192ad7ba1ebe2d5a9e8072b4fc7b08b203aca1c04d40eb7777096ee553959`; pg_dump and server 18.6 (Debian 18.6-1.pgdg13+2), EmDash 1.1.0, taken 12:36:33Z. `scripts/validation-content.ts` on it: three findings (the tagline in `options`, the picture's key in `media`, the picture's file), exit 1: the validation state is in the set |
| 4 | Off the machine: the stand-in's backup by hand (12:37:34) | `backup-run: took 2026-11-27T123632Z` (and four earlier sets it had not held); status `result` ok, `newestSet` `2026-11-27T123632Z` |
| 5 | The Product Owner's word to remove the volumes, asked at this step (the ticket) | given in the chat at 12:45 |
| 6 | Both units stopped, both volumes removed | `podman volume rm songhealth-db-data songhealth-media`, exit 0; `podman volume ls` empty: **stores gone 12:45:43Z**. The database unit ended `failed`, as §7.8 records for every stop of it on this machine |
| 7 | The set brought back from the off-site copy (root, 12:45:48) | the one snapshot tagged `set=2026-11-27T123632Z` (`92f50213`, 959.084 MiB) restored in 5 s, moved to `~songhealth/recovery-fetched/2026-11-27T123632Z`, the account's, mode 0700, its files 0600; their SHA-256 equal the set's on the machine (12:46:11) |
| 8 | The stores recreated and provisioned: `scripts/host/provision-stores.sh` (12:46:15) | both volumes created; Phase A on the empty store, the final server ready, identity `songhealth` / `songhealth_admin`; the role `songhealth_app` without superuser, CREATEDB or CREATEROLE, with CONNECT, USAGE and CREATE; the media store marked; the database running (12:46:29). Through the script, as the Product Owner decided (#461 comment 7218322292 item 6) |
| 9 | The runtime secrets recovered (12:46:36) | see "The runtime secrets" below: every entry passed |
| 10 | The restore of the set brought back (12:46:49) | admitted as production's, taken while it served the same image; "yes" twice; `PASS: restored the production runtime from /home/songhealth/recovery-fetched/2026-11-27T123632Z, and the integrity check passed: 82 tables, 887 rows, 247 media files, 90 migrations` (12:47:04): **zero differences** |
| 11 | The application started and ready (12:47:08) | `systemctl --user start` returned at 12:47:31; `songhealth readiness: ready`, **ready 12:47:31Z** |
| 12 | The state after the restore | the picture HTTP 200, 9,316 bytes, `2c7b5116…f396`; the Homepage's tagline; the tagline read through the API just before the removal (part `run-10-remove`): 44 bytes, SHA-256 `84753035…4415`; `scripts/rehearsal/vm.sh stack-check`: all passed |

The set was restored from the copy brought back, not from the folder on the machine: the restore
read `~/recovery-fetched/2026-11-27T123632Z`, which the snapshot made, and the set in
`~/recovery-sets` was left untouched as the way back. That is the contract's recovery step:
"Bringing a set back from off the host places its three files in a folder the account can read,
from which Songhealth's restore runs" (`production-host-contract.md` item 3). `~/recovery-fetched`
was removed after the drill (§7.10 step 11): at 13:20 it is gone, and so are root's fetch folders
(part `run-12-after`).

T028 says "let Quadlet recreate them"; the volumes were made by `provision-stores.sh`, which
refuses a media volume that exists, and Quadlet's `.volume` units carry no option beyond
`VolumeName=`, so they are the volumes Quadlet would make (Product Owner, #461 comment 7218322292
item 6). The task list's wording is unchanged.

## The runtime secrets (AC1)

`runtime-secret-recovery.md` §8, per entry, with no value read out. The recovery copy is the one
`scripts/host/root-setup.sh` made at the installation (#456), root-only under `/root` on the same
machine: it survives the loss of the account's Podman store and environment files, not the loss
of the machine, which a rehearsal machine's copy cannot. On the Production host the Operator keeps
it in their protected store (§5.1).

| Entry | A: availability | B: staged, checked, installed | C: usability |
| --- | --- | --- | --- |
| 1 `PGPASSWORD` | the copy's one version `20261125T142859Z`, root 0600 | K2 identical; one line; `songhealth-app.env` byte-identical once the copy's value was written back (the live value was the copy's) | the application role's prerequisite passed and S1 passed, at the start after the restore |
| 2 the migration URL's password | same | K2 identical; one line; secret replaced | S3 and S4 passed (`emdash migrate --status` and the apply, through the recovered URL) |
| 3 `EMDASH_ENCRYPTION_KEY` | same | K1 exit 0 (`runtime-secret-recovery.md` §8.3.3 as written); K2 identical; secret replaced | K3: the running container's mounted key `cmp` the staged file, exit 0; no key diagnostic in the start's journal |
| 4 `songhealth-db-password` | same | K2 identical; one line; secret replaced | the §8.3.4 probe over the private network: `songhealth_admin`, exit 0 |

Step 5 ran in T028's order: both units stopped and the database started alone, its new container
mounting the replaced secrets, and the probe ran against it; the application started once, after
the restore, and the rest of stage C read the restored state (Product Owner, #461 comment
7218322292 item 5). The staged files are the copy's bytes, so each replaced secret now ends in one
newline where the installation wrote none; the application reads each secret's first line (`IFS=
read -r` in `songhealth-app.container`) and the database image reads the bootstrap file through
command substitution, so the values in use are the same. The staging files were removed after stage
C (§6.2 step 7).

## The Administrators (AC3)

| Administrator | Passkey | Result |
| --- | --- | --- |
| `second-admin@songhealth.invalid` | the virtual authenticator's, stored on the workstation (#457, device R) | `node scripts/rehearsal-admins.ts signin`: `PASS S-R the stored Administrator signs in with device R's passkey, unchanged: second-admin@songhealth.invalid, role 50` (12:47:54; the same step before the drill, at 12:15, passed too) |
| `po-rehearsal@` | the Product Owner's Windows Hello passkey (#457) | pending: the Product Owner signs in from their Windows computer later (#461, their answer at the removal step) |

## The time (AC5)

A rehearsal measurement, not the Production host's: **108 s from "stores gone" (12:45:43Z) to
"ready" (12:47:31Z)**, against spec #450's target of recovery within one hour on the same host.
Within it: the set brought back, 23 s (5 s of it Restic's restore of 959 MiB, the rest the move and
the checksums); provisioning, 14 s; the secrets, 8 s; the restore and its check, 15 s; the start
to ready, 23 s; the rest is the pauses between commands sent over SSH. The set held the demo
dataset and 247 media files in a media archive of 1,005,230,080 bytes, most of them #460's
synthetic pictures.

The site did not answer from 12:37:21 to 12:47:31 (10 min 10 s), of which 8 min 22 s came before
the stores were removed: the stand-in's upload and the wait for the Product Owner's word. The
nightly run's own stop came first (48.9 s, 12:36:32 to 12:37:20).

## The validation content removed (AC4)

Through EmDash's API on the application's loopback publication, from the workstation through
`scripts/rehearsal/vm.sh tunnel`, with one token "T028 rehearsal validation removal (#461)"
(`settings:read`, `settings:manage`, `media:read`, `media:write`, 24 h), made with the rehearsal's
own demo-dataset token and revoked after, by a script kept outside the repository whose output is
the transcript's part `run-10-remove`:

| Step | Result |
| --- | --- |
| The media item `01M8DZSZFGZ5AJA48G71QDRD9A` | HTTP 200: `validation-picture.png`, storage key `01M8DZSZFEWR0CK7CA11E16S20.png`, `image/png`, 9,316 bytes |
| `POST /_emdash/api/settings` `{"tagline": ""}`, the value before #459 | HTTP 200; read back `""` |
| `DELETE /_emdash/api/media/01M8DZSZFGZ5AJA48G71QDRD9A` | HTTP 200 `{"deleted":true,"storageDeleted":true}`; the item then 404, its file 404 |
| The token revoked | HTTP 200; its `GET /_emdash/api/settings` then 401 |
| The nightly run by hand after it (12:48:45) | set `2026-11-27T124846Z`, ok, 53.4 s stopped |
| `node scripts/validation-content.ts ~/recovery-sets/2026-11-27T124846Z /_emdash/api/media/file/01M8DZSZFEWR0CK7CA11E16S20.png` | `PASS: no validation content and no validation media remain in the Recovery Set 2026-11-27T124846Z (taken 2026-11-27T12:48:46Z): the validation tagline and the picture's key are in no row of its database, and none of its 246 media files is the validation picture`, exit 0; the Homepage no longer shows the tagline |

The sets taken before the removal still hold the validation state, on the machine and in the
stand-in's repository, until they age out (seven on the host, 30 daily and 12 monthly off it); the
check reads what the site holds now, through the newest set.

## What it did not touch (AC7)

- No file under `specs/001-platform-foundation/evidence/` changed (`git diff --stat` of the branch).
- Every volume command ran on the rehearsal machine as its Deployment account. The development
  runtime afterwards (part `run-13-dev-runtime`, 13:20): `dev-runtime-verify.sh` `VERIFY: PASS`,
  its source the promoted commit `31b4ca1`, clean; its volumes `songhealth-qdev-db-data` and
  `songhealth-qdev-media` the ones created on 2026-10-28.
