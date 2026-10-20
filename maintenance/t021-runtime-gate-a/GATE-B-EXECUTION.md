# GATE-B-EXECUTION — T021 runtime maintenance runbook (NOT APPROVED; corrective round 1)

`GATE_B=NOT_APPROVED`; `GATE_C=NOT_APPROVED`; `RUNTIME_INTEGRATION=HOLD`.
Everything below is a **future, separately approved** execution proposal.
No command in this file has been executed; none is authorized by Gate A.

## Scope requiring an explicit Product Owner decision (Gate B)

| Item | Decision required |
| --- | --- |
| Install this reviewed maintenance bundle into the live controller area | approve/deny |
| Source/config/Compose transition `6ab72780…` → `e7e21d6…` (exact pair only; seed file advanced with the source, never applied) | approve/deny |
| App-only downtime: validated stop + single replacement app container (new ID binding; environment change requires replacement, not bare restart) | approve/deny |
| Paired rollback to the exact recorded source `6ab72780…` (bounded, explicitly approved per record; works from a completed OR recorded-interrupted forward) | approve/deny |
| Private capability delivery: server-only `SONGHEALTH_T021_ROUTE_TOKEN` value (via the record's private `token_input` file) into `maintenance/t021-gate-a/route-token.env` + mode-0600 client copy at `SONGHEALTH_T021_ROUTE_ACCESS` | approve/deny |
| Second distinct test-owned native role account/PAT (prerequisite; provisioning step named below, NOT implemented in this bundle) | approve/deny |
| Bounded post-transition verification (unauthenticated SSR check included; any native-PAT verification acknowledges its bookkeeping writes — never label authenticated GETs zero-write) | approve/deny |

Gate C (T022 runtime join) and everything after remain separate decisions.

## Corrected execution path (A1–A4)

The reviewed transition order is **validate-everything → stop → mutate →
replace → verify**, with every consequential stage recorded durably:

1. **Gate B install record** (schema 2, `operation: "install"`) names the
   exact Gate A candidate SHA + `bundle_manifest_sha256`. The installer
   verifies the bundle, verifies EVERY installed artifact against the
   captured preimages, validates the record AND the installed activation —
   all BEFORE the first write. A rejected installation leaves manifest/
   activation bytes untouched. It stages the maintenance area, rewrites
   manifest.json/activation.json through the controller's own exclusive
   tmp/fsync discipline (mutable state, the Gate B record and the
   candidate binding are NOT hash-bound manifest entries), and writes
   `candidate.json` binding the externally accepted candidate.
2. **runtime.env never changes.** The installed controller's `[A-Z_]+`
   grammar cannot read a digits key, so the server-only
   `SONGHEALTH_T021_ROUTE_TOKEN` travels through a PRIVATE Compose service
   env_file (`maintenance/t021-gate-a/route-token.env`, mode 0600, UID
   1001) referenced by the proposed Compose. Original routines
   (`env_read`/`status`/`verify`) stay compatible; no token value ever
   enters a public/hashed artifact, log, argv or evidence.
3. **apply** verifies the bundle, Gate B record (candidate binding against
   `candidate.json`), stage-aware installed preimages, source guard, seed
   preimage, five-key env and the token input — all BEFORE the app is
   stopped — then: stop app → checkout exact source → install the reviewed
   474-byte config + proposed Compose as the LIVE files → write the token
   env_file → single replacement app through the LIVE Compose (the provider
   argv `-f <live>/compose.yaml` now carries the reviewed key) → bounded
   unauthenticated health → `complete` record. Each stage appends to
   `maintenance/t021-gate-a/state.json` (schema 3).
4. **rollback** (separate Gate B record, `operation: "rollback"`, whose
   `forward_record_sha256` must hash the ACTUAL recorded forward progress)
   validates all material — record pairing, preimages, source/seed/config/
   Compose preimage bytes, token-file presence, the CURRENT (replacement)
   app binding — BEFORE stopping, then restores the exact recorded
   source/seed/config/Compose, removes the token env_file, creates ONE
   replacement app and records its new ID. Works from a completed apply OR
   any recorded interrupted stage at/after `app-stopped`. Old container
   IDs are history, never restorable; no credential-timestamp reversal,
   DB/media restore or deleted-ID resurrection.
5. **Guards**: the original controller's `runtime.lock` flock discipline
   wraps every live verb; live resource admission (postgres container by
   recorded identity + running state, both volumes, both networks) blocks
   mutation on drift; approval-JSON IDs alone are never treated as
   live-resource proof; no direct provider bypass exists.

## Exact gate-b-record.json the PO decision must produce

```json
{
  "schema": 2,
  "operation": "install" | "apply" | "rollback" | "deliver-capability",
  "gate_a_candidate_sha": "<exact Gate A corrective candidate SHA>",
  "bundle_manifest_sha256": "<sha256 of maintenance/t021-runtime-gate-a/bundle-manifest.json>",
  "gate_a_review_reference": "<Lead PASS reference>",
  "independent_review_reference": "<ChatGPT Independent Review reference>",
  "po_reference": "<Gate B PO approval reference>",
  "capture_preimages": {
    "postgres": "d91afe9ed3198d7fc1abd48634f230ca4b6d1349f044d19e722f2a174676ca9a",
    "app": "56a74583da82df514f18a45969032b59b0f8938bd4a4da605aceb8c7e93d6e6d"
  },
  "token_input": "<private mode-0600 UID1001 file holding the raw server-only token (apply/deliver-capability only)>"
}
```

`rollback` records additionally require `forward_record_sha256` (the sha256
of the actual recorded forward progress record) and
`rollback_authorization`. The record lives at
`<live>/maintenance/t021-gate-a/gate-b-record.json` (mode 0600, UID 1001),
written only by the PO decision process. A wrong-but-valid 40-hex candidate,
a stale manifest hash, a missing field, a mismatched operation or a
fabricated forward hash refuses BEFORE any live access.

## NOT-EXECUTED future commands (Gate B only)

```bash
# 0. Prerequisite checks (read-only; recorded stable identities)
/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh status
/home/multica-agent/.local/share/dev-runtimes/songhealth/runtime.sh verify

# 1. Write the Gate B install record (PO decision; mode 0600, UID 1001),
#    then install the reviewed maintenance bundle (validate-before-write;
#    no live transition). Prints the manifest identity Gate B must reference.
python3 <gate-a-checkout>/maintenance/t021-runtime-gate-a/install-maintenance.py

# 2. Write the Gate B apply record naming a private token_input file
#    (mode 0600, UID 1001, raw token value; generated by the PO decision,
#    never by this bundle), then run the forward transition:
python3 /home/multica-agent/.local/share/dev-runtimes/songhealth/maintenance/t021-gate-a/runtime.py apply

# 3. Capability client copy (mode 0600 { "token": … } at the private path
#    named by SONGHEALTH_T021_ROUTE_ACCESS; no value ever printed):
python3 /home/multica-agent/.local/share/dev-runtimes/songhealth/maintenance/t021-gate-a/runtime.py deliver-capability

# 4. Paired rollback (ONLY under an explicit Gate B rollback record whose
#    forward_record_sha256 hashes the actual recorded forward progress):
python3 /home/multica-agent/.local/share/dev-runtimes/songhealth/maintenance/t021-gate-a/runtime.py rollback
```

`maintenance-apply`/`maintenance-rollback` are the only operations the
installer adds to the activation scope; no verb is assumed to exist on
today's controller, and ordinary `promote` is never rollback authority.

## Prerequisites and private inputs

- **Second distinct test-owned role account/PAT — Gate B prerequisite.**
  Either reuse a supplied existing account or approve an explicitly named
  native provisioning step. This bundle implements NO account/PAT
  provisioning and never mutates the shared Administrator.
- The token VALUE (Gate-B-generated) supplied via the record's private
  `token_input`; `runtime.env` is untouched. `SONGHEALTH_T021_ROUTE_ACCESS`
  names the client-copy path.
- The capture verifies preimages, not fresh runtime health/worktree
  cleanliness — Gate B revalidates under its own authorization.

## Stop conditions / partial state

- Any refusal BEFORE the first mutation leaves every preimage untouched.
- Failure AFTER a consequential stage preserves truthful partial state in
  `maintenance/t021-gate-a/state.json` and names the stage in the HOLD
  message; bounded rollback runs only under an explicit Gate B rollback
  record; a failed or unknown rollback stops for PO (no retry loop).
- Lock contention refuses ('another Songhealth operation is active');
  resource-identity drift blocks before the app stop; unknown/stale/
  drifted state refuses everywhere.

## Verification boundary (future, bounded)

- Unauthenticated: `GET http://127.0.0.1:4322/` SSR marker (in
  `bounded_health_checks`); the dev-only route probe uses the capability
  header, not any Admin PAT.
- Any native-PAT verification is a separately approved Gate B step; its
  bookkeeping writes (e.g. `last_used_at`) are acknowledged, never hidden —
  authenticated GETs are never labeled zero-write. Future strict read-only
  preflights must avoid PAT use entirely.
