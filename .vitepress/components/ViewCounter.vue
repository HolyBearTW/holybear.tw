<template>
  <span class="view-count">
    | 瀏覽次數：{{ views === null ? "載入中..." : views }}
  </span>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { incrementAndGetViews } from '../firebase/view-count'
const props = defineProps({ slug: String })
const views = ref(null)
onMounted(async () => {
  if (props.slug) {
    views.value = await incrementAndGetViews(props.slug)
  }
})
</script>
