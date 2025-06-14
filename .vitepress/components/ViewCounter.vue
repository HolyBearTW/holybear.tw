<template>
  <span class="view-count">
    <img src="/icon_fire-outline.svg" alt="人氣" class="fire-icon" title="人氣">
    {{ views === null ? "載入中..." : views }}
  </span>
</template>

<style scoped>
.view-count {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  line-height: 1;
  white-space: nowrap;
}
.fire-icon {
  width: 1em;
  height: 1em;
  display: block;
}
</style>

<script setup>
import { ref, onMounted, watch } from 'vue'
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

async function fetchViews(slug) {
  if (slug) {
    try {
      if (!hasCounted(slug)) {
        views.value = await incrementAndGetViews(slug)
        markCounted(slug)
      } else {
        // 只讀取，不加1
        views.value = await incrementAndGetViews(slug, { onlyRead: true })
      }
    } catch (e) {
      views.value = '錯誤'
      console.error('[ViewCounter] 讀取失敗:', e)
    }
  } else {
    views.value = '無slug'
    console.warn('[ViewCounter] slug 為空')
  }
}

onMounted(() => {
  fetchViews(props.slug)
})

watch(() => props.slug, (newSlug, oldSlug) => {
  if (newSlug && newSlug !== oldSlug) {
    fetchViews(newSlug)
  }
})
</script>
