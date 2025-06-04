---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed } from 'vue'
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

const postsWithDate = allPosts.filter(Boolean)

/**
 * 把傳進來的 ISO 時間字串（如 "2025-02-14T16:30:45Z" 或 "2025-02-15T08:30:45+08:00"）
 * 轉成臺北時區 (Asia/Taipei) 的 "YYYY-MM-DD hh:mm:ss" 格式
 */
function formatDateTimeTaipei(isoString) {
  if (!isoString) return ''
  try {
    // 先把輸入的 ISO 字串轉為 Date 物件
    const date = new Date(isoString)
    // 用 toLocaleString 並指定時區為 Asia/Taipei，得到類似 "2025/2/15 上午12:30:45" 這種形式
    const twString = date.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour12: false, // 24 小時制
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    // toLocaleString 回傳的形式通常是 "2025/02/15 00:30:45"
    // 我們把斜線換成連字號，就變成 "2025-02-15 00:30:45"
    return twString.replace(/\//g, '-')
  } catch {
    return isoString
  }
}

/**
 * 如果你希望保留只顯示「YYYY-MM-DD」用的函式，可以繼續保留 formatDateExactlyLikePostPage，
 * 但在本範例裡我們只在列表用到 formatDateTimeTaipei
 */
function formatDateExactlyLikePostPage(dateString) {
  if (dateString) {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // fallback
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return ''
}

const postsPerPage = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(postsWithDate.length / postsPerPage))
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return postsWithDate.slice(start, end)
})
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
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
          <div class="post-title-row">
            <span
              v-if="post.category && post.category.length"
              class="category"
              v-for="c in post.category"
              :key="'cat-' + c"
            >{{ c }}</span>
            <h2 class="post-title">{{ post.title }}</h2>
          </div>

          <!-- 以下為顯示「作者」與「臺北時區完整時間」 -->
<p class="post-meta">
  <span v-if="post.author">作者：{{ post.author }} ｜ </span>
  <span v-if="post.time">發布日期：{{ formatDateTimeTaipei(post.time) }}</span>
</p>



          <div v-if="post.excerpt" class="post-excerpt" v-html="post.excerpt"></div>
          <span class="read-more">繼續閱讀 &gt;</span>
        </div>
      </a>
    </div>
  </div>
  <div class="pagination" v-if="totalPages > 1">
    <button class="pagination-button" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">上一頁</button>
    <button
      v-for="page in pageNumbers"
      :key="page"
      class="pagination-button"
      :class="{ active: page === currentPage }"
      @click="goToPage(page)">
      {{ page }}
    </button>
    <button class="pagination-button" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">下一頁</button>
  </div>
</div>

<style scoped>
.blog-home {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 0;
}
.blog-articles-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
.post-item {
  border-bottom: 1px dashed var(--vp-c-divider);
  padding-bottom: 0.6rem;   /* 虛線與標題間距縮小 */
  margin-bottom: 0.2rem;
  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
.blog-articles-grid > .post-item:last-child {
  border-bottom: none;
}
.post-item:hover {
  transform: translateY(-3px);
  background-color: var(--vp-c-bg-soft);
}
.post-item-link {
  display: flex;
  align-items: flex-start;
  padding: 0;
  text-decoration: none;
  color: inherit;
  height: 100%;
  min-height: 82px;
}
.post-thumbnail-wrapper {
  flex-shrink: 0;
  width: 110px;
  height: 82px;
  margin-right: 1rem;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: flex-start; /* 保證和內容頂部齊 */
  justify-content: center;
}
.post-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.post-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.post-title-row {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.2rem !important;
  margin-top: 0 !important;
}
.category {
  display: inline-block;
  background: #00FFEE;  /* 主色系背景 */
  color: #000;          /* 黑色字 */
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.85em;
  margin-right: 0.15em;
  margin-top: 0;
  margin-bottom: 0.2rem !important;
  line-height: 1.6;
  font-weight: 500;
  white-space: nowrap;         /* 單行顯示，不自動換行 */
  overflow: visible;           /* 超出內容不被截斷 */
  text-overflow: unset;        /* 不顯示 ... */
  height: auto;                /* 不要設定固定高度，讓內容自動撐開 */
  max-width: none;             /* 讓分類標籤寬度自適應 */
}
.post-title, .post-info .post-title {
  border-top: none !important;  /* 移除標題上方線條 */
  padding-top: 0;
  margin-top: 0 !important;
  margin-bottom: 0.2rem !important;
  font-size: 1.3rem;
  line-height: 1.3;
  color: var(--vp-c-text-1);
  font-weight: 700;
  display: inline;
  vertical-align: middle;
}

/* ──── 新增 post-meta 樣式 ──── */
.post-meta {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0;
  margin-bottom: 0.2rem;
  line-height: 1.2;
}

.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.5;
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
  margin-top: 0.13rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.read-more {
  display: inline-block;
  color: var(--vp-c-brand-1);
  font-weight: 500;
  font-size: 0.9rem;
  margin-top: 0.15rem;
  margin-bottom: 0;
}
.read-more:hover {
  text-decoration: underline;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
  gap: 0.5rem;
  flex-wrap: wrap;
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

@media (max-width: 767px) {
  .post-item-link {
    flex-direction: row;
    align-items: flex-start;
    text-align: left;
  }
  .post-thumbnail-wrapper {
    width: 80px;
    height: 60px;
    margin-right: 0.7rem;
    margin-bottom: 0;
  }
  .post-title, .post-info .post-title {
    font-size: 1.05rem;
  }
  .post-excerpt {
    font-size: 0.92rem;
    -webkit-line-clamp: 2;
  }
}
</style>
