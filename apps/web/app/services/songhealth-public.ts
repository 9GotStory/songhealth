/**
 * T026 — Typed Songhealth public REST client (US1).
 *
 * References: FR-006 (allowlisted public fields only), FR-007 (current
 * server-side eligibility on every disclosure), FR-010 (the React public
 * application consumes the Songhealth public contract — never a superseded
 * Delivery 001 application backend, raw CMS storage, or legacy WordPress
 * coupling), FR-011 (Public ID is identity, slug is readability), FR-012
 * (neutral unknown/ineligible behavior), FR-030 with the G02C-B02/B03
 * clarifications (bounded `data`/`hasMore`/optional `nextCursor`, no totals
 * or page counts); contracts/public-rest.md; Constitution I, IV, V.
 *
 * Decoding is deliberately strict: a response that is not EXACTLY the
 * Songhealth DTO or bounded-list envelope shape is a contract violation that
 * throws — raw WordPress fields, native REST envelope keys (`total`,
 * `totalPages`, `page`, `perPage`), `_links` objects, media identities, and
 * unknown fields are all rejected, never tolerated, because a tolerated field
 * is a field the public surface silently accepts from a non-contract source.
 * There is no raw-WordPress or Delivery 001 fallback anywhere: the client
 * builds exactly one URL per request under the `songhealth/v1` namespace and
 * never issues a second request to another backend. Decoding is also
 * request-bound (G03-B02): a detail response must describe exactly the
 * requested type and Public ID, and every listed item must be of the
 * requested type — a mismatch is a contract violation, never a
 * canonicalization or coercion into the requested shape.
 *
 * The client is a server-side (SSR loader) module by design: the public API
 * base is resolved from the server environment (`SONGHEALTH_API_BASE_URL`),
 * never from a `VITE_`-prefixed value that would ship backend topology into
 * the browser bundle, and no credential of any kind is attached — the public
 * contract is anonymous.
 */

/** The public resource types of the Delivery 002 foundation contract. */
export type SonghealthResourceType = "basic-page" | "document-resource";

/** Canonical Songhealth Public ID shape: lowercase hyphenated UUIDv7. */
const PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Safe display-slug segment shape used by canonical paths. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** The Basic Page detail DTO (contracts/public-rest.md §Detail). */
export interface BasicPageDetailDto {
  readonly type: "basic-page";
  readonly publicId: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly summary?: string;
  readonly body?: string;
  readonly documentReferences?: readonly string[];
}

/** The Document Resource detail DTO. */
export interface DocumentResourceDetailDto {
  readonly type: "document-resource";
  readonly publicId: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly summary?: string;
  readonly documentDate?: string;
  readonly downloadPath: string;
}

/** Either supported detail DTO. */
export type SonghealthDetailDto = BasicPageDetailDto | DocumentResourceDetailDto;

/** The bounded listing envelope (G02C-B02/B03). */
export interface SonghealthListEnvelope {
  readonly data: readonly SonghealthDetailDto[];
  readonly hasMore: boolean;
  readonly nextCursor?: string;
}

/** Bounded listing request inputs; nothing else is part of the contract. */
export interface SonghealthListParams {
  readonly type: SonghealthResourceType;
  readonly perPage?: number;
  readonly order?: "newest" | "oldest";
  readonly cursor?: string;
}

/**
 * A response outside the accepted contract shape. Bounded message, no
 * request detail — the violation itself is the evidence, never its content.
 */
export class SonghealthContractViolationError extends Error {
  constructor(message = "The public response did not match the Songhealth contract.") {
    super(message);
    this.name = "SonghealthContractViolationError";
  }
}

/** The bounded invalid-request class (HTTP 400, neutral body). */
export class SonghealthInvalidRequestError extends Error {
  constructor(message = "Invalid request.") {
    super(message);
    this.name = "SonghealthInvalidRequestError";
  }
}

/** The generic unexpected-failure class (HTTP 5xx, safe category only). */
export class SonghealthUnavailableError extends Error {
  constructor(message = "Unavailable.") {
    super(message);
    this.name = "SonghealthUnavailableError";
  }
}

/**
 * Assert `value` is a plain record object.
 *
 * @param value Value to check.
 * @param label Violation label.
 */
function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SonghealthContractViolationError(label);
  }
}

/**
 * Assert `value` is a string matching `pattern`.
 *
 * @param value Value to check.
 * @param pattern Required shape.
 * @param label Violation label.
 * @returns The validated string.
 */
function expectString(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new SonghealthContractViolationError(label);
  }
  return value;
}

/** Field names allowed on the shared part of a detail DTO. */
const SHARED_DETAIL_FIELDS = new Set(["type", "publicId", "title", "canonicalPath", "summary"]);

/** Additional fields allowed per resource type. */
const TYPE_DETAIL_FIELDS: Readonly<Record<SonghealthResourceType, ReadonlySet<string>>> = {
  "basic-page": new Set(["body", "documentReferences"]),
  "document-resource": new Set(["documentDate", "downloadPath"]),
};

