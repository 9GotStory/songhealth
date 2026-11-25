# Windows client runbook (Feature 016)

How the Product Owner's Windows 11 computer reaches the machine under test before the DNS switch,
and how Claude Code runs the acceptance checks there in the real Chrome and Edge. Started in #456
for the rehearsal machine; #466 completes it for the Production host.

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

The two scripts it uses are in the repository: [`scripts/windows/client.ps1`](../../scripts/windows/client.ps1),
run by the Product Owner in PowerShell opened as administrator, and
[`scripts/windows/check-tls.ps1`](../../scripts/windows/check-tls.ps1), which Claude Code runs over the
control channel without administrator rights. Run `client.ps1` as
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
a standard local account, `songhealth-test`, that accepts only Claude Code's own key and may only
forward to the test browsers' debugging ports on this computer's loopback (127.0.0.1:9222 for
Chrome, 127.0.0.1:9223 for Edge). The Product Owner can revoke it at any moment by closing or
removing the channel.

**Set up, once** (administrator prompt):

```powershell
.\client.ps1 -Action OpenChannel -PublicKey '<Claude Code public key line>' -WorkstationAddress <workstation address>
```

It installs the OpenSSH Server optional feature if Windows does not have it yet, creates the
account with a random password nobody sees, writes the key, adds its rules to `sshd_config` (each
line tagged `# songhealth-test-channel`), limits the firewall rule for port 22 to the workstation,
and starts the server.

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
removes the account, its key, its `sshd_config` lines and the firewall rule's permission; the script
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
- Claude Code runs `check-tls.ps1` over the channel: `songhealth.moph.go.th` reports `TRUSTED` with
  the test authority as issuer, and `name-check.invalid` reports `REFUSED` with Windows' name
  constraint status.

Spec #450 assumes that Chrome and Edge read the Windows hosts file and trust the Windows
certificate store, also with Secure DNS on; checks W3 and W4 below confirm it per browser.

**Remove** (administrator prompt): `.\client.ps1 -Action RemoveRehearsal` removes both hosts lines
and the authority, and empties the DNS cache. Before the production tests (#466) only what was
made for the rehearsal is removed: these two, and the Windows Hello passkeys made under the real
name on the rehearsal machine (#457).

## 4. The acceptance checks on the rehearsal machine (#456)

Claude Code runs each check in Chrome and in Edge through the channel and records PASS or FAIL
with its evidence; the Product Owner certifies the result.

| # | Check | Pass when |
|---|---|---|
| W1 | Windows' own verification (`check-tls.ps1`) | `songhealth.moph.go.th` is `TRUSTED`, issued by the test authority; `name-check.invalid` is `REFUSED` |
| W2 | The browser refuses a name outside the constraint | `https://name-check.invalid/` ends in a certificate error, in Chrome and in Edge |
| W3 | The site under its real name | `https://songhealth.moph.go.th/` opens with no certificate warning, and the certificate the browser shows is the test authority's, in Chrome and in Edge |
| W4 | The Admin under its real name | `https://songhealth.moph.go.th/_emdash/admin` opens with no certificate warning, in Chrome and in Edge; its setup screen is left untouched (the first Administrator is #457's) |
| W5 | Windows Hello reaches the desktop | while the script drives the page, a WebAuthn request for `songhealth.moph.go.th` brings up the Windows Hello prompt on the Product Owner's desktop; the Product Owner cancels it, so no passkey is made |

The feasibility of the channel itself is recorded with these results in #456: Playwright attaching
to each browser through the tunnel, the Windows Hello prompt, and whether recent Chrome and Edge
need the separate profile for remote debugging.

## 5. Production (#466)

#466 completes this runbook for the Production host: the hosts entry pointing at it, the Ministry's
certificate in place of the test authority, the Windows Hello passkeys, signing out of the Admin
and deleting the test profiles afterwards, and removing the control channel.
