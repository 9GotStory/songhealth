# Admin sign-in evidence (Feature 016)

Images for the Ministry, showing that signing in to the site's administration (the EmDash Admin)
is protected at least as strongly as two-factor authentication. Signing in takes a passkey that
exists only on the Administrator's own computer (something they have), unlocked by Windows Hello
with their PIN (something they know). There is no password to steal or guess.

**Where they come from.** The rehearsal machine, on 2026-11-26 (#457): the site's fresh copy under
its real name, `https://songhealth.moph.go.th`, reached from the Product Owner's Windows 11
computer through the hosts file, with a test certificate. #466 takes the same set again on the
Production host, under the Ministry's certificate. The names shown are the rehearsal's made-up ones
(`…@songhealth.invalid`; #457 comment 7184244548), not a real person's. Asked for in #457 comment
7182035030.

| # | Image | What it shows | Source for the claim |
|---|---|---|---|
| 1 | [`1-setup-passkey-step.png`](1-setup-passkey-step.png) | The Admin's own setup of the first Administrator, at its last step, "Secure your account": the account gets a passkey, and the setup offers no password. "Create passkey" opens Windows' passkey prompt; "EmDash never receives your PIN, password, or biometric information." | EmDash 1.1.0's setup ends with the passkey step and signs in by passkey only with no email provider (`docs/agents/emdash-1.1.0.md`, "Authentication and setup"); Windows run W6 (`docs/operations/windows-client-runbook.md` §4) |
| 2 | [`2-sign-in-screen.png`](2-sign-in-screen.png) | The Admin's sign-in screen: "Sign in with Passkey", and no password field. Its "Sign in with email link" is refused, since the site has no email sender (`503 EMAIL_NOT_CONFIGURED`), so a passkey is the only way in from the sign-in screen (the recovery link below is made on the server). | `docs/agents/emdash-1.1.0.md`, "Authentication and setup" (no email provider; the email link's route); `scripts/rehearsal-admins.ts` preflight P6 on the rehearsal machine |
| 3 | [`3-sign-in-windows-hello-pin.png`](3-sign-in-windows-hello-pin.png) | A sign-in in Chrome: Windows Security's "Sign in with a passkey" names the account and "Passkey for songhealth.moph.go.th" and asks for the PIN. The passkey is on this computer, and only its PIN releases it. | Windows run W7 and W8 (`docs/operations/windows-client-runbook.md` §4, §5) |
| 4 | [`4-signed-in.png`](4-signed-in.png) | After the PIN: the Administrator is in the Admin, at `songhealth.moph.go.th/_emdash/admin`. | Windows run W7 |

**The passkey works only under `songhealth.moph.go.th`.** Image 3 shows the name Windows binds the
passkey to. The site sets that name from its configured address, never from the address a visitor
typed, so a passkey made here is refused anywhere else (`docs/agents/emdash-1.1.0.md`,
"Authentication and setup", the first fact). On the rehearsal machine, a look-alike site
(`songhealth-moph.example`) and a site reached by its numeric address asked a browser for this
site's passkey, and the browser refused both with `SecurityError` before any passkey was offered
(`scripts/rehearsal-admins.ts` admins A7; asked for a passkey of their own name instead, they got
none). This is what protects an Administrator from a
look-alike sign-in page: there is no password or code to type into it.

**The one way in without a passkey.** For the day every Administrator's passkeys are lost, a
recovery link signs one Administrator in once, within 15 minutes, so that they make a new passkey.
It is not on the sign-in screen and nobody can ask for it from the site: it is made on the server
itself, by someone signed in there over the private network, and only with the Operator's approval
(`docs/operations/administrator-recovery.md`; the Product Owner's decision, #457 comment
7184244548).

**Not shown yet.** Windows Hello's prompt while the passkey is being made, during the setup (#457
comment 7182035030, image 1's second half). On the rehearsal machine Windows asked for the PIN
straight away, and the moment was not captured. #466 captures it when the Production host's first
Administrator is made.

The repository is public: no image here shows a Windows account name, a real email address, a
private-network address, a tailnet name or a key.
