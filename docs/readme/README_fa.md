[English](README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · **فارسی** · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md)

# FloorPlan 3D — ویرایشگر نقشه دوبعدی و سه‌بعدی

> طراحی خانه در مرورگر با Vue 3 و SVG و Three.js.

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## پروژه اصلی و ذکر منبع

[wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)

## تصاویر نمایشی

### نقشه دوبعدی

![نقشه دوبعدی](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/2d_view.png)

### نمای سه‌بعدی

![نمای سه‌بعدی](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/3d_view.png)

### حالت قدم‌زدن

![حالت قدم‌زدن](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/walk_mode.png)

## امکانات

- Run the editor without signing in. Select one-to-four-bedroom layouts or a blank plan; draw and edit walls, position doors and windows, and arrange furniture.
- Switch between 2D plans and 3D scenes, adjust materials and lighting, compare design versions, and export plans and estimates locally.
- The interface has a 20-language selector. Core labels are translated; remaining advanced controls fall back to English or legacy copy while translations are completed.

## شروع سریع

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/` for the public editor. Run `npm run build` to generate `dist/`.

## پیکربندی و استقرار






## ساختار پروژه

```text
src/editor/       SVG floor plan and command/history engine
src/scenes/       Three.js renderer
src/layouts/      One to four bedroom presets and empty plan
src/services/     Versions, estimates, project storage
src/i18n/         20 locale dictionaries and selection state
tests/            Node tests
```

## امنیت و داده‌ها


## مشارکت

Contributions and translation fixes are welcome. Run `npm run test:architecture` and `npm run build` before opening a pull request. Translation coverage varies: advanced dialogs and dynamic editor content may still display English or legacy wording.

## حمایت از پروژه

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## License / 授權

MIT License. See [LICENSE](../../LICENSE). Third-party assets may carry separate licenses.




### Standalone edition

This edition runs entirely in the browser with no login, remote database, or Cloudflare Worker. Export features are available locally. Local project and imported-model persistence depend on browser storage.
