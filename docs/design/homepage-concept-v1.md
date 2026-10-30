# Homepage Concept v1: design reference

The Product Owner's Figma file "Songhealth — Homepage Concept v1" (file key
`Lxdfd1dBgNNO28Rx62zGYO`), frame `5:2` "Songhealth / Homepage / Desktop", 1440 px wide. It was
read once, on 2026-10-29, through the Figma MCP (`get_design_context` and `get_variable_defs`).
The account has very few Figma reads, so build from this page and re-read the file only when the
Product Owner changes it.

The Product Owner's draft design system for the whole public UI is `docs/design/DESIGN.md`
(v0.2, not yet accepted). A difference between the two, or between the draft and a built page, is
a pending confirmation (#64 comment 6535747409).

- **Tokens:** colour and type names are the tokens in `src/styles/global.css` (ADR 0001).
- **Units:** sizes are px in the 1440 frame.
- **Sections:** each spans the frame, with 120 px side padding around the 1200 px content (the
  `page-container` utility).
- **Mobile:** the frame is desktop only. The mobile layout keeps its content and order (`04` §15).

## What the build changes

These were decided in #51 and the current docs.

- **Featured (hero):** the hero shows the Featured item. With none, it shows a compact band with
  the site title and tagline. The slogan is not used.
- **Copy:** use "หน่วยบริการสุขภาพที่เกี่ยวข้อง", never "ใกล้บ้าน" or "ในพื้นที่" (`00` §13). It
  replaces the Health Service Discovery eyebrow and the service-card wording.
- **Frequently Used Services:** only Service records. "ค้นหาหน่วยบริการ" (the Health Service
  Directory) and "คู่มือและแบบฟอร์ม" (Documents) are not Services.
- **Health Information:** the latest 4 Health Content items, each labelled with its first topic,
  in the topic-card style. The frame shows Health Topics instead.
- **Quick Access and navigation:** no ITA and no Dashboard (both deferred). Quick Access items
  come from its menu and show a label and an arrow only.
- **Contrast fixes:**
  - text-secondary on surface-soft becomes text-secondary-on-soft (the Contact Summary lead);
  - the search and Health Service Discovery inputs use border-input as their boundary.
- **File defect:** auto-layout frames carry an unintended white fill that hides white text in
  the hero, the utility bar and the footer. Build those frames transparent.
- **Decided in #64** (Product Owner, 2026-10-30: #64 comment 6526131459):
  - while nothing is Featured, a brand-dark card in the hero's place holds the site title as the
    page's H1, with the tagline under it;
  - "ดูข่าวทั้งหมด →" follows the News card and "ดูประกาศทั้งหมด →" the Announcements panel, each
    under its own box, and "ดูความรู้สุขภาพทั้งหมด →" follows Health Information;
  - each current Announcement states its status and dates, as `/announcements` does;
  - the Contact Summary's lead is the Homepage's meta description;
  - the Activities list shows Card / Activity too, with each Activity's summary.

## Shared patterns

- **Section heading:** a column 1200 px wide with an 8 px gap:
  - eyebrow: Label, brand-primary;
  - title: H2, text-primary;
  - lead: Body, text-secondary.
- **Section rhythm:** 80 px vertical padding (Search 0/64, Featured 32/64, Frequently Used
  Services 64/80, Contact Summary 64). The heading sits 28 px above the content.
- **Primary button:** a brand-primary pill, 20/12 px padding, Label in surface-base.
- **Text link:** Label in brand-primary, ending in "→".

## Sections, in order

### 1. Utility bar (built in #52)

- **Bar:** brand-dark, 42 px high, Small in surface-base.
- **Left:** "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่".
- **Right:** "ค้นหา" and "ติดต่อเรา", 20 px apart.

### 2. Header (built in #52)

- **Bar:** surface-base, 88 px high.
- **Identity:**
  - mark: 48 px, brand-primary, radius 16, a "+" in surface-base;
  - title: H3, brand-dark (Figma placeholder "SONGHEALTH");
  - tagline: Small, text-secondary ("สุขภาพอำเภอสอง");
  - mark and text sit 12 px apart.
- **Navigation:** Label, 24 px apart. The current item is brand-primary, the others text-primary.

### 3. Featured

- **Shell:** bg-page.
- **Card:** brand-dark, radius 32, 56 px padding, 520 px high. A text column 590 px wide sits
  beside a visual 450 × 408, 48 px apart.
- **Text column** (22 px gap):
  - eyebrow chip "เรื่องเด่นจากอำเภอสอง": surface-base at 12 % fill, pill, 14/8 px padding,
    Label in surface-base;
  - title: Display, surface-base;
  - lead: Body Large, surface-base;
  - buttons, 12 px apart: a primary "ดูเรื่องเด่น", and a secondary "ค้นหาบริการ" (surface-base
    at 6 % fill, 28 % border).
- **Visual:** a left-to-right gradient from hero-visual-from to hero-visual-to, radius 26, with a
  210 px circle and the caption "ชุมชน • สุขภาพ • ใกล้บ้าน" in H3 brand-dark.
- **Build:** the Featured item's title, summary and image (or this visual), a primary link to the
  item, and "ค้นหาบริการ" to `/services`.

### 4. Search

- **Heading:** H3, text-primary, "คุณกำลังมองหาอะไร?".
- **Field:** surface-base, radius 20, 72 px high, padding 22 left and 10 right, with a border
  (border-input). The placeholder is Body, text-secondary: "ค้นหาบริการ ข่าวสาร หน่วยบริการ
  หรือเอกสาร…". A primary button "ค้นหา" sits inside the field.
- **Build:** a GET form to `/search`.

### 5. Frequently Used Services

- **Section:** surface-base. Heading: "บริการประชาชน" / "วันนี้คุณต้องการทำอะไร?" /
  "เข้าถึงบริการสำคัญได้ง่าย โดยไม่ต้องรู้โครงสร้างภายในของหน่วยงาน".
- **Grid:** 3 columns of 384 px, 24 px gaps, two rows of cards 196 px high.
- **Card / Service** (component `4:36`):
  - card: surface-base, border-default, shadow card, radius 20, padding 24 top, 22 bottom,
    24 sides, 14 px gap;
  - top row: a 44 px icon tile (surface-soft, radius 14, "+" in H3 brand-primary) with "↗" in H3
    brand-primary at the right;
  - name: H3, text-primary;
  - description: Small, text-secondary.
- **Figma cards:**
  - Services: ร้องเรียน / เสนอแนะ, แจ้งปัญหาด้านสุขภาพ, บริการสำหรับ อสม., ขอข้อมูลจากสำนักงาน;
  - not Services, removed: ค้นหาหน่วยบริการ, คู่มือและแบบฟอร์ม.
- **Link:** "ดูบริการทั้งหมด →" to `/services`.

### 6. Latest News and Current Announcements

- **Section:** bg-page. Heading: "ข่าวสาร" / "เรื่องใหม่จากเครือข่ายสุขภาพอำเภอสอง" /
  "ข่าวประชาสัมพันธ์และประกาศที่ประชาชนควรรู้".
- **Row:** 390 px high, 24 px gap.
- **Lead News card:** 760 px, brand-primary, radius 24, padding 28/30, 16 px gap, all text in
  surface-base:
  - category: Label ("ข่าวประชาสัมพันธ์");
  - title: H1;
  - summary: Body Large;
  - link: "อ่านข่าว →".
- **Announcements panel:** 416 px, surface-base, border-default, radius 24:
  - header (padding 24/20/24): H3 "ประกาศ", then Small text-secondary
    "ข้อมูลที่อาจมีวันสิ้นสุดหรือการดำเนินการ";
  - items (padding 18/24, 6 px gap, a divider line between items): title in Body text-primary,
    then "ดูรายละเอียด →" in Small brand-primary.

### 7. Health Information

- **Section:** surface-base. Heading: "สุขภาพใกล้ตัว" / "ความรู้ที่ใช้ได้ในชีวิตประจำวัน" /
  "เนื้อหาสุขภาพที่คัดสรรและทบทวนเพื่อคนในพื้นที่".
- **Grid:** 4 cards, 282 × 240, 24 px gaps.
- **Card:** radius 22, padding 26 top, 24 bottom, 24 sides, 12 px gap. Fills alternate
  topic-green and topic-blue.
  - number: Label, brand-primary ("01"–"04");
  - title: H3, text-primary;
  - description: Body, text-secondary. It measures 4.52:1 and 4.54:1 on these fills;
    text-secondary-on-soft gives more margin;
  - link: "อ่านเพิ่มเติม →".
- **Figma topics:** NCDs, โรคติดต่อ, ผู้สูงอายุ, แม่และเด็ก.

### 8. Health Service Discovery

- **Section:** brand-dark, 20 px gap.
- **Text:**
  - eyebrow: Label, accent-warm (the frame's "หน่วยบริการใกล้บ้าน" is replaced; see above);
  - title: H1, surface-base, "ค้นหาหน่วยบริการสุขภาพในอำเภอสอง";
  - lead: Body Large, surface-base, "ค้นหาตามตำบลหรือชื่อหน่วยบริการ พร้อมข้อมูลติดต่อ
    เวลาเปิดบริการ และแผนที่".
- **Field:** surface-base, radius 18, 68 px high, 900 px wide, padding 22 left and 10 right. The
  placeholder is "เลือกตำบล หรือพิมพ์ชื่อหน่วยบริการ", with a primary button "ค้นหาหน่วยบริการ".
- **Build:** an Area select and a name field, as a GET form to `/health-services`. No map is
  embedded.

### 9. Activities

- **Section:** bg-page. Heading: "กิจกรรมของเรา" / "สุขภาพเกิดขึ้นในชุมชน" /
  "การประชุม ลงพื้นที่ จิตอาสา และกิจกรรมร่วมกับเครือข่าย".
- **Grid:** 3 cards, 384 × 344, 24 px gaps.
- **Card / Activity** (component `4:48`):
  - card: surface-base, border-default, radius 22;
  - image area: 214 px high. Without an image, a left-to-right gradient from
    activity-visual-from to activity-visual-to, captioned "กิจกรรมในชุมชน" in Label brand-dark;
  - content (padding 18/20, 8 px gap): meta in Small text-secondary, as
    "กิจกรรม • 24 ก.ย. 2569", then the title in H3 text-primary.
- **Link:** "ดูกิจกรรมทั้งหมด →" to `/activities`.

### 10. Quick Access

- **Section:** surface-base. Heading: "เข้าถึงข้อมูล" / "ข้อมูลและเอกสารสำคัญ" /
  "ทางลัดสำหรับข้อมูลอ้างอิงและความโปร่งใสของหน่วยงาน".
- **Grid:** 4 cards, 282 × 132, 24 px gaps.
- **Card / Quick Link** (component `4:43`):
  - card: surface-base, border-default, radius 18, padding 22 top, 20 bottom, 22 sides;
  - label: H3, text-primary, with "→" in H3 brand-primary at the right;
  - the frame's Small text-secondary subtitle is not built.
- **Figma cards:**
  - kept: เอกสารเผยแพร่, ข้อมูลสุขภาพ;
  - deferred: ITA, Dashboard.

### 11. Contact Summary

- **Section:** surface-soft, 64 px vertical padding, a 560 px text column and a 592 × 230 visual,
  48 px apart.
- **Text column** (14 px gap):
  - title: H2, brand-dark (the site title);
  - lead: Body Large, text-secondary-on-soft, "ศูนย์กลางข้อมูล บริการ
    และการประสานงานด้านสุขภาพของประชาชนในอำเภอสอง จังหวัดแพร่";
  - contact line: Body, text-primary. In the build: address, main telephone, opening hours and
    "เปิดแผนที่";
  - link: "ดูข้อมูลติดต่อทั้งหมด →" to `/contact`.
- **Visual:** a left-to-right gradient from contact-visual-from to contact-visual-to, radius 24,
  with a 42 px circle and "แผนที่สำนักงานและพื้นที่อำเภอสอง" in Label brand-dark. It is a static
  stand-in, and the text works without it.

### 12. Footer (built in #52)

- **Bar:** brand-dark, 48 px vertical padding, all text surface-base.
- **Left:** the title in H3, then the office name in Small.
- **Right:** links in Small, 24 px apart:
  - "นโยบายความเป็นส่วนตัว" and "การเข้าถึงเว็บไซต์" (the privacy and accessibility Basic Pages,
    shown once they are published);
  - "ติดต่อเรา".
