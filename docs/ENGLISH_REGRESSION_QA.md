# English UI regression review

The old editor's `tr(Chinese, English)` API previously returned the Chinese original if the English phrase was not present in the canonical/legacy key mapping. This was a regression visible in the keyboard shortcuts panel after re-rendering.

The editor brand title and large HTML keyboard help section now use stable semantic translation keys. Ribbon help buttons also use `$t` and therefore follow reactive Vue locale state.

## Manual verification
1. Load `/` with English selected, and inspect the project title, User Guide / Tutorial Settings, right-side Keyboard Shortcuts, and footer instructions.
2. Switch English → Simplified Chinese → Traditional Chinese → English and check those labels again.
3. Check bedroom changes and reopening the right-side overview, since the panel is rebuilt dynamically.
4. Check mobile touch controls and translated tooltips separately.

## Remaining limitations
All locales have the same key structure, but many translations outside English, Simplified Chinese, and Traditional Chinese are still English fallbacks. Key equality checks alone do not establish translation quality.
