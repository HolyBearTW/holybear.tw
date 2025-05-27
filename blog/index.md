---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed } from 'vue'
import { useData } from 'vitepress'
// 載入所有文章資料，確保 posts.data.ts 已正確設定
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

const { site } = useData()

const postsPerPage = 10 // 每頁顯示的文章數量
const currentPage = ref(1) // 當前頁碼，預設為第一頁

// 計算總頁數
const totalPages = computed(() => {
  return Math.ceil(allPosts.length / postsPerPage)
})

// 根據當前頁碼和每頁數量，計算當前頁要顯示的文章
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return allPosts.slice(start, end)
})

// 點擊頁碼按鈕時的處理函數
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    // 捲動到頁面頂部，提升使用者體驗
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 生成頁碼陣列，用於 v-for 迴圈
const pageNumbers = computed(() => {
  const pages = []
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i)
  }
  return pages
})

// 格式化日期+時間（台灣時區、與文章內頁一致）
function formatDateTime(dateString) {
  return dateString || ''
}
</script>

<div class="blog-home">
  <div class="blog-articles-grid">
    <div v-for="post in paginatedPosts" :key="post.url" class="post-item">
      <a :href="post.url" class="post-item-link">
        <div class="post-thumbnail-wrapper">
          <img :src="post.image" :alt="post.title" class="post-thumbnail" />
        </div>
        <div class="post-info">
          <h2 class="post-title">{{ post.title }}</h2>
          <p v-if="post.date" class="post-date">
            發布日期：{{ formatDateTime(post.date) }}
          </p>
          <div v-if="post.excerpt" class="post-excerpt" v-html="post.excerpt"></div>
          <span class="read-more">繼續閱讀 &gt;</span>
        </div>
      </a>
    </div>
  </div>

  <div class="pagination" v-if="totalPages > 1">
    <button
      class="pagination-button"
      :disabled="currentPage === 1"
      @click="goToPage(currentPage - 1)"
    >
      上一頁
    </button>
    <button
      v-for="page in pageNumbers"
      :key="page"
      class="pagination-button"
      :class="{ active: page === currentPage }"
      @click="goToPage(page)"
    >
      {{ page }}
    </button>
    <button
      class="pagination-button"
      :disabled="currentPage === totalPages"
      @click="goToPage(currentPage + 1)"
    >
      下一頁
    </button>
  </div>
</div>

<style scoped>
/* 部落格首頁的整體容器 */
.blog-home {
  max-width: 960px; /* 根據您的網站版面調整最大寬度 */
  margin: 0 auto;
  padding: 2rem 0;
}

/* 所有文章單欄佈局 (預設為一排一篇文章) */
.blog-articles-grid {
  display: grid;
  grid-template-columns: 1fr; /* 單欄佈局 */
  gap: 1.5rem; /* 文章卡片之間的垂直間距 */
}

.post-item {
  border-bottom: 1px dashed var(--vp-c-divider); /* 底部虛線分隔 */
  padding-bottom: 1.5rem; /* 內容與底部虛線間距 */
  margin-bottom: 1.5rem; /* 每個項目底部的間距 */
  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out; /* 懸停動畫 */
}
/* 移除網格中最後一個項目的底部邊線 */
.blog-articles-grid > .post-item:last-child {
  border-bottom: none;
}
/* 在分頁情況下，確保當前頁的最後一個項目也沒有底部線條 */
.blog-articles-grid .post-item:nth-last-child(1):not(:only-child) {
  border-bottom: none;
}

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

/* 覆蓋 VitePress 預設的 h2 樣式，移除頂部邊框和多餘的內外距 */
.post-info .post-title { /* 使用 .post-info 作為前綴增加選擇器權重 */
  border-top: none; /* 移除頂部邊框 */
  padding-top: 0; /* 移除頂部內距 */
  margin-top: 0; /* 移除頂部外距 */
  font-size: 1.3rem; /* 標題大小 */
  line-height: 1.3;
  margin-bottom: 0.5rem; /* 標題下方外距 */
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

/* 分頁按鈕樣式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 3rem;
  gap: 0.5rem;
  flex-wrap: wrap; /* 換行以應對多頁數或小螢幕 */
}

.pagination-button {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  font-size: 0.95rem;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}

.pagination-button.active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
  cursor: default;
}

.pagination-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
