<script setup lang="ts">
import { Archive, House, Search, X } from 'lucide-vue-next'
import { computed } from 'vue'
import { useData } from 'vitepress'
import { taxonomyLabel } from '../utils/taxonomy'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

defineProps<{
  categories: { name: string; count: number }[]
  tags: string[]
  query: string
  category: string
  tag: string
  view: 'posts' | 'archive'
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:category': [value: string]
  'update:tag': [value: string]
  'update:view': [value: 'posts' | 'archive']
  clear: []
}>()
</script>

<template>
  <!-- Vue port of Typelin/fuwari Search.svelte + TagNavigation.astro. -->
  <section class="fuwari-toolbar fuwari-card-base" :aria-label="en ? 'Post filters and navigation' : '文章篩選與導覽'">
    <div class="fuwari-toolbar__views">
      <button :class="{ active: view === 'posts' }" @click="emit('update:view', 'posts')"><House :size="17" />{{ en ? 'Posts' : '文章' }}</button>
      <button :class="{ active: view === 'archive' }" @click="emit('update:view', 'archive')"><Archive :size="17" />{{ en ? 'Archive' : '歸檔' }}</button>
    </div>
    <label class="fuwari-search">
      <Search :size="18" aria-hidden="true" />
      <span class="fuwari-sr-only">{{ en ? 'Search posts' : '搜尋文章' }}</span>
      <input :value="query" type="search" :placeholder="en ? 'Search posts…' : '搜尋標題或摘要…'" @input="emit('update:query', ($event.target as HTMLInputElement).value)">
    </label>
    <select :value="category" :aria-label="en ? 'Category' : '分類'" @change="emit('update:category', ($event.target as HTMLSelectElement).value)">
      <option value="">{{ en ? 'All categories' : '全部分類' }}</option>
      <option v-for="item in categories" :key="item.name" :value="item.name">{{ taxonomyLabel(item.name, en) }} ({{ item.count }})</option>
    </select>
    <select :value="tag" :aria-label="en ? 'Tag' : '標籤'" @change="emit('update:tag', ($event.target as HTMLSelectElement).value)">
      <option value="">{{ en ? 'All tags' : '全部標籤' }}</option>
      <option v-for="item in tags" :key="item" :value="item">{{ taxonomyLabel(item, en) }}</option>
    </select>
    <button class="fuwari-toolbar__clear" type="button" :title="en ? 'Clear filters' : '清除篩選'" @click="emit('clear')"><X :size="18" /></button>
  </section>
</template>
