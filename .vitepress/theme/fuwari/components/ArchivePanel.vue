<script setup lang="ts">
import { withBase } from 'vitepress'
import type { FuwariPost } from '../types'
import { formatDateToYYYYMMDD } from '../utils/date-utils'

defineProps<{ groups: { year: string; posts: FuwariPost[] }[] }>()
</script>

<template>
  <!-- Vue port of Fuwari ArchivePanel.svelte. -->
  <section class="fuwari-archive fuwari-card-base">
    <div v-for="group in groups" :key="group.year" class="fuwari-archive__year">
      <h2>{{ group.year }}</h2>
      <a v-for="post in group.posts" :key="post.url" :href="withBase(post.url)">
        <time>{{ formatDateToYYYYMMDD(post.published).slice(5) }}</time>
        <span>{{ post.title }}</span>
      </a>
    </div>
  </section>
</template>
