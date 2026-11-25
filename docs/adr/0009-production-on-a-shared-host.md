---
status: accepted
---

# Production runs on a host shared with the office's other systems

Feature 001 described a production host that ran Songhealth alone and left the reverse proxy,
monitoring and scheduled backups outside its scope. The office will instead rent one server from
an outside provider, running Ubuntu Server LTS, as its central server for several systems. That
server's own infrastructure (provisioning, firewall, private network, proxy, central backup,
monitoring and alerting) is a separate project in a private repository, outside this one. The
Product Owner decided it in the grill of spec #450 (2026-11-25, rounds 1 to 3) and approved this
record in the spec's review (#450 comment 7157822580).

**Decision.** Songhealth is one system on the Production host (`GLOSSARY.md`):

- It runs under one Deployment account without sudo, with rootless Podman and Quadlet as before,
  its own loopback port, a database that publishes no port, and environment, secrets, volumes and
  Recovery Sets of its own. Resource limits are set per host, outside the committed units.
- The proxy, the certificate, the central backup, the host's watch and email belong to the host.
  `docs/operations/production-host-contract.md` states what Songhealth needs from each and what it
  gives back, without fixing how the host does it.
- This repository holds Songhealth's side only: its units, its site's proxy configuration, its
  scripts and timers, its runbooks, and the guided script for the root steps Songhealth needs. It
  holds no address of the host, no private-network configuration, no key, certificate or
  credential, and nothing about another system.
- Root steps, creating secrets and anything that can lose data are the Operator's, through a
  runbook or a guided script.

**Trade-offs.**

- One server costs less and is run once for all the office's systems; in exchange Songhealth
  shares its CPU, memory and disk, and a fault on the host takes every system down together.
- Songhealth depends on a contract another project fulfils. Each side can be built and tested
  apart (the rehearsal stands in for the host's side), but neither is ready until both are.
- The Deployment account can read Songhealth's own secrets; having no sudo keeps it from the
  host's and the other systems' (spec #450, "The Operator, the Deployment account and Claude
  Code").
- A public repository gives nothing away about the host, at the cost of keeping its addresses and
  configuration in a second, private place.
