# ITA prototype: the MOIT page and the Evidence editor

A throwaway prototype of the ITA re-entry grill (Feature 004), built and reviewed on 2026-11-02.
It lives on the branch `prototype/ita` only; `main` keeps the decisions, not the code. The
development runtime served it from commit `459bed3` (then `8c069a5`) while the Product Owner
reviewed it, and the data was removed afterwards.

## The questions

1. Does EmDash 1.1.0's `blocks` field give ITA staff a workable Evidence editor: a file picker
   inside a block, a MOIT with 60+ blocks, Duplicate for a new year, and a deleted file?
2. What should the public MOIT page look like?

## What was built

- `scripts/prototype-ita.ts add|remove`: a temporary collection `proto_moit` (title, fiscal_year,
  number, summary, updated_on, and `evidence`, a blocks field), three block types
  (`proto_ita_requirement`, `proto_ita_file`, `proto_ita_link`), five sample PDFs and two
  published MOITs of fiscal year 2570 that follow the legacy site's 2569 MOIT 1 (9 blocks) and
  MOIT 2 (63 blocks). One PDF was deleted after publishing, so MOIT 1 item 2.3 showed the
  unavailable state.
- `src/pages/prototype/ita/`: the year list, a year's MOITs, and the MOIT page with three
  variants switched by `?variant=`:
  - **A, เอกสารเรียงตามข้อ**: one column, a numbered section per Requirement, Evidence as rows;
  - **B, ตารางตามรอบ**: a table with the download in the column of its Round;
  - **C, สารบัญและการ์ด**: a sticky table of contents beside one collapsible card per
    Requirement, Evidence as pills.

## What was learned

- A block's file field renders through the Admin's `FieldRenderer`, so it has Replace and Remove
  and opens the same media picker as a Document's file. Question 1's main risk is closed.
- The Admin shows every block expanded. "Collapse block" exists per block and does not survive a
  reload. MOIT 2's form scrolls about 29,000 px. The block header shows the type, its version and
  the first field's value, so an Evidence label that starts with its number reads well.
- Duplicate, from the list's row actions, made a draft "… (Copy)" with the same fiscal year, all
  blocks and all file values. Staff must change the year and the slug and clear last year's
  Evidence themselves.
- The media library has a "Used in" tab per item that lists the entries and the field that use
  it, behind a "Media usage tracking is indexing existing content" setup. Deleting the item is not
  blocked.
- A `select` block field with two options cannot be cleared once a value is chosen: the Admin
  renders it as a combobox with no empty choice. An optional Round needs an explicit "no round"
  option.
- Schema slugs (collection, field, block type) allow letters, digits and underscores only; entry
  slugs keep hyphens.
- Entry slugs are unique within a collection, and a URL pattern resolves an entry by its slug
  alone, so a MOIT's slug must carry its year (`moit-2-2570`).
- The Product Owner's Figma file has one page, the homepage; it holds no ITA page concept.

## The verdict (Product Owner, 2026-11-02)

- Variant **C** wins ("ตามแนะนำทั้ง 3 ข้อ เลือกแบบ C").
- The long Admin form is accepted for V1.
- The prototype data is removed from the development runtime; the block types need SQL, because
  EmDash 1.1.0 has no route that deletes one.

The decisions go to ADR 0006 and the Feature 004 spec; the spec also settles the "no round"
option and the URL shape (the Product Owner asked why `/prototype/ita/2570/moit-2-2570` carries
the year twice).
