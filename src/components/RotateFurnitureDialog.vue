<template>
  <!-- Teleport 可避免 Ribbon 分頁切換時，對話框被 v-show 隱藏。 -->
  <Teleport to="body">
    <dialog id="rotateFurnitureDialog" aria-labelledby="rotateFurnitureTitle">
      <form id="rotateFurnitureForm">
        <h3 id="rotateFurnitureTitle">自訂家具旋轉角度</h3>
        <p class="muted">輸入要旋轉的角度。正數為順時針，負數為逆時針；多選或群組會繞共同中心旋轉。</p>
        <div class="form">
          <label for="rotateFurnitureAngle">旋轉角度（°）
            <input id="rotateFurnitureAngle" name="degrees" type="number" value="45" step="any" required autofocus inputmode="decimal" />
          </label>
        </div>
        <p id="rotateFurnitureError" class="rotate-furniture-error" role="alert" hidden>請輸入有效的旋轉角度。</p>
        <div class="actions">
          <button class="btn primary" type="submit">確定旋轉</button>
          <button class="btn" type="button" id="cancelFurnitureRotation">取消</button>
        </div>
      </form>
    </dialog>
  </Teleport>
</template>
