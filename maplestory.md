---
layout: page
title: 新楓之谷戰力分析
description: 新楓之谷角色戰力分析工具，支援查詢台版角色裝備、能力值，並透過 AI 進行分析。
---

<ClientOnly>
  <MapleStoryWrapper />
</ClientOnly>

<script setup>
import { defineAsyncComponent } from 'vue'

const MapleStoryWrapper = defineAsyncComponent(() =>
  import('./.vitepress/components/MapleStoryWrapper.vue')
)
</script>
