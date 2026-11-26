# Administrator recovery (Feature 016)

What to do on the day no Administrator can sign in to the EmDash Admin: every Administrator's
passkeys are lost, so nobody can add a passkey or invite anyone. One recovery link, made on the
Production host with the Operator's approval, signs one locked-out Administrator in to their own
account once. They add a new passkey and remove the lost ones.

**Authority:** spec #450, user story 19 and "Access before the cutover, and the Administrators";
the Product Owner's choice of this procedure, #457 comment 7184244548. The EmDash 1.1.0 behaviour it
rests on is in [`docs/agents/emdash-1.1.0.md`](../agents/emdash-1.1.0.md), "Authentication and
setup".

**Why a script.** With no email provider, which is production's configuration, EmDash 1.1.0 has
no supported recovery: an Administrator's "Send Recovery Link" answers that email is not configured,
and no route resets another user's passkey. EmDash's own sign-in-link route
(`/_emdash/api/auth/magic-link/verify`) still signs in the account of a `recovery` row of its
`auth_tokens` table. [`scripts/admin-recovery.ts`](../../scripts/admin-recovery.ts) writes one
such row, as EmDash itself writes it: valid for 15 minutes and used once. It adds no sign-in method,
changes no configuration, and touches nothing else in the database.

## The rules

- **The Operator approves each run.** The script writes to the production database directly, so
  it runs only after the Operator has said yes to this run, for this account. It then asks again:
  it writes nothing until `yes` is typed. It is never run on production without that approval.
- **No secret is printed.** The script reads the database's names from the database container and
  the site URL with `grep`, so it never reads a password. The link goes into a new owner-only file;
  the script prints that file's path and the link's expiry, never the link. Keep the link out of
  chat, issues, pull requests, evidence and screenshots.
- **Only an Administrator's account.** The script refuses an email with no account, an account
  below Administrator, and a disabled account. A session for a disabled account is refused anyway.
- **One account, once.** The link signs in only the account it was made for, within 15 minutes,
  and only once. A second run makes a new link and needs a new approval.

## Who does what

| Step | Who |
|---|---|
| 1. Approve this run, for this account | **Operator** |
| 2. Run the script on the Production host as the Deployment account | whoever the Operator names, Claude Code included, under that approval |
| 3. Bring the link file to the Administrator's computer and delete it on the host | the same person |
| 4. Open the link, press Continue | **the locked-out Administrator** |
| 5. Add a new passkey with Windows Hello, remove the lost ones | **the locked-out Administrator** (Windows Hello is theirs alone) |
| 6. Sign out, sign in with the new passkey | **the locked-out Administrator** |
| 7. Delete the link file on their computer | **the locked-out Administrator** |

## Steps

**Before:** the locked-out Administrator's email, as it was given when the account was made; a
computer with Windows Hello that reaches the site under `https://songhealth.moph.go.th` (before the
DNS switch, through the hosts-file entry of the
[Windows client runbook](windows-client-runbook.md)); and a checkout of the deployed commit on the
host, on the Node version `package.json` pins (26.13.0). Without a checkout, copy
`scripts/admin-recovery.ts`, `scripts/admin-recovery/plan.ts` and `scripts/recovery-set/plan.ts` in
that layout.

1. **The Operator approves** the run for that account. The Operator keeps the record of it (who
   approved, when, for which account) outside the public repository.
2. **On the host, as the Deployment account**, with the application and database running:

   ```bash
   node scripts/admin-recovery.ts <the Administrator's email> ~/recovery-link.txt
   ```

   It names the account, its role and its number of passkeys, says what it is about to write, and
   asks `type yes to write the link:`. Anything but `yes` writes nothing. After `yes` it prints the
   file's path and the time the link expires (UTC, 15 minutes later).
3. **Move the file** to the Administrator's computer over the private network (for example `scp`),
   then delete it on the host: `rm ~/recovery-link.txt`.
4. **The Administrator opens the link** in Chrome or Edge, within the 15 minutes. The Admin asks
   for a press of **Continue** ("The link works only once."); after it they are signed in.
5. **In the Admin, Security Settings** (the user menu, then "Security Settings"): **Add Passkey**,
   a name for this computer, **Register Passkey**, and Windows Hello's PIN. Then each lost passkey:
   **Remove <name>**, and **Remove** in "Remove passkey?". The Admin keeps the last one; it shows
   Remove only while more than one is listed.
6. **Sign out** (the user menu, "Log out") and **sign in** with the new passkey.
7. **Delete the link file.** It is used up; an unused link expires on its own after 15 minutes.

Then add a second passkey on another device, as each Administrator has one (spec #450), and invite
another Administrator if only one is left.

## When it refuses

| It says | What to do |
|---|---|
| `<file> exists: give a new file` | name a file that does not exist yet |
| `no account has the email …` | check the email; the script lowercases it, as EmDash does |
| `… is not an Administrator (role N)` | the link is only for an Administrator's account |
| `… is disabled` | a disabled account cannot sign in; the Operator decides what comes first |
| `the auth_tokens table has the columns […], not EmDash 1.1.0's […]` | the deployed EmDash is not 1.1.0: stop, and check the script against the new version first |
| `not approved: nothing was written` | nothing happened; run again once approved |
| `… failed: …` | nothing was written: a row whose link could not be kept is deleted again |

The exit code is 0 when the link is written and 1 for every refusal.

If the link has expired or the Continue page says "This sign-in link is invalid or has already been
used", run the script again, after a new approval.

## Rehearsed

Followed from start to finish on the rehearsal machine on 2026-11-26 (#457), with the Operator's
approval, for an Administrator whose passkey was lost. Run on the host, the script refused an
unknown account and an answer other than `yes`, then wrote the link. On the workstation,
[`scripts/rehearsal-admins.ts`](../../scripts/rehearsal-admins.ts) `recovery` followed steps 4 to
7 with a virtual authenticator: the Administrator could not sign in, the link signed them in after
Continue, they added a passkey and removed the lost one, signed in again with the new one, and
the link a second time signed nobody in. The script runs against the rehearsal machine only: no
virtual authenticator ever meets the Production host, where each passkey step is a person's own.
