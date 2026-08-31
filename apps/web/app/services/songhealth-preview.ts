/**
 * T036 — Preview-only typed React client (US2).
 *
 * References: FR-016 (Preview is confined to currently authorized staff and
 * uses the React public presentation), FR-017 (no administrator credential or
 * equivalent privileged secret ever reaches the React client, and URLs or
 * parameters never bypass authorization), FR-010 (no Delivery 001 backend, raw
 * CMS storage, or legacy WordPress coupling); contracts/preview.md
 * §Retrieval, §Isolation; Constitution I, IV.
 *
 * This client exists only for the authenticated read-only Preview surface. It
 * attaches no credential, no token of its own, and no privileged value: the
 * one-time navigation grant is passed through from the route URL to the
 * request, and the user's own current WordPress session cookie is the session
 * — sent because the request is made from the browser with
 * `credentials: "include"`, never stored, read, or relayed by this module.
 *
 * Decoding is deliberately strict and mirrors the public client's discipline:
 * a response that is not EXACTLY the bounded Preview candidate DTO is a
 * contract violation that throws — raw WordPress fields, native REST envelope
 * keys, `_links` objects, media identities, a `downloadPath` binary surface,
 * and unknown fields are all rejected, never tolerated. There is exactly one
 * request to exactly one backend and no fallback of any kind: no raw
 * WordPress/admin API fallback, no Delivery 001 backend fallback, no retry,
 * and no anonymous/public re-request after a denial — the neutral not-found
 * class is a terminal answer for the view, not a signal to try another source.
 *
 * Persistence: none. Nothing here writes to localStorage, sessionStorage,
 * IndexedDB, the Cache API, or any service worker, and the route consumes the
 * grant from the URL once (T037 removes it), so no Preview state survives the
 * view.
 */

/** The public resource types of the Delivery 002 foundation contract. */
export type SonghealthPreviewResourceType = "basic-page" | "document-resource";

/** Canonical Songhealth Public ID shape: lowercase hyphenated UUIDv7. */
const PUBLIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Safe display-slug segment shape used by canonical paths. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** The Basic Page Preview candidate DTO (contracts/preview.md §Isolation). */
export interface BasicPagePreviewDto {
  readonly type: "basic-page";
  readonly publicId: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly summary?: string;
  readonly body?: string;
  readonly documentReferences?: readonly string[];
}

/** The Document Resource Preview candidate DTO (no binary surface: US3 owns it). */
export interface DocumentResourcePreviewDto {
  readonly type: "document-resource";
  readonly publicId: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly summary?: string;
  readonly documentDate?: string;
}

/** Either supported Preview candidate DTO. */
export type SonghealthPreviewCandidateDto = BasicPagePreviewDto | DocumentResourcePreviewDto;

/**
 * A response outside the accepted Preview contract shape. Bounded message, no
 * request detail — the violation itself is the evidence, never its content.
 */
export class SonghealthPreviewContractViolationError extends Error {
  constructor(message = "The Preview response did not match the Songhealth contract.") {
    super(message);
    this.name = "SonghealthPreviewContractViolationError";
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
    throw new SonghealthPreviewContractViolationError(label);
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
    throw new SonghealthPreviewContractViolationError(label);
  }
  return value;
}

/** Field names allowed on the shared part of a Preview candidate DTO. */
const SHARED_PREVIEW_FIELDS = new Set(["type", "publicId", "title", "canonicalPath", "summary"]);

/** Additional fields allowed per resource type. */
const TYPE_PREVIEW_FIELDS: Readonly<Record<SonghealthPreviewResourceType, ReadonlySet<string>>> = {
  "basic-page": new Set(["body", "documentReferences"]),
  "document-resource": new Set(["documentDate"]),
};

/**
 * Decode one Preview candidate DTO strictly against the allowlist.
 *
 * @param value Unknown response value.
 * @returns The validated candidate DTO.
 */
export function decodeSonghealthPreviewCandidate(value: unknown): SonghealthPreviewCandidateDto {
  assertRecord(value, "A Preview response must be an object.");
  const type = value.type;
  if (type !== "basic-page" && type !== "document-resource") {
    throw new SonghealthPreviewContractViolationError("A Preview response must carry a supported type.");
  }

  const allowed = TYPE_PREVIEW_FIELDS[type];
  for (const key of Object.keys(value)) {
    if (!SHARED_PREVIEW_FIELDS.has(key) && !allowed.has(key)) {
      throw new SonghealthPreviewContractViolationError(`Preview field '${key}' is not part of the contract.`);
    }
  }

  const publicId = expectString(
    value.publicId,
    PUBLIC_ID_PATTERN,
    "A Preview response must carry a canonical Public ID.",
  );
  const title =
    typeof value.title === "string" && value.title.length > 0
      ? value.title
      : (() => {
          throw new SonghealthPreviewContractViolationError("A Preview response must carry a title.");
        })();
  /* The canonical base is bound to the resource type, so a cross-type path never decodes. */
  const canonicalBase = type === "basic-page" ? "pages" : "documents";
  const canonicalPath = expectString(
    value.canonicalPath,
    new RegExp(`^/${canonicalBase}/${publicId}(/${SLUG_PATTERN.source.slice(1, -1)})?$`),
    "A Preview response must carry its validated canonical path.",
  );

  const dto: Record<string, unknown> = { type, publicId, title, canonicalPath };
  if (value.summary !== undefined) {
    if (typeof value.summary !== "string") {
      throw new SonghealthPreviewContractViolationError("summary must be a string.");
    }
    dto.summary = value.summary;
  }

  if (type === "basic-page") {
    /* A binary path or document date is never part of a Basic Page candidate. */
    if (value.downloadPath !== undefined || value.documentDate !== undefined) {
      throw new SonghealthPreviewContractViolationError("Document Resource fields are not part of a Basic Page.");
    }
    if (value.body !== undefined) {
      if (typeof value.body !== "string") {
        throw new SonghealthPreviewContractViolationError("body must be a string.");
      }
      dto.body = value.body;
    }
    if (value.documentReferences !== undefined) {
      if (!Array.isArray(value.documentReferences)) {
        throw new SonghealthPreviewContractViolationError("documentReferences must be an array of Public IDs.");
      }
      dto.documentReferences = value.documentReferences.map((reference) =>
        expectString(reference, PUBLIC_ID_PATTERN, "documentReferences entries must be canonical Public IDs."),
      );
    }
    return dto as unknown as BasicPagePreviewDto;
  }

  if (value.body !== undefined || value.documentReferences !== undefined) {
    throw new SonghealthPreviewContractViolationError("Basic Page fields are not part of a Document Resource.");
  }
  /* The Preview candidate deliberately carries no downloadPath: the mediated binary surface is US3. */
  if (value.downloadPath !== undefined) {
    throw new SonghealthPreviewContractViolationError("The Preview candidate carries no binary path.");
  }
  if (value.documentDate !== undefined) {
    dto.documentDate = expectString(
      value.documentDate,
      /^\d{4}-\d{2}-\d{2}$/,
      "documentDate must be an ISO calendar date.",
    );
  }
  return dto as unknown as DocumentResourcePreviewDto;
}

