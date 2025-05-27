<template>
  <div class="giscus-comments-container">
    <div v-show="!giscusLoaded" class="giscus-comments-placeholder">
      <p>正在載入留言...</p>
      <div class="spinner"></div>
    </div>

    <div v-show="giscusLoaded" ref="giscusContainer" class="giscus-actual-comments">
      </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useData } from 'vitepress'

const giscusLoaded = ref(false)
const giscusContainer = ref(null)
const route = useRoute()
const { isDark } = useData()

const giscusTheme = computed(() => isDark.value ? 'dark_dimmed' : 'light')

// 注入 giscus script 的方法（可重複調用）
function loadGiscus() {
  if (giscusContainer.value) {
    giscusContainer.value.innerHTML = '' // 先清空舊 iframe
    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.setAttribute('data-repo', 'HolyBearTW/holybear.me')
    script.setAttribute('data-repo-id', 'R_kgDOJmguVg')
    script.setAttribute('data-category', 'General')
    script.setAttribute('data-category-id', 'DIC_kwDOJmguVs4Cqo90')
    script.setAttribute('data-mapping', 'pathname')
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'bottom')
    script.setAttribute('data-theme', giscusTheme.value)
    script.setAttribute('data-lang', 'zh-TW')
    script.setAttribute('crossorigin', 'anonymous')
    script.async = true
    giscusContainer.value.appendChild(script)
    giscusLoaded.value = true
  }
}

// 第一次進入頁面時載入
onMounted(() => {
  loadGiscus()
})

// 監聽路由變化，切換文章時重新載入 giscus
watch(() => route.path, () => {
  giscusLoaded.value = false
  loadGiscus()
})

// 監聽 dark mode 變化，動態切換主題
watch(giscusTheme, (newTheme) => {
  const iframe = document.querySelector('iframe.giscus-frame')
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      giscus: {
        setConfig: {
          theme: newTheme
        }
      }
    }, 'https://giscus.app')
  }
}, { immediate: true })
</script>

<style scoped>
.giscus-comments-container {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative;
}

.giscus-comments-placeholder {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg);
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.giscus-actual-comments {
  width: 100%;
}

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
