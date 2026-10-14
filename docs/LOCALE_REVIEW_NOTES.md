# Localization QA notes

Canonical locale dictionaries are in `src/i18n/*.json`. Always use `ui.*` keys in new Vue components and generated HTML. Do not translate already translated DOM text; use stable semantic keys and re-render from project state on locale changes.

Before declaring a language complete:
1. Translate every English-identical nontechnical entry in `docs/LOCALIZATION_AUDIT.md`.
2. Check all Ribbon tabs, overview panel, furniture library, tooltips, dialogs, admin view, User Guide and Guided Tour.
3. Verify switching English → Simplified Chinese → Traditional Chinese → English without inconsistent labels.
4. Confirm localized terms and simplified/traditional glyph usage with fluent reviewers.
5. Run `npm run test:i18n`, `npm run test:architecture`, `npm run build` and browser screenshot regression tests.

Note that English-identical values may be valid for technical names, and untranslated values may differ due to script or terminology. The audit is a triage tool, not a translation certification.
