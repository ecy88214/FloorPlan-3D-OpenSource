[English](README.md) · **简体中文** · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md)

# FloorPlan 3D — 2D/3D 开源室内设计工具

> 基于 Vue 3、SVG 和 Three.js 的浏览器住宅平面编辑器。

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## 原始项目与致谢

[wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)

## 演示截图

### 2D 平面图

![2D 平面图](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/2d_view.png)

### 3D 视图

![3D 视图](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/3d_view.png)

### 漫游模式

![漫游模式](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/walk_mode.png)

## 功能

- 无需登录即可使用编辑器。选择一至四房或空白户型；绘制墙体、摆放门窗与家具。
- 切换 2D 平面与 3D 场景、调整材质与灯光、对比版本；管理员允许时可导出方案及估价。
- 界面提供 20 种语言；核心标签已翻译，高级功能仍可能回退至英文或旧文案。

## 快速开始

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/` for the public editor. Run `npm run build` to generate `dist/`.

## 配置与部署






## 项目结构

```text
src/editor/       SVG floor plan and command/history engine
src/scenes/       Three.js renderer
src/layouts/      One to four bedroom presets and empty plan
src/services/     Versions, estimates, project storage
src/i18n/         20 locale dictionaries and selection state
tests/            Node tests
```

## 安全与数据


## 参与贡献

Contributions and translation fixes are welcome. Run `npm run test:architecture` and `npm run build` before opening a pull request. Translation coverage varies: advanced dialogs and dynamic editor content may still display English or legacy wording.

## 支持项目

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## License / 授權

MIT License. See [LICENSE](../../LICENSE). Third-party assets may carry separate licenses.




### Standalone edition

This edition runs entirely in the browser with no login, remote database, or Cloudflare Worker. Export features are available locally. Local project and imported-model persistence depend on browser storage.
