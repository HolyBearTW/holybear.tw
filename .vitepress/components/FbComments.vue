<template>
  <div>
    <div id="fb-root"></div>
    <div class="fb-comments" :data-href="pageUrl" data-width="100%" data-numposts="10"></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()
const pageUrl = ref('')

onMounted(() => {
  pageUrl.value = typeof window !== 'undefined' ? window.location.href : ''
  if (!document.getElementById('facebook-jssdk')) {
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/zh_TW/sdk.js#xfbml=1&version=v19.0'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  } else {
    // 重新渲染 comments plugin
    if (window.FB) window.FB.XFBML.parse()
  }
})
</script>
