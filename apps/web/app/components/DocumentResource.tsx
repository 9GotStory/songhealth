/**
 * T045 — Shared Document Resource public presentation (US3).
 *
 * References: FR-018–FR-020 (delivery is mediated by the owning Document
 * Resource's own current eligibility through the one Songhealth download
 * path), FR-006 (only allowlisted public fields are presented), FR-011
 * (Public ID is identity; the display slug is optional readability);
 * contracts/protected-binary.md; data-model.md §Document Resource Foundation
 * Record; Constitution I, IV.
 *
 * The download target is ONLY the DTO's `downloadPath` — the canonical
 * mediated Songhealth binary path derived from the Public ID. A Media
 * Library URL, an attachment ID, a filesystem path, a stored filename, or
 * any raw WordPress media representation never appears here: those are not
 * public identity, and the DTO (strictly decoded by the shared client)
 * carries none of them.
 */

import type { DocumentResourceDetailDto } from "../services/songhealth-public.js";

/** Presentation properties: the already-decoded Document Resource detail DTO. */
export interface DocumentResourceProps {
  readonly resource: DocumentResourceDetailDto;
  /** The public contract origin the mediated download path is served from. */
  readonly downloadOrigin: string;
}

/**
 * The shared Document Resource public presentation.
 *
 * @param props The decoded Document Resource DTO.
 * @returns The page element tree.
 */
export default function DocumentResource({ resource, downloadOrigin }: DocumentResourceProps) {
  return (
    <article>
      <h1>{resource.title}</h1>
      {resource.summary !== undefined && resource.summary.length > 0 ? (
        <p>{resource.summary}</p>
      ) : null}
      {resource.documentDate !== undefined ? (
        <p>
          <time dateTime={resource.documentDate}>{resource.documentDate}</time>
        </p>
      ) : null}
      <p>
        {/* The one approved download path: the mediated Songhealth binary route keyed by Public ID. */}
        <a data-songhealth-download="1" href={`${downloadOrigin}${resource.downloadPath}`} rel="nofollow">
          ดาวน์โหลดเอกสาร (PDF)
        </a>
      </p>
    </article>
  );
}
