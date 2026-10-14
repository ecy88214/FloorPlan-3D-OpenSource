import { LIB } from './catalog.js';

// 家具庫只顯示 catalog.js 明確定義的分類和物件。
// 過去會把各房型的預設家具再集合成「圖面物件」，造成重複項目。
// 保留此函式供既有載入流程呼叫，但不再自動追加群組。
export function completeCatalog() {
  const duplicateGroup = LIB.findIndex(group => group.cat === '圖面物件');
  if (duplicateGroup !== -1) LIB.splice(duplicateGroup, 1);
}
