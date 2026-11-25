# Production host contract (Feature 016)

What Songhealth needs from the Production host, and what it gives back. Songhealth is one system
on the office's central server (`docs/adr/0009`); the server's own infrastructure is a separate
project in a private repository. This document is the interface both sides build against: the
host's project and, until the host exists, the minimal stand-in on the rehearsal machine (spec
#450, "The rehearsal"). It says what Songhealth relies on and never how the host provides it.

**Authority:** spec #450 "The Production host and the host contract" (Product Owner, 2026-11-25,
round 3) lists the six items below; `10` §3.1, §17 and §18 hold the decisions they serve. Terms
are `GLOSSARY.md`'s: the Operator approves, and the Deployment account is the one account without
sudo that owns Songhealth's runtime.

**What this repository holds of it:** Songhealth's side only. No address of the host, no
private-network configuration, no key, certificate or credential, and nothing about another system
appears here, in Songhealth's units or in its runbooks. Where Songhealth needs one of those, the
host names it in the account's own configuration, outside the repository.

Each item gives:

- **Interface:** what one side calls, reads or places, and where.
- **Permission:** who may do it, and what the Deployment account may not.
- **Status:** what the item reports, and where Songhealth reads it.
- **On failure:** what happens, and who hears of it.
- **Recovery:** how it is put right, and whose step that is.
- **Owner:** which side owns which part. "The host" is the host's project, run by the Operator;
  "Songhealth" is this repository's part, run through the Deployment account under the Operator's
  approval.

## 1. The proxy and the certificate

- **Interface:** Caddy runs at the host's level for every system on it. Its configuration imports
  Songhealth's site configuration, a file this repository provides (#456 places it, #458 completes
  it), from a path the host chooses. That site answers `songhealth.moph.go.th` alone, forwards to
  Songhealth's loopback publication (`127.0.0.1:4321`, `production-foundation.md` §2, §10), passes the
  name to the application as a fixed `Host`, limits the request body, and answers with a static HTML
  notice and HTTP 503 while the application is stopped for the night's Recovery Set (§3). Where the
  site must refer to something private, such as which addresses may reach it before the cutover, it
  imports a named snippet the host defines, so no address enters the repository: `songhealth_private`
  closes the connection for every source outside the allowed network. Caddy reads the
  certificate and key for the site's name from files the Operator places, named in a second
  snippet the host defines, `songhealth_tls` (#456: [`deploy/caddy/songhealth.caddy`](../../deploy/caddy/songhealth.caddy)
  imports both), and requests no ACME certificate for a name they cover. A request for a host name no system serves is closed at the
  host's level, and closing it leaves every other system's site as it is.
- **Permission:** the Deployment account cannot read the certificate's key, change Caddy's
  configuration or reload it. A change to Songhealth's site configuration is reviewed in this
  repository and installed and reloaded by the Operator. Until the Operator says otherwise, only
  Songhealth's site is restricted to the private network (spec #450, "Access before the cutover").
- **Status:** Songhealth reads its side through its access log (§5) and its own checks through the
  proxy at the site's real name. Caddy's own state and the certificate's expiry are the host's to
  watch.
- **On failure:** if Caddy is down or refuses Songhealth's site, the site is unreachable while the
  application stays healthy behind it; the host's watch alerts. A configuration that does not load
  is refused by the reload, and the running configuration stays.
- **Recovery:** the Operator corrects the configuration or the certificate files and reloads Caddy;
  Songhealth's checks through the proxy confirm the site again.
- **Owner:** the host owns Caddy, its installation, its global configuration, the closing of unknown
  names, the private-network snippet and the certificate files. Songhealth owns its site
  configuration and its 503 notice.

## 2. Rootless Podman's prerequisites

