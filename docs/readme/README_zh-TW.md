[English](README.md) · [简体中文](README_zh.md) · **繁體中文** · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md)

# FloorPlan 3D — 2D／3D 開源室內設計工具

> 以 Vue 3、SVG 及 Three.js 製作的瀏覽器住宅平面編輯器。

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## 原始專案與致謝

[wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)

## 展示截圖

### 2D 平面圖

![2D 平面圖](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/2d_view.png)

### 3D 視圖

![3D 視圖](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/3d_view.png)

### 漫遊模式

![漫遊模式](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/walk_mode.png)

## 主要功能

- 免登入即可操作編輯器。可選一至四房或空白房型，繪製牆體、配置門窗及家具。
- 切換 2D 平面與 3D 場景、調整材質燈光、比較設計版本；管理員允許時可匯出方案與估價。
- 介面提供 20 種語系；核心標籤已翻譯，部分進階操作仍回退英文或舊文案。

## 快速開始

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/` for the public editor. Run `npm run build` to generate `dist/`.

## 設定與部署






## 專案結構

```text
src/editor/       SVG floor plan and command/history engine
src/scenes/       Three.js renderer
src/layouts/      One to four bedroom presets and empty plan
src/services/     Versions, estimates, project storage
src/i18n/         20 locale dictionaries and selection state
tests/            Node tests
```

## 安全與資料


## 參與貢獻

Contributions and translation fixes are welcome. Run `npm run test:architecture` and `npm run build` before opening a pull request. Translation coverage varies: advanced dialogs and dynamic editor content may still display English or legacy wording.

## 支持專案

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## License / 授權

MIT License. See [LICENSE](../../LICENSE). Third-party assets may carry separate licenses.




### Standalone edition

This edition runs entirely in the browser with no login, remote database, or Cloudflare Worker. Export features are available locally. Local project and imported-model persistence depend on browser storage.
