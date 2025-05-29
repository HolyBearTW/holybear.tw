---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed, nextTick } from 'vue' // 導入 nextTick
// 1. 從 .vitepress/theme/posts.data.ts 導入文章資料
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

// 2. 日期格式化函數，確保與文章頁面顯示一致
function formatDateExactlyLikePostPage(dateStringInput) {
  // 處理無效輸入 (null, undefined, 空白字串)
  if (dateStringInput === null || dateStringInput === undefined) {
    return '';
  }
  const dateString = String(dateStringInput).trim(); // 轉換為字串並移除頭尾空白
  if (!dateString) {
    return ''; // 如果是空字串，則不顯示
  }

  // 判斷原始字串是否包含時間特徵 (例如冒號)
  const containsTimeChars = dateString.includes(':');

  // 解析日期字串
  const date = new Date(dateString);

  // 檢查日期是否有效
  if (isNaN(date.getTime())) {
    return ''; // 如果日期無效，返回空字串
  }

  // 決定是否有實際指定的時間
  const hasSpecifiedTime = containsTimeChars;

  // 轉換到台北時區 (Asia/Taipei)
  const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

  // 再次檢查轉換後的 twDate 是否有效
  if (isNaN(twDate.getTime())) {
    return '';
  }

  const yyyy = twDate.getFullYear();
  const mm = String(twDate.getMonth() + 1).padStart(2, '0'); // 月份是從 0 開始的，所以要 +1
  const dd = String(twDate.getDate()).padStart(2, '0');

  // 根據是否有指定時間來格式化輸出
  if (hasSpecifiedTime) {
    const hh = String(twDate.getHours()).padStart(2, '0');
    const min = String(twDate.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`; // 顯示日期和時間
  } else {
    return `${yyyy}-${mm}-${dd}`; // 只顯示日期
  }
}

// 分頁邏輯設定
const postsPerPage = 10 // 每頁顯示的文章數量
const currentPage = ref(1) // 當前頁碼，預設為第一頁

// 計算總頁數
const totalPages = computed(() => {
  // 確保 allPosts 存在且是陣列，防止空值錯誤
  if (!allPosts || !Array.isArray(allPosts)) return 0;
  return Math.ceil(allPosts.length / postsPerPage);
})

// 計算當前頁要顯示的文章
const paginatedPosts = computed(() => {
  // 確保 allPosts 存在且是陣列
  if (!allPosts || !Array.isArray(allPosts)) return [];
  const start = (currentPage.value - 1) * postsPerPage // 起始索引
  const end = start + postsPerPage // 結束索引
  return allPosts.slice(start, end) // 截取陣列
})

// 跳轉到指定頁面
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    // 使用 nextTick 確保 DOM 更新後再執行滾動，避免 SSR 錯誤
    nextTick(() => {
      if (typeof window !== 'undefined') { // 再次確認是否在瀏覽器環境
        window.scrollTo({ top: 0, behavior: 'smooth' }) // 平滑滾動到頁面頂部
      }
    })
  }
}

// 計算分頁按鈕的頁碼列表
const pageNumbers = computed(() => {
  const pages = []
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i)
  }
  return pages
})
</script>

<template>
  <div class="blog-list-container">
    <h1>部落格文章</h1>

    <div v-if="paginatedPosts.length > 0" class="post-cards-wrapper">
      <div v-for="post in paginatedPosts" :key="post.url" class="post-card">
        <a :href="post.url" class="post-link">
          <div class="post-image-wrapper">
            <img :src="post.image" :alt="post.title" class="post-image" />
          </div>
          <div class="post-content">
            <h2 class="post-title">{{ post.title }}</h2>
            <p v-if="post.date" class="post-date">
              <time :datetime="post.date">{{ formatDateExactlyLikePostPage(post.date) }}</time>
            </p>
            <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
            <div v-if="post.tags && post.tags.length > 0" class="post-tags">
              <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
          </div>
        </a>
      </div>
    </div>
    <div v-else class="no-posts-message">
      <p>目前沒有任何部落格文章可以顯示。</p>
      <p>請確認您的文章檔案路徑和篩選條件是否正確。</p>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
        class="pagination-button"
      >
        上一頁
      </button>
      <button
        v-for="page in pageNumbers"
        :key="page"
        @click="goToPage(page)"
        :class="['pagination-button', { active: page === currentPage }]"
      >
        {{ page }}
      </button>
      <button
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
        class="pagination-button"
      >
        下一頁
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 部落格列表容器樣式 */
.blog-list-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 40px;
  color: var(--vp-c-text-1); /* 使用 VitePress 變數定義文字顏色 */
}

/* 文章卡片網格佈局 */
.post-cards-wrapper {
  display: grid;
  gap: 30px; /* 卡片間距 */
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* 響應式網格，最小 300px，自動填滿 */
  margin-bottom: 40px;
}

/* 單篇文章卡片樣式 */
.post-card {
  background-color: var(--vp-c-bg-soft); /* 使用 VitePress 變數定義背景色 */
  border-radius: 8px;
  box-shadow: var(--vp-shadow-1); /* 使用 VitePress 變數定義陰影 */
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease; /* 平滑過渡效果 */
  display: flex;
  flex-direction: column; /* 內容垂直排列 */
}

.post-card:hover {
  transform: translateY(-5px); /* 滑鼠懸停時上移 */
  box-shadow: var(--vp-shadow-2); /* 滑鼠懸停時加深陰影 */
}

.post-link {
  text-decoration: none; /* 移除下劃線 */
  color: inherit; /* 繼承父元素顏色 */
  display: flex;
  flex-direction: column;
  height: 100%; /* 確保連結填滿卡片高度 */
}

/* 圖片容器與圖片樣式 */
.post-image-wrapper {
  width: 100%;
  padding-top: 56.25%; /* 16:9 比例 (高 / 寬 = 9 / 16 = 0.5625) */
  position: relative;
  overflow: hidden;
}

.post-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保持圖片比例並填滿容器 */
  transition: transform 0.3s ease; /* 平滑過渡效果 */
}

.post-card:hover .post-image {
  transform: scale(1.05); /* 滑鼠懸停時圖片放大 */
}

/* 文章內容區塊樣式 */
.post-content {
  padding: 20px;
  flex-grow: 1; /* 內容區塊彈性成長，填滿剩餘空間 */
  display: flex;
  flex-direction: column;
}

.post-title {
  font-size: 1.5em;
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--vp-c-brand-1); /* 使用 VitePress 品牌色 */
  line-height: 1.3;
}

.post-date {
  font-size: 0.9em;
  color: var(--vp-c-text-2); /* 次要文字顏色 */
  margin-bottom: 15px;
}

.post-summary {
  font-size: 1em;
  color: var(--vp-c-text-1); /* 主要文字顏色 */
  line-height: 1.6;
  margin-bottom: 15px;
  flex-grow: 1; /* 摘要彈性成長 */
  overflow: hidden; /* 隱藏超出內容 */
  display: -webkit-box; /* 實現多行文字截斷 */
  -webkit-line-clamp: 3; /* 限制摘要顯示三行 */
  -webkit-box-orient: vertical;
}

/* 標籤樣式 */
.post-tags {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap; /* 標籤換行 */
  gap: 8px; /* 標籤間距 */
}

.tag {
  background-color: var(--vp-c-badge-tip-bg); /* 使用 VitePress 提示標籤背景色 */
  color: var(--vp-c-badge-tip-text); /* 使用 VitePress 提示標籤文字顏色 */
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85em;
  white-space: nowrap; /* 避免標籤文字換行 */
}

/* 沒有文章時的提示訊息 */
.no-posts-message {
  text-align: center;
  padding: 50px 0;
  color: var(--vp-c-text-2);
}

/* 分頁導航樣式 */
.pagination {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center;
  margin-top: 50px;
  gap: 10px; /* 按鈕間距 */
}

.pagination-button {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider); /* 分隔線顏色 */
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--vp-c-bg-alt); /* 滑鼠懸停時背景色 */
  border-color: var(--vp-c-brand-1); /* 滑鼠懸停時邊框顏色 */
}

.pagination-button.active {
  background-color: var(--vp-c-brand-1); /* 當前頁按鈕的背景色 */
  color: var(--vp-c-white); /* 當前頁按鈕的文字顏色 */
  border-color: var(--vp-c-brand-1);
}

.pagination-button:disabled {
  opacity: 0.5; /* 禁用時半透明 */
  cursor: not-allowed; /* 禁用時滑鼠樣式 */
}
</style>
