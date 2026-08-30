<script setup lang="ts">
import CalendarCard from './CalendarCard.vue'
import TimeWeatherCard from './TimeWeatherCard.vue'
import type { FuwariPost } from '../types'
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

defineProps<{ posts: FuwariPost[] }>()
</script>

<template>
  <aside class="fuwari-right-panel" :aria-label="en ? 'Blog information' : 'Blog 資訊側欄'">
    <TimeWeatherCard />
    <CalendarCard :posts="posts" />
  </aside>
</template>
