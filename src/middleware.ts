// PROTOTYPE (throwaway, branch prototype/design): keep the Feature 006 design variant a reviewer
// picked through `?variant=` or `?onepage=` in a cookie, so following a link keeps it
// (src/lib/prototype-design.ts). It only sets cookies; every response stays as the page renders it.
import { defineMiddleware } from "astro:middleware";

import {
	ONEPAGE_COOKIE,
	ONEPAGE_PARAM,
	VARIANT_COOKIE,
	VARIANT_PARAM,
	designOf,
} from "./lib/prototype-design";

export const onRequest = defineMiddleware((context, next) => {
	const { searchParams } = context.url;
	if (searchParams.has(VARIANT_PARAM) || searchParams.has(ONEPAGE_PARAM)) {
		const design = designOf(context.url, (name) => context.cookies.get(name)?.value);
		const options = { path: "/", sameSite: "lax" as const, httpOnly: true };
		context.cookies.set(VARIANT_COOKIE, design.variant, options);
		context.cookies.set(ONEPAGE_COOKIE, design.onepage, options);
	}
	return next();
});
