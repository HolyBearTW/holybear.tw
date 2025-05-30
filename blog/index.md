---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed } from 'vue'
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

const postsWithDate = allPosts.filter(Boolean)

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
          <div class="post-date-row">
            <span class="post-date">
              發布日期：{{ formatDateExactlyLikePostPage(post.date) }}
            </span>
          </div>
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
  gap: 0.3rem; /* 更小的格間距 */
}
.post-item {
  border-bottom: 1px dashed var(--vp-c-divider);
  padding-bottom: 0.5rem; /* 更緊湊 */
  margin-bottom: 0.3rem;  /* 更緊湊 */
  transition: transform 0.2s, background-color 0.2s;
}
.blog-articles-grid > .post-item:last-child {
  border-bottom: none;
}
.post-item-link {
  display: flex;
  align-items: flex-start;
  padding: 0;
  text-decoration: none;
  color: inherit;
  height: 100%;
  min-height: 90px;
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
  /* 不要有多餘的 padding/margin-top */
}

.post-title-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0;
  margin-top: 0;
}

.category {
  display: inline-block;
  background: #00FFEE;
  color: #000;
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.88em;
  margin-right: 0.18em;
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1.6;
  height: 1.6em;
  display: flex;
  align-items: center;
}

.post-title, .post-info .post-title {
  margin-bottom: 0 !important;
  margin-top: 0 !important;
  font-size: 1.18rem;
  line-height: 1.4;
  color: var(--vp-c-text-1);
  font-weight: 700;
  display: inline;
  vertical-align: middle;
}

.post-date-row {
  margin-top: 0;
  margin-bottom: 0.08em;
  display: flex;
  align-items: center;
}

.post-date {
  color: var(--vp-c-text-2);
  font-size: 0.89em;
  margin: 0;
  padding: 0;
  line-height: 1.3;
}

.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.5;
  font-size: 0.97rem;
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
  font-size: 0.92rem;
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
