# T032 — US7 native Admin maintenance: automated journeys on the single runtime

**Status: EXECUTED — 5 of 5 passed. T032 and SC-007 are ACCEPTED by Product Owner decision
(2026-10-29). The staff session was waived.**

This is a Claude Code self-review only (Constitution 5.0.0). The automated journeys are the
accepted evidence. No staff session was observed, so this record makes no claim about staff
comprehension.

## Authorization and scope

- **Authorization.** On 2026-10-29 the Product Owner delegated execution of the plan
  proposed in this session: "ให้คุณวางแผนและดำเนินการทั้งหมดแทนฉันได้เลย".
- **What this reverses.** The plan let the browser tests use EmDash's development-only
  `auth/dev-bypass` session. That reverses the 2026-10-24 instruction not to use dev-bypass
  for these journeys ([PR #37 comment 6386273659](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6386273659)).
- **Why the 2026-10-24 concerns do not apply.** That instruction followed the NO-GO on
  "Option B" ([comment 6386211045](https://github.com/9GotStory/songhealth/pull/37#issuecomment-6386211045)),
  a custom route that would have turned a PAT into a browser session. This change has no
  custom route: it uses EmDash's own dev-only session route and the native logout.
  - The concern that still applies is server-side session residue. Each test therefore logs
    out, and the logout must answer 200.
- **What this record supersedes.** The draft evidence in PR #37 was produced on the deleted
  UID-1001 runtime (4322), where the four authenticated journeys skipped. That evidence
  remains Git history.

## Identities

| Item | Value |
| --- | --- |
| Runtime | `http://127.0.0.1:4324`, source `f71d56ee8f725e07485d8d2d45273e90424363e9` (verify PASS before and after; `t022/verify-*.txt`) |
| Suite | `tests/browser/cms-editor.spec.ts` (T031), opted in with `SONGHEALTH_ADMIN_SESSION=dev-bypass` |
| Toolchain | Node 24.21.0, Playwright 1.63.0 (chromium), Astro 7.3.5, EmDash 1.1.0, `@emdash-cms/admin` 1.1.0 |
| Output | `t032/editor-run-1-output.txt` |

## Results (5 passed, 0 failed, 0 skipped)

| # | Journey | What it shows |
| --- | --- | --- |
| 1 | Admin boundary, Thai locale (no session) | `/_emdash/admin/` redirects to the native sign-in page with `lang="th"` and the Thai passkey copy |
| 2 | Maintenance journey (`health_services`) | Thai labels, list search and draft status filter, find and reopen, native media, reference and taxonomy pickers, reuse of a Service, explicit save |
| 3 | Validation error (`services` ลิงก์บริการภายนอก) | a malformed URL is refused readably; the correction saves |
| 4 | Domain date (`announcements` วันที่ประกาศ) | the date control renders the stored instant; draft state is shown separately; system timestamps differ from the domain date |
| 5 | Gallery repeater (`activities` แกลเลอรีภาพ) | one task-owned image row with an optional caption saves explicitly |

The owned-resource cleanup reported complete after every test, and the logout answered 200.
The residue check after the run found 0 synthetic entries, media, terms or bylines (see the
T022 record).

## Defects found and fixed by the first authenticated run

These tests had never run with a session before. All fixes are in the tests; nothing in the
platform was changed.
- **Duplicate row links.** Each list row has two links to the editor: the title, and an edit
  icon named "แก้ไข <title>". Matching by a title fragment hit both. The tests now match the
  exact title.
- **Reference picker checkbox names.** In pinned `@emdash-cms/admin` 1.1.0, each picker
  checkbox has the item title as `aria-label`, but also `aria-labelledby` pointing at the
  field label, which takes precedence. So every checkbox is announced as the field name (for
  example "บริการที่ให้ (optional)"), not the item. The tests select the row by its title
  text.
  - This is a native accessibility defect worth knowing for screen-reader users. It is
    upstream, and nothing in Songhealth changes it.
- **Datetimes stored as UTC.** EmDash stores datetimes as UTC ISO:
  `2026-10-24T09:00:00+07:00` reads back as `2026-10-24T02:00:00.000Z`. The test now checks
  that the instant is unchanged.
- **Sign-in copy timing.** The copy renders only after the Admin app mounts. The test waits
  for `#emdash-boot-loader` to detach. This fix is ported from the PR #37 corrective round.

## Product Owner decision: staff session waived (2026-10-29)

The Product Owner decided: "T032 (SC-007) ฉันไม่อยากทำละ ถ้าคุณทดสอบด้วย playwright แล้วว่ามันผ่าน
ก็ถือว่าผ่านเลย". As a result:
- T032 is checked;
- SC-007 is accepted on the automated evidence above, as a documented Product Owner
  exception;
- the requirement text in `spec.md` is unchanged.

If a staff session is run later, its outcomes can still be added here.

### How to run an optional staff session later

The original requirement was one bounded staff session: real staff author, select, reuse,
find and correct representative records in the native Admin. Its earlier pending status is
in Git history.
- **How to run it.** On `http://127.0.0.1:4324`, a staff member signs in to the Admin
  through `/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`. Passkeys do not work on the
  IP origin. They maintain a few representative records while someone records each journey's
  outcome and any confusing label, then that record is added to this file.
