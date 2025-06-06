<template>
  <span class="view-count">
    <img src="/icon_fire-outline.svg" width="18" height="18" alt="人氣" style="vertical-align:middle; margin-right: 4px;">
    {{ views === null ? "載入中..." : views }}
  </span>
</template>

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
