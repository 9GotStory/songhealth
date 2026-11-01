// The admin change log's middleware (#115; ADR 0005): it writes `src/lib/admin-change-log.ts`'s
// line to standard output once a request has its answer. Podman sends the container's output to
// journald (docs/operations/production-foundation.md "Admin change log").
//
// astro.config.mjs registers it through EmDash's `middleware.outer`, so it wraps the whole EmDash
// pipeline (emdash 1.1.0 src/astro/integration/index.ts buildMiddlewareEntries; Product Owner,
// #115 comment 6559591057). It therefore sees the refusals EmDash's auth middleware answers
// without calling `next()`, such as a missing session or CSRF header
// (src/astro/middleware/auth.ts), which Astro's project middleware, running after EmDash's, would
// not. By the time `next()` resolves, that auth middleware has set `locals.user` for a signed-in
// request. A handler that throws is logged with status 500, and its error propagates as before
// (astro 7.3.5 dist/core/middleware/astro-middleware.js). The role is named by EmDash's own role
// levels (@emdash-cms/auth 1.1.0 src/types.ts roleFromLevel), such as ADMIN or EDITOR.
import { roleFromLevel } from "@emdash-cms/auth";
import { defineMiddleware } from "astro:middleware";

import { adminChangeLine } from "../lib/admin-change-log";

export const onRequest = defineMiddleware(async (context, next) => {
	const log = (status: number) => {
		const { user } = context.locals;
		const line = adminChangeLine({
			method: context.request.method,
			route: context.routePattern,
			path: context.url.pathname,
			status,
			user: user ? { id: user.id, role: roleFromLevel(user.role) ?? null } : null,
			time: new Date(),
		});
		if (line !== undefined) console.log(line);
	};
	let response: Response;
	try {
		response = await next();
	} catch (error) {
		log(500);
		throw error;
	}
	log(response.status);
	return response;
});
