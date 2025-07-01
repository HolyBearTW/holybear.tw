---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

// 定義作者陣列，包含 login、中文顯示名稱、GitHub 連結
const authors = [
  { name: '聖小熊', login: 'HolyBearTW', url: 'https://github.com/HolyBearTW' },
  { name: '玄哥', login: 'Tim0320', url: 'https://github.com/Tim0320' },
  { name: '酪梨', login: 'ying0930', url: 'https://github.com/ying0930' },
  { name: 'Jack', login: 'Jackboy001', url: 'https://github.com/Jackboy001' },
  { name: 'Leo', login: 'leohsiehtw', url: 'https://github.com/leohsiehtw' },
]

// 根據 post.author 找到對應的作者物件
function getAuthorMeta(authorName) {
  return authors.find(a => a.name === authorName) ||
         authors.find(a => a.login === authorName) ||
         { name: authorName, login: '', url: '' }
}

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

function fixVpContentPadding() {
  const content = document.querySelector('.VPContent .content-container')
  if (!content) return
  if (document.querySelector('.blog-home')) {
    content.style.paddingTop = '0'
  } else {
    content.style.paddingTop = ''
  }
}

onMounted(() => {
  fixVpContentPadding()
  window.addEventListener('vitepress:afterRouteChanged', fixVpContentPadding)
})
onBeforeUnmount(() => {
  window.removeEventListener('vitepress:afterRouteChanged', fixVpContentPadding)
})
</script>

