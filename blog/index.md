---
layout: home
title: 個人日誌
---

<script setup>
import { useData } from 'vitepress'
// 從 data 載入 posts 數據
import { data as posts } from '../.vitepress/theme/posts.data.ts'

const { site } = useData()
</script>

<div class="blog-list">
  <div v-for="post in posts" :key="post.url" class="post-item">
    <div class="post-header">
      <img :src="post.image" :alt="post.title" class="post-thumbnail" />
      <h2 class="post-title">
        <a :href="post.url">{{ post.title }}</a>
      </h2>
    </div>
    <p v-if="post.date" class="post-date">發布日期：{{ new Date(post.date).toLocaleDateString('zh-TW') }}</p>
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
.post-header {
  display: flex; /* 使用 Flexbox 讓圖片和標題並排 */
  align-items: center; /* 垂直置中對齊 */
  margin-bottom: 1rem; /* 標題下方留點空間 */
}
.post-thumbnail {
  width: 80px; /* 設定圖片寬度 */
  height: 80px; /* 設定圖片高度 */
  object-fit: cover; /* 圖片裁切方式，確保不變形填滿空間 */
  margin-right: 1.5rem; /* 圖片右邊留點空間 */
  border-radius: 8px; /* 讓圖片邊角圓滑一點 */
  flex-shrink: 0; /* 圖片不縮小 */
}
.post-title {
  font-size: 1.8rem;
  margin: 0; /* 移除預設的 margin */
}
.post-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.post-title a:hover {
  color: var(--vp-c-brand-1);
}
.post-date {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
</style>
