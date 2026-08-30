<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as allPosts } from '../../posts.data.ts'
import { fuwariProfile } from '../data/posts'
import type { FuwariPost } from '../types'
import '../styles/fuwari.css'
import HeroBanner from './HeroBanner.vue'
import ArchivePanel from './ArchivePanel.vue'
import BlogToolbar from './BlogToolbar.vue'
import HeroSection from '../../../components/HeroSection.vue'
import Pagination from './Pagination.vue'
import PostCard from './PostCard.vue'
import SideBar from './SideBar.vue'
import RightPanel from './RightPanel.vue'
import { useAuthors } from '../../../components/useAuthors.js'
import { uniqueTaxonomies } from '../utils/taxonomy'

// VitePress owns routing, theme state, the outer Layout and the real Navbar.
const { site, lang } = useData()
const isEnglish = computed(() => lang.value.toLowerCase().startsWith('en'))
const translatedPostPaths = new Set(['/blog/2025-06-13'])
const title = computed(() => isEnglish.value ? `${site.value.title || 'HolyBear'} Blog` : `${site.value.title || 'HolyBear'} 日誌`)
const displayProfile = computed(() => isEnglish.value
  ? { ...fuwariProfile, name: 'HolyBear', bio: 'Notes on technology, life, and every moment worth remembering.' }
  : fuwariProfile)
const { getAuthorMeta } = useAuthors()

function toDate(value: unknown, url: string) {
  const parsed = new Date(String(value || ''))
  if (!Number.isNaN(parsed.getTime())) return parsed
  const match = url.match(/(\d{4})-(\d{2})-(\d{2})/)
  return match ? new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00+08:00`) : new Date(0)
}

const fuwariPosts = computed<FuwariPost[]>(() => allPosts
  .filter((post) => post.url.startsWith('/blog/') && post.frontmatter?.blog === true)
  .map((post) => ({
    title: post.title,
    slug: String(post.frontmatter?.slug || post.title),
    url: isEnglish.value && translatedPostPaths.has(post.url)
      ? `/en${post.url}`
      : post.url,
    published: toDate(post.date, post.url),
    tags: Array.isArray(post.tags) ? post.tags : [],
    category: Array.isArray(post.category) ? post.category[0] || null : post.category || null,
    image: post.image || '/blog_no_image.svg',
    description: post.summary || post.excerpt || '',
    words: Number(post.words) || 1,
    minutes: Number(post.minutes) || 1,
    author: post.author || '聖小熊'
  })))

const carouselPosts = computed(() => fuwariPosts.value
  .filter((post) => post.image && post.image !== '/blog_no_image.svg')
  .slice(0, 10)
  .map((post) => ({ ...post, date: post.published })))

const fuwariCategories = computed(() => {
  const counts = new Map<string, number>()
  fuwariPosts.value.forEach((post) => {
    const category = post.category || (isEnglish.value ? 'Uncategorized' : '未分類')
    counts.set(category, (counts.get(category) || 0) + 1)
  })
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

const fuwariTags = computed(() => uniqueTaxonomies([...new Set(fuwariPosts.value.flatMap((post) => post.tags))], isEnglish.value))
const fuwariAuthors = computed(() => {
  const counts = new Map<string, number>()
  fuwariPosts.value.forEach((post) => {
    const authors = Array.isArray(post.author) ? post.author : [post.author]
    authors.forEach((author) => counts.set(String(author), (counts.get(String(author)) || 0) + 1))
  })
  return [...counts].map(([key, count]) => {
    const meta = getAuthorMeta(key)
    return {
      key,
      name: meta.name,
      count,
      avatar: meta.login ? `https://github.com/${meta.login}.png` : '/logo.png'
    }
  }).sort((a, b) => b.count - a.count)
})
const query = ref('')
const selectedAuthor = ref('')
const selectedCategory = ref('')
const selectedTag = ref('')
const view = ref<'posts' | 'archive'>('posts')
const currentPage = ref(1)
const pageSize = 8
const filtersReady = ref(false)
const sourceArticle = ref('')
const postList = ref<HTMLElement | null>(null)
const centerTransitioning = ref(false)

function handleBlogNavReset(event: MouseEvent) {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('.VPNavBarMenuLink')
  if (!anchor) return
  const target = new URL(anchor.href, window.location.href)
  if (/\/(?:en\/)?blog\/$/.test(target.pathname) && !target.search) resetBlogState()
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const category = params.get('category') || ''
  const tag = params.get('tag') || ''
  const author = params.get('author') || ''
  const source = params.get('source') || ''
  sourceArticle.value = /^\/blog\/[^/?#]+\/?$/.test(source) ? source : ''
  selectedAuthor.value = fuwariAuthors.value.some((item) => item.key === author) ? author : ''
  selectedCategory.value = fuwariCategories.value.some((item) => item.name === category) ? category : ''
  selectedTag.value = fuwariTags.value.includes(tag) ? tag : ''
  filtersReady.value = true
  document.addEventListener('click', handleBlogNavReset)
})

onBeforeUnmount(() => document.removeEventListener('click', handleBlogNavReset))

