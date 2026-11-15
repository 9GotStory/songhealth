// PROTOTYPE helper: a saved runtime page's <main>, without dev-only attributes and with SVG bodies elided.
import { readFileSync } from "node:fs";
const s = readFileSync(process.argv[2], "utf8");
let m = s.match(/<main[\s\S]*?<\/main>/)[0]
	.replace(/ data-astro-[a-z-]+="[^"]*"/g, "")
	.replace(/ srcset="[^"]*"/g, "").replace(/ src="\/_image[^"]*"/g, " src=\"IMG\"").replace(/(<svg[^>]*>)[\s\S]*?<\/svg>/g, (_, o) => o.replace(/ (xmlns|stroke-[a-z]+|fill|viewBox|stroke)="[^"]*"/g, "") + "…</svg>");
console.log(m);
