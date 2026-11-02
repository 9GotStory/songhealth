# #115 evidence: the admin change log on the development runtime

One evidence round for the admin change log (#115, ADR 0005), run on 2026-11-01 between
15:42:32Z and 15:42:35Z by Claude Code. This is a self-run record, not an independent review, and
not the Product Owner's acceptance.

- **Runtime:** the single development runtime at `http://127.0.0.1:4324`, promoted to `c60941d`
  (`dev-runtime-update.sh --sha`), `dev-runtime-verify.sh` VERIFY: PASS at that commit. Node
  26.13.0.
- **Actors:** the development Administrator's PAT, and the role fixture's PAT
  (`role-fixture@songhealth.test`, an Author) moved to Editor for the publishing steps and back.
  One request carried no credential.
- **Reading:** the lines were read from the app unit's journal, as `production-foundation.md` §7.5
  says: `journalctl --user -u songhealth-dev-app.service -o cat`, filtered by the marker
  `songhealth-admin-change`, over the round's window.

## Steps and lines

Each step is one request through EmDash's native API. "Line" is what the journal received for it.

| Step | Request | Status | Line |
| --- | --- | --- | --- |
| Entry create | `POST /_emdash/api/content/news` | 201 | none, as required |
| Entry save | `PUT …/content/news/{id}` | 200 | none, as required |
| Edit lock take | `POST …/content/news/{id}/lock` | 200 | none, as required |
| Edit lock refresh | `POST …/content/news/{id}/lock` | 200 | none, as required |
| Edit lock release | `DELETE …/content/news/{id}/lock` | 200 | none, as required |
| Role change to Editor (Administrator) | `PUT …/admin/users/{fixture}` | 200 | 1 |
| Publish (Editor) | `POST …/content/news/{id}/publish` | 200 | 1 |
| Unpublish (Editor) | `POST …/content/news/{id}/unpublish` | 200 | 1 |
| Refused: an Editor changes a user | `PUT …/admin/users/{administrator}` | 403 | 1 |
| Role change back to Author | `PUT …/admin/users/{fixture}` | 200 | 1 |
| Disable | `POST …/admin/users/{fixture}/disable` | 200 | 1 |
| Enable | `POST …/admin/users/{fixture}/enable` | 200 | 1 |
| Schema field create | `POST …/schema/collections/news/fields` | 201 | 1 |
| Schema field delete | `DELETE …/schema/collections/news/fields/{field}` | 200 | 1 |
| Site settings save (title unchanged) | `POST …/settings` | 200 | 1 |
| Menu create | `POST …/menus` | 201 | 1 |
| Menu item add | `POST …/menus/{menu}/items` | 201 | 1 |
| Menu item delete | `DELETE …/menus/{menu}/items/{item}` | 200 | 1 |
| Menu delete | `DELETE …/menus/{menu}` | 200 | 1 |
| Invite | `POST …/auth/invite` | 200 | 1 |
| API token create | `POST …/admin/api-tokens` | 201 | 1 |
| API token revoke | `DELETE …/admin/api-tokens/{token}` | 200 | 1 |
| Refused: a settings save with no session | `POST …/settings` | 401 | 1 |
| MCP `initialize` (Administrator's token) | `POST /_emdash/api/mcp` | 404 | none, as required |
| Entry trash (cleanup) | `DELETE …/content/news/{id}` | 200 | 1 |
| Entry permanent delete (cleanup) | `DELETE …/content/news/{id}/permanent` | 200 | 1 |

The journal received 21 lines in the window. 20 of them match the 20 expected lines exactly, in
order: the user id, role, method, path and status of each. Each time falls inside the window.

The 21st is `POST /_emdash/api/typegen` with no user. EmDash's development server sends it to
itself after a schema change, to regenerate types. The route is development-only ("Dev-only
endpoint - disabled in production", emdash 1.1.0 `src/astro/routes/api/typegen.ts`), and the rule
logs it like any other state-changing API request.

- **Who published:** the publish and unpublish lines name the role fixture's user id with the role
  EDITOR. EmDash itself records no publisher.
- **A refusal by the route:** the Editor's user change answered 403 and was logged with it.
- **A refusal by EmDash's middleware:** the settings save with no session answered 401 from
  EmDash's auth middleware, which does not call `next()` (emdash 1.1.0
  `src/astro/middleware/auth.ts`). Only a middleware that wraps EmDash's sees it, which is why the
  log goes through `middleware.outer` (#115 comment 6559591057).
- **MCP is off:** `POST /_emdash/api/mcp` answered Astro's 404 page, not JSON-RPC. No route answers
  that path, so it wrote no line (#115 comment 6560104841).

```text
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.449Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"PUT","path":"/_emdash/api/admin/users/01M62QKS99NTBN5FFC63X1892Q","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.515Z","userId":"01M62QKS99NTBN5FFC63X1892Q","role":"EDITOR","method":"POST","path":"/_emdash/api/content/news/01M6BWDNRJEHWWX2Y39GS75TQP/publish","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.578Z","userId":"01M62QKS99NTBN5FFC63X1892Q","role":"EDITOR","method":"POST","path":"/_emdash/api/content/news/01M6BWDNRJEHWWX2Y39GS75TQP/unpublish","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.586Z","userId":"01M62QKS99NTBN5FFC63X1892Q","role":"EDITOR","method":"PUT","path":"/_emdash/api/admin/users/01M61PSVNRFW1SA3SDDJ26CATQ","status":403}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.608Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"PUT","path":"/_emdash/api/admin/users/01M62QKS99NTBN5FFC63X1892Q","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.625Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/admin/users/01M62QKS99NTBN5FFC63X1892Q/disable","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.638Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/admin/users/01M62QKS99NTBN5FFC63X1892Q/enable","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.678Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/schema/collections/news/fields","status":201}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.723Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"DELETE","path":"/_emdash/api/schema/collections/news/fields/songhealth_synthetic_115","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.749Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/settings","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.775Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/menus","status":201}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.802Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/menus/songhealth-f002-synthetic-115/items","status":201}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.818Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"DELETE","path":"/_emdash/api/menus/songhealth-f002-synthetic-115/items/01M6BWDPA5JWANY0RNH117ST0W","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.833Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"DELETE","path":"/_emdash/api/menus/songhealth-f002-synthetic-115","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.851Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/auth/invite","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.868Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"POST","path":"/_emdash/api/admin/api-tokens","status":201}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.885Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"DELETE","path":"/_emdash/api/admin/api-tokens/01M6BWDPC3VFSS2M468KVR1A3P","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.889Z","userId":null,"role":null,"method":"POST","path":"/_emdash/api/settings","status":401}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:33.988Z","userId":null,"role":null,"method":"POST","path":"/_emdash/api/typegen","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:34.047Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"DELETE","path":"/_emdash/api/content/news/01M6BWDNRJEHWWX2Y39GS75TQP","status":200}
{"log":"songhealth-admin-change","time":"2026-11-01T15:42:34.101Z","userId":"01M61PSVNRFW1SA3SDDJ26CATQ","role":"ADMIN","method":"DELETE","path":"/_emdash/api/content/news/01M6BWDNRJEHWWX2Y39GS75TQP/permanent","status":200}
```

## Credentials

The round used four credentials: the Administrator's PAT, the role fixture's PAT, the API token
it created, and the invite's token. It checked the 21 lines for each without printing any of them:
none appears. Each line holds exactly the seven keys `log`, `time`, `userId`, `role`, `method`,
`path` and `status`, and no `?`.

The invite's token does appear in the journal, from EmDash, not from this log. In development
EmDash's console email provider writes each email to standard output, including the invite link
(emdash 1.1.0 `src/plugins/email-console.ts`: "Auto-activated when import.meta.env.DEV is true").
In production, with no email provider, EmDash returns the link in the response instead
(`src/astro/routes/api/auth/invite/index.ts`).

## Cleanup

- The entry was trashed and permanently deleted (the last two lines).
- The schema field, the menu item and the menu were deleted, and the API token was revoked.
- The role fixture is back to Author and enabled: verify's "role fixture PAT (mode 0600)
  authenticates as an enabled Author" passed afterwards.
- EmDash has no route that revokes an invite, so the invite's one `auth_tokens` row was deleted
  with SQL by its synthetic email.
- Afterwards no synthetic API token, menu, field or invite remained, `dev-runtime-residue.sh`
  reported RESIDUE: NONE, and `dev-runtime-verify.sh` VERIFY: PASS at `c60941d`.

## Regression

The log's middleware wraps every request, public pages included. So the same commit then ran the
full browser suite (`--workers=1`): 304 passed and 14 skipped, the same counts as at `ea2f8cc`.
The T021 coordinator passed 14 of 14 with no owned-fixture residue. RESIDUE: NONE afterwards,
with the suites' 40 synthetic misses in EmDash's 404 log, which clears only as a whole.

## Version-specific facts

- **astro 7.3.5:**
  - Integration middleware with `order: "pre"` runs before the project's own middleware
    (`dist/core/middleware/vite-plugin.js`, Context7 `/withastro/docs` integrations reference
    `addMiddleware`).
  - The middleware share one context (`dist/core/middleware/sequence.js`).
  - A handler's error reaches the middleware through `next()`
    (`dist/core/middleware/astro-middleware.js`).
  - Astro routes on the decoded path (`dist/core/routing/match-request.js`).
  - For a method that a route does not export, Astro runs the middleware again for the 404 page
    (`dist/runtime/server/endpoint.js`, `dist/core/errors/default-handler.js`).
- **emdash 1.1.0:** `docs/agents/emdash-1.1.0.md` "Traceability".
- **Podman 5.8.4:** on the development host, `podman info` reports the log driver `journald`, and
  the development application container uses it. The production unit sets no `LogDriver=`
  (`production-foundation.md` §7.5).