const filteredPosts = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('zh-TW')
  return fuwariPosts.value.filter((post) => {
    const matchesQuery = !needle || `${post.title} ${post.description}`.toLocaleLowerCase('zh-TW').includes(needle)
    const authors = Array.isArray(post.author) ? post.author.map(String) : [String(post.author)]
    return matchesQuery && (!selectedAuthor.value || authors.includes(selectedAuthor.value)) && (!selectedCategory.value || post.category === selectedCategory.value) && (!selectedTag.value || post.tags.includes(selectedTag.value))
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / pageSize)))
const visiblePosts = computed(() => filteredPosts.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const archiveGroups = computed(() => {
  const groups = new Map<string, FuwariPost[]>()
  filteredPosts.value.forEach((post) => {
    const year = String(post.published.getFullYear())
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)!.push(post)
  })
  return [...groups].map(([year, posts]) => ({ year, posts }))
})

watch([query, selectedAuthor, selectedCategory, selectedTag], () => { currentPage.value = 1 })
watch([selectedAuthor, selectedCategory, selectedTag], ([author, category, tag]) => {
  if (!filtersReady.value) return
  const url = new URL(window.location.href)
  author ? url.searchParams.set('author', author) : url.searchParams.delete('author')
  category ? url.searchParams.set('category', category) : url.searchParams.delete('category')
  tag ? url.searchParams.set('tag', tag) : url.searchParams.delete('tag')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
})
watch(pageCount, (pages) => { if (currentPage.value > pages) currentPage.value = pages })

function clearFilters() {
  query.value = ''
  selectedAuthor.value = ''
  selectedCategory.value = ''
  selectedTag.value = ''
}

function resetBlogState() {
  clearFilters()
  view.value = 'posts'
  currentPage.value = 1
}

function selectCategory(category: string) {
  selectedCategory.value = selectedCategory.value === category ? '' : category
}

function selectAuthor(author: string) {
  selectedAuthor.value = selectedAuthor.value === author ? '' : author
}

function selectTag(tag: string) {
  selectedTag.value = selectedTag.value === tag ? '' : tag
}

async function changePage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), pageCount.value)
  if (nextPage === currentPage.value || centerTransitioning.value) return

  const column = postList.value
  if (!column) {
    currentPage.value = nextPage
    return
  }

  centerTransitioning.value = true
  column.classList.add('fuwari-swup-transition', 'is-leaving')
  await new Promise((resolve) => window.setTimeout(resolve, 200))
  currentPage.value = nextPage
  await nextTick()
  document.querySelector('.fuwari-toolbar')?.scrollIntoView({ behavior: 'auto', block: 'start' })
  column.classList.remove('is-leaving')
  column.classList.add('is-entering')
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())))
  column.classList.remove('is-entering')
  await new Promise((resolve) => window.setTimeout(resolve, 200))
  column.classList.remove('fuwari-swup-transition')
  centerTransitioning.value = false
}
</script>

<template>
  <section class="fuwari-blog">
    <HeroBanner />
    <h1 class="fuwari-sr-only">{{ title }}</h1>
    <p v-if="sourceArticle" class="fuwari-translation-notice fuwari-card-base">
      Automatic full-article translation is not available in every browser yet.
      <a :href="withBase(sourceArticle)">Read the original post</a>, or browse the shared post list below.
    </p>
    <!-- Ported from Typelin/fuwari MainGridLayout.astro; its Navbar is deliberately omitted. -->
    <div class="fuwari-main-grid fuwari-index-grid">
      <SideBar
        :profile="displayProfile"
        :authors="fuwariAuthors"
        :categories="fuwariCategories"
        :tags="fuwariTags"
        collapse-tags
        :selected-category="selectedCategory"
        :selected-tag="selectedTag"
        :selected-author="selectedAuthor"
        @select-author="selectAuthor"
        @select-category="selectCategory"
        @select-tag="selectTag"
      />
      <main ref="postList" class="fuwari-post-list" :aria-label="isEnglish ? 'Latest posts' : '最新文章'">
        <BlogToolbar class="fuwari-onload fuwari-delay-content" v-model:query="query" v-model:category="selectedCategory" v-model:tag="selectedTag" v-model:view="view" :categories="fuwariCategories" :tags="fuwariTags" @clear="clearFilters" />
        <HeroSection v-if="view === 'posts'" class="fuwari-carousel fuwari-onload" :posts="carouselPosts" />
        <template v-if="view === 'posts'">
          <PostCard
            v-for="(post, index) in visiblePosts"
            :key="post.url"
            :entry="post"
            :animation-delay="150 + index * 50"
            @select-category="selectCategory"
            @select-tag="selectTag"
          />
          <p v-if="!filteredPosts.length" class="fuwari-empty fuwari-card-base">{{ isEnglish ? 'No posts match the current filters.' : '找不到符合條件的文章。' }}</p>
          <Pagination :page="currentPage" :pages="pageCount" @change="changePage" />
        </template>
        <ArchivePanel v-else :groups="archiveGroups" />
      </main>
      <RightPanel :posts="fuwariPosts" />
    </div>
  </section>
</template>
