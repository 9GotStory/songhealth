// Screenshot content for the Contact page (#62): a full Office Contact, with coordinates for the
// "เปิดแผนที่" link and a LINE address, and the Facebook and YouTube handles, so /contact and the
// footer show every official channel line. The run restores the earlier settings.

import type { Fixtures } from "../capture-with-fixtures.ts";

const fixtures: Fixtures = async ({ officeContact }) => {
	await officeContact(
		{
			address: "[ตัวอย่าง] 99 หมู่ 1 ตำบลบ้านกลาง\nอำเภอสอง จังหวัดแพร่ 54120",
			telephone: "054 591 234",
			email: "contact@example.invalid",
			opening_hours: "จันทร์–ศุกร์ 08:30–16:30 น.\nเว้นวันหยุดราชการ",
			latitude: 18.4686,
			longitude: 100.1834,
			line_url: "https://lin.ee/example",
		},
		{ facebook: "example.songhealth", youtube: "@example-songhealth" },
	);
	return ["/contact"];
};

export default fixtures;
