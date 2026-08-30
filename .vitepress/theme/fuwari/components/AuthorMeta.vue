<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { useAuthors } from '../../../components/useAuthors.js'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

const props = defineProps<{ author?: string | string[] }>()
const { getAuthorMeta } = useAuthors()
const authors = computed(() => {
  const identifiers = Array.isArray(props.author) ? props.author : [props.author || '聖小熊']
  return identifiers.map((identifier) => getAuthorMeta(String(identifier)))
})

function useFallback(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  image.src = withBase('/logo.png')
}
</script>

<template>
  <div class="fuwari-author-list" :aria-label="en ? 'Post authors' : '文章作者'">
    <a v-for="item in authors" :key="item.login || item.name" :href="item.url" target="_blank" rel="noopener">
      <img :src="item.login ? `https://github.com/${item.login}.png` : withBase('/logo.png')" :alt="item.name" @error="useFallback">
      <span>{{ item.name }}</span>
    </a>
  </div>
</template>
