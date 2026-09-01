/**
 * T046 — `/documents/{publicId}/{slug?}` public resolution route (US3),
 * following the accepted US1 canonical-route pattern.
 *
 * References: FR-018–FR-020 (anonymous delivery depends on the owning
 * Document Resource's CURRENT eligibility, re-decided on every request),
 * FR-011 (Public ID is identity; the display slug is optional readability
 * metadata and one canonical URL exists per resource), FR-012 (unknown and
 * ineligible resources receive neutral behavior — never internal state,
 * never a blind homepage redirect); contracts/protected-binary.md;
 * data-model.md §Document Resource Foundation Record; Constitution I, IV.
 *
 * Eligibility precedes slug disclosure: the loader resolves the record by
 * its immutable Public ID through the public detail operation FIRST, and
 * only an eligible record reaches the canonicalization step, where a
 * missing, outdated, or differently-normalized slug redirects directly to
 * the current canonical path. An unknown, malformed, or ineligible
 * identifier resolves to the one neutral not-found answer — the same
 * status, the same copy, and no redirect — so no outside observer can tell
 * which condition applied. Every answer of this route is `no-store`: cache
 * is never eligibility authority.
 */

import { type LoaderFunctionArgs, type MetaFunction, data, redirect, useLoaderData } from "react-router";
import DocumentResource from "../components/DocumentResource.js";
import type { DocumentResourceDetailDto } from "../services/songhealth-public.js";
import {
  SonghealthContractViolationError,
  SonghealthInvalidRequestError,
  createSonghealthPublicClient,
  resolveSonghealthApiBaseUrl,
} from "../services/songhealth-public.js";

/** The neutral transport posture of every answer this route gives. */
const RESPONSE_HEADERS = { "Cache-Control": "no-store" } as const;

/**
 * Loader payload: an eligible, canonical record with the public contract
 * origin for its mediated download link, or the one neutral answer. The
 * origin is the non-secret public contract origin (the preview route uses
 * the same pattern), never a credential.
 */
type LoaderData =
  | {
      readonly status: "found";
      readonly resource: DocumentResourceDetailDto;
      readonly absoluteCanonicalPath: string;
      readonly downloadOrigin: string;
    }
  | { readonly status: "not-found" };

/**
 * Resolve one Document Resource by Public ID, canonicalizing the slug.
 *
 * @param args Route loader arguments.
 * @returns The route data, or the direct canonical redirect.
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const publicId = typeof params.publicId === "string" ? params.publicId : "";
  const client = createSonghealthPublicClient();

  let resource: Awaited<ReturnType<typeof client.getResourceDetail>>;
  try {
    resource = await client.getResourceDetail("document-resource", publicId);
  } catch (error) {
    if (
      error instanceof SonghealthContractViolationError ||
      error instanceof SonghealthInvalidRequestError
    ) {
      /* A non-contract answer is never presented: the neutral class, bounded. */
      return data({ status: "not-found" } satisfies LoaderData, { status: 404, headers: RESPONSE_HEADERS });
    }
    throw error;
  }

  /*
   * Neutral not-found: unknown, malformed, and ineligible identifiers share
   * this one answer — status, copy, and no redirect — and nothing about the
   * requested identifier is echoed back.
   */
  if (resource === null || resource.type !== "document-resource") {
    return data({ status: "not-found" } satisfies LoaderData, { status: 404, headers: RESPONSE_HEADERS });
  }

  /*
   * Eligibility is decided; canonicalization happens now. The DTO's
   * canonicalPath is the single authority: any requested variant that is not
   * exactly it — missing slug, outdated slug, differently-normalized slug —
   * redirects directly to it, without ever creating a second identity.
   */
  const requestedPath = `/documents/${publicId}${typeof params.slug === "string" ? `/${params.slug}` : ""}`;
  if (requestedPath !== resource.canonicalPath) {
    return redirect(resource.canonicalPath, { headers: RESPONSE_HEADERS });
  }

  const absoluteCanonicalPath = new URL(resource.canonicalPath, request.url).toString();
  return data(
    { status: "found", resource, absoluteCanonicalPath, downloadOrigin: resolveSonghealthApiBaseUrl() } satisfies LoaderData,
    { headers: RESPONSE_HEADERS },
  );
}

/**
 * Document metadata from public data only: the record's title, and exactly
 * one canonical destination per eligible resource (FR-011). The neutral
 * answer carries no canonical link.
 *
 * @param args Meta arguments carrying the loader data.
 * @returns The metadata descriptors.
 */
export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  if (loaderData !== undefined && loaderData.status === "found") {
    return [
      { title: loaderData.resource.title },
      { tagName: "link", rel: "canonical", href: loaderData.absoluteCanonicalPath },
    ];
  }
  return [{ title: "Not found" }];
};

/**
 * The route presentation.
 *
 * Because every loader answer is a successful `data()` payload, the
 * presentation is a pure function of the loader data: an eligible record
 * renders the shared Document Resource presentation, and the one neutral
 * answer renders the same fixed copy whatever condition produced it.
 *
 * @returns The rendered route.
 */
export default function PublicDocumentResourceRoute() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.status === "not-found") {
    return (
      <main>
        <h1>Not found</h1>
        <p>The page you requested is not available.</p>
      </main>
    );
  }

  return (
    <main>
      <DocumentResource resource={loaderData.resource} downloadOrigin={loaderData.downloadOrigin} />
    </main>
  );
}