/**
 * Decode one detail DTO strictly against the allowlist.
 *
 * @param value Unknown response value.
 * @returns The validated DTO.
 */
export function decodeSonghealthDetail(value: unknown): SonghealthDetailDto {
  assertRecord(value, "A detail response must be an object.");
  const type = value.type;
  if (type !== "basic-page" && type !== "document-resource") {
    throw new SonghealthContractViolationError("A detail response must carry a supported type.");
  }

  const allowed = TYPE_DETAIL_FIELDS[type];
  for (const key of Object.keys(value)) {
    if (!SHARED_DETAIL_FIELDS.has(key) && !allowed.has(key)) {
      throw new SonghealthContractViolationError(`Detail field '${key}' is not part of the contract.`);
    }
  }

  const publicId = expectString(
    value.publicId,
    PUBLIC_ID_PATTERN,
    "A detail response must carry a canonical Public ID.",
  );
  const title =
    typeof value.title === "string" && value.title.length > 0
      ? value.title
      : (() => {
          throw new SonghealthContractViolationError("A detail response must carry a title.");
        })();
  /* The canonical base is bound to the resource type, so a cross-type path never decodes. */
  const canonicalBase = type === "basic-page" ? "pages" : "documents";
  const canonicalPath = expectString(
    value.canonicalPath,
    new RegExp(`^/${canonicalBase}/${publicId}(/${SLUG_PATTERN.source.slice(1, -1)})?$`),
    "A detail response must carry its validated canonical path.",
  );

  const dto: Record<string, unknown> = { type, publicId, title, canonicalPath };
  if (value.summary !== undefined) {
    if (typeof value.summary !== "string") {
      throw new SonghealthContractViolationError("summary must be a string.");
    }
    dto.summary = value.summary;
  }

  if (type === "basic-page") {
    if (value.downloadPath !== undefined || value.documentDate !== undefined) {
      throw new SonghealthContractViolationError("Document Resource fields are not part of a Basic Page.");
    }
    if (value.body !== undefined) {
      if (typeof value.body !== "string") {
        throw new SonghealthContractViolationError("body must be a string.");
      }
      dto.body = value.body;
    }
    if (value.documentReferences !== undefined) {
      if (!Array.isArray(value.documentReferences)) {
        throw new SonghealthContractViolationError("documentReferences must be an array of Public IDs.");
      }
      dto.documentReferences = value.documentReferences.map((reference) =>
        expectString(reference, PUBLIC_ID_PATTERN, "documentReferences entries must be canonical Public IDs."),
      );
    }
    return dto as unknown as BasicPageDetailDto;
  }

  if (value.body !== undefined || value.documentReferences !== undefined) {
    throw new SonghealthContractViolationError("Basic Page fields are not part of a Document Resource.");
  }
  if (value.documentDate !== undefined) {
    dto.documentDate = expectString(
      value.documentDate,
      /^\d{4}-\d{2}-\d{2}$/,
      "documentDate must be an ISO calendar date.",
    );
  }
  dto.downloadPath = expectString(
    value.downloadPath,
    new RegExp(`^/wp-json/songhealth/v1/documents/${publicId}/binary$`),
    "downloadPath must be the mediated binary path of this resource.",
  );
  return dto as unknown as DocumentResourceDetailDto;
}

/** Field names allowed on the bounded listing envelope. */
const ENVELOPE_FIELDS = new Set(["data", "hasMore", "nextCursor"]);

/**
 * Decode one bounded listing envelope strictly.
 *
 * @param value Unknown response value.
 * @returns The validated envelope.
 */
export function decodeSonghealthListEnvelope(value: unknown): SonghealthListEnvelope {
  assertRecord(value, "A listing response must be an object.");
  for (const key of Object.keys(value)) {
    if (!ENVELOPE_FIELDS.has(key)) {
      throw new SonghealthContractViolationError(`Listing field '${key}' is not part of the contract.`);
    }
  }
  if (typeof value.hasMore !== "boolean") {
    throw new SonghealthContractViolationError("hasMore must be a boolean.");
  }
  if (!Array.isArray(value.data)) {
    throw new SonghealthContractViolationError("data must be an array of detail DTOs.");
  }

  const envelope: Record<string, unknown> = {
    data: value.data.map((item) => decodeSonghealthDetail(item)),
    hasMore: value.hasMore,
  };

  /*
   * G02C-B03: `nextCursor` is present exactly when continuation is available
   * — a present-but-null key is a third envelope shape and is rejected, as
   * is a terminal response that still carries a cursor.
   */
  if (value.hasMore) {
    if (typeof value.nextCursor !== "string" || value.nextCursor.length === 0) {
      throw new SonghealthContractViolationError("A continuing envelope must carry a string nextCursor.");
    }
    envelope.nextCursor = value.nextCursor;
  } else if (value.nextCursor !== undefined) {
    throw new SonghealthContractViolationError("A terminal envelope omits nextCursor entirely.");
  }

  return envelope as unknown as SonghealthListEnvelope;
}

