<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Clock3, Text } from 'lucide-vue-next'
import { ClientOnly, Content, useData, useRoute, withBase } from 'vitepress'
import VPDocAsideOutline from 'vitepress/dist/client/theme-default/components/VPDocAsideOutline.vue'
import { data as allPosts } from '../../posts.data.ts'
import GiscusComments from '../../../components/GiscusComments.vue'
import ShareButtons from '../../../components/ShareButtons.vue'
import ViewCounter from '../../../components/ViewCounter.vue'
import VotePanel from '../../../components/VotePanel.vue'
import { fuwariProfile } from '../data/posts'
import '../styles/fuwari.css'
import HeroBanner from './HeroBanner.vue'
import PostMeta from './PostMeta.vue'
import SideBar from './SideBar.vue'
import AuthorMeta from './AuthorMeta.vue'
import CalendarCard from './CalendarCard.vue'
import TimeWeatherCard from './TimeWeatherCard.vue'
import { uniqueTaxonomies } from '../utils/taxonomy'
import type { FuwariPost } from '../types'
import { useAuthors } from '../../../components/useAuthors.js'

const route = useRoute()
const articlePage = ref<HTMLElement | null>(null)
const { frontmatter, page, lang } = useData()
const { getAuthorMeta } = useAuthors()
const isEnglish = computed(() => lang.value.toLowerCase().startsWith('en'))
const translatedPostPaths = new Set(['/blog/2025-06-13'])
const normalize = (path: string) => path.replace(/\.html$/, '').replace(/\/$/, '')
const blogPosts = computed(() => allPosts.filter((post) => post.url.startsWith('/blog/') && post.frontmatter?.blog === true))
const canonicalPath = computed(() => route.path.replace(/^\/en(?=\/blog\/)/, ''))
const sourcePost = computed(() => blogPosts.value.find((post) => normalize(post.url) === normalize(canonicalPath.value)))
const sourceIndex = computed(() => blogPosts.value.findIndex((post) => normalize(post.url) === normalize(canonicalPath.value)))
const newerPost = computed(() => sourceIndex.value > 0 ? blogPosts.value[sourceIndex.value - 1] : null)
const olderPost = computed(() => sourceIndex.value >= 0 && sourceIndex.value < blogPosts.value.length - 1 ? blogPosts.value[sourceIndex.value + 1] : null)
const displayProfile = computed(() => isEnglish.value
  ? { ...fuwariProfile, name: 'HolyBear', bio: 'Notes on technology, life, and every moment worth remembering.' }
  : fuwariProfile)

function toDate(value: unknown) {
  const parsed = new Date(String(value || ''))
  if (!Number.isNaN(parsed.getTime())) return parsed
  const match = route.path.match(/(\d{4})-(\d{2})-(\d{2})/)
  return match ? new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00+08:00`) : new Date(0)
}

const calendarPosts = computed<FuwariPost[]>(() => blogPosts.value.map((post) => ({
  title: post.title,
  slug: String(post.frontmatter?.slug || post.title),
  url: isEnglish.value && translatedPostPaths.has(post.url) ? `/en${post.url}` : post.url,
  published: toDate(post.date),
  tags: Array.isArray(post.tags) ? post.tags : [],
  category: Array.isArray(post.category) ? post.category[0] || null : post.category || null,
  image: post.image || '/blog_no_image.svg',
  description: post.summary || post.excerpt || '',
  words: Number(post.words) || 1,
  minutes: Number(post.minutes) || 1,
  author: post.author || '聖小熊',
})))

const tags = computed<string[]>(() => {
  const value = sourcePost.value?.tags ?? frontmatter.value.tags ?? frontmatter.value.tag ?? []
  return Array.isArray(value) ? value : [String(value)]
})
const categories = computed<string[]>(() => {
  const value = sourcePost.value?.category ?? frontmatter.value.category ?? []
  return Array.isArray(value) ? value : [String(value)]
})
const categoryItems = computed(() => {
  const counts = new Map<string, number>()
  blogPosts.value.forEach((post) => {
    const value = Array.isArray(post.category) ? post.category[0] : post.category
    const name = String(value || (isEnglish.value ? 'Uncategorized' : '未分類'))
    counts.set(name, (counts.get(name) || 0) + 1)
  })
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})
const allTags = computed(() => uniqueTaxonomies([...new Set(blogPosts.value.flatMap((post) => post.tags || []))], isEnglish.value))
const title = computed(() => String((isEnglish.value ? frontmatter.value.title : sourcePost.value?.title) || frontmatter.value.title || page.value.title || (isEnglish.value ? 'Untitled post' : '無標題文章')))
const description = computed(() => String((isEnglish.value ? frontmatter.value.description : sourcePost.value?.summary) || frontmatter.value.description || ''))
const published = computed(() => toDate((isEnglish.value ? frontmatter.value.date : sourcePost.value?.date) || frontmatter.value.date))
const words = computed(() => Number(sourcePost.value?.words) || 1)
const minutes = computed(() => Number(sourcePost.value?.minutes) || 1)
const author = computed(() => (isEnglish.value ? frontmatter.value.author : sourcePost.value?.author) ?? frontmatter.value.author ?? '聖小熊')
const authorItems = computed(() => {
  const counts = new Map<string, number>()
  blogPosts.value.forEach((post) => {
    const authors = Array.isArray(post.author) ? post.author : [post.author || '聖小熊']
    authors.forEach((key) => counts.set(String(key), (counts.get(String(key)) || 0) + 1))
  })
  return [...counts].map(([key, count]) => {
    const meta = getAuthorMeta(key)
    return {
      key,
      name: meta.name,
      count,
      avatar: meta.login ? `https://github.com/${meta.login}.png` : '/logo.png',
    }
  }).sort((a, b) => b.count - a.count)
})
const selectedAuthor = computed(() => String(Array.isArray(author.value) ? author.value[0] || '' : author.value || ''))
// Preserve the legacy counter key so existing Firestore view totals keep working.
// relativePath cannot be used because its slash becomes a Firestore path separator.
const slug = computed(() => String(frontmatter.value.slug || (page.value as { path?: string }).path || title.value || 'unknown'))

