/**
 * T023 — Frontend contract tests for the Songhealth public client (US1,
 * tests-first for T026 `../../app/services/songhealth-public`).
 *
 * References: FR-006 (allowlisted public fields only), FR-008 (no
 * existence/lifecycle disclosure), FR-010 (consume the Songhealth contract,
 * never raw CMS storage or the superseded Delivery 001 backend), FR-011
 * (Public ID is identity, display slug is optional readability), FR-030 and
 * the G02C-B02/B03 clarifications (bounded `data`/`hasMore`/optional
 * `nextCursor`, never exact totals or page counts);
 * contracts/public-rest.md §Detail, §Bounded listing; Constitution IV, V.
 *
 * EXPECTED RED: the only reason this suite fails before T026 is that the
 * planned `songhealth-public` service module does not exist yet — a
 * module-resolution failure for that one intentionally absent module, not a
 * test-syntax, fixture, or forced-failure error.
 *
 * Decoding is deliberately STRICT: anything that is not exactly the
 * Songhealth DTO/envelope shape is a contract violation that must throw —
 * raw WordPress fields, native REST envelope keys (`total`, `totalPages`,
 * `page`), link objects (`_links`), media identities, and unknown fields are
 * all rejected rather than tolerated, because a tolerated field is a field
 * the public surface silently accepts from a non-contract source.
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import {
  SonghealthContractViolationError,
  createSonghealthPublicClient,
  decodeSonghealthDetail,
  decodeSonghealthListEnvelope,
} from "../../app/services/songhealth-public";

// ---------------------------------------------------------------------------
// Canonical fixtures — exactly the shapes contracts/public-rest.md defines.
// ---------------------------------------------------------------------------

const PAGE_PUBLIC_ID = "018f6b2c-4a1b-7b3e-9c2d-1a2b3c4d5e6f";
const DOCUMENT_PUBLIC_ID = "018f6b31-9c22-7d4a-b15e-9f8e7d6c5b4a";

const BASIC_PAGE_DTO = {
  type: "basic-page",
  publicId: PAGE_PUBLIC_ID,
  title: "Contract Fixture Page",
  canonicalPath: `/pages/${PAGE_PUBLIC_ID}/contract-fixture-page`,
  summary: "A bounded public summary.",
  body: "<p>Bounded public body copy.</p>",
  documentReferences: [DOCUMENT_PUBLIC_ID],
} as const;

const DOCUMENT_DTO = {
  type: "document-resource",
  publicId: DOCUMENT_PUBLIC_ID,
  title: "Contract Fixture Document",
  canonicalPath: `/documents/${DOCUMENT_PUBLIC_ID}/contract-fixture-document`,
  documentDate: "2026-02-14",
  downloadPath: `/wp-json/songhealth/v1/documents/${DOCUMENT_PUBLIC_ID}/binary`,
} as const;

/** Every field shape a raw WordPress REST response carries that must be rejected. */
const RAW_WORDPRESS_FIELDS: Readonly<Record<string, unknown>> = {
  id: 42,
  slug: "contract-fixture-page",
  status: "publish",
  author: 7,
  link: "https://cms.example/contract-fixture-page/",
  guid: { rendered: "https://cms.example/?page_id=42" },
  date_gmt: "2026-02-14T09:00:00",
  featured_media: 0,
  post_type: "songhealth_page",
  meta: { _songhealth_summary: "sentinel" },
  _links: { self: [{ href: "https://cms.example/wp-json/wp/v2/pages/42" }] },
  source_url: "https://cms.example/wp-content/uploads/2026/02/contract-fixture.pdf",
  media_details: { filesize: 2048 },
};

/** Neutral classes the contract defines as bounded responses. */
const NEUTRAL_NOT_FOUND_BODY = {
  code: "songhealth_not_found",
  message: "Not found.",
  data: { status: 404 },
} as const;

const NEUTRAL_INVALID_BODY = {
  code: "songhealth_invalid_request",
  message: "Invalid request.",
  data: { status: 400 },
} as const;

