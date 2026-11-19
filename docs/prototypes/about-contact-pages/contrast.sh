#!/usr/bin/env bash
# PROTOTYPE (throwaway), Feature 012: --all-text contrast of the picked variants' pages
# (Product Owner, 2026-11-19: /about A, Leadership C, Personnel A, /contact A).
set -u
cd "$(git rev-parse --show-toplevel)"
P=$PWD/.tmp/prototypes/about-contact-pages
mkdir -p "$P/contrast"
for page in "about-demo.html?variant=A&nobar" "about-no-page.html?variant=A&nobar" \
	"leadership-demo.html?variant=C&nobar" "leadership-one.html?variant=C&nobar" \
	"leadership-six.html?variant=C&nobar" "leadership-empty.html?variant=C&nobar" \
	"personnel-demo.html?variant=A&nobar" "personnel-full.html?variant=A&nobar" \
	"plans-demo.html?nobar" "plans-full.html?nobar" "results-empty.html?nobar" \
	"contact-full.html?variant=A&nobar" "contact-empty.html?variant=A&nobar" \
	"organization.html?nobar" "page-privacy.html?nobar" "page-with-documents.html?nobar" \
	"page-title-only.html?nobar"; do
	name=${page%%.html*}
	PLAYWRIGHT_BASE_URL=file://$P/ node scripts/measure-text-contrast.ts --all-text --fold "$page" main \
		> "$P/contrast/$name.txt" 2>&1
	echo "$name: $?"
done
