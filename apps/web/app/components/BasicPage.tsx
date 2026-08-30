/**
 * T027 — Shared Basic Page public presentation (US1).
 *
 * References: FR-006 (only allowlisted public fields are presented), FR-010
 * (presentation consumes the Songhealth DTO, never raw CMS data), FR-011
 * (Public ID is identity; the display slug is optional readability),
 * FR-019 (a reference never elevates its target — the projector already
 * resolved which references are currently eligible, so only those are handed
 * to presentation); contracts/public-rest.md §Detail, §Canonical behavior;
 * Constitution I, IV.
 *
 * Controlled body output: the DTO's `body` is markup that the server
 * projector already reduced to the safe WordPress post vocabulary, but
 * presentation applies its OWN control rather than trusting it — the body is
 * parsed into React elements for a small explicit tag allowlist, with every
 * other tag dropped and all remaining text escaped by React. Nothing in this
 * component ever uses `dangerouslySetInnerHTML`, so no markup from the
 * contract can reach the document as raw HTML.
 *
 * Eligible references: `documentReferences` arrives already filtered by the
 * projector to the references that pass their OWN current eligibility. They
 * are rendered as links under the Frozen `/documents/{publicId}` canonical
 * base — resolution of that base is US3 (T046) and is not implemented here.
 */

import { createElement, type ReactNode } from "react";
import type { BasicPageDetailDto } from "../services/songhealth-public.js";

/** Tags the controlled renderer may produce. Anything else is dropped. */
const ALLOWED_TAGS = new Set(["p", "h2", "h3", "strong", "em", "ul", "ol", "li", "a", "br"]);

/** Tags whose CONTENT is code rather than document text: dropped entirely. */
const DROPPED_WITH_CONTENT = new Set(["script", "style", "template"]);

/** One parsed body node: an allowlisted element or an escaped text run. */
type BodyNode =
  | { readonly kind: "element"; readonly type: string; readonly href?: string; readonly children: readonly BodyNode[] }
  | { readonly kind: "text"; readonly text: string };

/** A URL the controlled renderer accepts for a link target. */
const SAFE_HREF_PATTERN = /^(?:https?:\/\/|\/|#)/i;

/**
 * Parse contract body markup into the allowlisted node tree.
 *
 * Tolerant by design: unmatched close tags and unclosed open tags are
 * normalized (the stack closes them), unknown tags are unwrapped to their
 * text content, code-bearing tags are dropped with their content, and any
 * structural surprise degrades to plain text rather than failing the page.
 *
 * @param html Body markup from the detail DTO.
 * @returns The parsed nodes.
 */
export function parseControlledBody(html: string): readonly BodyNode[] {
  const roots: BodyNode[] = [];
  const stack: Array<{ type: string; href?: string; children: BodyNode[] }> = [];

  const currentChildren = (): BodyNode[] =>
    stack.length > 0 ? stack[stack.length - 1]!.children : (roots as BodyNode[]);

  const pattern = /<\/\s*([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;

  let dropping: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const [, closeName, openName, rawAttributes, text] = match;

    if (dropping !== null) {
      /* Inside a code-bearing tag: consume everything up to its close tag. */
      if (closeName && closeName.toLowerCase() === dropping) {
        dropping = null;
      }
      continue;
    }

    if (closeName !== undefined) {
      const name = closeName.toLowerCase();
      if (name === "br") {
        continue;
      }
      /* Close the nearest matching open element; ignore stray closers. */
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        if (stack[depth]!.type === name) {
          const closed = stack.splice(depth).map(toBodyNode);
          if (depth === 0) {
            (roots as BodyNode[]).push(...closed);
          } else {
            stack[depth - 1]!.children.push(...closed);
          }
          break;
        }
      }
      continue;
    }

    if (openName !== undefined) {
      const name = openName.toLowerCase();
      if (DROPPED_WITH_CONTENT.has(name)) {
        dropping = name;
        continue;
      }
      if (!ALLOWED_TAGS.has(name)) {
        continue; /* Unknown tag: dropped; its inner text is still collected below. */
      }
      if (name === "br") {
        currentChildren().push({ kind: "element", type: "br", children: [] });
        continue;
      }
      const href = name === "a" ? extractHref(rawAttributes ?? "") : undefined;
      stack.push({ type: name, href, children: [] });
      continue;
    }

    if (text !== undefined && text.length > 0) {
      currentChildren().push({ kind: "text", text });
    }
  }

  /* Unclosed elements close at the end of input. */
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    const target = stack.length > 0 ? stack[stack.length - 1]!.children : (roots as BodyNode[]);
    target.push(toBodyNode(unclosed));
  }

  return roots;

  /**
   * Finalize one parsed element.
   *
   * @param element Open element state.
   * @returns The body node.
   */
  function toBodyNode(element: { type: string; href?: string; children: BodyNode[] }): BodyNode {
    return { kind: "element", type: element.type, href: element.href, children: element.children };
  }
}

/**
 * Extract a safe href from a raw attribute string.
 *
 * @param rawAttributes Raw attribute text of an anchor open tag.
 * @returns The href value, or undefined when absent/unsafe.
 */
function extractHref(rawAttributes: string): string | undefined {
  const match = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttributes);
  if (match === null) {
    return undefined;
  }
  const href = (match[2] ?? match[3] ?? match[4] ?? "").trim();
  return SAFE_HREF_PATTERN.test(href) ? href : undefined;
}

/**
 * Render parsed body nodes as React elements.
 *
 * @param nodes Parsed nodes.
 * @returns The rendered children.
 */
function renderBodyNodes(nodes: readonly BodyNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.kind === "text") {
      return node.text;
    }
    if (node.type === "a") {
      return createElement(
        "a",
        node.href === undefined ? { key: index } : { key: index, href: node.href, rel: "nofollow noopener" },
        ...renderBodyNodes(node.children),
      );
    }
    if (node.type === "br") {
      return createElement("br", { key: index });
    }
    return createElement(node.type, { key: index }, ...renderBodyNodes(node.children));
  });
}

/** Presentation properties: the already-decoded Basic Page detail DTO. */
export interface BasicPageProps {
  readonly resource: BasicPageDetailDto;
}

/**
 * The shared Basic Page public presentation.
 *
 * @param props The decoded Basic Page DTO.
 * @returns The page element tree.
 */
export default function BasicPage({ resource }: BasicPageProps) {
  const body = typeof resource.body === "string" ? parseControlledBody(resource.body) : [];
  const references = resource.documentReferences ?? [];

  return (
    <article>
      <h1>{resource.title}</h1>
      {resource.summary !== undefined && resource.summary.length > 0 ? <p>{resource.summary}</p> : null}
      <div>{renderBodyNodes(body)}</div>
      {references.length > 0 ? (
        <section>
          <h2>Related documents</h2>
          <ul>
            {references.map((publicId) => (
              <li key={publicId}>
                <a href={`/documents/${publicId}`} rel="nofollow">
                  {publicId}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
