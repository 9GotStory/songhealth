// Native EmDash live-collection registration (Feature 001, T004).
//
// Connects EmDash to Astro's live content system through the native `_emdash`
// live-collection loader. This is the platform's single live-collection
// registration point; Feature 001 adds no Product collections.

import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
