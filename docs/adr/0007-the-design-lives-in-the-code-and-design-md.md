---
status: accepted
---

# The public design's source is the code and DESIGN.md v1.0, not the Figma frame

ADR 0001 took the public site's tokens from the Product Owner's Figma file "Songhealth —
Homepage Concept v1" (file `Lxdfd1dBgNNO28Rx62zGYO`, frame `5:2`). That file can no longer be
edited: the Figma Starter quota stopped the Product Owner's final editing round, so
`docs/design/DESIGN.md` stayed a draft (v0.2) with its §10 Figma checklist open. Feature 006
settled the design in code instead (spec #144). The grill of 2026-11-04 put the design's variants
in code on the development runtime rather than in Figma (Round 1, Q2: "ตามที่แนะนำทั้ง 7 ข้อ").
With the legacy site's real content, the Product Owner judged the built design better than three
new variants and picked targeted fixes to it.

The design's source is therefore the code, the tokens in `src/styles/global.css` and the
components in `src/components/`, together with `docs/design/DESIGN.md` v1.0, which records them
and the rules they follow. Figma Concept v1 stays unchanged, as history, and
`docs/design/homepage-concept-v1.md` still describes it. This supersedes ADR 0001's part that the
tokens come from the Figma frame. ADR 0001's technology stands: Tailwind CSS v4 through its Vite
plugin, with CSS-first `@theme` tokens.

## Considered options

- **Finish the Figma cleanup and build from the file** (v0.2 §10): the quota blocks the edits, and
  the file has no mobile frame and no post page.
- **Figma for the tokens, the code for the layouts:** two sources for one design. The tokens
  already depart from the frame, with the contrast fixes of #51 and the Featured title's size.

## Consequences

- A design change is made in the code and recorded in `DESIGN.md` in the same pull request. Its
  screenshots, at 375 and 1440 px with 320 px for reflow, are how the Product Owner reviews it
  (spec #144 "Evidence, not gates").
- Building or reviewing a page needs no Figma read. The Dashboard concepts stay in the Figma file
  for their separately approved future scope.
- Text that a Homepage section or the shell takes from the frame still comes from
  `docs/design/homepage-concept-v1.md` where it names some (CODING_STANDARDS "Public pages").
