---
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue' // 引入 onMounted
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

// 日期格式化函數 (保持不變)
function formatDateExactlyLikePostPage(dateStringInput) {
  if (dateStringInput === null || dateStringInput === undefined) {
    return '';
  }
  const dateString = String(dateStringInput).trim();
  if (!dateString) {
    return '';
  }
  const containsTimeChars = dateString.includes(':');
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }
  const hasSpecifiedTime = containsTimeChars;
  const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  if (isNaN(twDate.getTime())) {
    return '';
  }
  const yyyy = twDate.getFullYear();
  const mm = String(twDate.getMonth() + 1).padStart(2, '0');
  const dd = String(twDate.getDate()).padStart(2, '0');

  if (hasSpecifiedTime) {
    const hh = String(twDate.getHours()).padStart(2, '0');
    const min = String(twDate.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } else {
    return `${yyyy}-${mm}-${dd}`;
  }
}

const postsPerPage = 10
const currentPage = ref(1)

// 使用一個 ref 來保存實際的文章數據，只在客戶端載入後才賦值
const clientPosts = ref([]); 

// totalPages 和 paginatedPosts 的計算將依賴 clientPosts
const totalPages = computed(() => {
  if (!clientPosts.value || !Array.isArray(clientPosts.value)) return 0;
  return Math.ceil(clientPosts.value.length / postsPerPage);
})

const paginatedPosts = computed(() => {
  if (!clientPosts.value || !Array.isArray(clientPosts.value)) return [];
  // 在這裡也對每個 post 進行一次額外的檢查，確保不會有 undefined 混入
  return clientPosts.value.slice(
    (currentPage.value - 1) * postsPerPage,
    (currentPage.value - 1) * postsPerPage + postsPerPage
  ).filter(post => post !== undefined && post !== null); // 確保過濾掉任何 undefined/null 的項目
})

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    if (!import.meta.env.SSR) {
      nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
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

// !!! 核心修正：在組件掛載後才將 allPosts 數據賦值給 clientPosts !!!
// 這樣可以確保在 SSR 階段，`clientPosts` 始終為空陣列，避免嘗試渲染不存在的數據。
onMounted(() => {
  if (!import.meta.env.SSR) { // 再次確認在客戶端執行
    clientPosts.value = allPosts; 
  }
});

</script>

<template>
  <div class="blog-list-container">
    <h1>部落格文章</h1>

    <div v-if="paginatedPosts.length > 0" class="post-cards-wrapper">
      <div v-for="post in paginatedPosts" :key="post.url" class="post-card">
        <a :href="post.url || '#'" class="post-link">
          <div class="post-image-wrapper">
            <img :src="post.image || '/blog_no_image.svg'" :alt="post.title || '無標題圖片'" class="post-image" />
          </div>
          <div class="post-content">
            <h2 class="post-title">{{ post.title || '無標題文章' }}</h2>
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
/* 樣式保持不變 */
.blog-list-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 40px;
  color: var(--vp-c-text-1);
}

.post-cards-wrapper {
  display: grid;
  gap: 30px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  margin-bottom: 40px;
}

.post-card {
  background-color: var(--vp-c-bg-soft);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-1);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
}

.post-card.error-card {
  background-color: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  border: 1px dashed var(--vp-c-divider);
  text-align: center;
  padding: 20px;
}


.post-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--vp-shadow-2);
}

.post-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.post-image-wrapper {
  width: 100%;
  padding-top: 56.25%; /* 16:9 比例 */
  position: relative;
  overflow: hidden;
}

.post-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.post-card:hover .post-image {
  transform: scale(1.05);
}

.post-content {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.post-title {
  font-size: 1.5em;
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--vp-c-brand-1);
  line-height: 1.3;
}

.post-date {
  font-size: 0.9em;
  color: var(--vp-c-text-2);
  margin-bottom: 15px;
}

.post-summary {
  font-size: 1em;
  color: var(--vp-c-text-1);
  line-height: 1.6;
  margin-bottom: 15px;
  flex-grow: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.post-tags {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background-color: var(--vp-c-badge-tip-bg);
  color: var(--vp-c-badge-tip-text);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85em;
  white-space: nowrap;
}

.no-posts-message {
  text-align: center;
  padding: 50px 0;
  color: var(--vp-c-text-2);
}

/* 分頁樣式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 50px;
  gap: 10px;
}

.pagination-button {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand-1);
}

.pagination-button.active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
