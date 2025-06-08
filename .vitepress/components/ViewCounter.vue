<template>
  <div class="view-count-wrapper">
    <span class="view-count">
      <img src="/icon_fire-outline.svg" alt="人氣" class="fire-icon">
      {{ views === null ? "載入中..." : views }}
    </span>
  </div>
</template>

<style scoped>
.view-count-wrapper {
  /* 將 display: flex; 改為 inline-flex; */
  /* 這樣它就變成一個可以在行內排列的 flex 容器，不會強制換行 */
  display: inline-flex;
  justify-content: flex-end; /* 將內容推到最右邊 */

  /* 移除 width: 100%; */
  /* 因為 inline-flex 元素的寬度通常由內容決定，設定 100% 可能導致不預期的行為 */
  /* 除非它的父容器是 flex 並且你希望它佔據剩餘空間，否則通常不需要 */

  /* 如果這個組件在特定情境下需要撐滿父容器並靠右，
     則更建議在「引用這個組件的父層」來設定 display: flex;
     並在父層中對齊你的組件。
     但若要強行在此組件內實現，可能需要依賴外部父元素的寬度。 */
}

.view-count {
  display: inline-flex;
  align-items: center;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0;
  margin-bottom: 0.2rem;
  gap: 0.3em;             /* 讓 icon 跟數字自然有間距 */
  line-height: 1;         /* 行高固定，避免不同字級出現位移 */
  white-space: nowrap;    /* 防止自動換行 */
}
.fire-icon {
  width: 1em;             /* 跟文字一樣大，隨字級縮放 */
  height: 1em;
  display: block;         /* 避免 baseline 導致 icon 微微偏下或偏上 */
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
// 請確認這個路徑是否正確，通常會是 './utils/view-count' 或依你的專案結構而定
import { incrementAndGetViews } from './view-count'

const props = defineProps({ slug: String })
const views = ref(null)

function hasCounted(slug) {
  const seen = JSON.parse(localStorage.getItem('viewedSlugs') || '[]')
  return seen.includes(slug)
}
function markCounted(slug) {
  const seen = JSON.parse(localStorage.getItem('viewedSlugs') || '[]')
  if (!seen.includes(slug)) {
    seen.push(slug)
    localStorage.setItem('viewedSlugs', JSON.stringify(seen))
  }
}

onMounted(async () => {
  if (props.slug) {
    try {
      if (!hasCounted(props.slug)) {
        views.value = await incrementAndGetViews(props.slug)
        markCounted(props.slug)
      } else {
        // 只讀取，不加1
        views.value = await incrementAndGetViews(props.slug, { onlyRead: true })
      }
    } catch (e) {
      views.value = '錯誤'
      console.error('[ViewCounter] 讀取失敗:', e)
    }
  } else {
    views.value = '無slug'
    console.warn('[ViewCounter] slug 為空')
  }
})
</script>
