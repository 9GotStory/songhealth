# Homepage — เว็บไซต์สำนักงานสาธารณสุขอำเภอสอง

> **Document ID:** 04-homepage
> **Status:** CLEAN REBASELINE v2.3 — CURRENT
> **Version:** 2.3
> **Last Updated:** 29 ตุลาคม 2569 (2026-10-29)
> **Depends On:** `00-website-foundation.md`, `01-information-architecture.md`, `02-content-model.md`, `03-sitemap.md`
> **Purpose:** กำหนด homepage information priority, sections, curation, responsive/accessibility behavior โดยไม่กำหนด component implementation หรือสร้าง homepage CMS subsystem

> **Feature 003 decision (Product Owner, 2026-10-29):** the Homepage includes a staff-maintained
> Quick Access section (§10.1) before the Contact Summary. Quick Access repeats navigation by
> design. It creates no content and no second sitemap.

---

# 1. Homepage Goal

Homepage ต้องช่วยผู้ใช้ตอบ 3 คำถามเร็วที่สุด:

1. ตอนนี้มีเรื่องสำคัญอะไร?
2. ฉันต้องการบริการ/ข้อมูลอะไรและไปต่อที่ไหน?
3. สำนักงานนี้คือใคร ติดต่ออย่างไร?

Homepage เป็น **curated + automated view** ของ canonical content ไม่ใช่ content repository ใหม่.

---

# 2. Principles

- Citizen First
- Mobile First
- Search easy to reach
- priority over completeness
- reuse canonical content
- staff workloadต่ำ
- no duplicate content ownership
- no page builder
- no AI/popularity/personalization ranking
- no auto-playing hero carousel
- accessibility by default

---

# 3. Homepage Order

Baseline order:

```text
Header / Navigation / Search
Featured / Priority
Frequently Used Services
Latest News + Current Announcements
Health Information
Health Service Discovery
Activities
Quick Access
Contact Summary
Footer
```

Section อาจถูกซ่อนเมื่อไม่มี contentที่มีคุณภาพ ยกเว้น core navigation/search/contact/footer.

Exact visual grid/card compositionเป็น Design System concern.

---

# 4. Header / Navigation / Search

Header ใช้ navigation จาก `03-sitemap.md`.

Requirements:

- logo links to `/`
- Main/Utility navigationชัดเจน
- Searchเข้าถึงง่ายทั้ง desktop/mobile
- ไม่สร้าง mobile content/navigationอีกชุด
- keyboard/focus behaviorต้องเหมาะสม

---

# 5. Featured / Priority

Featured เป็น presentation curation ไม่ใช่ Content Type.

เลือกจาก existing public content เช่น News, Announcement, Health Content, Service, Activity หรือ Health Reportเมื่อเหมาะ.

Baseline:

- one primary itemเมื่อ sectionแสดง
- secondary itemsมีได้เล็กน้อยตาม design
- curated sourceต้องยัง published/public
- sourceที่ unavailable/expiredจนไม่เหมาะต้องหายจาก active presentation
- no duplicate detail route

**No automatic fallback algorithm is required in Version 1.** หากไม่มี curated Featured ที่เหมาะสม sectionสามารถย่อ/หายได้; Latest Newsยังให้ข้อมูลปัจจุบันอยู่แล้ว.

ไม่มี autoplay carousel.

---

# 6. Frequently Used Services

แสดง Service records ที่ประชาชนใช้บ่อย/สำคัญโดย manual curation.

ประมาณ 4–6 รายการเป็น guideline ไม่ใช่ schema constraint.

Card แสดงเฉพาะข้อมูลที่ช่วยเลือก เช่น name + concise description/icon.

Link ไป canonical Service route หรือ approved external journeyผ่าน Service record.

ไม่มี popularity analytics/AI ranking/forced replacement.

---

# 7. News and Announcements

### Latest News
อ่าน News ที่ published ล่าสุดแบบ automatic ordering.

### Current Announcements
แสดง announcement ที่ยัง relevant/current ตาม domain dates/status.

Deduplicate itemที่ถูกใช้เป็น Featuredเมื่อทำได้ง่าย; ไม่สร้าง deduplication subsystemเพื่อ homepage.

Card ต้อง link canonical route.

---

# 8. Health Information

เป้าหมายคือ surface Health Content ที่มีประโยชน์ต่อประชาชน ไม่ใช่ทำ medical recommendation engine.

Baseline:

- staff อาจ curate current/seasonal Health Content
- ถ้าไม่ curate สามารถใช้ latest/recent published Health Content แบบง่าย
- overdue review metadataอาจเตือน staff แต่ไม่ auto-unpublish
- Health Report ไม่ถูกผสมกับ knowledge cardsโดย default
- no AI seasonal selection

---

# 9. Health Service Discovery

Homepage ช่วยเริ่ม journey ไป `/health-services`; ไม่ duplicate directory.

แสดงได้ เช่น:

- clear CTA
- simple search/filter entry point
- small curated facility set only when useful

ไม่ทำ:

- full interactive map
- geolocation / near-me
- nearest-provider calculation
- live open-now engine
- full facility result applicationบน homepage

Query/filter stateที่เริ่มจาก homepageสามารถส่งต่อไป directoryผ่าน URL.

---

# 10. Activities

แสดงกิจกรรมล่าสุดจำนวนเล็กน้อยโดย Activity Date เป็น primary ordering และ Published Date fallbackเมื่อไม่มี Activity Date.

ใช้ Featured Image หรือ simple visual fallback; ไม่บังคับ staffสร้าง artworkเพื่อเติม layout.

