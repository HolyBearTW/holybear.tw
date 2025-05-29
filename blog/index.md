---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed } from 'vue'

// 1. 移除了從 '../.vitepress/theme/posts.data.ts' 的導入
// import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

// 2. 將 allPosts 初始化為一個 ref。
//    您需要自行決定如何填充 allPosts.value 的數據。
//    下方是一個示意，您需要用您的實際數據源替換。
const allPosts = ref([]) // 初始化為空陣列

// -------------------------------------------------------------------------
// 重要：您需要在此處或透過其他方式填充 `allPosts.value` 的數據。
// 例如，如果您選擇生成一個 JSON 檔案：
//
// import postsDataFromJson from './path/to/your/all-posts-data.json' // 假設您生成了這個 JSON
// allPosts.value = postsDataFromJson;
//
// 或者，如果您從 API 獲取 (注意這對 SSG 的影響)：
// import { onMounted } from 'vue'
// onMounted(async () => {
//   try {
//     const response = await fetch('/api/posts'); // 您的 API 端點
//     if (response.ok) {
//       allPosts.value = await response.json();
//     } else {
//       console.error('無法獲取文章列表');
//       allPosts.value = [];
//     }
//   } catch (error) {
//     console.error('獲取文章列表時發生錯誤:', error);
//     allPosts.value = [];
//   }
// });
//
// 請確保 `allPosts.value` 填充的數據結構與之前 `posts.data.ts` 提供的類似，
// 即一個物件陣列，每個物件至少包含 `url`, `title`, `date`, `image`, `excerpt` 等文章屬性。
// 並且，如果您的頁面需要靜態生成 (SSG)，這個數據需要在建構時可用。
// -------------------------------------------------------------------------


// 3. 日期格式化函數 (與先前修改後的版本相同)
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
  // 轉換到台北時區
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

// 分頁邏輯 (現在依賴於 ref allPosts.value)
const postsPerPage = 10
const currentPage = ref(1)

const totalPages = computed(() => {
  if (!allPosts.value) return 0; // 防禦性檢查
  return Math.ceil(allPosts.value.length / postsPerPage);
})

const paginatedPosts = computed(() => {
  if (!allPosts.value) return []; // 防禦性檢查
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return allPosts.value.slice(start, end)
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
