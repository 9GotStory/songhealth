// The icon a Service card shows (Feature 008 #248; spec #239 "Frequently Used Services", user
// stories 11, 42 and 43).
//
// Staff choose a Service's icon in the Service editor from a fixed set of 18, each offered by a
// Thai name for its picture; the name is the stored value (Product Owner, 2026-11-12: #248 comment
// 6826430670, which lists each name with its Lucide icon, the source of the table below). A
// Service without a choice shows the standard icon, hand-heart, and so does one whose stored value
// is outside the set, as a name removed from the set later leaves it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { serviceIcon } from "../../src/lib/service-icon.ts";

/** Each name staff choose, with its Lucide icon (#248 comment 6826430670). */
const CHOICES = [
	["มือประคองหัวใจ", "hand-heart"],
	["ข้อความแจ้งเตือน", "message-square-warning"],
	["ตาชั่ง", "scale"],
	["หลอดไฟ", "lightbulb"],
	["เครื่องหมายคำถาม", "circle-question-mark"],
	["หัวใจและชีพจร", "heart-pulse"],
	["ใบไม้", "leaf"],
	["เม็ดยา", "pill"],
	["เอกสาร", "file-text"],
	["กลุ่มคน", "users"],
	["ลูกโลก", "globe"],
	["เข็มฉีดยา", "syringe"],
	["โล่", "shield-check"],
	["หูฟังแพทย์", "stethoscope"],
	["เด็กเล็ก", "baby"],
	["โทรศัพท์", "phone"],
	["แผ่นรายการ", "clipboard-list"],
	["โทรโข่ง", "megaphone"],
] as const;

describe("a Service's icon", () => {
	it("is offered in the Service editor under each of the 18 names, the standard icon first", () => {
		const seed = JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8"));
		const services = seed.collections.find(({ slug }: { slug: string }) => slug === "services");
		const icon = services.fields.find(({ slug }: { slug: string }) => slug === "icon");
		assert.deepEqual(
			icon.validation.options,
			CHOICES.map(([choice]) => choice),
		);
		assert.equal(icon.required ?? false, false, "the choice is optional");
	});

	it("is the chosen one, for each of the 18 names", () => {
		for (const [choice, icon] of CHOICES) {
			assert.equal(serviceIcon(choice), icon, choice);
		}
	});

	it("is the standard icon, hand-heart, without a choice", () => {
		assert.equal(serviceIcon(null), "hand-heart");
		assert.equal(serviceIcon(undefined), "hand-heart");
		assert.equal(serviceIcon(""), "hand-heart");
	});

	it("is the standard icon for a stored value outside the set, also one close to a name", () => {
		assert.equal(serviceIcon("ดาว"), "hand-heart");
		assert.equal(serviceIcon("เข็มฉีดยา "), "hand-heart");
		assert.equal(serviceIcon("syringe"), "hand-heart");
		assert.equal(serviceIcon("toString"), "hand-heart");
		assert.equal(serviceIcon("constructor"), "hand-heart");
	});
});
