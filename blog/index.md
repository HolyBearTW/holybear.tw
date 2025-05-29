---
layout: home
title: 部落格文章
description: 聖小熊的部落格文章列表
---

<script setup>
import { ref, computed } from 'vue'
// 1. 恢復從 .vitepress/theme/posts.data.ts 導入數據
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'

// 2. 使用先前調整好的日期格式化函數
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
    // console.warn(`[Blog Date] Invalid date string provided: ${dateStringInput}`);
    return ''; // 如果日期無效，返回空字串
  }

  // 決定是否有實際指定的時間
  const hasSpecifiedTime = containsTimeChars;

  // 轉換到台北時區 (Asia/Taipei)
  const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

  // 再次檢查轉換後的 twDate 是否有效
  if (isNaN(twDate.getTime())) {
    // console.warn(`[Blog Date] Invalid date after Asia/Taipei conversion for: ${dateStringInput}`);
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

// 分頁邏輯 (直接使用導入的 allPosts)
const postsPerPage = 10
const currentPage = ref(1)

// allPosts 從 .data.ts 導入時已具備響應性
const totalPages = computed(() => {
  // 確保 allPosts 存在且是陣列
  if (!allPosts || !Array.isArray(allPosts)) return 0;
  return Math.ceil(allPosts.length / postsPerPage);
})

const paginatedPosts = computed(() => {
  // 確保 allPosts 存在且是陣列
  if (!allPosts || !Array.isArray(allPosts)) return [];
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return allPosts.slice(start, end)
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