ไม่ทำ masonry/gallery carousel/photo wall บน homepage.

Link ไป canonical Activity route.

## 10.1 Quick Access

แสดงทางลัดจำนวนเล็กน้อยไปยัง canonical destinations ที่มีอยู่แล้ว เช่น เอกสารเผยแพร่ หรือข้อมูลสุขภาพ.

- staff ดูแลรายการและลำดับเองผ่าน native CMS primitive; composition เป็น evidence-driven value (`01` §17)
- ซ้ำกับ navigation ได้โดยตั้งใจ; ไม่สร้าง content หรือ sitemap ชุดที่สอง
- ไม่ใช้เป็นทางเข้า scope ที่ deferred เช่น ITA หรือ Dashboard
- section ซ่อนเมื่อไม่มีรายการ (§17)

---

# 11. Contact Summary

Homepage แสดงเฉพาะข้อมูลที่สร้าง confidenceและช่วยติดต่อเร็ว:

- office name/address summary
- main phone/contact
- office hoursเมื่อมี
- simple map/location affordance
- link to `/contact`

ใช้ sourceเดียวกับ Contact/office data; ห้าม duplicate fieldsเฉพาะ homepage.

Map เป็น enhancement; essential address/contact textต้องอยู่ได้แม้ mapไม่โหลด.

ไม่แสดง personal contactของเจ้าหน้าที่โดย default.

---

# 12. Footer

Footer ช่วย orientation/trust/utility ไม่เป็น second sitemap.

อาจมี:

- essential navigation
- contact
- privacy/PDPA
- accessibility statement
- official social/digital channels
- copyright/agency identification

แสดงเฉพาะ official channelsที่ดูแลจริง.

Cookie consent/bannerเกิดเมื่อ actual technology/privacy requirementต้องการ ไม่ใช่เพราะมี Cookie Policy document.

---

# 13. Homepage Data Ownership

```text
Homepage section        Source owner
Featured                relation/config → existing content
Services                Service
Latest News             News
Announcements           Announcement
Health Information      Health Content
Health Service CTA      Health Service Directory
Activities              Activity
Quick Access            curated shortcuts → existing destinations
Contact                 office/contact owner
```

Homepage ไม่สร้าง duplicate copiesของ source records.

---

# 14. Admin / Curation

ใช้ native CMS primitive ก่อน:

- reference/relation picker
- menu/widget area
- structured configuration
- ordering fieldเมื่อจำเป็น

ไม่สร้าง custom Homepage application/page builderใน Version 1.

Staffไม่ควรพิมพ์ internal IDs/URLsสำหรับ canonical content; picker/referenceควร resolve destination.

Homepage edit/publish accessใช้ ordinary CMS roles/permissions; ไม่มี Homepage roleเฉพาะ.

---

# 15. Responsive Behavior

- same content/data across desktop/mobile
- mobile order preserves information priority
- no separate mobile CMS configuration
- cards/grid collapseตาม available space
- primary contentไม่ต้อง horizontal carousel
- touch targets/readabilityเหมาะกับ mobile

Exact breakpoints/column countsอยู่ใน Design System.

---

# 16. Accessibility Contract

Homepageต้องรองรับอย่างน้อย:

- semantic landmarks/headings
- keyboard navigation
- visible focus
- logical DOM/read order
- sufficient contrast
- meaningful link text
- text not baked into images for essential meaning
- alt text for informative images
- labels/errors for forms/search
- no flashing/autoplay that interferes with access
- status communicated by text/semantics, not color alone
- maps/images have textual alternatives for essential information

Accessibilityเป็น implementation/QA quality requirement ไม่ใช่ separate approval workflowหรือ toolbar.

Target conformance should align with the accessibility standard adopted for the whole site; Homepageไม่สร้างมาตรฐานเฉพาะของตนเอง.

---

# 17. Empty / Invalid Content

Homepage must fail gracefully:

- curated sourceไม่ public → do not render the link/card
- optional sectionไม่มี valid items → hide/compact the section
- image missing → use text-first layout or simple placeholder
- map fails → retain address/contact

Do not fill empty slotsด้วย unrelated contentเพียงเพื่อรักษา layout.

---

# 18. Performance / SEO

- primary homepage content delivered as meaningful server-rendered/public HTML
- avoid JavaScript for static cards/navigation when unnecessary
- responsive images/lazy loading where appropriate
- main page metadata/site identity use current SEO/site settings
- no homepage-specific duplicate canonical content

Exact caching/image implementationอยู่ใน System Blueprint/implementation.

---

# 19. Explicit Non-Goals

Version 1 Homepageไม่มี:

- visual page builder
- drag/drop arbitrary sections
- per-device content
- AI ranking/recommendation
- popularity ranking
- personalization
- A/B testing
- auto-playing hero carousel
- near-me/geolocation engine
- full facility map/directory
- Homepage-specific workflow/audit system
- separate homepage database/model copies

---

# 20. Acceptance

Homepage baselineผ่านเมื่อ:

- priorityสอดคล้อง citizen tasks
- sections reuse canonical content
- staff workloadไม่ต้อง curateทุกส่วนรายวัน
- automated sectionsใช้ simple ordering
- curated sectionsไม่สร้าง duplicate content
- mobile/accessibilityยังใช้งานได้
- optional missing contentไม่ทำให้ pageแตก
- ไม่มี custom homepage subsystemที่ native CMS primitiveทำได้อยู่แล้ว

> **Homepage is a view, not a platform.**
