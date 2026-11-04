// Thai titles keep compound words whole (#145; spec #144 "Shared: Thai titles keep compound words
// whole").
//
// - A title splits into runs, each kept together or plain, which give the title back unchanged
//   when joined.
// - At each place the longest listed word that starts there is kept, so "ความดันโลหิตสูง" wins over
//   "ความดันโลหิต" and "ตรวจคัดกรอง" over "คัดกรอง". Every occurrence is kept, and two listed words
//   side by side stay two runs, so a line can still break between them.
// - Text outside the list is untouched: plain runs hold it as written, characters that need
//   escaping included, since the page escapes each run once as it renders it.
// - A listed word has 1 to 15 characters, so a kept run fits the narrowest card column; a list
//   with a longer or an empty word is refused.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { titleRuns, titleSplitter } from "../../src/lib/thai-title.ts";

const kept = (text: string) => ({ text, keep: true });
const plain = (text: string) => ({ text, keep: false });

describe("titleRuns", () => {
	it("keeps the longest listed word over a shorter one it contains", () => {
		assert.deepEqual(titleRuns("วัดความดันโลหิตสูงฟรี"), [
			plain("วัด"),
			kept("ความดันโลหิตสูง"),
			plain("ฟรี"),
		]);
		assert.deepEqual(titleRuns("ตรวจคัดกรองมะเร็ง"), [kept("ตรวจคัดกรอง"), plain("มะเร็ง")]);
		assert.deepEqual(titleRuns("ผลการคัดกรอง"), [plain("ผลการ"), kept("คัดกรอง")]);
	});

	it("keeps every occurrence, and two listed words side by side as two runs", () => {
		assert.deepEqual(titleRuns("เบาหวาน รู้ทันเบาหวาน"), [
			kept("เบาหวาน"),
			plain(" รู้ทัน"),
			kept("เบาหวาน"),
		]);
		assert.deepEqual(titleRuns("สำนักงานสาธารณสุขอำเภอสอง"), [
			plain("สำนักงาน"),
			kept("สาธารณสุข"),
			kept("อำเภอสอง"),
		]);
	});

	it("leaves a title with no listed word as one plain run, and an empty title with none", () => {
		assert.deepEqual(titleRuns("ประชุมคณะกรรมการบริหาร"), [plain("ประชุมคณะกรรมการบริหาร")]);
		assert.deepEqual(titleRuns(""), []);
	});

	it("keeps a listed word among Thai, Latin and digits", () => {
		assert.deepEqual(titleRuns("ประชุม COVID-19 ครั้งที่ 7/2569"), [
			plain("ประชุม COVID-19 "),
			kept("ครั้งที่"),
			plain(" 7/2569"),
		]);
	});

	it("keeps characters that need escaping as they are, for the page to escape once", () => {
		assert.deepEqual(titleRuns(`<b>เบาหวาน</b> & "ไต" 'วาย'`), [
			plain("<b>"),
			kept("เบาหวาน"),
			plain(`</b> & "ไต" 'วาย'`),
		]);
	});
});

describe("titleSplitter", () => {
	it("splits by the words it is given", () => {
		assert.deepEqual(titleSplitter(["ฝนตก"])("วันนี้ฝนตกหนัก"), [
			plain("วันนี้"),
			kept("ฝนตก"),
			plain("หนัก"),
		]);
	});

	it("keeps the longest word whatever the list's order", () => {
		assert.deepEqual(titleSplitter(["ความดันโลหิต", "ความดันโลหิตสูง"])("วัดความดันโลหิตสูง"), [
			plain("วัด"),
			kept("ความดันโลหิตสูง"),
		]);
	});

	it("refuses a listed word longer than 15 characters, and an empty one", () => {
		assert.doesNotThrow(() => titleSplitter(["ความดันโลหิตสูง"]));
		assert.throws(() => titleSplitter(["ความดันโลหิตสูงมาก"]), /ความดันโลหิตสูงมาก.*18/);
		assert.throws(() => titleSplitter([""]), RangeError);
	});
});
