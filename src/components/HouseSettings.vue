<template>
<!-- 對話框移至 body，避免被未啟用的 Ribbon v-show 隱藏或裁切 -->
<Teleport to="body">
<dialog id="houseDialog" aria-labelledby="houseDialogTitle">
  <form method="dialog">
    <h3 id="houseDialogTitle">房屋尺寸與空白房型</h3>
    <p>以地坪範圍設定長寬，不含外牆厚度。單位：公尺。</p>
    <div class="form">
      <label>房屋寬度（m）<input id="houseWidth" type="number" min="1" max="50" step="0.01" required></label>
      <label>房屋深度（m）<input id="houseDepth" type="number" min="1" max="50" step="0.01" required></label>
    </div>
    <p id="houseArea"></p>
    <p class="muted">套用尺寸會縮放牆體、地坪與門窗，並調整家具位置；家具本身尺寸不變。縮小後請檢查家具是否重疊。</p>
    <p class="muted">新增空白房型會替換目前方案，保留四面外牆與空地坪。以上操作皆可復原。</p>
    <div class="actions"><button class="btn primary" type="button" id="resizeHouse">套用尺寸</button><button class="btn" type="button" id="newEmptyHouse">新增空白房型</button><button class="btn" value="cancel">取消</button></div>
  </form>
</dialog>
</Teleport>
</template>