- **Interface:** the host provides what rootless Podman with Quadlet needs for the Deployment
  account:
  - Podman with Quadlet, from the distribution (Ubuntu 26.04's is 5.7.0; the Quadlet keys the
    units use are in its documentation, spec #450 "Confirmed facts", and started as written on the
    rehearsal machine, #456), and the packages Podman and `netavark` only recommend: `uidmap` (not
    on the minimal cloud image), with subordinate UID and GID ranges for the account, `pasta`
    (package `passt`) for rootless networking, and `aardvark-dns` and `nftables` for the private
    network, without which the application cannot resolve the database's name (#456);
  - Podman's init at `/usr/libexec/podman/catatonit`, Podman's default `init_path`, which the
    application unit runs (`RunInit=true`, `production-foundation.md` §3, §7.1). Ubuntu's `podman`
    recommends `catatonit`, which installs that path; a host installed with
    `--no-install-recommends` installs `catatonit` by name;
  - `/usr/bin/stat` with the output the database unit's existing-store guard reads
    (`production-foundation.md` §3, §6.1). On Ubuntu 26.04 that path is the uutils `stat` and GNU's
    is `/usr/bin/gnustat`. On the rehearsal machine the uutils `stat` 0.10.0 printed the guard's
    exact records, and the unit keeps `/usr/bin/stat` (Product Owner, #456 comment 7166769976);
  - lingering for the account (`loginctl enable-linger`, `production-foundation.md` §4.6), so its
    user manager and Songhealth's units run without a login session and start at boot;
  - any change to a host safeguard, such as an AppArmor rule for Podman's `pasta` (Launchpad bug
    2154379), only once the Product Owner has approved it with its effect. On the rehearsal
    machine that bug logs one denial at each stop and the teardown still completes, so no change
    is made (#456 comment 7166769976).
- **Permission:** installing packages, setting subordinate ranges and lingering, and changing a
  safeguard are root steps of the Operator's, through Songhealth's guided script for the root steps
  it needs ([`scripts/host/root-setup.sh`](../../scripts/host/root-setup.sh), which installs these
  packages by name where the host has not). The Deployment account has no sudo. Songhealth installs Node 26.13.0, the version
  `package.json` pins, under the account from the official distribution with its checksum
  verified, for its operational scripts; no dependency and no development toolchain is installed
  on the host.
- **Status:** the account reads `podman --version`, `podman info`, `loginctl show-user` and its own
  units' state; the T016 harness records the host's versions and `stat`'s behaviour in T022.
- **On failure:** a missing prerequisite stops a unit from starting, and the unit's own refusal
  names it (`production-foundation.md` §6, §8). A host update that changes Podman's behaviour shows
  as a failed or restarting unit, which Songhealth's watch reports (§4).
- **Recovery:** the Operator installs or restores the prerequisite; Songhealth starts its units
  again and its checks confirm them. A Podman upgrade on the host is announced to Songhealth before
  it is applied, and the T016 harness runs again where it touches what the harness covers.
- **Owner:** the host owns the packages, the subordinate ranges, lingering and its safeguards.
  Songhealth owns its units, its Node under the account and what they run.

## 3. The central backup

- **Interface:** Songhealth takes a Recovery Set every night at 03:00 Asia/Bangkok with the
  application stopped (`10` §18) and keeps seven on the host. It writes each set where the backup
  cannot see it, checks it, and only then moves it by a rename into its folder of finished sets, a
  path under the account's home that the host is told once; a set there is therefore always
  complete: its own directory, named by its UTC time, holding `database.dump`, `media.tar` and
  `manifest.json` (`production-foundation.md` §7.6). The central backup takes each set from that
  folder, encrypts it and keeps it off the host, 30 daily and 12 monthly. It writes its status to a
  file the account can read, at a path the host names: a JSON object with the time of its last run
  (`"time"`, UTC), its result (`"result"`, `"ok"` or `"failed"`) and the name of the newest set it
  holds off the host (`"newestSet"`). Bringing a set back from off the host places its three files
  in a folder the account can read, from which Songhealth's restore runs.
- **Permission:** the backup reads the folder of finished sets and never writes or deletes there;
  Songhealth removes its own sets beyond seven. The account reads the status file and cannot read
  the backup's credentials or its encryption key. Bringing a set back is a root step of the
  Operator's, and a restore that can lose data waits for the Operator's approval each time. No
  production set leaves the host before the data-governance approval (spec #450).
- **Status:** the status file. Songhealth's watch reads it and reports a run that failed, and a
  newest set off the host older than the night's (§4).
- **On failure:** a failed upload leaves the sets on the host as they are, and the status says
  `"failed"`; a status that stops changing reads as a failure too. A failed nightly set is
  Songhealth's own failure: no set reaches the folder, and Songhealth reports it.
- **Recovery:** the next night's run takes the sets still in the folder; the Operator can run the
  upload by hand. A restore is rehearsed at least every six months.
- **Owner:** Songhealth owns taking, checking, keeping and pruning its sets on the host, and
  restoring them. The host owns encryption, the copy off the host, its retention there, its
  credentials and bringing a set back.

## 4. The alert command

- **Interface:** one command the account can run, at an absolute path the host names in the
  account's configuration, as `<alert command> <subject>` with the message's body on standard
  input. It sends an email to the recipients the host has set. Songhealth's watch calls it when its
  service fails or restarts in a loop, when its readiness or its container's health fails, when the
  night's Recovery Set or the copy off the host fails (§3), and when application errors or HTTP 5xx
  answers appear in its access log (§5); it also sends the weekly health report through it.
- **Permission:** the account runs it without sudo, chooses neither the recipients nor the sender,
  and cannot read the mail credential. A message never carries a secret, an address of the host or
  a visitor's personal data.
- **Status:** exit status 0 when the message is accepted for sending; any other status when it is
  not. That an email really arrives is checked by a drill (spec #450, "Monitoring and alerts").
- **On failure:** Songhealth records the refusal in its own journal and tries again at its next
  check. The host watches its own sending.
- **Recovery:** the host's project restores sending; the next check's message, or the weekly
  report, shows it works again.
- **Owner:** the host owns the command, the email and its recipients, and watches CPU, memory, disk
  and the certificate's expiry itself. Songhealth owns what it watches and when it calls.

## 5. Songhealth's access log

- **Interface:** Caddy writes the access log of Songhealth's site, and of no other system, to a file
  the account can read, at a path the host names, one JSON object a request in Caddy's own log
  format. The host rotates it.
- **Permission:** the account reads it and never writes it. It holds visitors' addresses, so it
  stays on the host and out of evidence and issues; Songhealth's watch reports counts, never lines.
  How long it is kept is the host's setting, with the same question of a legal minimum as the
  application's journal (ADR 0005).
- **Status:** the file itself: Songhealth's watch counts HTTP 5xx answers and errors in it since its
  last check.
- **On failure:** a log that is missing, unreadable or no longer growing while the site serves is
  reported by Songhealth's watch as a failure of the watch itself (§4).
- **Recovery:** the Operator restores the log's path or permissions; the watch reads it again at its
  next check.
- **Owner:** the host owns the log's writing, rotation and retention. Songhealth owns reading it.

## 6. Limits and swap

- **Interface:** the host sets the Deployment account's resource limits (memory, CPU) and the
  machine's swap, per host and outside Songhealth's committed units. The limit leaves room for the
  database, the server and the startup build together: the startup build alone peaked at 2,093 to
  2,164 MiB on the workstation (`production-foundation.md` §7.1), and the rehearsal records the
  whole start's figures for each size (#464). Swap of 2 to 4 GB is a starting proposal and never a
  substitute for memory the system needs (spec #450).
- **Permission:** setting a limit or swap is a root step of the Operator's. The account reads its
  limits and cannot change them.
- **Status:** the account can read its limits where the host applies them, which the host tells
  it, and its own units' use (`systemctl --user status`); the host watches the machine's memory and
  swap.
- **On failure:** a start that runs out of memory is killed; the unit fails or restarts, and
  Songhealth's watch reports it (§4). The host's watch reports pressure on the machine.
- **Recovery:** the Operator raises the limit or the swap, after the figures say why; Songhealth
  starts its units again.
- **Owner:** the host owns limits and swap. Songhealth owns stating what it needs and measuring it.

## What this contract does not fix

How the host installs Caddy and loads the certificate, which network software makes the private
network, how the central backup encrypts, transfers and stores, which mail service sends the email,
and how limits are applied are the host's. Songhealth relies only on what each item's interface
states.

Some details here go beyond what spec #450 decided, so that both sides can be built against them,
and the Product Owner reviews them with this document: the snippet the site imports for the
private-network rule and the one naming the certificate files (§1), the rename into the folder of finished sets and the status file's three
keys (§3), the alert command's arguments (§4), the access log's JSON lines (§5), and the
announcement of a Podman upgrade on the host before it is applied (§2). The tickets
that build each side (#456, #458, #460, #462) confirm them against the stand-in, and a change goes
into this document first.