/**
 * Build a JSON `Response` for the stubbed fetch.
 *
 * @param body Decoded body the response carries.
 * @param status HTTP status.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Songhealth public detail decoding — T023 (tests-first for T026)", () => {
  it("accepts exactly the allowlisted Basic Page DTO", () => {
    const decoded = decodeSonghealthDetail({ ...BASIC_PAGE_DTO });
    expect(decoded).toEqual(BASIC_PAGE_DTO);
    expect(decoded.type).toBe("basic-page");
    expect(decoded.canonicalPath).toBe(`/pages/${PAGE_PUBLIC_ID}/contract-fixture-page`);
  });

  it("accepts exactly the allowlisted Document Resource DTO", () => {
    const decoded = decodeSonghealthDetail({ ...DOCUMENT_DTO });
    expect(decoded).toEqual(DOCUMENT_DTO);
    expect(decoded.type).toBe("document-resource");
    if (decoded.type === "document-resource") {
      expect(decoded.downloadPath).toBe(
        `/wp-json/songhealth/v1/documents/${DOCUMENT_PUBLIC_ID}/binary`,
      );
    }
  });

  it("accepts the minimal DTO without optional fields", () => {
    const minimal = {
      type: "basic-page",
      publicId: PAGE_PUBLIC_ID,
      title: "Minimal Fixture",
      canonicalPath: `/pages/${PAGE_PUBLIC_ID}`,
      body: "",
    };
    expect(decodeSonghealthDetail(minimal)).toEqual(minimal);
  });

  it("rejects every raw WordPress field it is ever handed", () => {
    for (const [field, value] of Object.entries(RAW_WORDPRESS_FIELDS)) {
      const polluted = { ...BASIC_PAGE_DTO, [field]: value };
      expect(() => decodeSonghealthDetail(polluted), `field '${field}' must be rejected`).toThrow(
        SonghealthContractViolationError,
      );
    }
  });

  it("rejects unknown fields, not only the known-bad ones", () => {
    expect(() => decodeSonghealthDetail({ ...BASIC_PAGE_DTO, editorNote: "internal" })).toThrow(
      SonghealthContractViolationError,
    );
  });

  it("rejects malformed identifiers, paths, and cross-type fields", () => {
    const malformed = [
      { ...BASIC_PAGE_DTO, publicId: "not-a-uuid" },
      { ...BASIC_PAGE_DTO, publicId: PAGE_PUBLIC_ID.toUpperCase() },
      { ...BASIC_PAGE_DTO, publicId: "018f6b2c-4a1b-4b3e-9c2d-1a2b3c4d5e6f" },
      { ...BASIC_PAGE_DTO, publicId: 42 },
      { ...BASIC_PAGE_DTO, canonicalPath: "/pages/wrong-id/contract-fixture-page" },
      { ...BASIC_PAGE_DTO, canonicalPath: "/documents/" + PAGE_PUBLIC_ID },
      { ...BASIC_PAGE_DTO, canonicalPath: "https://attacker.example/pages/" + PAGE_PUBLIC_ID },
      { ...BASIC_PAGE_DTO, downloadPath: DOCUMENT_DTO.downloadPath },
      { ...DOCUMENT_DTO, body: "<p>cross-type body</p>" },
      { ...DOCUMENT_DTO, type: "basic-page" },
      { ...BASIC_PAGE_DTO, title: 42 },
      { ...BASIC_PAGE_DTO, title: "" },
      { ...BASIC_PAGE_DTO, documentReferences: "not-an-array" },
      { ...BASIC_PAGE_DTO, documentReferences: [PAGE_PUBLIC_ID, DOCUMENT_PUBLIC_ID, "not-a-uuid"] },
      null,
      undefined,
      "a string",
      [],
    ];
    for (const value of malformed) {
      expect(() => decodeSonghealthDetail(value)).toThrow(SonghealthContractViolationError);
    }
  });
});

describe("Songhealth bounded listing decoding — T023 (tests-first for T026)", () => {
  it("accepts the continuing envelope exactly", () => {
    const envelope = {
      data: [BASIC_PAGE_DTO],
      hasMore: true,
      nextCursor: "b3BhcXVlLWNvbnRpbnVhdGlvbg",
    };
    expect(decodeSonghealthListEnvelope(envelope)).toEqual(envelope);
  });

  it("accepts the terminal envelope, which omits nextCursor entirely", () => {
    const terminal = { data: [BASIC_PAGE_DTO], hasMore: false };
    expect(decodeSonghealthListEnvelope(terminal)).toEqual(terminal);
  });

  it("accepts the empty continuation page the bounded scan can produce", () => {
    /* G02C-B02: budget exhaustion with candidates remaining — empty data, hasMore=true, cursor. */
    const empty = { data: [], hasMore: true, nextCursor: "b3BhcXVlLWNvbnRpbnVhdGlvbg" };
    expect(decodeSonghealthListEnvelope(empty)).toEqual(empty);
  });

  it("rejects exact totals, page counts, and native collection envelope fields", () => {
    for (const forbidden of ["total", "totalPages", "page", "perPage", "count"]) {
      const polluted = { data: [], hasMore: false, [forbidden]: 3 };
      expect(
        () => decodeSonghealthListEnvelope(polluted),
        `envelope field '${forbidden}' must be rejected`,
      ).toThrow(SonghealthContractViolationError);
    }
  });

  it("rejects the third envelope shape: nextCursor present but null", () => {
    expect(() =>
      decodeSonghealthListEnvelope({ data: [], hasMore: false, nextCursor: null }),
    ).toThrow(SonghealthContractViolationError);
  });

  it("rejects continuation state that contradicts the cursor contract", () => {
    const contradictory = [
      { data: [BASIC_PAGE_DTO], hasMore: true }, /* continuation without a cursor */
      { data: [], hasMore: true }, /* continuation without a cursor */
      { data: [BASIC_PAGE_DTO], hasMore: false, nextCursor: "b3BhcXVl" }, /* terminal with a cursor */
      { data: [BASIC_PAGE_DTO], hasMore: "yes", nextCursor: "b3BhcXVl" },
      { hasMore: false }, /* missing data */
      { data: { not: "an array" }, hasMore: false },
      { data: [RAW_WORDPRESS_FIELDS], hasMore: false }, /* raw WordPress item inside data */
      {
        data: [{ ...BASIC_PAGE_DTO, status: "publish" }],
        hasMore: false,
      },
    ];
    for (const value of contradictory) {
      expect(() => decodeSonghealthListEnvelope(value)).toThrow(SonghealthContractViolationError);
    }
  });
});

