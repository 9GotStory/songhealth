// Reads a posted issue comment back and says whether its body is the file it was posted from
// (#421 retro item 3; scripts/comment-readback/plan.ts), after `gh issue comment <n> --body-file
// <file>` (docs/agents/issue-tracker.md "Comment on an issue"):
//
//   node scripts/comment-readback.ts <comment id> <file>
//
// Prints the comment's address, then "matches" or the first line that differs; exits 1 when it
// differs. Run inside the clone, where `gh` infers the repository. Read-only.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { compareBodies } from "./comment-readback/plan.ts";

const [id, file] = process.argv.slice(2);
if (id === undefined || file === undefined || !/^\d+$/.test(id)) {
	console.error("usage: node scripts/comment-readback.ts <comment id> <file>");
	process.exit(2);
}

const comment = JSON.parse(
	execFileSync("gh", ["api", `repos/{owner}/{repo}/issues/comments/${id}`], { encoding: "utf8" }),
) as { html_url: string; body: string };
const result = compareBodies(comment.body, readFileSync(file, "utf8"));
console.log(comment.html_url);
console.log(result);
if (result !== "matches") process.exit(1);
