---
layout: home
title: Blog
description: HolyBear and Friends' Blog

hero:
  name: "HolyBear's Blog"
  text: "Tech & Life"
  tagline: "Learning & Creating"
  image:
    src: /logo.png
    alt: HolyBearTW Blog
  actions:
    - theme: alt
      text: Jump to Bottom
      link: "#bottom"
    - theme: alt
      text: Back to Main Site
      link: "/en/"
---

<script setup lang="ts">


import { useAuthors } from '../../.vitepress/components/useAuthors.js'
import ArticleMeta from '../../.vitepress/theme/ArticleMeta.vue'
import PostMeta from '../../.vitepress/theme/PostMeta.vue'
import { data as allPosts } from '../../.vitepress/theme/en/post.data.ts'
import { watch as vueWatch, ref as vueRef, onMounted as vueOnMounted, onUnmounted as vueOnUnmounted } from 'vue'

const isOldVersion = vueRef(false)
const toggleVersion = () => {
  isOldVersion.value = !isOldVersion.value
  currentPage.value = 1
  window.scrollTo({ top: 0, behavior: 'auto' })
  // 若要同步 hash，請取消下行註解
  // window.location.hash = isOldVersion.value ? '#old' : ''
}

import { onMounted, onUnmounted, nextTick, ref, computed, watch } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
watch(() => route.path, () => {
  if (window.location.hash) window.location.hash = ''
})

// 呼叫 Composable，取得需要的共用資料和狀態
const { getAuthorMeta, authorsData, isEnglish } = useAuthors()

// 產生顯示用作者陣列
const displayAuthors = computed(() => {
  return Object.keys(authorsData).map(login => {
    const author = authorsData[login];
    return {
      login: login,
      url: author.url,
      name: isEnglish.value && author.name_en ? author.name_en : author.name
    }
  })
})

// 格式化日期為 YYYY-MM-DD 格式
const formatDate = (dateString: string) => {
  if (!dateString) return '未知日期'
  
  const date = new Date(dateString)
  
  // 檢查日期是否有效
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString)
    return '未知日期'
  }
  
  return date.toISOString().slice(0, 10)
}

const fallbackImg = '/blog_no_image.svg'

const onImgError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img && img.src !== fallbackImg) img.src = fallbackImg
}

// 使用原本的 posts 數據，而不是 import.meta.glob
const posts = allPosts.filter(
  post => Boolean(post)
).map(post => ({
  ...post,
  image: post.image || fallbackImg,
  tags: Array.isArray(post.tags) ? post.tags : (Array.isArray(post.tag) ? post.tag : (post.tag ? [post.tag] : [])),
  category: Array.isArray(post.category) ? post.category : (post.category ? [post.category] : [])
})).sort((a, b) => {
  // 依日期新到舊排序，無日期的排最後
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return b.date.localeCompare(a.date);
});

// 分頁邏輯
const postsPerPage = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(posts.length / postsPerPage))
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return posts.slice(start, end)
})

