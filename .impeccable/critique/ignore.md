# Critique findings to drop

Each entry is a detector or review finding that `docs/design/DESIGN.md` settles, with its reason.

- `radial-halo` on the deep field (`deep-field`, `src/styles/global.css`; `--color-deep-highlight`
  `#0f8a70`): the list pages' heading field of DESIGN.md §7.8, which the Product Owner accepted in
  Features 008 and 009 (#313 comment 6905240669).
- `low-contrast` on a current Announcement row's month and year (`accent-warm` on the date tile's
  `brand-primary` to `brand-dark` gradient, `src/components/AnnouncementRow.astro`): the detector
  reads the gradient's lightest stop, 4.1:1, where the text sits darker; DESIGN.md §3.2 and §8.7
  record its readings, the one measured exception to `accent-warm` small text (#245 comment
  6812837231; #314).
- `low-contrast` on a Document row's file type ("PDF", or "ไฟล์") on its tile (`accent-warm` on
  the same gradient, `src/components/DocumentDownloadRow.astro`): the detector reads the
  gradient's lightest stop, where the text sits darker; DESIGN.md §3.2 and §7.3 record its
  readings, the other measured exception (spec #311 "The Document repository"; #315).
