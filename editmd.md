---
layout: page
title: 文章編輯器
description: 這是一個用於編輯 Markdown 文章的線上編輯器，支援即時預覽、語法高亮、段落排版、快捷鍵與匯出 Markdown 等功能，讓你能夠高效撰寫與管理內容，適合部落格、技術文件、筆記等多種 Markdown 應用場景。
---

<ClientOnly>
  <EditorWithPreview />
</ClientOnly>

<script setup>
import { defineAsyncComponent } from 'vue'

const EditorWithPreview = defineAsyncComponent(() =>
  import('./.vitepress/edit/EditorWithPreview.vue')
)
</script>
