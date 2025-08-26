<script setup>
import { computed } from 'vue'
import { useAuthors } from '../components/useAuthors.js'

const props = defineProps({
  author: {
    type: [String, Array],
    required: true
  },
  date: {
    type: [String, Date],
    required: false
  }
})

const { getAuthorMeta, isEnglish } = useAuthors()

const authorList = computed(() => {
  if (Array.isArray(props.author)) return props.author
  if (typeof props.author === 'string') return [props.author]
  return []
})

const authorMetas = computed(() => authorList.value.map(a => getAuthorMeta(a)))

const currentAuthorMeta = computed(() => authorMetas.value[0] || { name: '未知作者', login: '', url: '' })
const currentAuthorAvatar = computed(() =>
  currentAuthorMeta.value.login
    ? `https://github.com/${currentAuthorMeta.value.login}.png`
    : '/logo.png'
)
const currentAuthorUrl = computed(() => currentAuthorMeta.value.url || 'https://holybear.tw/')

const displayDate = computed(() => {
  if (!props.date) return isEnglish.value ? 'Unknown date' : '未知日期'
  const date = new Date(props.date)
  if (isNaN(date.getTime())) return isEnglish.value ? 'Unknown date' : '未知日期'
  const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const yyyy = twDate.getFullYear()
  const mm = String(twDate.getMonth() + 1).padStart(2, '0')
  const dd = String(twDate.getDate()).padStart(2, '0')
  const hh = String(twDate.getHours()).padStart(2, '0')
  const min = String(twDate.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
})
</script>

<template>
  <span class="author-inline">
    <img class="post-author-avatar" :src="currentAuthorAvatar" :alt="currentAuthorMeta.name" />
    <a :href="currentAuthorUrl" target="_blank" rel="noopener" class="author-link-name">{{ currentAuthorMeta.name }}</a>
    <span v-if="displayDate" class="dot" aria-hidden="true">•</span>
    <span v-if="displayDate">{{ displayDate }}</span>
  </span>
</template>

<style scoped>
.author-inline {
  display: flex;
  align-items: center;
  gap: 0.2em;
}
.post-author-avatar {
  width: 22px;
  height: 22px;
  margin: 0 2px 0 0;
  border-radius: 50%;
  vertical-align: middle;
  box-shadow: 0 2px 8px #0001;
  border: 1px solid #ddd;
  background: #fff;
  object-fit: cover;
  display: inline-block;
}
.author-link-name {
  color: var(--vp-c-brand-1, #00b8b8);
  text-decoration: none;
  font-weight: normal;
  line-height: 1;
  display: inline-block;
  vertical-align: middle;
  margin-right: 0;
  padding-right: 0;
}
.author-link-name:hover {
  text-decoration: underline;
}
.dot {
  opacity: .6;
  margin: 0 0.1em;
}
</style>
