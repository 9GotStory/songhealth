// The admin change log (#115; ADR 0005): one JSON line per state-changing request to EmDash's
// API, so publishing, schema and Admin changes, and user-access changes show who made them and
// when. EmDash 1.1.0 records who did none of these (docs/agents/emdash-1.1.0.md
// "Traceability").

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Routine editing writes no line, because EmDash records who did it and when, or because it
// changes nothing (#115 comment 6559441351, decision 6). Each entry is a method and the route
// pattern EmDash injects (emdash 1.1.0 src/astro/integration/routes.ts):
// - an entry's create and update, each a revision with its author and time
//   (src/database/repositories/revision.ts);
// - a new media item, which keeps its uploader and time: a direct upload, or the Admin's upload
//   URL, upload and confirm on local storage (src/astro/routes/api/media/upload-url.ts).
// The edit lock, which the Admin takes, refreshes and releases while someone edits, writes none
// for any method.
const ROUTINE_EDITING = new Set([
	"POST /_emdash/api/content/[collection]",
	"PUT /_emdash/api/content/[collection]/[id]",
	"POST /_emdash/api/media",
	"POST /_emdash/api/media/upload-url",
	"PUT /_emdash/api/media/[id]/upload",
	"POST /_emdash/api/media/[id]/confirm",
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
	if (!STATE_CHANGING.has(method) || !route.startsWith("/_emdash/api/")) return undefined;
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
