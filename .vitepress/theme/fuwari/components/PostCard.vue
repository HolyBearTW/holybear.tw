<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { withBase } from 'vitepress'
import { computed } from 'vue'
import { useData } from 'vitepress'
import type { FuwariPost } from '../types'
import PostMeta from './PostMeta.vue'
import AuthorMeta from './AuthorMeta.vue'
import ViewCounter from '../../../components/ViewCounter.vue'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

// Ported from Fuwari: src/components/PostCard.astro
// CollectionEntry/render() is replaced by the PoC's typed local data.
defineProps<{ entry: FuwariPost; animationDelay?: number }>()
defineEmits<{
  'select-category': [category: string]
  'select-tag': [tag: string]
}>()

function useFallbackImage(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  image.src = withBase('/blog_no_image.svg')
}
</script>

<template>
  <article class="fuwari-post-card fuwari-card-base fuwari-onload" :style="{ '--fuwari-animation-delay': `${animationDelay || 0}ms` }">
    <div class="fuwari-post-card__body">
      <a class="fuwari-post-card__title" :href="withBase(entry.url)">
        <span>{{ entry.title }}</span>
        <ArrowRight class="fuwari-post-card__arrow" :size="26" aria-hidden="true" />
      </a>
      <div class="fuwari-post-card__meta">
        <AuthorMeta :author="entry.author" />
        <PostMeta
          :published="entry.published"
          :updated="entry.updated"
          :tags="entry.tags"
          :category="entry.category"
          hide-tags-for-mobile
          hide-update-date
          interactive
          @select-category="$emit('select-category', $event)"
          @select-tag="$emit('select-tag', $event)"
        />
      </div>
      <p class="fuwari-post-card__description">{{ entry.description }}</p>
      <p class="fuwari-post-card__reading">
        <span>{{ entry.words.toLocaleString() }} {{ en ? 'words' : '字' }}</span>
        <span aria-hidden="true">|</span>
        <span>{{ en ? 'about' : '約' }} {{ entry.minutes }} {{ en ? 'min read' : '分鐘' }}</span>
        <span aria-hidden="true">|</span>
        <ClientOnly><ViewCounter :slug="entry.slug" read-only /></ClientOnly>
      </p>
    </div>
    <a class="fuwari-post-card__cover" :href="withBase(entry.url)" :aria-label="entry.title">
      <img :src="withBase(entry.image)" :alt="en ? `${entry.title} cover` : `${entry.title}封面`" loading="lazy" @error="useFallbackImage">
      <span class="fuwari-post-card__cover-action" aria-hidden="true"><ArrowRight :size="42" /></span>
    </a>
  </article>
</template>
