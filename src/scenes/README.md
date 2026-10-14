# Three.js 場景模組

`threeScene.js` 負責 3D 場景、材質、相機、漫遊與 2D/3D 同步。它從 `editor/planEditor.js` 匯入即時方案資料，透過 `services/sceneController.js` 登錄場景操作介面；不再依賴傳統全域腳本的載入順序。

3D 容器與漫遊提示的 Vue 元件位於 `views/Scene3DView.js`／`Scene3DView.html`。