function openBlogFilter(kind: 'author' | 'category' | 'tag', value: string) {
  const indexPath = isEnglish.value ? '/en/blog/' : '/blog/'
  window.location.assign(`${withBase(indexPath)}?${kind}=${encodeURIComponent(value)}`)
}

async function resetSidebarScroll() {
  await nextTick()
  const sidebar = articlePage.value?.querySelector<HTMLElement>('.fuwari-article-grid > .fuwari-sidebar .fuwari-sidebar__sticky')
  if (sidebar) sidebar.scrollTop = 0
}

onMounted(resetSidebarScroll)
watch(() => route.path, resetSidebarScroll)
</script>

<template>
  <section ref="articlePage" class="fuwari-blog fuwari-article-page">
    <HeroBanner />
    <div class="fuwari-main-grid fuwari-article-grid">
      <SideBar
        :profile="displayProfile"
        :authors="authorItems"
        :categories="categoryItems"
        :tags="allTags"
        collapse-tags
        :selected-category="categories[0] || ''"
        :selected-author="selectedAuthor"
        @select-author="openBlogFilter('author', $event)"
        @select-category="openBlogFilter('category', $event)"
        @select-tag="openBlogFilter('tag', $event)"
      />
      <main class="fuwari-article-column VPDoc">
        <article class="fuwari-article fuwari-card-base">
          <header class="fuwari-article__header fuwari-onload fuwari-delay-content">
            <div class="fuwari-article__reading">
              <span><Text :size="16" />{{ words.toLocaleString() }} {{ isEnglish ? 'words' : '字' }}</span>
              <span><Clock3 :size="16" />{{ minutes }} {{ isEnglish ? 'min read' : '分鐘' }}</span>
            </div>
            <h1>{{ title }}</h1>
            <p v-if="description" class="fuwari-article__description">{{ description }}</p>
            <div class="fuwari-article__meta-row">
              <div class="fuwari-article__meta-main">
                <AuthorMeta :author="author" />
                <PostMeta :published="published" :tags="tags" :category="categories[0] || null" show-time filter-links />
              </div>
              <ClientOnly><ViewCounter :slug="slug" /></ClientOnly>
            </div>
          </header>
          <Content class="vp-doc fuwari-article-content fuwari-onload fuwari-delay-post-body" />
          <nav v-if="newerPost || olderPost" class="fuwari-post-navigation fuwari-onload fuwari-delay-post-footer" :aria-label="isEnglish ? 'Previous and next posts' : '上一篇與下一篇'">
            <a v-if="olderPost" :href="withBase(olderPost.url)"><small>{{ isEnglish ? 'Older post' : '較早文章' }}</small><span>{{ olderPost.title }}</span></a>
            <span v-else></span>
            <a v-if="newerPost" :href="withBase(newerPost.url)"><small>{{ isEnglish ? 'Newer post' : '較新文章' }}</small><span>{{ newerPost.title }}</span></a>
          </nav>
        </article>

        <ClientOnly>
          <div class="fuwari-article-extras fuwari-card-base fuwari-onload fuwari-delay-post-footer">
            <div class="fuwari-feedback-row">
              <VotePanel />
              <ShareButtons />
            </div>
            <GiscusComments :reactions-enabled="false" />
          </div>
        </ClientOnly>
      </main>
      <aside class="fuwari-article-right-panel" :aria-label="isEnglish ? 'Article information' : '文章資訊側欄'">
        <section class="fuwari-article-outline fuwari-card-base" :aria-label="isEnglish ? 'On this page' : '文章目錄'">
          <VPDocAsideOutline />
        </section>
        <TimeWeatherCard />
        <CalendarCard :posts="calendarPosts" />
      </aside>
    </div>
  </section>
</template>