<div class="blog-home">
  <div class="blog-header-row">
    <h2 class="blog-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
      <span>日誌</span>
    </h2>
    <div class="blog-authors">
      <strong>作者群：</strong>
      <span
        v-for="author in authors"
        :key="author.login"
        class="author-link"
      >
        <a :href="author.url" target="_blank" rel="noopener">
          <img
            :src="`https://github.com/${author.login}.png`"
            :alt="author.name"
            class="author-avatar"
          />
          {{ author.name }}
        </a>
      </span>
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
            <span class="author-inline">
              <img
                v-if="getAuthorMeta(post.author).login"
                class="post-author-avatar"
                :src="`https://github.com/${getAuthorMeta(post.author).login}.png`"
                :alt="getAuthorMeta(post.author).name"
              />
              <a
                v-if="getAuthorMeta(post.author).url"
                :href="getAuthorMeta(post.author).url"
                target="_blank"
                rel="noopener"
                class="author-link-name"
              >{{ getAuthorMeta(post.author).name }}</a><span v-else>{{ post.author }}</span><span class="author-date">｜{{ formatDateExactlyLikePostPage(post.date) }}</span>
            </span>
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
  max-width: 1050px;
  margin-left: auto;
  margin-right: auto;
  padding-bottom: 2rem;
}
.blog-header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4rem;
  border-bottom: 1px dashed var(--vp-c-divider, #e5e5e5);
  margin-bottom: 0.5rem;
  flex-wrap: nowrap;
  flex-direction: row;
  position: unset; 
}
.blog-title {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.03em;
  margin: 0 1.2rem 0 0;
  line-height: 0.7;
  color: var(--vp-c-text-1);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.blog-title svg {
  margin-bottom: 2px;
}
/* 作者群：橫向排列＋頭像（響應式下會自動換行） */
.blog-authors {
  color: var(--vp-c-text-2, #444);
  font-size: 1.12rem;
  display: flex;
  align-items: baseline;
  gap: 0.3em;
  flex-wrap: wrap;
  min-width: 0;
  margin-bottom: 0;
  position: relative;
  align-items: center;
}
.blog-authors strong {
  margin-right: 0.5em;
}
.author-link {
  position: relative;
  display: inline-block;
}
.author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-right: 0.22em;
  vertical-align: middle;
  box-shadow: 0 2px 8px #0001;
  border: 1px solid #ddd;
  background: #fff;
  object-fit: cover;
}
.blog-authors a {
  color: var(--vp-c-brand-1, #00b8b8);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.07em;
  margin-left: 0.18em;
  margin-right: 0.18em;
  line-height: 1.6;
  display: inline-flex;
  align-items: center;
}
.blog-authors a:hover {
  text-decoration: underline;
}
.new-post-btn {
  background: var(--vp-c-brand);
  color: #000;
  font-weight: 600;
  padding: 0.32em 0.8em;
  border-radius: 10px;
  text-decoration: none;
  font-size: 0.95rem;
  transition: background 0.15s, color 0.15s;
  box-shadow: 0 2px 8px 0 #0001;
  white-space: nowrap;
  margin-bottom: 0.5rem;
  flex-shrink: 0; /* 防止按鈕被壓縮 */
}
.new-post-btn:hover {
  background: var(--vp-c-brand-dark);
  color: #000;
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
.author-inline {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  font-size: inherit;
  line-height: 1;
}
.post-author-avatar {
  width: 21px;
  height: 21px;
  margin: 0 2px 0 0;
  border-radius: 50%;
  vertical-align: middle; /* 確保它與行內內容垂直對齊 */
}
.post-meta-author .author-avatar {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  margin-right: 0.12em;
  vertical-align: middle;
  box-shadow: 0 2px 8px #0001;
  border: 1px solid #ddd;
  background: #fff;
  object-fit: cover;
  display: inline-block;
}
.author-link-name {
  color: var(--vp-c-brand-1, #00b8b8);
  text-decoration: none;
  font-weight: 600;
  line-height: 1; /* 這裡的 line-height 也要設為 1 */
  display: inline-block; /* 保持 inline-block */
  vertical-align: middle; /* 確保它與圖片和日期垂直對齊 */
  margin-right: 0;
  padding-right: 0;
}
.author-link-name:hover {
  text-decoration: underline;
}
.author-date {
  font-size: 0.98em;
  color: var(--vp-c-text-2);
  margin-left: 0;
  vertical-align: middle; /* 確保它與圖片和連結垂直對齊 */
}
.post-meta {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0 !important; /* 合併 margin-top 和 margin-bottom */
  padding: 0 !important;
  line-height: 1 !important; /* 確保行高緊密 */
  overflow: hidden; /* 防止內容溢出 */
  /* 新增的 flex 屬性 */
  display: flex; /* <--- 讓它成為 flex 容器 */
  align-items: center; /* <--- 讓所有內容垂直置中對齊 */
  height: 28px; /* <--- 嘗試給一個固定高度，例如 28px-32px，確保能容納圖片和文字 */
  /* min-height: 28px; */ /* 如果不喜歡固定高度，可以用 min-height */
}
.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.5;
  font-size: 0.95rem;
  margin-top: 0 !important;     /* 確保上方沒有間距 */
  margin-bottom: 0 !important; /* 確保下方沒有間距 */
  padding: 0 !important;
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
  margin-top: 0 !important; /* 如果要它更緊密 */
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
.pagination-button:hover:not(:disabled),
.pagination-button.active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}
.pagination-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
@media (max-width: 889px) {
  .blog-header-row {
    display: flex;
    flex-direction: row; 
    flex-wrap: wrap;     
    align-items: center; 
    justify-content: space-between; 
    
    /* 調整間距，清除所有可能導致間距的屬性 */
    border-bottom: 1px dashed var(--vp-c-divider, #e5e5e5); /* 保留邊線 */
    margin-bottom: 0 !important; /* 清除外部底部間距 */
    padding-top: 0.5rem !important; /* 確保有足夠的內部頂部空間 */
    padding-bottom: 0.2rem !important; /* 精確控制底部邊線與作者群的間距 */
    gap: 0 !important; /* 清除所有 flex item 之間的 gap */
  }

  .blog-title {
    margin: 0 !important; /* 強制清除所有 margin */
    flex-shrink: 0; 
    order: 0; 
  }

  .new-post-btn {
    width: auto; 
    margin: 0 !important; /* 強制清除所有 margin */
    font-size: 0.95rem; 
    order: 1; 
    flex-shrink: 0; 
  }

  .blog-authors {
    width: 100%; /* 強制作者群換到下一行並佔滿寬度 */
    margin-top: 0 !important; /* **關鍵：作者群上邊距強制設為 0** */
    margin-bottom: 0 !important; /* 強制清除底部間距 */
    justify-content: center; /* 讓作者群內容置中 */
    
    /* 作者群的內部排版，保持您要的效果 */
    display: flex; 
    flex-direction: row; 
    align-items: center; 
    flex-wrap: wrap; 
    gap: 0.25em 0.25em; /* 保持作者頭像間的間距 */
    text-align: center;
    order: 2; /* 確保作者群在日誌標題和新增按鈕之後 */
  }
  .blog-authors strong {
    white-space: nowrap; /* 避免「作者群：」換行 */
    margin-right: 0.25em !important; /* 確保作者群文字與頭像間距合理 */
  }
  .author-link {
    display: flex; 
    flex-direction: column; /* 讓頭像和名字垂直排列 */
    align-items: center; 
    margin: 0.05em 0.25em !important; /* **再次微調垂直間距，使其更小或為 0** */
  }
  .author-avatar {
    width: 32px; 
    height: 32px;
    margin-right: 0 !important; /* 強制移除右側間距 */
  }
  .blog-authors a {
    font-size: 0.9em; 
    margin: 0 !important;
    padding: 0 !important;
    display: flex; 
    flex-direction: column; 
    align-items: center; 
  }
  .blog-articles-grid {
  padding-top: 0.5rem; /* 增加標題上方間距 */
  }
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
}
</style>

<style>
.vp-doc h2 {
  border-top: none !important;
  padding-top: 0 !important;
  margin-top: 32px !important;
}
main,
.VPContent,
.VPContent .content-container,
.VPDoc .content-container,
[class*="VPContent"],
[class*="content-container"] {
  border-top: none !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>