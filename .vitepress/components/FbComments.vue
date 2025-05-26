<template>
  <div v-if="hydrated">
    <div id="fb-root"></div>
    <div class="fb-comments" :data-href="pageUrl" data-width="100%" data-numposts="10"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vitepress'

const hydrated = ref(false)
const route = useRoute()
const pageUrl = `https://holybear.me${route.path}`

onMounted(() => {
  hydrated.value = true
  if (window.FB) {
    window.FB.XFBML.parse()
  }
})
</script>
