<script setup lang="ts">
import { BookOpen, CalendarDays, Tag } from 'lucide-vue-next'
import { withBase } from 'vitepress'
import { computed } from 'vue'
import { useData } from 'vitepress'
import { formatDateTime, formatDateToYYYYMMDD } from '../utils/date-utils'
import { taxonomyLabel, uniqueTaxonomies } from '../utils/taxonomy'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

// Astro.props -> Vue defineProps; prop names stay aligned with Fuwari.
const props = defineProps<{
  published: Date
  updated?: Date
  tags: string[]
  category: string | null
  hideTagsForMobile?: boolean
  hideUpdateDate?: boolean
  showTime?: boolean
  interactive?: boolean
  filterLinks?: boolean
}>()

const displayTags = computed(() => uniqueTaxonomies(props.tags, en.value))

const emit = defineEmits<{
  'select-category': [category: string]
  'select-tag': [tag: string]
}>()

function filterHref(kind: 'category' | 'tag', value: string) {
  return `${withBase(en.value ? '/en/blog/' : '/blog/')}?${kind}=${encodeURIComponent(value)}`
}
</script>

<template>
  <div class="fuwari-post-meta">
    <div class="fuwari-post-meta__item">
      <span class="fuwari-meta-icon"><CalendarDays :size="17" /></span>
      <time :datetime="published.toISOString()">{{ showTime ? formatDateTime(published) : formatDateToYYYYMMDD(published) }}</time>
    </div>
    <a v-if="filterLinks && category" class="fuwari-post-meta__item fuwari-post-meta__filter" :href="filterHref('category', category)">
      <span class="fuwari-meta-icon"><BookOpen :size="17" /></span>
      <span>{{ taxonomyLabel(category, en) }}</span>
    </a>
    <button v-else-if="interactive && category" class="fuwari-post-meta__item fuwari-post-meta__filter" type="button" @click="emit('select-category', category)">
      <span class="fuwari-meta-icon"><BookOpen :size="17" /></span>
      <span>{{ taxonomyLabel(category, en) }}</span>
    </button>
    <div v-else class="fuwari-post-meta__item">
      <span class="fuwari-meta-icon"><BookOpen :size="17" /></span>
      <span>{{ category ? taxonomyLabel(category, en) : (en ? 'Uncategorized' : '未分類') }}</span>
    </div>
    <div class="fuwari-post-meta__item fuwari-post-meta__tags" :class="{ 'fuwari-post-meta__tags--mobile-hidden': hideTagsForMobile }">
      <span class="fuwari-meta-icon"><Tag :size="17" /></span>
      <span v-if="filterLinks && displayTags.length" class="fuwari-post-meta__tag-links">
        <template v-for="(tag, index) in displayTags" :key="tag">
          <span v-if="index" aria-hidden="true"> / </span>
          <a :href="filterHref('tag', tag)">{{ taxonomyLabel(tag, en) }}</a>
        </template>
      </span>
      <span v-else-if="interactive && displayTags.length" class="fuwari-post-meta__tag-links">
        <template v-for="(tag, index) in displayTags" :key="tag">
          <span v-if="index" aria-hidden="true"> / </span>
          <button type="button" @click="emit('select-tag', tag)">{{ taxonomyLabel(tag, en) }}</button>
        </template>
      </span>
      <span v-else>{{ displayTags.length ? displayTags.map((tag) => taxonomyLabel(tag, en)).join(' / ') : (en ? 'No tags' : '沒有標籤') }}</span>
    </div>
  </div>
</template>
