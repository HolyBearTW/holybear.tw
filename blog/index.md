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

// 確保文章已經按日期排序 (posts.data.ts 應該已經做了)
// 取得最新的一篇文章作為主打文章
const featuredPost = posts[0]

// 取得其餘的文章
const otherPosts = posts.slice(1)
</script>

<div class="blog-home">
  <div v-if="featuredPost" class="featured-post">
    <a :href="featuredPost.url" class="featured-post-link">
      <img :src="featuredPost.image" :alt="featuredPost.title" class="featured-post-image" />
      <div class="featured-post-content">
        <h1 class="featured-post-title">{{ featuredPost.title }}</h1>
        <p class="featured-post-date">發布日期：{{ new Date(featuredPost.date).toLocaleDateString('zh-TW') }}</p>
        <div class="featured-post-excerpt" v-html="featuredPost.excerpt"></div>
        <span class="read-more">繼續閱讀 &gt;</span>
      </div>
    </a>
  </div>

  <div class="other-posts-grid">
    <div v-for="post in otherPosts" :key="post.url" class="post-item">
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

/* 主打文章樣式 */
.featured-post {
  margin-bottom: 3rem; /* 與下方文章列表的間距 */
  border-bottom: 1px dashed var(--vp-c-divider); /* 底部虛線分隔 */
  padding-bottom: 2rem; /* 內容與虛線間距 */
}
.featured-post-link {
  display: block; /* 讓整個區塊可點擊 */
  text-decoration: none;
  color: inherit; /* 繼承文字顏色 */
}
.featured-post-image {
  width: 100%; /* 圖片佔滿寬度 */
  max-height: 300px; /* 主打圖片最大高度 */
  object-fit: cover; /* 圖片裁切方式，確保填滿 */
  border-radius: 8px; /* 圓角 */
  margin-bottom: 1.5rem; /* 圖片下方間距 */
}
.featured-post-content {
  padding: 0 1rem; /* 內文左右內距 */
}
.featured-post-title {
  font-size: 2.5rem; /* 主打文章標題較大 */
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 0.8rem;
  color: var(--vp-c-text-1);
}
.featured-post-date {
  color: var(--vp-c-text-2);
  font-size: 1rem;
  margin-bottom: 1rem;
}
.featured-post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  display: -webkit-box; /* 限制摘要行數 */
  -webkit-line-clamp: 4; /* 最多顯示4行 */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 其他文章網格佈局 */
.other-posts-grid {
  display: grid;
  grid-template-columns: 1fr; /* 預設手機版單欄 */
  gap: 2rem; /* 文章間距 */
}

/* 當螢幕寬度大於 768px 時，改為兩欄 */
@media (min-width: 768px) {
  .other-posts-grid {
    grid-template-columns: 1fr 1fr; /* 兩欄佈局 */
  }
}

.post-item {
  border: 1px solid var(--vp-c-divider); /* 卡片邊框 */
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease-in-out; /* 懸停動畫 */
}
.post-item:hover {
  transform: translateY(-5px); /* 懸停時輕微上浮 */
}
.post-item-link {
  display: flex; /* 圖片和文字並排 */
  align-items: flex-start; /* 文字內容頂部對齊 */
  padding: 1.5rem; /* 卡片內部間距 */
  text-decoration: none;
  color: inherit;
  height: 100%; /* 確保連結佔滿卡片高度 */
}
.post-thumbnail-wrapper {
  flex-shrink: 0; /* 圖片不縮小 */
  width: 100px; /* 縮圖固定寬度 */
  height: 100px; /* 縮圖固定高度 */
  margin-right: 1.5rem; /* 圖片右側間距 */
  border-radius: 4px;
  overflow: hidden;
}
.post-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 縮圖裁切方式 */
}
.post-info {
  flex-grow: 1; /* 文字內容佔據剩餘空間 */
}
.post-title {
  font-size: 1.3rem; /* 其他文章標題大小 */
  line-height: 1.3;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-1);
}
.post-date {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-bottom: 0.8rem;
}
.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.5;
  font-size: 0.95rem;
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
  margin-top: 0.5rem;
}
.read-more:hover {
  text-decoration: underline; /* 懸停時加底線 */
}

/* 手機版調整 */
@media (max-width: 767px) {
  .post-item-link {
    flex-direction: column; /* 手機版圖片和文字垂直堆疊 */
    align-items: center;
    text-align: center;
  }
  .post-thumbnail-wrapper {
    margin-right: 0;
    margin-bottom: 1rem; /* 圖片下方間距 */
  }
  .post-title {
    font-size: 1.5rem; /* 手機版標題稍微大一點 */
  }
}
</style>
