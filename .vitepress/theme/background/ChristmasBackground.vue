<template>
  <div class="christmas-background" aria-hidden="true"></div>
</template>

<style>
/* 全域主題色彩覆蓋（確保被套用時風格一致） */
body.theme-christmas {
  --vp-c-brand: #0a8f38 !important;
  --vp-c-brand-light: #4caf50 !important;
  --vp-c-bg: #07131a !important;
  --vp-c-text-1: #f8f8f8 !important;
}

.christmas-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #07131a url('/image/theme/snow.png') center/contain repeat;
}
</style>
