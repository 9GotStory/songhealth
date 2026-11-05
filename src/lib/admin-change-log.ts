// The admin change log (#115; ADR 0005): one JSON line per state-changing request to EmDash's
// API, so publishing, schema and Admin changes, and user-access changes show who made them and
// when. EmDash 1.1.0 records who did none of these (docs/agents/emdash-1.1.0.md
// "Traceability").
//
// A request is under EmDash's API when the route Astro ran is, not its path (Product Owner, #115
// comment 6560104841). astro 7.3.5 routes on the decoded path (dist/core/routing/match-request.js),
// so a percent-encoded path such as /_emdash/%61pi/settings still reaches the settings route. And
// for a method a route does not export, Astro runs the middleware again for the 404 page with the
// same path (dist/runtime/server/endpoint.js, dist/core/errors/default-handler.js), which the path
// would log twice. An API path that no route answers changes nothing and writes no line.

const EMDASH_API = "/_emdash/api/";
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Routine editing writes no line, because EmDash records who did it and when, or because it
// changes nothing (#115 comment 6559441351, decision 6). Each entry is a method and the route
// pattern EmDash injects (emdash 1.1.0 src/astro/integration/routes.ts):
// - an entry's create and update, each a revision with its author and time
//   (src/database/repositories/revision.ts);
// - a new media item, which keeps its uploader and time: a direct upload, or the Admin's upload
//   URL, upload and confirm on local storage (src/astro/routes/api/media/upload-url.ts);
// - the toolbar's renewal of its visual-action token, which changes nothing and which a public
//   page sends on a timer, with nobody acting (#164; src/visual-editing/toolbar.ts
//   refreshVisualActionToken, src/astro/routes/api/visual-editing/action-token.ts). A request that
//   a person sends keeps its line even when it changes nothing, such as a preview URL (#164
//   decision A).
// The edit lock, which the Admin takes, refreshes and releases while someone edits, writes none
// for any method.
const ROUTINE_EDITING = new Set([
	"POST /_emdash/api/content/[collection]",
	"PUT /_emdash/api/content/[collection]/[id]",
	"POST /_emdash/api/media",
	"POST /_emdash/api/media/upload-url",
	"PUT /_emdash/api/media/[id]/upload",
	"POST /_emdash/api/media/[id]/confirm",
	"POST /_emdash/api/visual-editing/action-token",
]);
const EDIT_LOCK = "/_emdash/api/content/[collection]/[id]/lock";

/** What the middleware knows about a request once it has its answer. */
export interface AnsweredRequest {
	method: string;
	/** The route Astro ran, as `context.routePattern` names it. */
	route: string;
	/** The requested path. A query string or fragment on it never reaches the line. */
	path: string;
	status: number;
	/** The user the request acted as, with their EmDash role name, or null when there is none. */
	user: { id: string; role: string | null } | null;
	time: Date;
}

/** The request's log line, or undefined when the request writes none. */
export function adminChangeLine(request: AnsweredRequest): string | undefined {
	const method = request.method.toUpperCase();
	const { route } = request;
	if (!STATE_CHANGING.has(method) || !route.startsWith(EMDASH_API)) return undefined;
	if (route === EDIT_LOCK || ROUTINE_EDITING.has(`${method} ${route}`)) return undefined;
	return JSON.stringify({
		log: "songhealth-admin-change",
		time: request.time.toISOString(),
		userId: request.user?.id ?? null,
		role: request.user?.role ?? null,
		method,
		path: request.path.replace(/[?#].*$/s, ""),
		status: request.status,
	});
}

/**
 * Answers the request with `next`, then writes its line through `write`: with the answer's status,
 * or with 500 when the handler throws, whose error then propagates unchanged. `details` is read
 * after the answer, once EmDash has resolved the user the request acted as.
 */
export async function withAdminChangeLog(
	next: () => Promise<Response>,
	details: () => Omit<AnsweredRequest, "status">,
	write: (line: string) => void,
): Promise<Response> {
	const log = (status: number) => {
		const line = adminChangeLine({ ...details(), status });
		if (line !== undefined) write(line);
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
}
