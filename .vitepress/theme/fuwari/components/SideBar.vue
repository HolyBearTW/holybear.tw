<script setup lang="ts">
import type { FuwariProfile as ProfileData } from '../types'
import { computed } from 'vue'
import { useData } from 'vitepress'
import Profile from './Profile.vue'
import WidgetLayout from './WidgetLayout.vue'
import { taxonomyLabel } from '../utils/taxonomy'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

// Ported from Fuwari: src/components/widget/SideBar.astro
defineProps<{
  profile: ProfileData
  authors?: { key: string; name: string; count: number; avatar: string }[]
  categories: { name: string; count: number }[]
  tags: string[]
  collapseTags?: boolean
  selectedCategory?: string
  selectedTag?: string
  selectedAuthor?: string
}>()

const emit = defineEmits<{
  (event: 'select-category', category: string): void
  (event: 'select-tag', tag: string): void
  (event: 'select-author', author: string): void
}>()
</script>

<template>
  <aside class="fuwari-sidebar" :aria-label="en ? 'Blog sidebar' : 'Blog 側欄'">
    <Profile :config="profile" />
    <div class="fuwari-sidebar__sticky">
      <WidgetLayout v-if="authors?.length" :title="en ? 'Authors' : '作者'" collapsible>
        <ul class="fuwari-author-filter">
          <li v-for="author in authors" :key="author.key">
            <button
              type="button"
              :class="{ active: selectedAuthor === author.key }"
              :aria-pressed="selectedAuthor === author.key"
              @click="emit('select-author', author.key)"
            >
              <img :src="author.avatar" :alt="author.name">
              <span>{{ author.name }}</span>
              <strong>{{ author.count }}</strong>
            </button>
          </li>
        </ul>
      </WidgetLayout>
      <WidgetLayout :title="en ? 'Categories' : '分類'" collapsible>
        <ul class="fuwari-category-list">
          <li v-for="category in categories" :key="category.name">
            <button
              type="button"
              :class="{ active: selectedCategory === category.name }"
              :aria-pressed="selectedCategory === category.name"
              @click="emit('select-category', category.name)"
            >
              <span>{{ taxonomyLabel(category.name, en) }}</span><strong>{{ category.count }}</strong>
            </button>
          </li>
        </ul>
      </WidgetLayout>
      <WidgetLayout
        :title="en ? 'Tags' : '標籤'"
        :collapsible="collapseTags"
        :default-open="!collapseTags"
      >
        <div class="fuwari-tag-list">
          <button
            v-for="tag in tags"
            :key="tag"
            type="button"
            :class="{ active: selectedTag === tag }"
            :aria-pressed="selectedTag === tag"
            @click="emit('select-tag', tag)"
          >{{ taxonomyLabel(tag, en) }}</button>
        </div>
      </WidgetLayout>
    </div>
  </aside>
</template>
