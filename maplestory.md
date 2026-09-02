---
layout: page
title: 新楓之谷戰力分析
description: 新楓之谷角色戰力分析工具，支援查詢台版角色裝備、能力值，並透過 AI 進行分析。
---

<div v-if="mapleToolLoadState !== 'ready'" class="maple-tool-boot-shell" :class="{ 'is-error': mapleToolLoadState === 'error' }" :role="mapleToolLoadState === 'error' ? 'alert' : 'status'" aria-live="polite">
  <span v-if="mapleToolLoadState === 'loading'" class="maple-tool-boot-spinner" aria-hidden="true"></span>
  <strong>{{ mapleToolLoadState === 'error' ? '角色戰力分析工具載入失敗' : '正在啟動角色戰力分析工具' }}</strong>
  <span>{{ mapleToolLoadState === 'error' ? '請重新整理頁面後再試。' : '首次載入需要準備介面資源，請稍候…' }}</span>
</div>

<ClientOnly>
  <MapleStoryWrapper />
</ClientOnly>

<script setup>
import { defineAsyncComponent, ref } from 'vue'

const mapleToolLoadState = ref('loading')

const MapleStoryWrapper = defineAsyncComponent({
  loader: () => import('./.vitepress/theme/maplestory/MapleStoryWrapper.vue').then((module) => {
    mapleToolLoadState.value = 'ready'
    return module
  }),
  delay: 0,
  timeout: 30000,
  suspensible: false,
  onError(_error, retry, fail, attempts) {
    if (attempts <= 2) {
      window.setTimeout(retry, 800)
    } else {
      mapleToolLoadState.value = 'error'
      fail()
    }
  },
})
</script>

<style>
.maple-tool-boot-shell {
  display: flex;
  min-height: min(68vh, 680px);
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: #cbd5e1;
  text-align: center;
}

.maple-tool-boot-shell strong {
  color: #f8fafc;
  font-size: 1rem;
}

.maple-tool-boot-shell > span:last-child {
  color: #94a3b8;
  font-size: 0.8rem;
}

.maple-tool-boot-shell.is-error strong {
  color: #fda4af;
}

.maple-tool-boot-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(34, 211, 238, 0.2);
  border-top-color: #22d3ee;
  border-radius: 999px;
  animation: maple-tool-boot-spin 0.8s linear infinite;
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.35));
}

html:not(.dark) .maple-tool-boot-shell {
  color: #355866;
}

html:not(.dark) .maple-tool-boot-shell strong {
  color: #163b49;
}

html:not(.dark) .maple-tool-boot-shell > span:last-child {
  color: #557481;
}

@keyframes maple-tool-boot-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .maple-tool-boot-spinner { animation-duration: 1.8s; }
}
</style>
