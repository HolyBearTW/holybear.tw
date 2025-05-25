---
layout: home # 或者其他您設定的佈局
title: 部落格文章 # 這個頁面的標題
description: 聖小熊的部落格文章列表
---

<script setup>
import { useData } from 'vitepress'
// 從 data 載入 posts 數據
import { data as posts } from '../.vitepress/theme/posts.data.ts'

const { site } = useData()

// 現在所有文章都直接在 posts 陣列中，不需要額外區分主打文章
</script>

<div class="blog-home">
  <div class="blog-articles-grid">
    <div v-for="post in posts" :key="post.url" class="post-item">
      <a :href="post.url" class="post-item-link">
        <div class="post-thumbnail-wrapper">
          <img :src="post.image" :alt="post.title" class="post-thumbnail" />
        </div>
        <div class="post-info">
          <h2 class="post-title">{{ post.title }}</h2>
          <p class="post-date">發布日期：{{ new Date(post.date).toLocaleDateString('zh-TW') }}</p>
          <div class="post-excerpt" v-html="post.excerpt"></div>
          <span class="read-more">繼續閱讀 &gt;</span>
        </div>
      </a>
    </div>
  </div>
</div>

<style scoped>
/* 部落格首頁的整體容器 */
.blog-home {
  max-width: 960px; /* 根據您的網站版面調整最大寬度 */
  margin: 0 auto;
  padding: 2rem 0;
}

/* 所有文章網格佈局 */
.blog-articles-grid {
  display: grid;
  grid-template-columns: 1fr; /* 預設手機版單欄 */
  gap: 1.5rem; /* 文章卡片之間的垂直間距 */
}

/* 當螢幕寬度大於 768px 時，改為兩欄 */
@media (min-width: 768px) {
  .blog-articles-grid {
    grid-template-columns: 1fr 1fr; /* 兩欄佈局 */
    column-gap: 2rem; /* 兩欄之間的水平間距 */
  }
}

.post-item {
  /* GNN 的列表項通常沒有明顯的邊框，而是在項目之間有分隔線 */
  /* 這裡我們先用底部虛線分隔，若不喜歡可移除 */
  border-bottom: 1px dashed var(--vp-c-divider);
  padding-bottom: 1.5rem; /* 內容與底部虛線間距 */
  margin-bottom: 1.5rem; /* 每個項目底部的間距 */
  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out; /* 懸停動畫 */
}
/* 移除最後一個項目的底部邊線，避免多餘的線條 */
.blog-articles-grid > .post-item:last-child {
    border-bottom: none;
}
/* 在兩欄佈局下，第二欄的最後一個項目可能不是 .post-item:last-child，這需要更複雜的選擇器來處理。
   如果只使用 border-bottom 且不去除最後一個，通常也能接受。
   或者，可以在 CSS Grid 容器中使用 grid-row-gap 來代替 border-bottom。
   為求簡潔，先保持 current post-item 的 border-bottom。
*/


.post-item:hover {
  transform: translateY(-3px); /* 懸停時輕微上浮 */
  background-color: var(--vp-c-bg-soft); /* 懸停時背景色變化 */
}
.post-item-link {
  display: flex; /* 圖片和文字內容並排 */
  align-items: flex-start; /* 內容頂部對齊 */
  padding: 0.5rem 0; /* 鏈接內部頂部和底部的內距 */
  text-decoration: none;
  color: inherit;
  height: 100%; /* 確保連結佔滿整個項目高度 */
}
.post-thumbnail-wrapper {
  flex-shrink: 0; /* 圖片不縮小 */
  width: 120px; /* 縮圖固定寬度，可調整 */
  height: 90px; /* 縮圖固定高度，可調整為 4:3 比例 */
  margin-right: 1rem; /* 圖片右側間距 */
  border-radius: 4px; /* 輕微圓角 */
  overflow: hidden;
}
.post-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 縮圖裁切方式，確保填滿空間 */
}
.post-info {
  flex-grow: 1; /* 文字內容佔據剩餘空間 */
}
.post-title {
  font-size: 1.3rem; /* 文章標題大小 */
  line-height: 1.3;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}
.post-date {
  color: var(--vp-c-text-2);
  font-size: 0.85rem; /* 日期文字大小 */
  margin-bottom: 0.8rem;
}
.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.5;
  font-size: 0.95rem; /* 摘要文字大小 */
  margin-bottom: 1rem;
  display: -webkit-box; /* 多行文字省略 */
  -webkit-line-clamp: 3; /* 限制摘要顯示3行 */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.read-more {
  display: inline-block;
  color: var(--vp-c-brand-1); /* 使用品牌色作為連結顏色 */
  font-weight: 500;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
.read-more:hover {
  text-decoration: underline; /* 懸停時加底線 */
}

/* 手機版調整：確保小螢幕下依然是圖片在左，文字在右 */
@media (max-width: 767px) {
  .post-item-link {
    flex-direction: row; /* 在手機版也保持圖片和文字並排 */
    align-items: flex-start;
    text-align: left;
  }
  .post-thumbnail-wrapper {
    width: 100px; /* 手機版縮圖寬度 */
    height: 75px; /* 手機版縮圖高度 (維持 4:3 比例) */
    margin-right: 1rem;
    margin-bottom: 0;
  }
  .post-title {
    font-size: 1.25rem; /* 手機版標題稍微大一點點 */
  }
  .post-excerpt {
    -webkit-line-clamp: 2; /* 限制摘要顯示2行 */
  }
}
</style>
