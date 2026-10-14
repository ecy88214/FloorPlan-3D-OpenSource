[English](README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · **日本語** · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md)

# FloorPlan 3D — 2D／3D 間取りエディター

> Vue 3、SVG、Three.js によるブラウザ上の住宅設計ツール。

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## 元プロジェクトとクレジット

[wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)

## デモ画像

### 2D 間取り

![2D 間取り](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/2d_view.png)

### 3D ビュー

![3D ビュー](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/3d_view.png)

### ウォークモード

![ウォークモード](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/walk_mode.png)

## 主な機能

- ログインなしで編集できます。1〜4 寝室の間取りまたは空白プランを選び、壁、ドア、窓、家具を編集できます。
- 2D／3D 表示、マテリアルや照明、バージョン比較、管理者が許可したエクスポートに対応します。
- エクスポート制限はアプリケーションの設定であり、コピー防止ではありません。
- 20 言語の選択に対応。主要ラベルは翻訳済みですが、一部は英語にフォールバックします。

## クイックスタート

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/` for the public editor. Run `npm run build` to generate `dist/`.

## 設定とデプロイ






## 構成

```text
src/editor/       SVG floor plan and command/history engine
src/scenes/       Three.js renderer
src/layouts/      One to four bedroom presets and empty plan
src/services/     Versions, estimates, project storage
src/i18n/         20 locale dictionaries and selection state
tests/            Node tests
```

## セキュリティとデータ


## 貢献

Contributions and translation fixes are welcome. Run `npm run test:architecture` and `npm run build` before opening a pull request. Translation coverage varies: advanced dialogs and dynamic editor content may still display English or legacy wording.

## プロジェクトを支援

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## License / 授權

MIT License. See [LICENSE](../../LICENSE). Third-party assets may carry separate licenses.




### Standalone edition

This edition runs entirely in the browser with no login, remote database, or Cloudflare Worker. Export features are available locally. Local project and imported-model persistence depend on browser storage.