/** Neutral response codes of the public contract. */
const CODE_NOT_FOUND = "songhealth_not_found";
const CODE_INVALID_REQUEST = "songhealth_invalid_request";
const CODE_UNAVAILABLE = "songhealth_unavailable";

/**
 * Read the neutral class of an error response, if it is one.
 *
 * @param body Parsed body of a non-2xx response.
 * @returns The stable Songhealth code, or null for a non-contract body.
 */
function neutralCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const code = (body as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
}

/** Client construction options. */
export interface SonghealthPublicClientOptions {
  /** Base URL of the WordPress origin serving the Songhealth contract. */
  readonly baseUrl?: string;
  /** Fetch implementation (test seam); defaults to the global fetch. */
  readonly fetchImpl?: typeof fetch;
}

/** The public client surface used by the React routes. */
export interface SonghealthPublicClient {
  /**
   * Resolve one resource by its immutable Public ID.
   *
   * @param resourceType Public resource type.
   * @param publicId Canonical Public ID.
   * @returns The eligible detail DTO, or null for the neutral not-found class.
   */
  getResourceDetail(
    resourceType: SonghealthResourceType,
    publicId: string,
  ): Promise<SonghealthDetailDto | null>;

  /**
   * Request one bounded listing page.
   *
   * @param params Allowlisted listing inputs.
   * @returns The bounded continuation envelope.
   */
  listResources(params: SonghealthListParams): Promise<SonghealthListEnvelope>;
}

/**
 * Resolve the public API base URL from the server environment.
 *
 * Server configuration only: the value is read where the loader runs, so no
 * backend topology is shipped to the browser bundle.
 *
 * @param env Environment source (defaults to the Node process environment).
 * @returns The configured base URL.
 */
export function resolveSonghealthApiBaseUrl(env: Record<string, string | undefined> = {} as Record<string, string | undefined>): string {
  const source = Object.keys(env).length > 0 ? env : (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const base = source.SONGHEALTH_API_BASE_URL ?? "http://127.0.0.1:8090";
  return base.replace(/\/+$/, "");
}

/**
 * Build the typed public client.
 *
 * @param options Construction options.
 * @returns The client.
 */
export function createSonghealthPublicClient(
  options: SonghealthPublicClientOptions = {},
): SonghealthPublicClient {
  const baseUrl = (options.baseUrl ?? resolveSonghealthApiBaseUrl()).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  if (typeof fetchImpl !== "function") {
    throw new SonghealthUnavailableError("The public client has no transport available.");
  }

  /**
   * Perform one anonymous request inside the Songhealth namespace.
   *
   * @param path Contract path under the namespace.
   * @param query Allowlisted query parameters.
   * @returns The decoded JSON body, or null for the neutral not-found class.
   */
  async function request(path: string, query: Readonly<Record<string, string>>): Promise<unknown> {
    const url = new URL(`/wp-json/songhealth/v1${path}`, baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    /* Exactly one request, to exactly one backend: there is no fallback. */
    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "error",
      });
    } catch {
      /* Transport failure is the bounded unavailability class — never a fallback. */
      throw new SonghealthUnavailableError();
    }

    if (response.status === 404) {
      const body: unknown = await response.json().catch(() => null);
      if (neutralCode(body) === CODE_NOT_FOUND) {
        return null; /* Neutral unknown/ineligible: indistinguishable, no fallback. */
      }
      throw new SonghealthContractViolationError();
    }

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const code = neutralCode(body);
      if (response.status === 400 && code === CODE_INVALID_REQUEST) {
        throw new SonghealthInvalidRequestError();
      }
      if (response.status >= 500 && code === CODE_UNAVAILABLE) {
        throw new SonghealthUnavailableError();
      }
      throw new SonghealthContractViolationError();
    }

    return response.json();
  }

  return {
    async getResourceDetail(resourceType, publicId) {
      const body = await request(`/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(publicId)}`, {});
      if (body === null) {
        return null; /* The neutral not-found class: no record, no fallback. */
      }
      const detail = decodeSonghealthDetail(body);
      /*
       * G03-B02: the decoded DTO must be the requested resource. A response
       * naming another type or another identifier is a contract violation —
       * never canonicalized, never rendered as the requested resource.
       */
      if (detail.type !== resourceType || detail.publicId !== publicId) {
        throw new SonghealthContractViolationError(
          "The detail response did not describe the requested resource.",
        );
      }
      return detail;
    },

    async listResources(params) {
      const query: Record<string, string> = { type: params.type };
      if (params.perPage !== undefined) {
        query.perPage = String(params.perPage);
      }
      if (params.order !== undefined) {
        query.order = params.order;
      }
      if (params.cursor !== undefined) {
        query.cursor = params.cursor;
      }
      const body = await request("/resources", query);
      const envelope = decodeSonghealthListEnvelope(body);
      /*
       * G03-B02: every listed item must be of the requested resource type;
       * any cross-type item rejects the whole response.
       */
      if (envelope.data.some((item) => item.type !== params.type)) {
        throw new SonghealthContractViolationError(
          "The listing response carried an item outside the requested resource type.",
        );
      }
      return envelope;
    },
  };
}
