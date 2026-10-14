// 編輯器與延後載入的 Three.js 場景共用此介面，避免掛在 window 上。
export let sceneController = null;
export function registerScene(controller) {
  sceneController = controller;
}
