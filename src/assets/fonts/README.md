# Noto Sans Thai (self-hosted)

The public site's typeface (Feature 003 #52; ADR 0001). The site serves these files from its
own origin through Astro's Fonts API (`fonts` in `astro.config.mjs`), with `font-display: swap`.
No font request ever leaves the site.

## Licence

SIL Open Font License 1.1, in [`OFL.txt`](OFL.txt).
Copyright 2022 The Noto Project Authors (https://github.com/notofonts/thai). Each file also
carries the licence and copyright in its `name` table.

## Source

- Upstream: Google Fonts' build of Noto Sans Thai v2.002, which covers Thai and Latin
  (`notofonts/thai` release `NotoSansThai-v2.002`).
- File: `ofl/notosansthai/NotoSansThai[wdth,wght].ttf` and `ofl/notosansthai/OFL.txt` in
  `google/fonts` at commit `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`.
- Git blob SHAs as published: `34b48ab6f74867dbfce19410a2f452abef34e3ff` (font) and
  `7fa8dcb08ce4d2667b683ac4a8e79166e44e5277` (licence).

## How the files were made

Static instances of the variable font at normal width, compressed to WOFF2 with fontTools 4.68.0
(brotli 1.2.1):

```sh
fonttools varLib.instancer --update-name-table -o NotoSansThai-Regular.ttf \
  'NotoSansThai[wdth,wght].ttf' wght=400 wdth=100
fonttools ttLib.woff2 compress -o NotoSansThai-Regular.woff2 NotoSansThai-Regular.ttf
# likewise wght=500 Medium, 600 SemiBold, 700 Bold
```

| File | Weight | SHA-256 |
|---|---|---|
| `NotoSansThai-Regular.woff2` | 400 | `32d1469bb97e5fb5ee8cac6f5ad1e7b888a2d385ac6c167d446430721eddf640` |
| `NotoSansThai-Medium.woff2` | 500 | `1ff3dc041d0b40e010ee1dfdd8ea5be57da2682d175881f6054d59c3a2f1458b` |
| `NotoSansThai-SemiBold.woff2` | 600 | `29fcff1948ae93f0d5a1dca99308d79d81bd886d60a8134676399a62722b3b8d` |
| `NotoSansThai-Bold.woff2` | 700 | `dedbda7145fe35e5b166bc667228d2af111b8ef282d2ee7a3a6b54e37e75d49b` |
