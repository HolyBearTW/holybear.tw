<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, FileText } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'
import type { FuwariPost } from '../types'

interface CalendarDay {
  key: string
  day: number
  current: boolean
  today: boolean
  weekday: number
  posts: FuwariPost[]
}

const props = defineProps<{ posts: FuwariPost[] }>()
const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))
const weekdays = computed(() => en.value ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['日', '一', '二', '三', '四', '五', '六'])

function taipeiNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
}

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function dayKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const today = taipeiNow()
const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const selectedDate = ref('')
const calendarYears = computed(() => [...new Set([
  today.getFullYear(),
  ...props.posts.map((post) => Number(dateKey(post.published).slice(0, 4))),
])].filter(Number.isFinite).sort((a, b) => b - a))
const calendarMonths = computed(() => Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: en.value
    ? new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2000, index, 1))
    : `${index + 1} 月`,
})))

const postsByDate = computed(() => {
  const grouped = new Map<string, FuwariPost[]>()
  props.posts.forEach((post) => {
    const key = dateKey(post.published)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(post)
  })
  return grouped
})

const days = computed<CalendarDay[]>(() => {
  const result: CalendarDay[] = []
  const firstWeekday = new Date(year.value, month.value, 1).getDay()
  const currentDays = new Date(year.value, month.value + 1, 0).getDate()
  const previousDays = new Date(year.value, month.value, 0).getDate()

  for (let offset = firstWeekday - 1; offset >= 0; offset--) {
    result.push({ key: `previous-${offset}`, day: previousDays - offset, current: false, today: false, weekday: result.length % 7, posts: [] })
  }
  for (let day = 1; day <= currentDays; day++) {
    const key = dayKey(year.value, month.value, day)
    result.push({
      key, day, current: true,
      today: year.value === today.getFullYear() && month.value === today.getMonth() && day === today.getDate(),
      weekday: new Date(year.value, month.value, day).getDay(),
      posts: postsByDate.value.get(key) || []
    })
  }
  let nextDay = 1
  while (result.length < 42) {
    result.push({ key: `next-${nextDay}`, day: nextDay++, current: false, today: false, weekday: result.length % 7, posts: [] })
  }
  return result
})

const selectedPosts = computed(() => selectedDate.value ? postsByDate.value.get(selectedDate.value) || [] : [])

function changeMonth(delta: number) {
  month.value += delta
  if (month.value < 0) { month.value = 11; year.value-- }
  if (month.value > 11) { month.value = 0; year.value++ }
  selectedDate.value = ''
}

function changeCalendarDate() {
  selectedDate.value = ''
}

function selectDay(item: CalendarDay) {
  if (!item.posts.length) return
  if (item.posts.length === 1) {
    window.location.href = withBase(item.posts[0].url)
    return
  }
  selectedDate.value = selectedDate.value === item.key ? '' : item.key
}
</script>

<template>
  <section class="fuwari-side-card fuwari-calendar fuwari-card-base" :aria-label="en ? 'Post calendar' : '文章發佈日曆'">
    <h2><CalendarDays :size="17" /><span>{{ en ? 'Post Calendar' : '文章日曆' }}</span></h2>
    <div class="fuwari-calendar__navigation">
      <button type="button" :aria-label="en ? 'Previous month' : '上個月'" @click="changeMonth(-1)"><ChevronLeft :size="16" /></button>
      <div class="fuwari-calendar__selectors">
        <select v-model.number="year" :aria-label="en ? 'Year' : '年份'" @change="changeCalendarDate">
          <option v-for="item in calendarYears" :key="item" :value="item">{{ en ? item : `${item} 年` }}</option>
        </select>
        <select v-model.number="month" :aria-label="en ? 'Month' : '月份'" @change="changeCalendarDate">
          <option v-for="item in calendarMonths" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </div>
      <button type="button" :aria-label="en ? 'Next month' : '下個月'" @click="changeMonth(1)"><ChevronRight :size="16" /></button>
    </div>
    <div class="fuwari-calendar__grid fuwari-calendar__weekdays" aria-hidden="true">
      <span v-for="(weekday, index) in weekdays" :key="`${weekday}-${index}`">{{ weekday }}</span>
    </div>
    <div class="fuwari-calendar__grid">
      <button
        v-for="item in days"
        :key="item.key"
        type="button"
        :disabled="!item.current || !item.posts.length"
        :aria-label="item.posts.length ? (en ? `${item.key}, ${item.posts.length} posts` : `${item.key}，${item.posts.length} 篇文章`) : item.key"
        :title="item.posts.map((post) => post.title).join('\n') || undefined"
        :class="{ 'is-muted': !item.current, 'is-today': item.today, 'is-sunday': item.weekday === 0, 'is-saturday': item.weekday === 6, 'has-post': item.posts.length, 'is-selected': selectedDate === item.key }"
        @click="selectDay(item)"
      >{{ item.day }}</button>
    </div>
    <div v-if="selectedPosts.length > 1" class="fuwari-calendar__posts" aria-live="polite">
      <a v-for="post in selectedPosts" :key="post.url" :href="withBase(post.url)">
        <FileText :size="13" /><span>{{ post.title }}</span>
      </a>
    </div>
  </section>
</template>
