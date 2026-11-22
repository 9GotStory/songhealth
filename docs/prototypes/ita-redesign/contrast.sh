#!/usr/bin/env bash
# PROTOTYPE (throwaway), Feature 013: --all-text contrast of every case in each variant, at the
# five widths; PAGES="<case>:<variant> ..." narrows it. The Product Owner picked /ita A, the
# year's page A and the MOIT page's E (2026-11-22).
# .tmp/prototypes/ita-redesign/contrast.sh  →  contrast/<case>-<variant>.txt
set -u
cd "$(git rev-parse --show-toplevel)"
P=$PWD/.tmp/prototypes/ita-redesign
mkdir -p "$P/contrast"
for page in ${PAGES:-ita-demo:A ita-demo:B ita-three:A ita-three:B ita-empty:A \
	year-demo:A year-demo:B year-one:A year-full:A year-full:B \
	moit-demo-1:A moit-demo-1:B moit-demo-1:C moit-demo-1:D moit-demo-2:A moit-demo-2:B \
	moit-lead-only:A moit-lead-only:B moit-long-title:B moit-long-title:D \
	moit-demo-1:E moit-demo-2:E moit-lead-only:E moit-long-title:E}; do
	name=${page%%:*}
	variant=${page##*:}
	PLAYWRIGHT_BASE_URL=file://$P/ node scripts/measure-text-contrast.ts --all-text --fold \
		"$name.html?variant=$variant&nobar" "main [data-variant=$variant]" \
		> "$P/contrast/$name-$variant.txt" 2>&1
	echo "$name-$variant: $?"
done
