# Translation architecture

## Canonical IDs only

All `src/i18n/*.json` language catalogs use the **same semantic keys** such as `ui.home`, `ui.furniture.properties`, and `ui.two.d.plan`. The only translations inside those files are the values. English is the canonical fallback.

- `index.js`: locale state, `setLocale`, `t(id)`, English fallback.
- `legacy-aliases.json`: temporary mapping of older English, Simplified Chinese, and Traditional Chinese source labels to canonical IDs. This file **is not** a language catalog.
- `dom.js`: transitional support for older DOM/SVG text. New Vue text must call `$t('ui.key')` and newly created JS UI must call `t('ui.key')`.
- `scripts/check-i18n.mjs`: checks all 20 catalogs share identical canonical IDs and contain no empty values.

Run `npm run test:i18n` after each translation edit. `sameAsEnglish` is an **audit metric**, not proof the translation is incorrect (brands and abbreviations can be identical). A nonzero figure means localized copy needs editorial review.

### Migration note

Existing editor drawing and data sources still have literal Simplified/Traditional Chinese strings. `legacy-aliases.json` allows old components to continue working, but removing this compatibility layer requires systematically replacing those legacy literal callsites with semantic IDs. It is incorrect to claim that running the key consistency checker alone proves all UI is translated.
