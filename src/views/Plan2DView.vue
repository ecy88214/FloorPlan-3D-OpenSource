<template>
<svg id="plan" class="tool-select" font-family="-apple-system,'PingFang SC','Microsoft YaHei',sans-serif">
      <defs id="defs">
        <filter id="handDrawnFilter" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="handDrawnShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="8" dy="12" stdDeviation="8" flood-color="#543d2b" flood-opacity="0.22" />
        </filter>
      </defs>
      <g id="gGrid"></g>
      <g id="gRooms"></g>
      <g id="gWalls"></g>
      <g id="gOpen"></g>
      <g id="gFurn"></g>
      <g id="gLabels" pointer-events="none"></g>
      <g id="gDims" pointer-events="none"></g>
      <g id="gMeasure" pointer-events="none"></g>
      <g id="gWallDraft" pointer-events="none"></g>
      <g id="gSnapGuides" pointer-events="none"></g>
      <g id="gCollision" pointer-events="none"></g>
      <g id="gDiagnostics" pointer-events="none"></g>
      <g id="gSel"></g>
    </svg>
</template>


