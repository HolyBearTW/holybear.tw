
<template>
  <div class="editor-loader-wrapper">
    <!-- Suspense 包裝異步組件 -->
    <Suspense>
      <!-- 主要內容: 異步載入的編輯器 -->
      <template #default>
        <VPEditor />
      </template>
      
      <!-- 載入中狀態 -->
      <template #fallback>
        <div class="editor-loading">
          <div class="loading-container">
            <div class="spinner"></div>
            <p class="loading-text">編輯器載入中...</p>
            <p class="loading-hint">正在初始化 TipTap 編輯器和相關擴展</p>
          </div>
        </div>
      </template>
    </Suspense>
    
    <!-- 錯誤邊界處理 -->
    <div v-if="loadError" class="editor-error">
      <div class="error-container">
        <i class="fas fa-exclamation-triangle error-icon"></i>
        <h3>編輯器載入失敗</h3>
        <p class="error-message">{{ loadError }}</p>
        <button @click="reloadEditor" class="reload-btn">
          <i class="fas fa-redo"></i>
          重新載入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, onErrorCaptured } from 'vue'

const loadError = ref<string>('')

// 異步載入 VPEditor 組件
const VPEditor = defineAsyncComponent({
  loader: () => import('./VPEditor.vue'),
  
  // 載入延遲 (ms) - 如果在此時間內載入完成,不會顯示 loading 狀態
  delay: 200,
  
  // 超時時間 (ms)
  timeout: 10000,
  
  // 錯誤處理
  onError(error, retry, fail) {
    console.error('❌ VPEditor 載入失敗:', error)
    loadError.value = error.message || '未知錯誤'
    fail() // 標記為失敗,不再重試
  },
})

// 捕獲組件錯誤
onErrorCaptured((error) => {
  console.error('❌ VPEditor 運行錯誤:', error)
  loadError.value = error.message || '編輯器運行時錯誤'
  return false // 阻止錯誤繼續傳播
})

// 重新載入編輯器
const reloadEditor = () => {
  loadError.value = ''
  window.location.reload()
}
</script>

<style scoped>
.editor-loader-wrapper {
  position: relative;
  min-height: 600px;
}

/* 載入中狀態 */
.editor-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 600px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

/* 載入動畫 - 旋轉圓圈 */
.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 1.5rem;
  border: 4px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 0.5rem 0;
}

.loading-hint {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* 錯誤狀態 */
.editor-error {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 600px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 2px dashed var(--vp-c-danger-1);
}

.error-container {
  text-align: center;
  padding: 3rem;
  max-width: 500px;
}

.error-icon {
  font-size: 3rem;
  color: var(--vp-c-danger-1);
  margin-bottom: 1rem;
}

.error-container h3 {
  font-size: 1.5rem;
  color: var(--vp-c-text-1);
  margin: 0 0 1rem 0;
}

.error-message {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  margin: 0 0 2rem 0;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border-left: 4px solid var(--vp-c-danger-1);
  text-align: left;
  font-family: 'Courier New', monospace;
}

.reload-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: var(--vp-c-brand-1);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.reload-btn:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--vp-c-brand-1), 0.3);
}

.reload-btn i {
  font-size: 1rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .loading-container,
  .error-container {
    padding: 2rem 1rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
  }

  .loading-text {
    font-size: 1rem;
  }

  .error-icon {
    font-size: 2.5rem;
  }

  .error-container h3 {
    font-size: 1.25rem;
  }

  .reload-btn {
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
  }
}

/* 載入動畫 - 淡入效果 */
.editor-loading,
.editor-error {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 暗色模式優化 */
.dark .spinner {
  border-color: var(--vp-c-bg-mute);
  border-top-color: var(--vp-c-brand-1);
}

.dark .error-message {
  background: var(--vp-c-bg-mute);
}
</style>