const goToPage = (page: number) => {
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

// 設置卡片動畫監聽的函數
const setupCardAnimations = async () => {
  await nextTick()
  
  const cards = document.querySelectorAll('.card')
  cards.forEach((card) => {
    const element = card as HTMLElement
    
    // 移除可能存在的舊監聽器和類
    element.classList.remove('animation-complete')
    
    // 監聽每張卡片的動畫完成事件
    element.addEventListener('animationend', () => {
      element.classList.add('animation-complete')
      // 強制觸發重排，確保樣式立即生效
      element.offsetHeight
    }, { once: true }) // 只監聽一次
  })
}

// 初始設置
onMounted(() => {
  setupCardAnimations()
  document.body.classList.add('blog-index-page')
})

onUnmounted(() => {
  document.body.classList.remove('blog-index-page')
})

// 監聽當前頁變化，重新設置動畫
watch(currentPage, async () => {
  // 等待 DOM 更新完成後再設置動畫
  await nextTick()
  setTimeout(setupCardAnimations, 50) // 添加小延遲確保 DOM 完全更新
})
</script>


<!-- 新增 blog-header-row header 區塊 -->
<div class="blog-header-row" :class="{ 'with-divider': isOldVersion }">
  <h2 class="blog-title">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
    <span>{{ isEnglish ? 'Blog' : '日誌' }}</span>
  </h2>
  <div class="blog-authors">
    <strong>{{ isEnglish ? 'Authors:' : '作者群：' }}</strong>
    <span
      v-for="author in displayAuthors"
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
  <div class="blog-header-actions">
    <a
      @click.prevent="toggleVersion"
      href="#"
      class="new-post-btn switch-version-btn"
      style="margin-right: 0.5em;"
    >
  {{ isOldVersion ? 'New List' : 'Old List' }}
    </a>
    <a
      class="new-post-btn"
      href="https://github.com/HolyBearTW/holybear.tw/new/main/blog"
      target="_blank"
      rel="noopener"
    >➕ {{ isEnglish ? 'New Post' : '新增文章' }}</a>
  </div>
</div>

<div v-if="!isOldVersion" class="cards">
  <a v-for="post in paginatedPosts" :key="post.url" class="card" :href="post.url">
    <div class="thumb">
      <img :src="post.image"
           :alt="post.title"
           loading="lazy"
           @error="onImgError"
           style="object-fit: contain;" />
    </div>
    <ClientOnly>
      <div class="meta">
        <div class="title">{{ post.title }}</div>
        <div class="badges" v-if="post.category.length || post.tags.length">
          <!-- 類別標籤（主題色） -->
          <span v-for="c in post.category" :key="'cat-' + c" class="badge category">{{ c }}</span>
          <!-- TAG標籤（原樣式） -->
          <span v-for="t in post.tags" :key="'tag-' + t" class="badge tag">{{ t }}</span>
        </div>
        <div class="byline">
          <ArticleMeta :author="post.author" :date="post.date" />
        </div>
        <p class="desc" v-if="post.summary">{{ post.summary }}</p>
      </div>
    </ClientOnly>
  </a>
</div>
<!-- 舊版文章列表區塊 -->
<div v-else class="blog-articles-grid old-version">
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
        <ClientOnly>
          <PostMeta :post="post" />
        </ClientOnly>
        <div v-if="post.excerpt" class="post-excerpt" v-html="post.excerpt"></div>
        <span class="read-more">{{ isEnglish ? 'Read More' : '繼續閱讀' }} &gt;</span>
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

<!-- 底部錨點 -->
<div id="bottom"></div>

<style scoped>
/* 橫向排列，標題、作者群、按鈕同層，底部齊平 */
/* blog-header-row 樣式調整，讓作者群不會被擠到左側、讓作者群靠左、按鈕靠右，不受按鈕字數影響 */
.blog-header-row {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 2.2rem;
  margin-bottom: 0.5rem;
  flex-wrap: nowrap;
  flex-direction: row;
  position: unset;
}
.blog-header-actions {
  display: flex;
  align-items: flex-end;
  gap: 0.5em;
  margin-bottom: 0;
  margin-left: auto;
}

/* 切換按鈕沿用 new-post-btn 樣式，僅調整 margin-right */
.switch-version-btn {
  margin-right: 0.1em;
}
/* TAG 標籤顏色統一區塊（含主色、淺色、深色） */
/* 統一卡片下方 tag 標籤樣式（深灰底、淺灰字、深灰邊框） */
/* 只覆蓋顏色，形狀完全繼承 .badge，確保 tag 與 category 標籤一致 */
/* 只保留一組，與內頁同步，確保 specificity 正確 */
.badge.tag {
  background: #eaf4fb !important;
  color: #2077c7 !important;
  border: 1px solid #b5d0ea !important;
}
.dark .badge.tag {
  background: #23263a !important;
  color: #b5c6e0 !important;
  border: 1px solid #3b3b3b !important;
}
.dark .card {
  background: #1c1c1c !important;
  border-color: #2a2a2a !important;
}
/* 頁面作者群（沿用 blog/index.md 風格的精簡版） */
.cards { 
  display: grid; 
  grid-template-columns: 1fr; 
  gap: 16px; 
}

/* 平板以上：保持原有的水平佈局 */
@media (min-width: 720px) { 
  .cards { 
    gap: 20px; 
  } 
}

/* 卡片響應式設計 */
/* 與 index_backup.md 完全同步的卡片樣式 */
.card {
  display: flex; 
  align-items: stretch; 
  gap: 16px; 
  padding: 16px; 
  border-radius: 14px; 
  background: #F9F6F2 !important;
  border: 1px solid #e5e2da !important;
  color: #222 !important;
  min-height: 144px; 
  text-decoration: none; 
  color: inherit; 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* 進場動畫 - 初始狀態 */
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.6s ease forwards;
}

/* 手機版：保持水平佈局但調整尺寸 */
@media (max-width: 719px) {
  .card {
    flex-direction: row; /* 保持水平排列 */
    align-items: center; /* 確保垂直置中對齊 */
    gap: 12px;
    padding: 12px;
    min-height: auto;
  }
  
  .card .thumb {
    width: 100px !important; /* 縮小但保持在左邊 */
    height: 100px !important;
    margin: 0 !important;
    flex-shrink: 0;
    align-self: center !important; /* 垂直置中對齊 */
  }
  
  .card .meta {
    width: auto !important;
    flex: 1 !important;
    align-self: center !important; /* 垂直置中對齊 */
  }
  
  .card .title {
    font-size: 18px !important; /* 增大標題字體 */
    line-height: 1.3 !important;
    margin-bottom: 8px !important;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    white-space: normal;
    max-height: 2.8em;
    padding-bottom: 0.2em;
  }
  @media (max-width: 767px) {
    .card .title {
      font-size: 1.05rem !important;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      white-space: normal;
      max-height: 2.3em;
      line-height: 1.15 !important;
      padding-bottom: 0.18em;
    }
  }
  
  .card .badges {
    margin-bottom: 8px !important;
  }
  
  .card .badge {
    font-size: 11px !important;
    padding: 4px 8px !important;
  }
  
  .card .byline {
    font-size: 13px !important;
  }
  
  .card .byline .avatar {
    width: 18px !important;
    height: 18px !important;
  }
  
  .card .desc {
    font-size: 13px !important;
    line-height: 1.4 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important; /* 限制最多顯示2行 */
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
  }
}

/* 動畫完成後的狀態 - 這時才允許懸停效果 */
.card.animation-complete {
  animation: none !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
  /* 確保 transition 立即生效 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 滑鼠移入效果與 index_backup.md 完全一致 */
.card.animation-complete:hover {
  transform: translateY(-4px) scale(1.02) !important;
  border-color: var(--vp-c-brand) !important;
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.card.animation-complete:hover .title {
  color: var(--vp-c-brand) !important;
}

/* 手機版：禁用懸停效果 */
@media (max-width: 719px) {
  .card.animation-complete:hover {
    transform: none !important;
    border-color: #2a2a2a !important;
    box-shadow: none !important;
  }
  
  .card.animation-complete:hover .title {
    color: var(--vp-c-text-1) !important;
  }
}

/* 為每張卡片添加延遲效果，讓它們依序出現 */
.card:nth-child(1) { animation-delay: 0.1s; }
.card:nth-child(2) { animation-delay: 0.2s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.4s; }
.card:nth-child(5) { animation-delay: 0.5s; }
.card:nth-child(6) { animation-delay: 0.6s; }
.card:nth-child(7) { animation-delay: 0.7s; }
.card:nth-child(8) { animation-delay: 0.8s; }
.card:nth-child(9) { animation-delay: 0.9s; }
.card:nth-child(10) { animation-delay: 1.0s; }

/* 定義進場動畫關鍵幀 */
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


/* 原本的懸停動畫（針對沒有 animation-complete 類的卡片，暫時禁用） */
.card:hover:not(.animation-complete) { 
  /* 進場動畫期間不要懸停效果 */
}

/* 移除重複的懸停效果定義 */
.thumb { display: flex; width: 144px; height: 144px; overflow: hidden; border-radius: 12px; background: var(--vp-c-bg-soft); align-items: center; justify-content: center; flex-shrink: 0; }
.thumb img { max-width: 100%; max-height: 100%; object-fit: contain; object-position: center center; display: block; }
.meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 144px;
}

/* 手機版 meta 調整 */
@media (max-width: 719px) {
  .meta {
    height: auto !important;
    min-height: auto !important;
    justify-content: flex-start !important;
    padding: 8px 0;
  }
}
.title {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5em;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
}
.badges {
  margin-top: 0;
}
@media (max-width: 900px) {
  .title {
    margin-bottom: 0.8em;
  }
  .badges {
    margin-top: 0.3em;
  }
}
@media (max-width: 900px) {
  .title {
    font-size: 1.1rem;
    max-height: 2.2em;
  }
}
@media (max-width: 720px) {
  .title {
    font-size: 1rem;
    line-height: 1.15;
    max-height: 2em;
  }
}
.badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
/* 強制所有 badge 形狀完全一致 */
.badge,
.badge.category,
.badge.tag {
  font-size: 13px !important;
  line-height: 1 !important;
  padding: 8px 12px !important;
  border-radius: 999px !important;
}
.badge {
  background: #2a2a2a;
  color: #cce;
  border: 1px solid #3b3b3b;
}

/* 強制新版 category 標籤顏色與舊版一致，且不會被覆蓋 */
.cards .badges .badge.category {
  background: #e0f7fa !important;
  color: #00796b !important;
  border: 1.5px solid #00b8b8 !important;
  z-index: 1;
}
.dark .cards .badges .badge.category {
  background: #00363a !important;
  color: #4dd0e1 !important;
  border: 1.5px solid #00b8b8 !important;
  z-index: 1;
}
.badge.category {
  /* 只保留 shape，顏色與邊框交給下方高 specificity 控制 */
}
/* TAG 標籤顏色統一區塊（含主色、淺色、深色） */
/* 只覆蓋顏色，形狀完全繼承 .badge，確保 tag 與 category 標籤一致（與內頁同步） */
/* 已上移，避免重複與覆蓋 */
.byline { color: var(--vp-c-text-2); font-size: 0.9rem; display: flex; align-items: center; padding: 0 !important; line-height: 1 !important; height: 20px; gap: 4px; margin-bottom: 6px; }
.byline .author { display: inline-flex; align-items: center; color: var(--vp-c-brand-1); text-decoration: none; font-weight: 600; gap: 4px; }
.byline .author:hover { text-decoration: underline; }
.byline .avatar { width: 21px; height: 21px; border-radius: 50%; border: 1px solid #ddd; background: #fff; margin-right: 0; object-fit: cover; }
.byline .dot { opacity: .6; }
.desc { color: var(--vp-c-text-2); font-size: 14px; line-height: 1.3; margin: 0 !important; padding: 0; }

/* 分頁樣式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 2rem;
  padding: 1rem 0;
  flex-wrap: wrap;
}

.pagination-button {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 40px;
}

/* 手機版分頁樣式調整 */
@media (max-width: 719px) {
  .pagination {
    gap: 6px;
    padding: 0.8rem 0;
  }
  
  .pagination-button {
    padding: 10px 14px;
    font-size: 16px;
    min-width: 44px;
    min-height: 44px;
  }
}

.pagination-button:hover:not(:disabled),
.pagination-button.active {
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand);
}

.pagination-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-button:disabled:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}

/* --- blog-header-row 樣式 --- */
.blog-header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4rem;
  /* border-bottom: 1px dashed var(--vp-c-divider, #e5e5e5); */
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
/* 作者群整體縮小字體 */
/* 作者群整體縮小字體，並強制單行不換行，超出可橫向捲動 */
/* 英文作者名更小 */


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
  flex-shrink: 0;
}
.new-post-btn:hover {
  background: var(--vp-c-brand-dark);
  color: #000;
}
@media (max-width: 1259px) {
  .blog-header-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    /* border-bottom: 1px dashed var(--vp-c-divider, #e5e5e5); */
    margin-bottom: 0 !important;
    padding-top: 0.5rem !important;
    padding-bottom: 0.2rem !important;
    gap: 0 !important;
  }
  .blog-title {
    margin: 0 !important;
    flex-shrink: 0;
    order: 0;
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
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 !important;
    position: relative;
    top: -6px;
    order: 1;
  }
  .blog-authors {
    width: 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    justify-content: center;
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25em 0.25em;
    text-align: center;
    order: 2;
  }
  .blog-authors strong {
    white-space: nowrap;
    margin-right: 0 !important;
  }
  .author-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0.05em 0.25em !important;
  }
  .author-avatar {
    width: 32px;
    height: 32px;
    margin-right: 0 !important;
    margin-bottom: 3px !important;
  }
  .blog-authors a {
    font-size: 12px;
    margin: 0 !important;
    padding: 0 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

/* 響應式：手機和平板下 tag/category 標籤變小（scoped 內） */
@media (max-width: 900px) {
  .badge.tag,
  .badge.category {
    font-size: 12px !important;
    padding: 5px 9px !important;
  }
  .badges {
    margin-bottom: 4px !important;
    gap: 4px !important;
  }
  .title {
    margin-bottom: 0.3em !important;
  }
}

/* 舊版列表作者群下方虛線 */
.blog-authors.with-divider {
  border-bottom: 1.5px dashed var(--vp-c-divider, #e5e5e5);
  padding-bottom: 0.3em;
  margin-bottom: 0.7em;
}

/* 舊版列表 blog-header-row 下方虛線分隔線 */
.blog-header-row.with-divider {
  border-bottom: 1.5px dashed var(--vp-c-divider, #e5e5e5);
  padding-bottom: 0.3em;
  margin-bottom: 0.7em;
}
</style>
<!-- 舊版文章列表專用樣式 -->
<style scoped>
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
.post-title, .post-info .post-title {
  border-top: none !important;
  padding-top: 0;
  margin-top: 0 !important;
  margin-bottom: 0.2rem !important;
  font-size: 1.3rem;
  line-height: 1.3;
  color: var(--vp-c-text-1);
  font-weight: 700;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  word-break: break-word;
  white-space: normal;
  max-height: 2.6em;
}
.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.5;
  font-size: 0.95rem;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
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
  margin-top: 0 !important;
  margin-bottom: 0;
}
.read-more:hover {
  text-decoration: underline;
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
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    white-space: normal;
    max-height: 2.1em;
    line-height: 1.05;
  }
  .post-excerpt {
    font-size: 0.92rem;
    -webkit-line-clamp: 2;
  }
}
</style>

<style>

</style>

<style>
body.blog-index-page .vp-doc h2 {
  border-top: none !important;
  padding-top: 0 !important;
  margin-top: 0 !important;
}
body.blog-index-page main,
body.blog-index-page .VPContent,
body.blog-index-page .VPContent .content-container,
body.blog-index-page .VPDoc .content-container,
body.blog-index-page [class*="VPContent"],
body.blog-index-page [class*="content-container"] {
  border-top: none !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>

<style>
  /* 舊版列表 category 標籤 shape 與新版一致，並有淺色/深色差異 */
body.blog-index-page .blog-articles-grid .badge.category,
body.blog-index-page .blog-articles-grid .category {
  display: inline-block;
  border-radius: 8px;
  border: 1.5px solid #00b8b8 !important;
  padding: 4px 12px;
  font-size: 0.95em;
  margin-right: 0.18em;
  margin-top: 0;
  margin-bottom: 0.2rem !important;
  line-height: 1.4;
  font-weight: 700;
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  height: auto;
  max-width: none;
  box-shadow: 0 1px 2px #0001;
  letter-spacing: 0.01em;
  transition: background 0.15s, color 0.15s, border 0.15s;
}
.blog-articles-grid .category {
  background: #e0f7fa !important;
  color: #00796b !important;
  border-radius: 8px;
  border: 1.5px solid #00b8b8 !important;
}
.dark .blog-articles-grid .category {
  background: #00363a !important;
  color: #4dd0e1 !important;
  border-radius: 8px;
  border: 1.5px solid #00b8b8 !important;
}
.blog-articles-grid .badge.category {
  background: #e0f7fa !important;
  color: #00796b !important;
  border: 1.5px solid #00b8b8 !important;
}
.dark .blog-articles-grid .badge.category {
  background: #00363a !important;
  color: #4dd0e1 !important;
  border: 1.5px solid #00b8b8 !important;
}
/* 響應式：手機和平板下 tag/category 標籤變小 */
@media (max-width: 900px) {
  .badge.tag,
  .badge.category {
    font-size: 11px !important;
    padding: 4px 8px !important;
  }
}
  </style>