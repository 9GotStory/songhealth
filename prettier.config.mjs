// Prettier for Songhealth. `npm run format` rewrites files; CI runs
// `npm run format:check`. Tabs at 100 columns match the Feature 002 and 003
// code. What is left unformatted is listed in .prettierignore.
//
// No Tailwind class sorting: prettier-plugin-tailwindcss 0.8.1 reads the
// pre-1.0 Astro syntax tree, and prettier-plugin-astro 1.1.1 emits a JSX-style
// tree, so the sorter skips .astro files, where the classes live.

/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	printWidth: 100,
	plugins: ["prettier-plugin-astro"],
	overrides: [
		{ files: "*.astro", options: { parser: "astro" } },
		// Feature 001 files use two-space indents and already match Prettier in that style.
		{
			files: [
				"astro.config.mjs",
				"playwright.config.ts",
				"deploy/dev-quadlet/astro.dev.config.mjs",
				"src/live.config.ts",
			],
			options: { useTabs: false, tabWidth: 2 },
		},
	],
};
