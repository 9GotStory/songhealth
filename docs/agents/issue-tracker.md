# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: a ticket whole, `gh issue view <n> --json title,state,labels,body,comments`; a spec through the [bounded read recipe](#bounded-issue-and-evidence-reads), expanding the needed body/comment from its saved response.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Record a security finding** at class level, since this repository is public: the problem, what it reaches and the fix. The requests and the full results stay outside the repository, in a folder under `~/.local/state/songhealth-qdev/`, and the issue names that folder (#183).
- **Record a Product Owner decision** on the issue it decides, as a comment, when it is made: what was decided, the PO's words quoted, and the date. When the Product Owner picks an offered option, quote its label and its description: the description is the scope they agreed to. The change does that scope, and anything more is a new pending confirmation (#128 retro: the comment listed a step the chosen option did not name, so the review, which checks the change against the comment, could not catch it). A fresh session's `/implement` and `/code-review`'s Spec reviewer read it there with the issue; the PR body repeats it.
- **Link a decision that moves work** to another issue: the receiving issue cites the decision's comment (`#<n> comment <id>`), so code and PRs can cite it without a search.
- **List pending confirmations** (choices a ticket made that the Product Owner has not yet decided) as one checklist comment on its issue, so a later session finds them with the ticket, and ask the Product Owner after `/code-review`'s fixes and before the final evidence run: an answer can change the page, and the code cites the decision's comment. A `/code-review` finding left unfixed is one when it breaks a documented standard, departs from the spec or the ticket (CODING_STANDARDS "Public pages"), or changes what people see (#176 retro: a finding on a spec's test line reached the Product Owner only after the evidence round). A baseline smell left as it is, a judgement call on the code's shape, is not one: the pull request's "Review (self-review)" lists it with its reason (#149 retro: fixing every smell to spare a question doubled the follow-up review, and one smell still reached the Product Owner as a question about where a function lives). Each item names its options, what each one costs and gives, and the recommended one with its reason, weighed against the screenshots, so the Product Owner can decide in one reply (#63 retro: the reasoned pass changed three of six recommendations). Ask in the session with the same options, costs and reasons, in the Product Owner's language: they decide from the chat, and the comment is the record (#64 retro: a one-line-per-item ask in the chat cost a round trip). When a recommendation departs from a document the Product Owner wrote or accepted, such as `docs/design/DESIGN.md`, say what that document's rule rests on and how each option relates to the Product Owner's own sources, such as a decision, the prototype they picked from, or the Figma frame that `docs/design/homepage-concept-v1.md` describes (#105 retro: the icon-size ask left out that the draft's slots were not the frame's, and the Product Owner asked again). Record the answer as a decision, as above, then make the change that cites it, then run the evidence once at the final head. The PR body repeats both. Choices that follow an accepted page's precedent are not pending: the PR body lists them under "Built on precedent" (CODING_STANDARDS "Public pages").
- **Publish a spec written from a prototype** (`/to-spec`) once three things hold, each checked and not recalled (#241 retro: three such gaps reached the Product Owner after the review, and one answer cost a second evidence run). Each layout sentence matches the prototype at the breakpoint it names, read again after any breakpoint moved: #239 said "under it below `lg`" where the prototype put the card beside the headline from 640 px. Each rule the spec states for every section, card or page ("each section opens with…") is read against each one the prototype shows, and the spec names the ones that differ: #239's "Section headings" gave every section an icon tile where the prototype's Leadership strip has a compact heading, and its "Leadership strip" left out the first person's coloured assignment, so both reached the Product Owner after #243's review (#243 retro). Each icon, colour and type size the spec takes from the prototype either follows CODING_STANDARDS "Public pages" and the tokens or is listed as a pending confirmation: #239's "an arrow" met the `chevron-right` rule, and its 52 px headline was outside its own token list. A capability the spec gives the site for the first time (a client script, a new kind of token, a page that answers another way) is searched for in the rules and tests that state its absence, `grep -rn` over `CODING_STANDARDS.md`, `docs/design/DESIGN.md` and `tests/`, and the spec names each one its tickets change: #239's "one small inline script" met "Pages work without client JavaScript" in three documents and `public-shell.spec.ts` "the shell adds no client JavaScript", which failed in #246's full suite after its review (#246 retro).
- **Publish a ticket that builds a shared piece** (`/to-tickets`), such as a heading the next tickets reuse, with the sections that show it first and the text that changes there, so its tests have a page to read and the scope is the Product Owner's (#241 retro: the ticket named neither, and the choice reached the Product Owner as a pending confirmation).
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close** an issue on the Product Owner's ask, once its ticket's `/retro` is done (Product Owner, 2026-10-31): `gh issue close <number> --comment "..."`
- **Branches**: a ticket's work goes on `feat/<feature>-<ticket>-<slug>` and its retro on `chore/<feature>-retro-<ticket>`, such as `feat/006-145-thai-keep-together` and `chore/006-retro-145`. Each starts from the feature's integration branch, which its pull request targets: `005-wordpress-migration` for Feature 005, `008-homepage-redesign` for Feature 008. An integration branch is named `<feature number>-<name>`, the pattern CI's push trigger matches (`.github/workflows/checks.yml`). A feature's first ticket creates it from `main` and pushes it (`git push origin main:refs/heads/<feature number>-<name>`), and that ticket's first commit names it here, as #175 did. A standalone ticket, part of no feature, goes on `feat/<ticket>-<slug>` and its retro on `chore/retro-<ticket>`, both from `main`, which their pull requests target, as #164 and #169 did; its pull request body opens with `Builds #<ticket>:`.
- **Release**: a feature reaches `main` once the Product Owner accepts it on its spec issue. `release/<feature>-to-main` starts from the integration branch and adds the feature's README line, which cites the acceptance comment. Its pull request into `main` merges with `--match-head-commit`. Then the runtime is promoted to the merge, the model-update step runs, verify reports PASS and residue NONE, and the integration branch is deleted (Feature 003: #114).

The repository is `9GotStory/songhealth`; `gh` infers it automatically when run inside this clone.

## Pull request bodies

A ticket's pull request fills `/pr`'s template (Summary, Evidence, Merge Danger) in this order, as PRs #131–#139 do. Leave out a section with nothing to say.

1. `Builds #<spec> (Feature N, <name>) and #<ticket> ([F00N-NN]).`, then one sentence on what the change gives its user.
2. `## Summary`: the smallest view that shows the change (a tree, a diff sketch, pseudocode), then:
   - `### Decisions`: a table of each decision and its source (`PO, #<n> comment <id>`, or a spec section).
   - `### Built on precedent`: each choice that follows an accepted page or ticket, with that precedent.
   - `### Beyond the ticket`: what the change does that its ticket did not list, and why.
   - `### Review (self-review)`: the `/code-review` findings per axis and the commits that fix them, each finding left as it is with the decision that keeps it, and each later commit that was not reviewed again.
   - `### Version-specific facts`: each version-specific conclusion a decision rests on, with its version and source path (CLAUDE.md "Current documentation").
   - `### For the next tickets`: what a later ticket of the feature must build or check differently because of this one, with a link to its note on that ticket's issue. A ticket this change leaves alone gets no note, and a process lesson goes in the document it changes (#194 retro, comment 6741439448). `/pr` posts the notes before it opens the pull request, citing the ticket rather than the pull request, so the section links only notes that are there (#147 retro). While `scripts/migration.ts` exists, `/pr` first runs its `leak-check <export> <file>...` on the pull request's body and each note, which the pre-commit hook cannot see (#180 retro). The export is the newest `~/.local/state/songhealth-migration/WordPress.*.xml`, the one that hook reads (#196 retro). `/to-spec` runs the same check on a spec that gives a page new interface text, before it publishes the spec: the text reaches a commit later, where the hook stops it. A public institution's name that an export text equals joins `PUBLIC_NAMES` in `scripts/migration/leak-check.ts` on the Product Owner's word (#240 retro, comment 6787006436).
3. `## Evidence`: **Before**, the first failure of the red run, verbatim; **After**, the same check passing at the final head, with the commit `dev-runtime-verify.sh` reported. Then the screenshots, as a table of `https://github.com/9GotStory/songhealth/blob/<evidence commit>/<file>?raw=true` images from `scripts/evidence-branch.sh`, which prints one row for each `before-<name>.png` with its `after-<name>.png`; each seam's cases as pseudocode; and the result of every check at the final head.
4. `## Merge Danger`: the door, then the blast radius, ending with what reaches production.

**Evidence log.** From the red run on, `/implement` appends each run the Evidence will cite to `evidence-<ticket>.md` in the session's scratchpad: the command, the commit, and the output's decisive lines (the first failure, the pass and skip counts, the verify and residue lines, a script's own report, the exit status of a check that prints nothing decisive). It appends each `/code-review` report as it arrives, for `### Review (self-review)`. `/pr` writes these sections from that file, which outlives a context compaction (#126 retro: `/pr` searched a 6 MB transcript four times for the red run and the `add` output; #180 retro: a 7.5 MB one for the review reports).

**Reading evidence (#192/#193 retros).** For a spec, logs and tracker readback,
follow the [bounded read recipe](#bounded-issue-and-evidence-reads). For a Homepage timeout,
[README's diagnostic run](../../README.md#homepage-diagnostics) records named phases and native
JSON/trace artifacts without changing the normal suite's settings.

## Bounded issue and evidence reads

For a spec read or evidence handoff, project before printing (#193 retro, Product Owner
comment 6722771184; a ticket is read whole, #194 retro, comment 6741439448). Fetch once into a new scratch directory, then consume that completed file in
the same sequential command. A failed fetch exits before the read. This keeps full bodies out of
the initial tool result and preserves the response for a selected excerpt:

```bash
(
  set -e
  mkdir -p .tmp
  issue_read_dir=$(mktemp -d .tmp/issue-read.XXXXXX)
  printf 'Raw issue: %s/issue.json\n' "$issue_read_dir"
  gh issue view 193 --json number,title,state,url,labels,body,comments > "$issue_read_dir/issue.json"
  node --input-type=module - "$issue_read_dir/issue.json" <<'NODE'
import { readFileSync } from "node:fs";
const issue = JSON.parse(readFileSync(process.argv[2], "utf8"));
console.log(JSON.stringify({
  number: issue.number, title: issue.title, state: issue.state, url: issue.url,
  labels: issue.labels.map(({ name }) => name),
  bodyCharacters: issue.body.length, commentCount: issue.comments.length,
  latestComments: issue.comments.slice(-5).map(({ url, body }) => ({
    url, characters: body.length,
  })),
}, null, 2));
NODE
)
```

Replace `193` with the intended issue. Read the full required spec before implementation, using
bounded excerpts from the saved body and the relevant decision comments. Print a selected range
(such as 2,000 characters), its full length and whether more remains; continue until the required
content is accounted for. The five-comment list is a preview, not a completeness check for older
decisions. With a connector response, project its structured fields before returning them; retain
raw HTML/other response fields only in scratch or the tool store.

Parallelize independent fetches. A file consumer, JSON parser, comment readback or PR-body builder
runs after its writer has completed successfully; issue creation/comment publication returns its
receipt before targeted readback begins. Print receipt/body-match metadata on success and a bounded
mismatch excerpt on failure. An empty or partial file is a failed read, not evidence to proceed.

For logs, begin with the evidence index and decisive lines, then read the relevant bounded range.
Size the combined output of a batch, rather than allowing each child read a full output budget.
Read minified source as a bounded snippet around the match. Use the saved response for follow-up
reads so repeated context loads do not repeat the
fetch or dump whole documents.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

`/wayfinder`'s: [wayfinding-and-pr-triage.md](wayfinding-and-pr-triage.md#wayfinding-operations).

## Pull requests as a triage surface

`/triage`'s flag and commands: [wayfinding-and-pr-triage.md](wayfinding-and-pr-triage.md#pull-requests-as-a-triage-surface).
