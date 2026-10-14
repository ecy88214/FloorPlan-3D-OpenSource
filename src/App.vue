<template>
  <div class="app" :data-view="viewState.mode" :data-language="viewState.language">
    <EditorToolbar />
    <FurnitureLibrary />
    <FloorPlannerView />
    <PropertiesPanel />
    <EditorStatusBar />
    <RotateFurnitureDialog />
    <GuidedHelp />
    <DesignStudio />
  </div>
</template>

<script setup>
import EditorToolbar from './components/EditorToolbar.vue';
import FurnitureLibrary from './components/FurnitureLibrary.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import EditorStatusBar from './components/EditorStatusBar.vue';
import RotateFurnitureDialog from './components/RotateFurnitureDialog.vue';
import GuidedHelp from './components/GuidedHelp.vue';
import DesignStudio from './components/DesignStudio.vue';
import FloorPlannerView from './views/FloorPlannerView.vue';
import { viewState } from './stores/viewState.js';
import { onMounted } from 'vue';

onMounted(async () => {
  await import('./editor/planEditor.js');
  await import('./scenes/threeScene.js');
});
</script>
