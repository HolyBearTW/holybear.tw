---
layout: home # 讓這個頁面看起來像個首頁，或者您可以選擇其他佈局
title: 我的部落格文章 # 這個頁面的標題
---

<script setup>
// 這裡會把剛剛在 posts.data.ts 整理好的文章資料載入進來
// @ts-ignore
import { data as posts } from '../.vitepress/theme/posts.data.ts' // 載入文章資料

import { useData } from 'vitepress' // 載入 VitePress 的資料工具
const { site } = useData() // 取得網站基本資訊，可以用來處理網址
</script>

<div class="blog-list">
  <div v-for="post in posts" :key="post.url" class="post-item">
    <h2>
      <a :href="site.base + post.url.replace('.html', '')">
        {{ post.title }}
      </a>
    </h2>
    <p v-if="post.date">
      發布日期：{{ new Date(post.date).toLocaleDateString('zh-TW') }}
    </p>
  </div>
</div>

<style scoped>
.blog-list {
  max-width: 768px;
  margin: 0 auto;
  padding: 2rem 0;
}
.post-item {
  margin-bottom: 2rem;
  border-bottom: 1px dashed var(--vp-c-divider);
  padding-bottom: 1.5rem;
}
.post-item h2 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}
.post-item h2 a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.post-item h2 a:hover {
  color: var(--vp-c-brand-1);
}
.post-item p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
</style>
