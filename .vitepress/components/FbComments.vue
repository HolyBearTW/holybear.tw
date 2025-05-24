<template>
  <div>
    <div id="fb-root"></div>
    <div class="fb-comments" :data-href="pageUrl" data-width="100%" data-numposts="10"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vitepress' // 引入 useRoute

// 取得當前頁面的完整 URL，這樣每個頁面都會有獨立的留言串
const route = useRoute()
const pageUrl = `https://holybear.me${route.path}` // 確保這裡的域名是你的實際域名

onMounted(() => {
  // 檢查 window.FB 是否已經存在 (表示 Facebook SDK 已載入)
  if (window.FB) {
    // 如果存在，就解析留言外掛
    window.FB.XFBML.parse();
    console.log('Facebook SDK 已載入並解析留言外掛。');
  } else {
    // 如果不存在，表示 SDK 可能還沒載入，或者載入失敗
    console.warn('Facebook SDK (window.FB) 尚未載入，請確認 .vitepress/config.mts 的設定。');
  }
});
</script>

<style scoped>
</style>
