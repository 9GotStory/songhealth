# System Blueprint Controlled Amendment Review — v1.1

> **Document:** `current/10-system-blueprint.md`  
> **Previous Version:** 1.0 FROZEN  
> **Amended Version:** 1.1 FROZEN  
> **Review Date:** 15 สิงหาคม 2569  
> **Scope:** Development database isolation, Podman, Production-like Verification, Nginx proxy verification  
> **Result:** PASS

## 1. Amendment Trigger

หลัง Freeze v1.0 มีการยืนยัน Development workflow เพิ่มเติม:

- ไม่ต้องการติดตั้ง/ผูก MySQL/MariaDB native service กับ Developer OS
- ต้องการ real MySQL-compatible database สำหรับ database-sensitive integration/migration/concurrency verification
- ต้องการ production-like verification ของ production build และ reverse-proxy contract ก่อน Staging/Production
- Production ยังคงเป็น Bangmod Expert Hosting/Plesk ไม่ใช่ self-managed container platform

การเปลี่ยนนี้เป็น Technical Architecture refinement และไม่เปลี่ยน Product semantics ของ Frozen `00–08`.

## 2. Accepted Environment Model

### Daily Development

```text
Developer Host
├── Node.js / React / Vite
└── Podman
    └── CMS MySQL-compatible DB
        └── Named Volume
```

### Production-like Verification

```text
Podman Nginx
    ↓
Podman production-built Node.js application
    ↓
Podman MySQL-compatible DB
```

### Production

```text
Bangmod Expert Hosting / Plesk-supported runtime
    ↓
hosting-managed proxy/runtime boundary
    ↓
Production MySQL-compatible DB
```

## 3. Key Decisions

- Node.js/React/Vite remain native on the Developer Host for normal daily development.
- Development database is isolated in Podman and persists through a named volume.
- Development/CI database-sensitive tests use a real MySQL-compatible engine.
- the local/test engine image may be provisional until the actual Production MySQL/MariaDB family/version is verified.
- after verification, the Podman image/version is aligned and pinned as closely as practical.
- Production-like Verification adds Nginx + production-built application + database only for integration/release confidence.
- Nginx verifies the application/proxy contract; it does not claim exact Bangmod/Plesk parity.
- Production does not inherit a Podman/Nginx requirement from Development.
- Kubernetes, Production orchestration, Terraform, Ansible, Redis, queues, and other unrelated services remain deferred until justified.
- no Production secrets or unsanitized Production data belong in local/verification manifests by default.
- exact Containerfile/Compose provider/ports/image tags remain implementation/deployment manifest details.

## 4. Cross-document Impact

| Document | Action |
|---|---|
| `00-website-foundation.md` | No semantic change |
| `01–08` Frozen Product/IA docs | No semantic change |
| `10-system-blueprint.md` | Controlled Amendment 1.0 → 1.1 |
| `PROJECT-INDEX.md` | Update canonical version/current point |
| `CHANGELOG.md` | Record amendment |
| Constitution | No change |
| `09-migration-plan.md` | Remains deferred |

## 5. Consistency Review

```text
Product semantics                                 PASS
Architecture ownership                             PASS
Bangmod Production boundary                        PASS
Real database testing alignment                    PASS
Security / secrets / non-production data           PASS
No-over-engineering guardrail                      PASS
No accidental Production container mandate         PASS
No new unrelated infrastructure dependency         PASS
```

Blocking contradictions = 0.

## 6. Decision

**PASS — Controlled Amendment accepted and `10-system-blueprint.md` is FROZEN as v1.1.**
