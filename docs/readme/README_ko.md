[English](README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · **한국어** · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md)

# FloorPlan 3D — 2D/3D 평면도 편집기

> Vue 3, SVG, Three.js 기반 브라우저 주택 설계 도구입니다.

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## 원본 프로젝트 및 출처

[wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)

## 데모 스크린샷

### 2D 평면도

![2D 평면도](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/2d_view.png)

### 3D 보기

![3D 보기](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/3d_view.png)

### 둘러보기 모드

![둘러보기 모드](https://github.com/ecy88214/FloorPlan-3D-vue/blob/main/docs/assets/walk_mode.png)

## 기능

- 로그인 없이 편집기를 사용할 수 있습니다. 1~4개 침실 또는 빈 평면을 선택하고 벽, 문, 창문, 가구를 배치합니다.
- 2D/3D 전환, 재질과 조명, 버전 비교 및 관리자 승인 시 내보내기를 지원합니다.
- 내보내기 제한은 애플리케이션 수준의 설정이며 복사 방지 기능이 아닙니다.
- 20개 언어를 선택할 수 있습니다. 주요 항목은 번역되었으며 일부 고급 문구는 영어로 표시됩니다.

## 빠른 시작

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/` for the public editor. Run `npm run build` to generate `dist/`.

## 설정 및 배포






## 프로젝트 구조

```text
src/editor/       SVG floor plan and command/history engine
src/scenes/       Three.js renderer
src/layouts/      One to four bedroom presets and empty plan
src/services/     Versions, estimates, project storage
src/i18n/         20 locale dictionaries and selection state
tests/            Node tests
```

## 보안 및 데이터


## 기여

Contributions and translation fixes are welcome. Run `npm run test:architecture` and `npm run build` before opening a pull request. Translation coverage varies: advanced dialogs and dynamic editor content may still display English or legacy wording.

## 프로젝트 후원

[![Buy Me a Coffee](<../assets/buy-me-a-coffee.png>)](https://www.buymeacoffee.com/ecy88214)


## License / 授權

MIT License. See [LICENSE](../../LICENSE). Third-party assets may carry separate licenses.




### Standalone edition

This edition runs entirely in the browser with no login, remote database, or Cloudflare Worker. Export features are available locally. Local project and imported-model persistence depend on browser storage.
