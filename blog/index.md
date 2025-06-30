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
  <div class="blog-header-row">
    <h2 class="blog-title">日誌</h2>
    <div class="blog-authors">
      <strong>作者群：</strong>
      <a href="https://github.com/HolyBearTW" target="_blank" rel="noopener">聖小熊</a>
      <a href="https://github.com/Tim0320" target="_blank" rel="noopener">玄哥</a>
      <a href="https://github.com/ying0930" target="_blank" rel="noopener">酪梨</a>
      <a href="https://github.com/Jackboy001" target="_blank" rel="noopener">Jack</a>
      <a href="https://github.com/leohsiehtw" target="_blank" rel="noopener">LeoHsiehTW</a>
    </div>
    <a
      class="new-post-btn"
      href="https://github.com/HolyBearTW/holybear.me/new/main/blog"
      target="_blank"
      rel="noopener"
    >➕ 新增文章</a>
  </div>
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
          <p class="post-meta">
            作者：{{ post.author }}｜{{ formatDateExactlyLikePostPage(post.date) }}
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
  padding: 32px 0 2rem 0 !important;
}
@media (max-width: 767px) {
  main,
  .VPContent,
  .vp-doc,
  .VPContent .content-container,
  .blog-home,
  .blog-title,
  .blog-header-row,
  h1, h2 {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
}
.blog-header-row {
  display: flex;
  align-items: baseline; /* 維持此設定，讓「日誌」和「作者群」文字基線對齊 */
  justify-content: space-between;
  gap: 2rem;
  padding-bottom: 0.1rem; /* 大幅減少底部內距，讓內容更貼近虛線 */
  border-bottom: 1px dashed var(--vp-c-divider, #e5e5e5);
  margin-bottom: 1.3rem;
  flex-wrap: wrap;
}
@media (max-width: 767px) {
.blog-header-row {
flex-direction: column;
align-items: stretch;
gap: 0.7rem;
}
.new-post-btn {
width: 100%;
text-align: center;
margin-top: 0.7rem;
font-size: 1rem;
}
.blog-authors {
font-size: 0.99rem;
gap: 0.6em;
justify-content: center; /* 在手機版將作者群置中 /
text-align: center; / 確保作者群內部的文字也置中 */
}
.blog-title {
margin-bottom: 0.5rem;
margin-right: 0;
}
}
.blog-title {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.03em;
  margin: 0 1.2rem 0 0;
  line-height: 1.12;
  color: var(--vp-c-text-1);
  flex-shrink: 0;
}
.blog-authors {
  color: var(--vp-c-text-2, #444);
  font-size: 1.12rem;
  display: flex;
  align-items: baseline; /* 讓作者群內部元素也基線對齊 */
  gap: 1.1em;
  flex-wrap: wrap;
  min-width: 0;
  margin-bottom: 0; /* 移除之前為對齊做的微調 */
}
.blog-authors strong {
  margin-right: 0.5em;
}
.blog-authors a {
  color: var(--vp-c-brand-1, #00b8b8);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.07em;
  margin-left: 0.18em;
  margin-right: 0.18em;
  padding-bottom: 2px;
  line-height: 1.6;
}
.blog-authors a:hover {
  text-decoration: underline;
}
.new-post-btn {
  background: var(--vp-c-brand); /* 預設背景色: #00FFEE */
  color: #000; /* 預設文字顏色: 黑色 */
  font-weight: 600;
  padding: 0.32em 0.8em;
  border-radius: 5px;
  text-decoration: none;
  font-size: 0.95rem;
  /* 將 color 也加入 transition，讓文字顏色變化更平滑 */
  transition: background 0.15s, color 0.15s;
  box-shadow: 0 2px 8px 0 #0001;
  white-space: nowrap;
}
.new-post-btn:hover {
  background: var(--vp-c-brand-dark);
  color: #000;
}
@media (max-width: 900px) {
  .blog-header-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
  }
  .new-post-btn {
    width: 100%;
    text-align: center;
    margin-top: 0.7rem;
    font-size: 1rem;
  }
  .blog-authors {
    font-size: 0.99rem;
    gap: 0.6em;
  }
  .blog-title {
    margin-bottom: 0.5rem;
    margin-right: 0;
  }
}
.blog-articles-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
.post-item {
  border-bottom: 1px dashed var(--vp-c-divider);
  padding: 0.7rem 0;
  margin: 0;
}
.blog-articles-grid > .post-item:last-child {
  border-bottom: none;
}
.post-item-link {
  display: flex;
  align-items: center;
  min-height: 122px;
  height: auto;
  padding: 0 1rem;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
}
.post-item-link:hover {
  background-color: var(--vp-c-bg-soft);
  box-shadow: 0 2px 8px 0 #0001;
  transform: translateY(-3px);
}
.post-thumbnail-wrapper {
  flex-shrink: 0;
  width: 216px;
  height: 122px;
  margin-right: 1rem;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.post-info {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  background: #00FFEE;
  color: #000;
  border-radius: 3px;
  padding: 0 0.5em;
  font-size: 0.85em;
  margin-right: 0.15em;
  margin-top: 0;
  margin-bottom: 0.2rem !important;
  line-height: 1.6;
  font-weight: 500;
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  height: auto;
  max-width: none;
}
.post-title, .post-info .post-title {
  border-top: none !important;
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
.post-meta {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0 !important;
  margin-bottom: 0.2rem !important;
  line-height: 1.2;
  padding: 0;
}
.post-author {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0 0 0.2rem 0;
  line-height: 1.2;
  padding: 0;
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
  .post-item {
    padding: 0.2rem 0;
  }
  .post-item-link {
    min-height: unset;
    padding: 0.2rem 0.5rem;
  }
  .post-thumbnail-wrapper {
    width: 110px;
    height: 90px;
    margin-right: 0.7rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .post-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .post-info {
    flex: 1 1 0;
    min-width: 0;
  }
  .post-title, .post-info .post-title {
    font-size: 1.05rem;
  }
  .post-excerpt {
    font-size: 0.92rem;
    -webkit-line-clamp: 2;
  }
</style>

<style>
/* 完全消除 .vp-doc h2 標題的上方分隔線 */
.vp-doc h2 {
  border-top: none !important;
  padding-top: 0 !important;
  margin-top: 32px !important;
}
/* 若內容主體還有 box-shadow/border-top 分隔線，也一併消除 */
main,
.VPContent,
.VPContent .content-container,
.VPDoc .content-container,
.vp-doc .content-container,
[class*="VPContent"],
[class*="content-container"] {
  border-top: none !important;
  box-shadow: none !important;
  outline: none !important;
  margin-top: 0 !important;
  padding-top: 0 !important;
  background: inherit !important;
}
</style>