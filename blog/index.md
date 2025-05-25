---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed } from 'vue'
import { useData } from 'vitepress'
import { data as allPosts } from '../.vitepress/theme/posts.data.ts' // 載入所有文章

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
          <p class="post-date">發布日期：{{ new Date(post.date).toLocaleDateString('zh-TW') }}</p>
          <div class="post-excerpt" v-html="post.excerpt"></div>
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
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 0;
}

/* 所有文章單欄佈局 */
.blog-articles-grid {
  display: grid;
  grid-template-columns: 1fr; /* 單欄佈局 */
  gap: 1.5rem; /* 文章卡片之間的垂直間距 */
}

.post-item {
  border-bottom: 1px dashed var(--vp-c-divider); /* 底部虛線分隔，可移除 */
  padding-bottom: 1.5rem; /* 內容與底部虛線間距 */
  margin-bottom: 1.5rem; /* 每個項目底部的間距 */
  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
/* 移除最後一個項目的底部邊線 */
.blog-articles-grid > .post-item:last-child {
  border-bottom: none;
}
/* 在分頁情況下，每頁最後一個項目也移除底部線條 */
.blog-articles-grid .post-item:nth-last-child(1):not(:only-child) {
  border-bottom: none;
}


.post-item:hover {
  transform: translateY(-3px);
  background-color: var(--vp-c-bg-soft);
}
.post-item-link {
  display: flex;
  align-items: flex-start;
  padding: 0.5rem 0;
  text-decoration: none;
  color: inherit;
  height: 100%;
}
.post-thumbnail-wrapper {
  flex-shrink: 0;
  width: 120px;
  height: 90px;
  margin-right: 1rem;
  border-radius: 4px;
  overflow: hidden;
}
.post-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.post-info {
  flex-grow: 1;
}
.post-title {
  font-size: 1.3rem;
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
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.read-more {
  display: inline-block;
  color: var(--vp-c-brand-1);
  font-weight: 500;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
.read-more:hover {
  text-decoration: underline;
}

/* 分頁按鈕樣式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 3rem;
  gap: 0.5rem;
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
    flex-direction: row;
    align-items: flex-start;
    text-align: left;
  }
  .post-thumbnail-wrapper {
    width: 100px;
    height: 75px;
    margin-right: 1rem;
    margin-bottom: 0;
  }
  .post-title {
    font-size: 1.25rem;
  }
  .post-excerpt {
    -webkit-line-clamp: 2;
  }
}
</style>
