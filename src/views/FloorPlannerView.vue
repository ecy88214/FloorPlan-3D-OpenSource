<template>
<main id="stage">
    <Plan2DView />
    <Scene3DView />
    <div class="scalebar" id="scalebar"><span id="sbText">1 m</span><div class="bar" id="sbBar"></div></div>
    <div class="modehint" id="modehint"></div>
    <div id="fab"></div>
    <aside id="diagnosticsList" class="diagnostics-list" hidden aria-label="空間檢查結果"></aside>
  </main>
</template>

<script setup>
import Plan2DView from './Plan2DView.vue';
import Scene3DView from './Scene3DView.vue';
</script>
