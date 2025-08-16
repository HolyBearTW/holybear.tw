<template>
  <Teleport to="body">
    <div
      v-if="showModal && props.introFinished"
      class="migration-modal-overlay"
      @click="closeModal"
    >
      <div
        class="migration-modal"
        @click.stop
      >
        <!-- 關閉按鈕 -->
        <button
          class="close-btn"
          @click="closeModal"
          aria-label="關閉"
        >
          ✕
        </button>

        <!-- 標題 -->
        <h2 class="modal-title">
          🎉 重大消息！聖小熊搬家啦！
        </h2>

        <!-- 內容 -->
        <div class="modal-content">
          <p class="announcement">
            各位鄉民！本熊正式宣布：
          </p>
          
          <div class="highlight-box">
            <strong>🏠 新家網址：holybear.tw</strong>
          </div>

          <p class="description">
            經過深思熟慮（其實就是想要個酷炫的域名啦 😎），<br>
            聖小熊決定從舊窩搬到新窩了！
          </p>

          <div class="features">
            <div class="feature-item">
              <span class="emoji">⚡</span>
              <span>更快的載入速度</span>
            </div>
            <div class="feature-item">
              <span class="emoji">🎨</span>
              <span>更美的介面設計</span>
            </div>
            <div class="feature-item">
              <span class="emoji">🔧</span>
              <span>更穩定的技術架構</span>
            </div>
          </div>

          <p class="ps">
            P.S. 舊的連結都會自動跳轉，不用擔心找不到路～
          </p>
        </div>

        <!-- 按鈕區域 -->
        <div class="modal-actions">
          <button
            class="btn-primary"
            @click="closeModal"
          >
            知道了！歡迎回家 🏡
          </button>
          <button
            class="btn-secondary"
            @click="closeModalForever"
          >
            別再提醒了
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

// 接收進場動畫完成狀態
const props = defineProps({
  introFinished: {
    type: Boolean,
    default: false
  }
})

const showModal = ref(false)

// 檢查是否應該顯示彈窗
const shouldShowModal = () => {
  if (typeof window === 'undefined') return false
  
  // 設定截止日期：2025年10月1日
  const endDate = new Date('2025-10-01')
  const today = new Date()
  
  // 如果已經過了截止日期就不顯示
  if (today >= endDate) return false
  
  const lastShown = localStorage.getItem('migration-notice-last-shown')
  const neverShow = localStorage.getItem('migration-notice-never-show')
  
  // 如果用戶選擇了永遠不顯示
  if (neverShow === 'true') return false
  
  // 如果今天已經顯示過了就不顯示
  if (lastShown) {
    const lastShownDate = new Date(lastShown)
    
    // 檢查是否是同一天
    if (
      lastShownDate.getFullYear() === today.getFullYear() &&
      lastShownDate.getMonth() === today.getMonth() &&
      lastShownDate.getDate() === today.getDate()
    ) {
      return false
    }
  }
  
  return true
}

// 關閉彈窗
const closeModal = () => {
  showModal.value = false
  // 記錄今天已經顯示過
  localStorage.setItem('migration-notice-last-shown', new Date().toISOString())
}

// 永久關閉彈窗
const closeModalForever = () => {
  showModal.value = false
  localStorage.setItem('migration-notice-never-show', 'true')
  localStorage.setItem('migration-notice-last-shown', new Date().toISOString())
}

onMounted(() => {
  // 等待進場動畫完成後再檢查是否需要顯示彈窗
  checkAndShowModal()
})

// 監聽進場動畫狀態變化
watch(() => props.introFinished, (finished) => {
  if (finished) {
    checkAndShowModal()
  }
})

// 檢查並顯示彈窗的函數
const checkAndShowModal = () => {
  // 只有在進場動畫完成後才檢查
  if (!props.introFinished) return
  
  // 延遲一點顯示，避免影響頁面載入
  setTimeout(() => {
    if (shouldShowModal()) {
      showModal.value = true
    }
  }, 1000)
}
</script>

<style scoped>
.migration-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 8888;
  animation: fadeIn 0.3s ease-out;
}

.migration-modal {
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-brand);
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideUp 0.3s ease-out;
  padding: 0;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.modal-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin: 0;
  padding: 24px 24px 16px 24px;
  color: var(--vp-c-brand);
  background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-bg));
  border-radius: 14px 14px 0 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.modal-content {
  padding: 24px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.announcement {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 20px 0;
  color: var(--vp-c-brand);
}

.highlight-box {
  background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-brand-softer));
  border: 2px solid var(--vp-c-brand);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin: 20px 0;
  font-size: 20px;
  font-weight: bold;
  color: var(--vp-c-brand-dark);
  animation: pulse 2s infinite;
}

.description {
  text-align: center;
  margin: 20px 0;
  font-size: 16px;
}

.features {
  margin: 20px 0;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  font-size: 16px;
}

.emoji {
  font-size: 20px;
  margin-right: 12px;
  width: 28px;
  text-align: center;
}

.ps {
  font-size: 14px;
  color: var(--vp-c-text-2);
  text-align: center;
  margin: 20px 0 0 0;
  font-style: italic;
}

.modal-actions {
  padding: 0 24px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.btn-primary {
  background: var(--vp-c-brand);
  color: black;
}

.btn-primary:hover {
  background: var(--vp-c-brand-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 238, 0.3);
}

.btn-secondary {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-default);
  color: var(--vp-c-text-1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* 響應式設計 */
@media (max-width: 640px) {
  .migration-modal {
    width: 95%;
    margin: 20px;
  }
  
  .modal-title {
    font-size: 20px;
    padding: 20px 20px 12px 20px;
  }
  
  .modal-content {
    padding: 20px;
  }
  
  .highlight-box {
    font-size: 18px;
    padding: 12px;
  }
  
  .description {
    font-size: 15px;
  }
  
  .feature-item {
    font-size: 15px;
  }
  
  .modal-actions {
    padding: 0 20px 20px 20px;
  }
}

/* 暗色模式優化 */
.dark .migration-modal {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.dark .highlight-box {
  background: linear-gradient(135deg, var(--vp-c-brand-dimm), var(--vp-c-bg-soft));
  color: var(--vp-c-brand);
}
</style>
