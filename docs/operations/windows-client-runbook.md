# Windows client runbook (Feature 016)

How the Product Owner's Windows 11 computer reaches the machine under test before the DNS switch,
and how Claude Code runs the acceptance checks there in the real Chrome and Edge. Started in #456
for the rehearsal machine, with the Windows Hello passkeys and the production steps added in #457;
#466 follows §5 on the Production host and completes it.

**Authority:** spec #450, "Access before the cutover, and the Administrators" and "The rehearsal"
(Product Owner, Windows client, 2026-11-25: #450 comments 7160648899, 7160891011 and 7161099448);
the account that carries the control channel, #456 comment 7164993353.

**Who does what.** Claude Code runs every check, records PASS or FAIL with its evidence and
assembles the result. The Product Owner does the setup steps that need them (the private network,
Windows' administrator prompt), opens the browsers, gives each Windows Hello approval, and certifies
the final result. Nothing beyond what Windows ships is installed on the computer, and Claude Code
never holds an administrator login there.

**Placeholders.** `<machine address>` is the private-network address of the machine under test,
`<workstation address>` the workstation's, `<computer address>` this computer's. None of them, no
tailnet name, key or credential is written into the repository, an issue or evidence.

The two scripts it uses are in the repository and are kept in one folder on the computer:
[`scripts/windows/client.ps1`](../../scripts/windows/client.ps1), run by the Product Owner in
PowerShell opened as administrator, and
[`scripts/windows/check-tls.ps1`](../../scripts/windows/check-tls.ps1), the read-only certificate
check Claude Code runs over the control channel without administrator rights. Run `client.ps1` as
`powershell -ExecutionPolicy Bypass -File .\client.ps1 -Action <action> ...`.

## 1. Joining the private network

1. Install Tailscale for Windows and sign in to the office's tailnet (the tailnet itself is the
   host's project, outside this repository).
2. The tailnet's rules let this computer reach the machine under test on port 443, and let the
   workstation alone reach this computer on port 22 while the control channel is open.
3. Check: `Test-NetConnection <machine address> -Port 443` reports `TcpTestSucceeded : True`.

**Remove:** sign out of the tailnet in the Tailscale app, or uninstall it, when it is no longer
needed; the Product Owner removes the device from the tailnet.

## 2. The control channel

Windows' built-in OpenSSH Server, reached over the private network from the workstation alone, by
a standard local account, `songhealth-test`, that accepts only Claude Code's own key, may forward
only to the test browsers' debugging ports on this computer's loopback (127.0.0.1:9222 for
Chrome, 127.0.0.1:9223 for Edge), and runs no command but `check-tls.ps1` (sshd's `ForceCommand`,
on a copy only administrators can change). The Product Owner can revoke it at any moment by
closing or removing the channel.

**Set up, once** (administrator prompt):

```powershell
.\client.ps1 -Action OpenChannel -PublicKey '<Claude Code public key line>' -WorkstationAddress <workstation address>
```

It installs the OpenSSH Server optional feature if Windows does not have it yet, creates the
account with a random password nobody sees, writes the key, copies `check-tls.ps1` beside
`sshd_config`, adds its rules to `sshd_config` between `# songhealth-test-channel begin` and
`end` lines, checks the file with `sshd -t` (a file sshd refuses is put back as it was), limits
the firewall rule for port 22 to the workstation, and starts the server.

**Each test session:**

1. Open the channel: the same `OpenChannel` command, or `Start-Service sshd` as administrator.
2. Open the test browsers on the signed-in desktop, each with its own test profile and remote
   debugging on the loopback (the everyday profiles stay untouched):

   ```powershell
   & "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:LOCALAPPDATA\songhealth-test\chrome"
   & "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9223 --user-data-dir="$env:LOCALAPPDATA\songhealth-test\edge"
   ```

3. Claude Code opens the tunnel from the workstation and attaches its Playwright to both
   browsers (`chromium.connectOverCDP`):

   ```bash
   ssh -N -L 9222:127.0.0.1:9222 -L 9223:127.0.0.1:9223 songhealth-test@<computer address>
   ```

4. At the end, close the test browsers and close the channel: `.\client.ps1 -Action CloseChannel`.

**Remove** (after #466, or whenever the Product Owner decides): `.\client.ps1 -Action RemoveChannel`
removes the account, its key, the copy of `check-tls.ps1`, its `sshd_config` lines and the
firewall rule's permission; the script
then prints the command that uninstalls the OpenSSH Server feature too. Delete the test profiles'
folder, `%LOCALAPPDATA%\songhealth-test`, after the production checks, once the Admin session there
is signed out.

## 3. The hosts-file entry and the test authority (rehearsal machine)

The site's real name, `songhealth.moph.go.th`, points at the rehearsal machine through the hosts
file, so that the site, the Admin and passkeys run under the origin the site keeps. The rehearsal
machine's certificate comes from its Internal Test CA: short-lived, constrained to
`songhealth.moph.go.th`, and made on that machine, whose private key never leaves it. Only the
authority's certificate comes to this computer. A second hosts entry, `name-check.invalid`, reaches
a certificate the same authority issued outside its constraint, which Windows, Chrome and Edge must
refuse.

**Add** (administrator prompt), with the authority's certificate file Claude Code hands over:

```powershell
.\client.ps1 -Action AddRehearsal -MachineAddress <machine address> -CaFile <path to ca.crt>
```

It refuses a file that is not the rehearsal's authority or that holds a private key, adds both
hosts lines tagged `# songhealth-rehearsal`, trusts the authority in the computer's Trusted Root
store, and empties the DNS cache.

**Check that it took effect:**

- `.\client.ps1 -Action Status` shows two hosts entries and the test CA in Trusted Root once;
- `Resolve-DnsName songhealth.moph.go.th` answers with `<machine address>`;
- Claude Code runs `check-tls.ps1` over the channel (`ssh songhealth-test@<computer address>`):
  `songhealth.moph.go.th` reports `TRUSTED` with
  the test authority as issuer, and `name-check.invalid` reports `REFUSED` with Windows' name
  constraint status.

Spec #450 assumes that Chrome and Edge read the Windows hosts file and trust the Windows
certificate store, also with Secure DNS on; checks W3 and W4 below confirm it per browser.

**Remove** (administrator prompt): `.\client.ps1 -Action RemoveRehearsal` removes both hosts lines
and the authority, and empties the DNS cache. Before the production tests (#466) only what was
made for the rehearsal is removed: these two, and the Windows Hello passkeys made under the real
name on the rehearsal machine (§5, "Removing the rehearsal's passkeys").

## 4. The acceptance checks on the rehearsal machine (#456, #457)

Claude Code runs each check in Chrome and in Edge through the channel and records PASS or FAIL
with its evidence; the Product Owner certifies the result.

**Before W5,** the computer has a Windows Hello PIN (Settings > Accounts > Sign-in options > PIN;
an account without a password sets one first), and each test browser, opened after the PIN was
set, reports `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` as `true` on
the site. Without a PIN, Edge refuses every passkey request at once and Chrome offers only its own
dialog (#456). The browser asks only from the focused window: the Product Owner brings the one
under test to the front.

| # | Check | Pass when |
|---|---|---|
| W1 | Windows' own verification (`check-tls.ps1`) | `songhealth.moph.go.th` is `TRUSTED`, issued by the test authority; `name-check.invalid` is `REFUSED` |
| W2 | The browser refuses a name outside the constraint | `https://name-check.invalid/` ends in a certificate error, in Chrome and in Edge |
| W3 | The site under its real name | `https://songhealth.moph.go.th/` opens with no certificate warning, and the certificate the browser shows is the test authority's, in Chrome and in Edge |
| W4 | The Admin under its real name | `https://songhealth.moph.go.th/_emdash/admin` opens with no certificate warning, and the certificate the browser shows is the test authority's, in Chrome and in Edge; its setup screen is left untouched (the first Administrator is #457's) |
| W5 | Windows Hello reaches the desktop | while the script drives the page, a passkey request for `songhealth.moph.go.th` brings up Windows Hello's PIN prompt on the Product Owner's desktop; the Product Owner cancels it, so no passkey is made |

W5's request makes a passkey (`navigator.credentials.create`, Windows' own authenticator, a
throwaway user such as `w5-feasibility-check`): until a passkey exists for the name, a request to
use one (`get`) offers only a phone and a security key, never the PIN (#456). A PIN entered by
mistake makes that throwaway passkey; the site never registers it, and the Product Owner deletes
it in Settings > Accounts > Passkeys.

**The Administrator's passkey (#457).** The first Administrator is made through the Admin's own
setup in one browser, with a passkey kept by Windows Hello (§5), and used in both. The Product
Owner gives only the PIN; Claude Code drives every page.

| # | Check | Pass when |
|---|---|---|
| W6 | A passkey made with Windows Hello | the setup's "Create passkey" brings up Windows Hello's PIN prompt (not a browser's own password manager), and after the PIN the setup ends on the sign-in screen |
| W7 | Sign-in in the browser that made it | "Sign in with Passkey" and the PIN sign the Administrator in (`/_emdash/api/auth/me` answers role 50); after "Log out" it answers 401; signing in again works |
| W8 | Sign-in in the other browser | the same, in the other browser, with the passkey the first one made |
| W9 | The passkey is Windows' | Settings > Accounts > Passkeys lists it for `songhealth.moph.go.th` |

The results of W6–W9 on the rehearsal machine are recorded with their evidence in #457.

The feasibility of the channel itself is recorded with these results in #456: Playwright attaching
to each browser through the tunnel, the Windows Hello prompt, and whether recent Chrome and Edge
need the separate profile for remote debugging.

## 5. Windows Hello passkeys

A passkey for the site is made and kept by Windows Hello, the computer's own authenticator,
unlocked by its PIN (or face or fingerprint where the computer has them). It is bound to
`songhealth.moph.go.th` and works only there.

**Making one.** In the Admin's setup, an invitation's page or Security Settings ("Add Passkey"),
press the button that makes the passkey. Windows Hello asks for the PIN. If a browser offers its
own password manager instead (Chrome can offer Google Password Manager), choose Windows Hello, so
that the passkey stays on this computer and both browsers can use it. In #457, Chrome 158 went
straight to Windows Hello's PIN prompt.

**Signing in, in Chrome and in Edge.** "Sign in with Passkey" on the Admin's sign-in screen (Edge
in Thai: "เข้าสู่ระบบด้วย Passkey"); Windows Hello names the account and "Passkey for
songhealth.moph.go.th" and asks for the PIN. A passkey made in Chrome signs in in Edge, since both
use Windows Hello (#457, W8); the other way round, a passkey made in Edge used in Chrome, was not
tried. Signing out is the user menu's "Log out".

**Where Windows keeps them.** Settings > Accounts > Passkeys lists each passkey with its site and
account; the rehearsal's first Administrator's passkey was listed there (#457, W9). That it stays
after the browsers' test profiles are deleted is checked at #466 (§6, step 11).

### Removing the rehearsal's passkeys

Before the production checks, remove only the passkeys made on the rehearsal machine: Windows would
otherwise offer them on the Production host, under the same name, for accounts that do not exist
there. In Settings > Accounts > Passkeys, search for `songhealth.moph.go.th`, and remove each
entry whose account is a rehearsal name (`…@songhealth.invalid`, such as
`po-rehearsal@songhealth.invalid`) from its "…" menu. Leave every other passkey
untouched. Check: the search finds no `@songhealth.invalid` account. The rehearsal's virtual
authenticator never reaches this computer, so it left nothing here.

## 6. Production (#466)

The steps on the Production host before the DNS switch, in order. **PO** marks the Product Owner's
own steps: Windows' administrator prompt, Windows Hello, and a real sign-in. Claude Code drives the
browsers through the control channel and records each check; nothing automates a passkey on
production, and the rehearsal's evidence scripts refuse the Production host's certificate.

| # | Step | Who |
|---|---|---|
| 1 | Remove the rehearsal's hosts entries and test authority (`.\client.ps1 -Action RemoveRehearsal`, §3) | **PO** (administrator prompt) |
| 2 | Remove the rehearsal's passkeys (§5, "Removing the rehearsal's passkeys") | **PO** |
| 3 | The hosts-file entry for `songhealth.moph.go.th` pointing at `<Production host address>`, tagged like the rehearsal's (#466 gives the action); no test authority: the site shows the Ministry's certificate | **PO** (administrator prompt) |
| 4 | Check that it took effect: `Resolve-DnsName songhealth.moph.go.th` answers the Production host's address, and the site and the Admin open in Chrome and Edge with the Ministry's certificate and no warning (W3, W4 with the Ministry's issuer) | Claude Code |
| 4a | Before the setup, the site is private: from outside the private network, the site and its setup routes give no answer (#466) | Claude Code |
| 5 | The setup: the site title, then the first Administrator's name and email as the Product Owner gives them | Claude Code drives; **PO** gives the details |
| 6 | The setup's "Create passkey", with the setup screen and Windows Hello's prompt captured for the Ministry (`docs/operations/admin-sign-in-evidence/`) | **PO** (Windows Hello, Win+Shift+S) |
| 7 | Sign in, sign out and sign in again in Chrome and in Edge (W7, W8), and the passkey in Windows' list (W9) | Claude Code drives; **PO** (Windows Hello, each sign-in) |
| 8 | The second passkey, on another device the Product Owner names: on that device, signed in, Security Settings, "Add Passkey" | **PO** (a real sign-in, that device's own approval) |
| 9 | The invitation: Users, "Invite User", the second Administrator's email, role Admin, "Send Invite"; the link is copied from the dialog (7 days, once) and handed to that person privately, never in an issue or chat | Claude Code drives; **PO** hands the link over |
| 10 | The second Administrator opens the link on their own computer, makes their passkey, and adds a second one on another device (step 8) | **the second Administrator** (their own Windows Hello, a real sign-in) |
| 11 | Sign out of the Admin in both test browsers, close them, delete `%LOCALAPPDATA%\songhealth-test`; then check that Settings > Accounts > Passkeys still lists the Administrator's passkey | Claude Code signs out; **PO** closes, deletes and looks |
| 12 | Remove the control channel: `.\client.ps1 -Action RemoveChannel` (§2) | **PO** (administrator prompt) |

The emergency procedure for the day no Administrator can sign in is
[`administrator-recovery.md`](administrator-recovery.md); on production it is never run without the
Operator's approval.
