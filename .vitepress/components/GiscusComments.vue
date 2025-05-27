<template>
  <div class="giscus-comments-container">
    <div v-if="!giscusLoaded" class="giscus-comments-placeholder">
      <p>正在載入留言...</p>
      <div class="spinner"></div>
    </div>

    <div v-show="giscusLoaded" ref="giscusContainer" class="giscus-actual-comments">
      </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useData } from 'vitepress' // 引入 useData 獲取主題亮暗模式

const giscusLoaded = ref(false) // 控制佔位符和實際 Giscus 區塊的顯示
const giscusContainer = ref(null) // 用來綁定 Giscus 腳本要插入的 DOM 元素
const route = useRoute()
const { isDark } = useData() // 獲取 VitePress 的亮暗模式狀態

// 計算頁面 URL，Giscus 用來映射到 Discussion
const pageUrl = `https://holybear.me${route.path}`; // 請確認您的網站基底 URL 是 holybear.me

// 根據 VitePress 的亮暗模式切換 Giscus 主題
const giscusTheme = computed(() => isDark.value ? 'dark_dimmed' : 'light'); // Giscus 支援的亮暗主題

onMounted(() => {
  // 確保 giscusContainer 已經掛載到 DOM
  if (giscusContainer.value) {
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';

    // ******** 請替換這裡的數據為您在 Giscus 網站上設定後，複製到的實際 ID！ ********
    // 例如：data-repo="您的GitHub帳號/您的儲存庫名稱"
    script.setAttribute('data-repo', 'HolyBearTW/holybear.me'); // 替換成您的 GitHub 儲存庫
    // 例如：data-repo-id="R_kgDO_something"
    script.setAttribute('data-repo-id', 'YOUR_REPOSITORY_ID_HERE'); // <<<<<< 請替換！

    // 例如：data-category="Comments"
    script.setAttribute('data-category', 'Comments'); // 替換成您的 Discussion 類別名稱
    // 例如：data-category-id="DIC_kwDO_something"
    script.setAttribute('data-category-id', 'YOUR_CATEGORY_ID_HERE'); // <<<<<< 請替換！
    // ********************************************************************************

    script.setAttribute('data-mapping', 'pathname'); // 頁面路徑映射到 Discussion
    script.setAttribute('data-strict', '0'); // 不嚴格匹配 Discussion 標題
    script.setAttribute('data-reactions-enabled', '1'); // 啟用反應
    script.setAttribute('data-emit-metadata', '0'); // 不發送額外元數據
    script.setAttribute('data-input-position', 'bottom'); // 輸入框在下方
    script.setAttribute('data-theme', giscusTheme.value); // 使用計算過的主題
    script.setAttribute('data-lang', 'zh-TW'); // 語言
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    giscusContainer.value.appendChild(script); // 將腳本添加到容器中

    // 一旦腳本加入 DOM，我們就認為 Giscus 已經開始載入，可以隱藏佔位符
    giscusLoaded.value = true;
  }

  // 監聽 VitePress 主題的亮暗模式變化，並通知 Giscus 更新主題
  watch(giscusTheme, (newTheme) => {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        giscus: {
          setConfig: {
            theme: newTheme
          }
        }
      }, 'https://giscus.app');
    }
  }, { immediate: true }); // 立即執行一次，確保初始主題正確
});
</script>

<style scoped>
.giscus-comments-container {
  min-height: 200px; /* 確保容器有最小高度，避免頁面跳動 */
  display: flex;
  flex-direction: column; /* 讓內容垂直排列 */
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative; /* 為了讓佔位符可以絕對定位在裡面 */
}

/* 載入中佔位符的樣式 */
.giscus-comments-placeholder {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg); /* 背景色與頁面背景色匹配 */
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1; /* 確保在載入時它在最上層 */
}

/* 實際 Giscus 留言板的容器樣式 */
.giscus-actual-comments {
  width: 100%; /* 讓它佔滿容器寬度 */
  /* Giscus 的 iframe 本身會處理高度，所以這裡不需要 min-height */
}

/* 簡單的載入動畫 Spinner */
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--vp-c-brand-1);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 10px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