describe("Songhealth public client — T023 (tests-first for T026)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests only the Songhealth contract namespace, never raw WordPress or a Delivery 001 backend", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(BASIC_PAGE_DTO, 200));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const detail = await client.getResourceDetail("basic-page", PAGE_PUBLIC_ID);
    expect(detail).toEqual(BASIC_PAGE_DTO);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requested = new URL((fetchImpl.mock.calls[0] as unknown[])[0] as string, "https://x/");
    expect(requested.pathname).toBe(`/wp-json/songhealth/v1/resources/basic-page/${PAGE_PUBLIC_ID}`);
    expect(requested.pathname).not.toContain("wp/v2");
    expect(requested.toString()).not.toContain("/api/");
    expect(requested.search).toBe("");
  });

  it("builds the bounded listing request from the allowlisted inputs only", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: [BASIC_PAGE_DTO], hasMore: true, nextCursor: "b3BhcXVl" }, 200),
    );
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.listResources({ type: "basic-page", perPage: 3, order: "oldest" });
    expect(result.hasMore).toBe(true);
    expect(result.data).toHaveLength(1);

    const requested = new URL((fetchImpl.mock.calls[0] as unknown[])[0] as string, "https://x/");
    expect(requested.pathname).toBe("/wp-json/songhealth/v1/resources");
    const params = requested.searchParams;
    expect(params.get("type")).toBe("basic-page");
    expect(params.get("perPage")).toBe("3");
    expect(params.get("order")).toBe("oldest");
    expect([...params.keys()].sort()).toEqual(["order", "perPage", "type"]);
    expect(params.get("page")).toBeNull(); /* no page-count pagination exists */
    expect(params.get("search")).toBeNull(); /* no search parameter is ever sent */
  });

  it("sends the opaque continuation cursor exactly as received", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [], hasMore: false }, 200));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.listResources({ type: "basic-page", cursor: "b3BhcXVlLWN1cnNvcg" });
    const requested = new URL((fetchImpl.mock.calls[0] as unknown[])[0] as string, "https://x/");
    expect(requested.searchParams.get("cursor")).toBe("b3BhcXVlLWN1cnNvcg");
  });

  it("resolves the neutral not-found class to null without any fallback", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(NEUTRAL_NOT_FOUND_BODY, 404));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getResourceDetail("basic-page", PAGE_PUBLIC_ID)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1); /* no second, fallback backend request */
  });

  it("rejects a non-contract 200 body instead of falling back to raw WordPress", async () => {
    /* A native wp/v2-shaped body must be a hard violation, never tolerated as data. */
    const rawWordPressPage = { id: 42, slug: "contract-fixture-page", status: "publish", title: { rendered: "Raw" } };
    const fetchImpl = vi.fn(async () => jsonResponse([rawWordPressPage], 200));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getResourceDetail("basic-page", PAGE_PUBLIC_ID)).rejects.toBeInstanceOf(
      SonghealthContractViolationError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces the bounded invalid-request and unexpected-failure classes without detail", async () => {
    const cases: ReadonlyArray<{ body: unknown; status: number }> = [
      { body: NEUTRAL_INVALID_BODY, status: 400 },
      { body: { code: "songhealth_unavailable", message: "Unavailable.", data: { status: 500 } }, status: 500 },
    ];

    for (const testCase of cases) {
      const fetchImpl = vi.fn(async () => jsonResponse(testCase.body, testCase.status));
      const client = createSonghealthPublicClient({
        baseUrl: "https://cms.example",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      await expect(client.getResourceDetail("basic-page", PAGE_PUBLIC_ID)).rejects.toThrow();
      await expect(client.listResources({ type: "basic-page" })).rejects.toThrow();
    }
  });

  // -------------------------------------------------------------------------
  // G03-B02 — decoding is request-bound: the decoded response must describe
  // exactly the requested resource, never another type or identifier, and a
  // listing must not cross the requested type boundary.
  // -------------------------------------------------------------------------

  it("rejects a valid DTO that names a different Public ID than the one requested", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(BASIC_PAGE_DTO, 200));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getResourceDetail("basic-page", DOCUMENT_PUBLIC_ID)).rejects.toBeInstanceOf(
      SonghealthContractViolationError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1); /* no retry, no fallback, no coercion */
  });

  it("rejects a valid DTO of a different resource type than the one requested", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(DOCUMENT_DTO, 200));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    /* A Document Resource DTO is well-formed, but not the basic-page asked for. */
    await expect(client.getResourceDetail("basic-page", DOCUMENT_PUBLIC_ID)).rejects.toBeInstanceOf(
      SonghealthContractViolationError,
    );

    const pageOfDocument = vi.fn(async () => jsonResponse(BASIC_PAGE_DTO, 200));
    const otherClient = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: pageOfDocument as unknown as typeof fetch,
    });
    await expect(otherClient.getResourceDetail("document-resource", PAGE_PUBLIC_ID)).rejects.toBeInstanceOf(
      SonghealthContractViolationError,
    );
  });

  it("rejects a listing whose data contains an otherwise valid cross-type item", async () => {
    const mixed = {
      data: [BASIC_PAGE_DTO, DOCUMENT_DTO], /* both individually valid DTOs */
      hasMore: false,
    };
    const fetchImpl = vi.fn(async () => jsonResponse(mixed, 200));
    const client = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.listResources({ type: "basic-page" })).rejects.toBeInstanceOf(
      SonghealthContractViolationError,
    );
    await expect(client.listResources({ type: "document-resource" })).rejects.toBeInstanceOf(
      SonghealthContractViolationError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("accepts matching detail and listing responses and returns them unchanged", async () => {
    const detailFetch = vi.fn(async () => jsonResponse(BASIC_PAGE_DTO, 200));
    const detailClient = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: detailFetch as unknown as typeof fetch,
    });
    await expect(detailClient.getResourceDetail("basic-page", PAGE_PUBLIC_ID)).resolves.toEqual(BASIC_PAGE_DTO);

    const documentFetch = vi.fn(async () => jsonResponse(DOCUMENT_DTO, 200));
    const documentClient = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: documentFetch as unknown as typeof fetch,
    });
    await expect(documentClient.getResourceDetail("document-resource", DOCUMENT_PUBLIC_ID)).resolves.toEqual(
      DOCUMENT_DTO,
    );

    const homogeneous = { data: [BASIC_PAGE_DTO], hasMore: true, nextCursor: "b3BhcXVlLWNvbnRpbnVhdGlvbg" };
    const listFetch = vi.fn(async () => jsonResponse(homogeneous, 200));
    const listClient = createSonghealthPublicClient({
      baseUrl: "https://cms.example",
      fetchImpl: listFetch as unknown as typeof fetch,
    });
    await expect(listClient.listResources({ type: "basic-page" })).resolves.toEqual(homogeneous);
  });
});
