/**
 * T037 — Authenticated read-only Preview route (US2):
 * `/preview/{resourceType}/{publicId}`.
 *
 * References: FR-016 (Preview uses the React public presentation and is
 * excluded from public, search, cache, and crawler exposure), FR-017 (no
 * administrator credential reaches the client and no URL bypasses
 * authorization), FR-011 (identity is the Public ID); contracts/preview.md
 * §Isolation; Constitution I, IV.
 *
 * Isolation contract: the view visibly identifies itself as a non-public,
 * read-only Preview of working state and exposes no lifecycle control, no
 * publish action, no canonical link, and no analytics capture. The route's
 * own answers are `private, no-store`, the document carries a `noindex,
 * nofollow` robots policy and no canonical destination, and the one-time
 * navigation grant is consumed from the URL once and then removed from the
 * address bar, so no Preview state becomes a public URL, a shared artifact,
 * or a persisted data source.
 *
 * Data contract: the candidate comes only from the Preview-only client
 * (T036) inside the user's own browser session. The server-rendered document
 * of this route contains no candidate content at all — an unauthenticated
 * request, a direct URL without a grant, or any authorization loss renders
 * the same bounded not-available answer, with no fallback to the public
 * contract or any other backend.
 */

import { useEffect, useState } from "react";
import { data, useLoaderData, useParams, type MetaFunction } from "react-router";
import BasicPage from "../components/BasicPage.js";
import {
  createSonghealthPreviewClient,
  type PreviewHandoff,
  type SonghealthPreviewCandidateDto,
} from "../services/songhealth-preview.js";
import { resolveSonghealthApiBaseUrl } from "../services/songhealth-public.js";

/** The confidentiality posture of every answer this route gives. */
const RESPONSE_HEADERS = { "Cache-Control": "private, no-store" } as const;

/** Loader payload: the public contract origin for the browser-side session request. */
type LoaderData = { readonly apiOrigin: string };

/** The preview states of the client fetch. */
type PreviewState =
  | { readonly status: "requesting" }
  | { readonly status: "unavailable" }
  | { readonly status: "available"; readonly candidate: SonghealthPreviewCandidateDto };

/**
 * Resolve the route's server-side context.
 *
 * The loader performs no candidate access: it only hands the browser the
 * public contract origin the authenticated request must target (the same
 * non-secret origin the public contract is served from), so the WordPress
 * session cookie never passes through this application's server and the
 * server-rendered document never carries candidate content.
 *
 * @returns The route data.
 */
export async function loader(): Promise<ReturnType<typeof data<LoaderData>>> {
  return data({ apiOrigin: resolveSonghealthApiBaseUrl() }, { headers: RESPONSE_HEADERS });
}

/**
 * Document metadata: visibly non-public, never canonical, never indexable.
 *
 * @returns The metadata descriptors.
 */
export const meta: MetaFunction<typeof loader> = () => [
  { title: "ตัวอย่าง (ไม่ใช่หน้าสาธารณะ)" },
  { name: "robots", content: "noindex, nofollow" },
];

/**
 * The route presentation: the bounded banner, then the read-only candidate.
 *
 * @returns The rendered route.
 */
export default function StaffPreviewRoute() {
  const { apiOrigin } = useLoaderData<typeof loader>();
  const params = useParams();
  const resourceType = params.resourceType === "document-resource" ? "document-resource" : "basic-page";
  const publicId = typeof params.publicId === "string" ? params.publicId : "";
  const [handoff, setHandoff] = useState<PreviewHandoff | null>(readHandoffFromFragment());

  const [state, setState] = useState<PreviewState>(
    handoff !== null ? { status: "requesting" } : { status: "unavailable" },
  );

  useEffect(() => {
    if (handoff === null || publicId.length === 0) {
      return; /* No handoff in the navigation: the one not-available answer. */
    }

    /*
     * Consume the one-time handoff before anything else: the address bar and
     * history must not retain it, and nothing else may read it. The fetch
     * below uses the captured values only.
     */
    const consumed = handoff;
    setHandoff(null);
    window.history.replaceState(null, "", window.location.pathname);

    let cancelled = false;
    createSonghealthPreviewClient({ baseUrl: apiOrigin })
      .getCandidate(resourceType, publicId, consumed)
      .then((candidate) => {
        if (!cancelled) {
          setState(candidate === null ? { status: "unavailable" } : { status: "available", candidate });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "unavailable" });
        }
      });
    return () => {
      cancelled = true;
    };
    /*
     * The handoff is consumed exactly once for this navigation (captured
     * above, never a dependency): consuming it clears the state that would
     * otherwise re-run this effect and cancel the in-flight request's own
     * state update.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOrigin, resourceType, publicId]);

  return (
    <main>
      <aside
        data-songhealth-preview-banner="1"
        role="note"
        style={{
          border: "1px solid #b45309",
          background: "#fef3c7",
          color: "#78350f",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
        }}
      >
        <strong>ตัวอย่าง — ไม่ใช่หน้าสาธารณะ</strong>{" "}
        <span>ข้อมูลฉบับทำงานสำหรับผู้มีสิทธิ์เท่านั้น เป็นการอ่านอย่างเดียว และไม่มีการเผยแพร่</span>
      </aside>

      {state.status === "requesting" ? <p aria-busy="true">กำลังเปิดตัวอย่าง…</p> : null}
      {state.status === "unavailable" ? (
        <div>
          <h1>ไม่สามารถเปิดตัวอย่างได้</h1>
          <p>ตัวอย่างนี้ไม่พร้อมให้เปิดดู หรือสิทธิ์ในการเปิดดูสิ้นสุดลงแล้ว</p>
        </div>
      ) : null}
      {state.status === "available" ? renderCandidate(state.candidate) : null}
    </main>
  );
}

/**
 * Render one candidate read-only through the shared presentation.
 *
 * @param candidate The decoded bounded Preview candidate.
 * @returns The read-only presentation.
 */
function renderCandidate(candidate: SonghealthPreviewCandidateDto) {
  if (candidate.type === "basic-page") {
    /* The shared US1 renderer is the accepted presentation for a Basic Page. */
    return <BasicPage resource={candidate} />;
  }

  /*
   * The Document Resource candidate renders a bounded read-only summary of
   * its own fields. Its canonical presentation (T045) and any binary surface
   * (T043/T044) belong to US3 and are deliberately absent here.
   */
  return (
    <article>
      <h1>{candidate.title}</h1>
      {candidate.summary !== undefined && candidate.summary.length > 0 ? <p>{candidate.summary}</p> : null}
      {candidate.documentDate !== undefined ? <p>วันที่เอกสาร: {candidate.documentDate}</p> : null}
    </article>
  );
}

/**
 * Read the one-time navigation handoff from the URL fragment, if present.
 *
 * The authorized initiation hands the opaque grant and the supplemental
 * `wp_rest` nonce over in the fragment — the one URL component no server
 * ever receives — and the effect above removes it immediately, so neither
 * value survives in the address bar, history, or any log.
 *
 * @returns The handoff, or null when this navigation carries none.
 */
function readHandoffFromFragment(): PreviewHandoff | null {
  if (typeof window === "undefined") {
    return null; /* Server rendering never sees the fragment. */
  }
  const fragment = window.location.hash.replace(/^#/, "");
  if (fragment.length === 0) {
    return null;
  }
  const params = new URLSearchParams(fragment);
  const grant = params.get("g");
  const nonce = params.get("n");
  if (grant === null || grant.length === 0 || nonce === null || nonce.length === 0) {
    return null;
  }
  return { grant, nonce };
}
