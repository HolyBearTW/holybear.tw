<template>
  <div class="fb-comments-container">
    <div v-if="!commentsReady" class="fb-comments-placeholder">
      <p>正在載入留言...</p>
      <div class="spinner"></div> </div>

    <div v-if="commentsReady" class="fb-comments-actual">
      <div id="fb-root"></div>
      <div class="fb-comments" :data-href="pageUrl" data-width="100%" data-numposts="10"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vitepress'

const commentsReady = ref(false) // 控制實際留言板是否已載入並準備好顯示
const route = useRoute()
const pageUrl = `https://holybear.me${route.path}` // 計算當前頁面的絕對 URL

onMounted(() => {
  // 這個函數會嘗試載入 Facebook 留言板
  const loadFbComments = () => {
    // 檢查 window.FB 是否已載入 (表示 Facebook SDK 已經準備好了)
    if (window.FB) {
      window.FB.XFBML.parse(); // 解析頁面上的 XFBML 標籤，載入留言板
      commentsReady.value = true; // 設定為 true，隱藏佔位符，顯示實際留言板
    } else {
      // 如果 window.FB 還沒準備好，則等待一小段時間 (500ms) 後再嘗試
      // 這是為了確保 SDK 有時間載入完成
      setTimeout(loadFbComments, 500);
    }
  };

  // 在元件掛載後立即觸發載入函數，讓留言板盡快開始載入
  loadFbComments();
});
</script>

<style scoped>
/* 留言板容器樣式 */
.fb-comments-container {
  min-height: 200px; /* 給予一個最小高度，避免頁面載入後內容跳動 */
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative; /* 為了讓佔位符可以絕對定位在裡面 */
}

/* 載入中佔位符的樣式 */
.fb-comments-placeholder {
  /* 讓佔位符絕對定位在容器中，確保它在載入前能佔據空間 */
  position: absolute; 
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg); /* 背景色與頁面背景色匹配 */
  text-align: center;
  color: var(--vp-c-text-2); /* 使用 VitePress 的次要文字顏色 */
  font-size: 0.9rem;
  display: flex; /* 讓內容 (文字和 spinner) 可以置中 */
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1; /* 確保在載入時它在最上層 */
}

/* 實際留言板載入後的容器樣式 */
.fb-comments-actual {
  width: 100%; /* 讓它佔滿容器寬度 */
  /* 如果您希望留言板載入後有額外間距，可以在這裡添加 padding 或 margin */
}

/* 簡單的載入動畫 Spinner */
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--vp-c-brand-1); /* 使用品牌色 */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite; /* 旋轉動畫 */
  margin: 10px auto; /* 置中 */
}

@keyframes spin {
  to { transform: rotate(360deg); } /* 定義旋轉動畫 */
}
</style>
