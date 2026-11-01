// The admin change log's middleware (#115; ADR 0005): it writes `src/lib/admin-change-log.ts`'s
// line to standard output once a request has its answer. Podman sends the container's output to
// journald (docs/operations/production-foundation.md "Admin change log").
//
// astro.config.mjs registers it through EmDash's `middleware.outer`, so it wraps the whole EmDash
// pipeline (emdash 1.1.0 src/astro/integration/index.ts buildMiddlewareEntries; Product Owner,
// #115 comment 6559591057). It therefore sees the refusals EmDash's auth middleware answers
// without calling `next()`, such as a missing session or CSRF header
// (src/astro/middleware/auth.ts), which Astro's project middleware would not: it runs after every
// `pre` middleware (astro 7.3.5 dist/core/middleware/vite-plugin.js). The middleware share one
// context (dist/core/middleware/sequence.js), so by the time `next()` resolves, that auth
// middleware has set `locals.user` for a signed-in request. A handler's error reaches this
// middleware through `next()` (dist/core/middleware/astro-middleware.js). The role is named by
// EmDash's own role levels (@emdash-cms/auth 1.1.0 src/types.ts roleFromLevel), such as EDITOR.
import { roleFromLevel } from "@emdash-cms/auth";
import { defineMiddleware } from "astro:middleware";

import { withAdminChangeLog } from "../lib/admin-change-log";

export const onRequest = defineMiddleware((context, next) =>
	withAdminChangeLog(
		next,
		() => {
			const { user } = context.locals;
			return {
				method: context.request.method,
				route: context.routePattern,
				path: context.url.pathname,
				user: user ? { id: user.id, role: roleFromLevel(user.role) ?? null } : null,
				time: new Date(),
			};
		},
		(line) => console.log(line),
	),
);
