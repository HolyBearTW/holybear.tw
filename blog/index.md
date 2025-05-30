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
          <p class="post-date">
            發布日期：{{ formatDateExactlyLikePostPage(post.date) }}
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
  gap: 1.5rem;
}
.post-item {
  border-bottom: 1px dashed var(--vp-c-divider);
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
.blog-articles-grid > .post-item:last-child {
  border-bottom: none;
}
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
.post-title-row {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.2rem;
}
.category {
  display: inline-block;
  background: #00FFEE;  /* 主色系背景 */
  color: #000;          /* 黑色字 */
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.85em;
  margin-right: 0.15em;
}
.post-info .post-title {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
  font-size: 1.3rem;
  line-height: 1.3;
  margin-bottom: 0;
  color: var(--vp-c-text-1);
  display: inline;
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
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 3rem;
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
    width: 100px;
    height: 75px;
    margin-right: 1rem;
    margin-bottom: 0;
  }
  .post-title {
    font-size: 1.25rem;
  }
  .post-title-row {
    font-size: 1em;
  }
  .post-excerpt {
    -webkit-line-clamp: 2;
  }
}
</style>