/** Neutral response code of the Preview surface. */
const CODE_NOT_FOUND = "songhealth_not_found";

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
export interface SonghealthPreviewClientOptions {
  /**
   * Base URL of the WordPress origin serving the Songhealth contract. The
   * browser fetch needs the absolute origin because the session cookie lives
   * on that origin; the value is the public contract origin, never a secret.
   */
  readonly baseUrl?: string;
  /** Fetch implementation (test seam); defaults to the global fetch. */
  readonly fetchImpl?: typeof fetch;
}

/** The Preview-only client surface used by the Preview route. */
export interface SonghealthPreviewClient {
  /**
   * Request one bounded Preview candidate.
   *
   * @param resourceType Public resource type.
   * @param publicId Canonical Public ID.
   * @param handoff The one-time navigation handoff: the opaque grant and the
   * supplemental `wp_rest` nonce from the route's consumed URL fragment. The
   * nonce is the platform's CSRF control for cookie-authenticated REST — it
   * authenticates nothing by itself.
   * @returns The bounded candidate DTO, or null for the neutral not-found class.
   */
  getCandidate(
    resourceType: SonghealthPreviewResourceType,
    publicId: string,
    handoff: PreviewHandoff,
  ): Promise<SonghealthPreviewCandidateDto | null>;
}

/** The bounded one-time handoff of a Preview navigation. */
export interface PreviewHandoff {
  /** The opaque single-purpose grant minted by the authorized initiation. */
  readonly grant: string;
  /** The platform `wp_rest` nonce presented for the session's REST request. */
  readonly nonce: string;
}

/**
 * Build the Preview-only client.
 *
 * @param options Construction options.
 * @returns The client.
 */
export function createSonghealthPreviewClient(
  options: SonghealthPreviewClientOptions = {},
): SonghealthPreviewClient {
  if (options.baseUrl === undefined) {
    throw new SonghealthPreviewContractViolationError("The Preview client requires its explicit API origin.");
  }
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  if (typeof fetchImpl !== "function") {
    throw new SonghealthPreviewContractViolationError("The Preview client has no transport available.");
  }

  return {
    async getCandidate(resourceType, publicId, handoff) {
      if (typeof handoff?.grant !== "string" || handoff.grant.length === 0) {
        /* No grant in the navigation: the one terminal not-available answer. */
        return null;
      }

      const url = new URL(
        `/wp-json/songhealth/v1/preview/${encodeURIComponent(resourceType)}/${encodeURIComponent(publicId)}`,
        baseUrl,
      );
      url.searchParams.set("grant", handoff.grant);
      if (typeof handoff.nonce === "string" && handoff.nonce.length > 0) {
        /* The platform's own parameter for its REST CSRF control; authorization stays server-side. */
        url.searchParams.set("_wpnonce", handoff.nonce);
      }

      /* Exactly one request, to exactly one backend: there is no fallback. */
      let response: Response;
      try {
        response = await fetchImpl(url.toString(), {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" },
          redirect: "error",
        });
      } catch {
        /* Transport failure and denial are the same bounded answer for the view. */
        return null;
      }

      if (response.status === 404) {
        const body: unknown = await response.json().catch(() => null);
        if (neutralCode(body) === CODE_NOT_FOUND) {
          return null; /* Neutral denial: terminal, never a trigger for another source. */
        }
        throw new SonghealthPreviewContractViolationError();
      }

      if (!response.ok) {
        throw new SonghealthPreviewContractViolationError();
      }

      const candidate = decodeSonghealthPreviewCandidate(await response.json());
      /*
       * The decoded candidate must be the requested resource. A response
       * naming another type or another identifier is a contract violation —
       * never canonicalized, never rendered as the requested resource.
       */
      if (candidate.type !== resourceType || candidate.publicId !== publicId) {
        throw new SonghealthPreviewContractViolationError(
          "The Preview response did not describe the requested resource.",
        );
      }
      return candidate;
    },
  };
}
