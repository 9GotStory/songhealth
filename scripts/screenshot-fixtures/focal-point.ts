// Screenshot content for the crop around a picture's focal point (#298): an Activity with four
// photos, a Health Content and a Leadership. Every picture is tall, 600 × 1800, with an
// accent-warm disc, a quarter of its width across, on the focal point its field's value carries.
// The focal point is a quarter of the way across and three quarters of the way down. In a box no
// taller than a square, the widest being 16:9, the picture's middle and its top both leave that
// disc out, so the disc shows only when the crop keeps the focal point in view. The Activity's own
// picture has it a quarter of the way down, which the picture's middle leaves out too, because the
// Homepage's tile lays its gradient over the picture's lower part. Captures a close-up of each of
// the six cropped pictures at 1440 and 375 px: the Activity's card on /activities, its photos on
// its page and its tile on the Homepage, the Health Content's card and the Leadership's portrait
// on the Homepage, and the Leadership's card on /about/leadership.

import type { Fixtures } from "../capture-with-fixtures.ts";

/** A picture's focal point, and where its disc lies. */
const LOW = { focalX: 0.25, focalY: 0.75 };
const HIGH = { focalX: 0.25, focalY: 0.25 };

/**
 * A picture tall enough that a square's crop around its middle leaves both discs out, and its top
 * the low one.
 */
const TALL = { width: 600, height: 1800 };

/** The colours the photos blend, the site's own tokens. */
const COLOURS = ["#0b6b57", "#123c33", "#bae0cf", "#d1ebde"];

const WIDTHS = [1440, 375];

const fixtures: Fixtures = async ({ admin, helpers, picture }) => {
	const focused = async (alt: string, from: string, to: string, point = LOW) => ({
		id: await picture(alt, from, to, TALL, { x: point.focalX, y: point.focalY, colour: "#f3c95f" }),
		...point,
	});
	const publish = async (collection: string, data: Record<string, unknown>) => {
		const slug = helpers.syntheticSlug("shot");
		const entry = await helpers.createSyntheticEntry(admin, collection, { slug, data });
		if (!entry.result.ok)
			throw new Error(`${collection}: ${helpers.nativeRefusalOf(entry.result)}`);
		const published = await helpers.publishEntry(admin, collection, entry.entryId!);
		if (!published.ok) throw new Error(`publish: ${helpers.nativeRefusalOf(published)}`);
		return slug;
	};

	const activity = "[ตัวอย่าง] รณรงค์ตรวจคัดกรองสุขภาพเชิงรุกในชุมชน";
	const gallery = [];
	for (const [index, from] of COLOURS.entries()) {
		const caption = `ภาพกิจกรรมที่ ${index + 1}`;
		gallery.push({
			image: await focused(caption, from, COLOURS[(index + 2) % COLOURS.length]!),
			caption,
		});
	}
	const activitySlug = await publish("activities", {
		title: activity,
		summary: "เจ้าหน้าที่และ อสม. ออกตรวจคัดกรองเบาหวานและความดันโลหิตสูงในหมู่บ้าน",
		activity_at: new Date().toISOString(),
		featured_image: await focused(`ภาพ ${activity}`, "#0b6b57", "#bae0cf", HIGH),
		gallery,
	});

	const health = "[ตัวอย่าง] ดูแลสุขภาพช่วงอากาศเปลี่ยน";
	await publish("health_content", {
		title: health,
		summary: "ดื่มน้ำให้เพียงพอ พักผ่อน และสวมหน้ากากเมื่อมีอาการไอหรือจาม",
		featured_image: await focused(`ภาพ ${health}`, "#123c33", "#d1ebde"),
	});

	const person = "[ตัวอย่าง] ธนพล รักษ์ดี";
	await publish("personnel", {
		title: person,
		current_assignment: "ผู้ช่วยสาธารณสุขอำเภอสอง",
		public_visible: true,
		leadership_order: 3,
		profile_image: await focused(`ภาพ ${person}`, "#bae0cf", "#0b6b57"),
	});

	/** The first `element` whose text holds `title`, which a title's kept runs split into spans. */
	const titled = (element: string, title: string) => `${element}:has-text("${title}")`;
	return WIDTHS.flatMap((width) => [
		{
			name: `focal-activity-card-${width}`,
			path: `/activities@${width}>${titled("article", activity)}`,
		},
		{
			name: `focal-activity-photos-${width}`,
			path: `/activities/${activitySlug}@${width}>#activity-photos`,
		},
		{
			name: `focal-home-activity-tile-${width}`,
			path: `/@${width}>${titled("article", activity)}`,
		},
		{ name: `focal-home-health-card-${width}`, path: `/@${width}>${titled("article", health)}` },
		{ name: `focal-home-leadership-${width}`, path: `/@${width}>${titled("li", person)}` },
		{
			name: `focal-person-card-${width}`,
			path: `/about/leadership@${width}>${titled("article", person)}`,
		},
	]);
};

export default fixtures;
