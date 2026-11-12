// The icon a Service card shows (Feature 008 #248; spec #239 "Frequently Used Services").
//
// Staff choose a Service's icon in the Service editor from a fixed set, each offered by a Thai name
// for its picture. The name is the stored value: EmDash 1.1.0 lists a choice field's values as
// they are stored, without a picture or a separate label (docs/agents/emdash-1.1.0.md "Admin
// input"). The set is the Service `icon` field's options in seed/seed.json, in the same order
// (Product Owner, 2026-11-12: #248 comment 6826430670).
//
// A Service without a choice shows the standard icon, and so does one whose stored value is
// outside the set: EmDash refuses such a value when content is saved, so it comes only from a name
// that the set has lost since.

/** The Lucide icon of each name staff choose. */
const ICON_BY_CHOICE = {
	มือประคองหัวใจ: "hand-heart",
	ข้อความแจ้งเตือน: "message-square-warning",
	ตาชั่ง: "scale",
	หลอดไฟ: "lightbulb",
	เครื่องหมายคำถาม: "circle-question-mark",
	หัวใจและชีพจร: "heart-pulse",
	ใบไม้: "leaf",
	เม็ดยา: "pill",
	เอกสาร: "file-text",
	กลุ่มคน: "users",
	ลูกโลก: "globe",
	เข็มฉีดยา: "syringe",
	โล่: "shield-check",
	หูฟังแพทย์: "stethoscope",
	เด็กเล็ก: "baby",
	โทรศัพท์: "phone",
	แผ่นรายการ: "clipboard-list",
	โทรโข่ง: "megaphone",
} as const;

/** A Service icon, by its Lucide name. */
export type ServiceIconName = (typeof ICON_BY_CHOICE)[keyof typeof ICON_BY_CHOICE];

/** The standard Service icon (approved Q12; Product Owner, 2026-10-31: #51 comment 6536052180). */
const STANDARD_ICON: ServiceIconName = "hand-heart";

/** The icon of a Service whose stored choice is `choice`. */
export function serviceIcon(choice: string | null | undefined): ServiceIconName {
	return choice && Object.hasOwn(ICON_BY_CHOICE, choice)
		? ICON_BY_CHOICE[choice as keyof typeof ICON_BY_CHOICE]
		: STANDARD_ICON;
}
