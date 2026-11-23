#!/usr/bin/env bash
# PROTOTYPE (throwaway), Feature 014 (#412): --all-text contrast of the tile and card cases in each
# variant at the five widths; PAGES="<case>:<variant> ..." narrows it.
# .tmp/prototypes/light-tile-cards/contrast.sh  →  contrast/<case>-<variant>.txt
set -u
cd "$(git rev-parse --show-toplevel)"
P=$PWD/.tmp/prototypes/light-tile-cards
mkdir -p "$P/contrast"
for page in ${PAGES:-documents:A documents:B documents:C ita-year:A ita-year:B ita-year:C \
	health-reports:A health-reports:B health-reports:C announcements:A announcements:B \
	announcements:C announcements:A2 home:A home:B home:C health:S about:S}; do
	name=${page%%:*}
	variant=${page##*:}
	PLAYWRIGHT_BASE_URL=file://$P/ node scripts/measure-text-contrast.ts --all-text --fold \
		"$name.html?variant=$variant&nobar" "main [data-variant=$variant]" \
		> "$P/contrast/$name-$variant.txt" 2>&1
	echo "$name-$variant: $?"
done
