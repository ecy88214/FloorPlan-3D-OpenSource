# Translation status / 翻譯狀態

This release ships 20 locale catalogs. English is the default.

**Important:** The core navigation and frequently used controls have localized catalog entries. Many specialized messages, help walkthroughs, legacy SVG labels and dynamically generated reports still fall back to English, and some untranslated source data may appear in Chinese. This is **not** certified as fully translated into all 20 languages.

The fallback mechanism is: localized text → English dictionary → source string. If a Chinese source string lacks an English entry, it may still appear in Chinese. Please contribute verified translations, particularly for Arabic/Persian RTL UI and technical architectural terminology.

The English catalog contains additional translations for the Ribbon, the design studio, construction and furniture terminology. See `src/i18n/` and `src/i18n/dom.js`.
