// Public-browser harness regression from #191's retro: an axe call needs a
// JavaScript-enabled test context; no-script navigation is checked separately.
import { expect, expectNoAxeViolations, test } from "./public.helpers";

test.describe("without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("axe reports its JavaScript prerequisite before attempting an audit", async ({ page }) => {
		test.setTimeout(5_000);
		await page.goto("/");
		await expect(expectNoAxeViolations(page, "no-script Homepage")).rejects.toThrow(
			"axe requires a JavaScript-enabled context",
		);
	});
});

test("a JavaScript-enabled audit still reports a real accessibility violation", async ({
	page,
}) => {
	await page.goto("/");
	await page.evaluate(() => {
		const image = document.createElement("img");
		document.querySelector("main")!.append(image);
	});
	await expect(expectNoAxeViolations(page, "Homepage image without alt text")).rejects.toThrow(
		"image-alt",
	);
});
