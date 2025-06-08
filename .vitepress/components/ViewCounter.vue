<template>
  <span class="view-count">
    <img src="/icon_fire-outline.svg" alt="人氣" class="fire-icon">
    {{ views === null ? "載入中..." : views }}
  </span>
</template>

<style scoped>
.view-count {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;    /* 靠右排列 */
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0;
  margin-bottom: 0.2rem;
  gap: 0.3em;                   /* icon與數字間距 */
  line-height: 1;               /* 行高固定 */
  white-space: nowrap;          /* 防止換行 */
  min-width: max-content;       /* 必須設寬，justify-content 才有效 */
}
.fire-icon {
  width: 1em;                   /* 隨字級縮放 */
  height: 1em;
  display: block;               /* baseline 對齊更好 */
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
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
