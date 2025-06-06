<template>
  <span class="view-count">
    | 瀏覽次數：{{ views === null ? "載入中..." : views }}
  </span>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { incrementAndGetViews } from './view-count'
const props = defineProps({ slug: String })
const views = ref(null)
onMounted(async () => {
  console.log('[ViewCounter] slug:', props.slug)
  if (props.slug) {
    try {
      views.value = await incrementAndGetViews(props.slug)
      console.log('[ViewCounter] views:', views.value)
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
