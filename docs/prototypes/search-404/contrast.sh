#!/usr/bin/env bash
# PROTOTYPE (throwaway), Feature 015: --all-text contrast of each variant at the five widths;
# PAGES="<case>:<variant> ..." narrows it. .tmp/prototypes/search-404/contrast.sh
#   →  contrast/<case>-<variant>.txt
set -u
cd "$(git rev-parse --show-toplevel)"
P=$PWD/.tmp/prototypes/search-404
mkdir -p "$P/contrast"
for page in ${PAGES:-search-start:A search-start:B search-found:A search-found:B search-nothing:A \
	search-nothing:B notfound:A notfound:B}; do
	name=${page%%:*}
	variant=${page##*:}
	PLAYWRIGHT_BASE_URL=file://$P/ node scripts/measure-text-contrast.ts --all-text --fold \
		"$name.html?variant=$variant&nobar" "main [data-variant=$variant]" \
		> "$P/contrast/$name-$variant.txt" 2>&1
	echo "$name-$variant: $?"
done
