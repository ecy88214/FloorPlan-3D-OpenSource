# Guided help localization status

- All help dialogs, guided-tour controls, step titles/descriptions, section headings, and help paragraphs now resolve through canonical `ui.guide.*` keys.
- English, Traditional Chinese, and Simplified Chinese have separate content. Simplified content was mechanically converted from Traditional Chinese and needs native-speaker review.
- The other 17 locales have native translations for primary tour controls where supplied; guide prose currently falls back to English until reviewed translations are added.
- The i18n key consistency test verifies dictionary shape but does not prove translation quality or complete coverage.
