---
layout: home
title: Blog
description: HolyBear and Friends' Blog

hero:
  name: "HolyBear's Blog"
  text: "Tech & Life"
  tagline: "Learning & Creating"
  image:
    src: /logo.png
    alt: HolyBearTW Blog
  actions:
    - theme: brand
      text: Switch to Old List
      link: "/en/blog/blog_list"
    - theme: alt
      text: Jump to Bottom
      link: "#bottom"
    - theme: alt
      text: Back to Main Site
      link: "/en/"
---

<script setup lang="ts">
import { useAuthors } from '../../.vitepress/components/useAuthors.js'
import { data as allPosts } from '../../.vitepress/theme/en/post.data.ts'
import { onMounted, onUnmounted, nextTick, ref, computed, watch } from 'vue'

import { useRoute } from 'vitepress'

const route = useRoute()
watch(() => route.path, () => {
  if (window.location.hash) window.location.hash = ''
})

// Use composable to get shared author data and language state
const { getAuthorMeta, authorsData, isEnglish } = useAuthors()

const displayAuthors = computed(() => {
  return Object.keys(authorsData).map(login => {
    const author = authorsData[login];
    return {
      login: login,
      url: author.url,
      name: isEnglish.value && author.name_en ? author.name_en : author.name
    }
  })
})

// Format date as YYYY-MM-DD
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unknown Date'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString)
    return 'Unknown Date'
  }
  return date.toISOString().slice(0, 10)
}

const fallbackImg = '/blog_no_image.svg'
const onImgError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img && img.src !== fallbackImg) img.src = fallbackImg
}

const posts = allPosts.filter(
  post => Boolean(post) && post.url !== '/en/blog/blog_list'
).map(post => ({
  ...post,
  image: post.image || fallbackImg,
  tags: Array.isArray(post.tags) ? post.tags : (Array.isArray(post.tag) ? post.tag : (post.tag ? [post.tag] : [])),
  category: Array.isArray(post.category) ? post.category : (post.category ? [post.category] : [])
}))

const postsPerPage = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(posts.length / postsPerPage))
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return posts.slice(start, end)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

const pageNumbers = computed(() => {
  const pages = []
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i)
  }
  return pages
})

const setupCardAnimations = async () => {
  await nextTick()
  const cards = document.querySelectorAll('.card')
  cards.forEach((card) => {
    const element = card as HTMLElement
    element.classList.remove('animation-complete')
    element.addEventListener('animationend', () => {
      element.classList.add('animation-complete')
      element.offsetHeight
    }, { once: true })
  })
}

onMounted(() => {
  setupCardAnimations()
  document.body.classList.add('blog-index-page')
})

onUnmounted(() => {
  document.body.classList.remove('blog-index-page')
})

watch(currentPage, async () => {
  await nextTick()
  setTimeout(setupCardAnimations, 50)
})
</script>

<!-- Blog header row, fully synced with zh version -->
<div class="blog-header-row">
  <h2 class="blog-title">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
  <span>Blog</span>
  </h2>
  <div class="blog-authors">
    <strong>{{ isEnglish ? 'Authors:' : '作者群：' }}</strong>
    <span
      v-for="author in displayAuthors"
      :key="author.login"
      class="author-link"
    >
      <a :href="author.url" target="_blank" rel="noopener">
        <img
          :src="`https://github.com/${author.login}.png`"
          :alt="author.name"
          class="author-avatar"
        />
        {{ author.name }}
      </a>
    </span>
  </div>
  <a
    class="new-post-btn"
    href="https://github.com/HolyBearTW/holybear.tw/new/main/blog"
    target="_blank"
    rel="noopener"
  >➕ {{ isEnglish ? 'New Post' : '新增文章' }}</a>
</div>

<div class="cards">
  <a v-for="post in paginatedPosts" :key="post.url" class="card" :href="post.url">
    <div class="thumb">
      <img :src="post.image"
           :alt="post.title"
           loading="lazy"
           @error="onImgError"
           style="object-fit: contain;" />
    </div>
    <div class="meta">
      <div class="title">{{ post.title }}</div>
      <div class="badges" v-if="post.category.length || post.tags.length">
        <!-- Category badge (main color) -->
        <span v-for="c in post.category" :key="'cat-' + c" class="badge category">{{ c }}</span>
        <!-- TAG badge (original style) -->
        <span v-for="t in post.tags" :key="'tag-' + t" class="badge tag">{{ t }}</span>
      </div>
      <div class="byline">
        <template v-if="getAuthorMeta(post.author)?.login">
          <a class="author" :href="getAuthorMeta(post.author).url" target="_blank" rel="noopener">
            <img class="avatar" :src="`https://github.com/${getAuthorMeta(post.author).login}.png`" :alt="getAuthorMeta(post.author).name" />
            <span class="name">{{ getAuthorMeta(post.author).name }}</span>
          </a>
        </template>
        <template v-else>
          <span class="name">{{ post.author }}</span>
        </template>
        <span class="dot">•</span>
        <time :datetime="post.date">{{ formatDate(post.date) }}</time>
      </div>
      <p class="desc" v-if="post.summary">{{ post.summary }}</p>
    </div>
  </a>
</div>

<div class="pagination" v-if="totalPages > 1">
  <button class="pagination-button" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">{{ isEnglish ? 'Prev' : 'Previous' }}</button>
  <button
    v-for="page in pageNumbers"
    :key="page"
    class="pagination-button"
    :class="{ active: page === currentPage }"
    @click="goToPage(page)">
    {{ page }}
  </button>
  <button class="pagination-button" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">{{ isEnglish ? 'Next' : 'Next' }}</button>
</div>

<!-- Bottom anchor -->
<div id="bottom"></div>

<style scoped>
@media (prefers-color-scheme: light) {
  :root body.blog-index-page .badge.tag,
  :root body.blog-index-page .badges .badge.tag,
  html:not(.dark) body.blog-index-page .badge.tag,
  html:not(.dark) body.blog-index-page .badges .badge.tag,
  body.blog-index-page .badges .badge.tag,
  body.blog-index-page .badges > .badge.tag,
  body.blog-index-page .card .badges > .badge.tag,
  ::v-deep(.badge.tag) {
    background: #4a5568;
    color: #e2e8f0;
    border: 1px solid #6c7293;
  }
}
.card {
  background: #F9F6F2 !important;
  border: 1px solid #e5e2da !important;
  color: #222 !important;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04) !important;
}
.dark .card {
  background: #1c1c1c !important;
  border-color: #2a2a2a !important;
}
.cards { 
  display: grid; 
  grid-template-columns: 1fr; 
  gap: 16px; 
}
@media (min-width: 720px) { 
  .cards { 
    gap: 20px; 
  } 
}
.card {
  display: flex; 
  align-items: stretch; 
  gap: 16px; 
  padding: 16px; 
  border-radius: 14px; 
  border: 1px solid #2a2a2a; 
  min-height: 144px; 
  text-decoration: none; 
  color: inherit; 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.6s ease forwards;
}
@media (max-width: 719px) {
  .card {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 12px;
    min-height: auto;
  }
  .card .thumb {
    width: 100px !important;
    height: 100px !important;
    margin: 0 !important;
    flex-shrink: 0;
    align-self: center !important;
  }
  .card .meta {
    width: auto !important;
    flex: 1 !important;
    align-self: center !important;
  }
  .card .title {
    font-size: 18px !important;
    line-height: 1.3 !important;
    margin-bottom: 8px !important;
  }
  .card .badges {
    margin-bottom: 8px !important;
  }
  .card .badge {
    font-size: 11px !important;
    padding: 4px 8px !important;
  }
  .card .byline {
    font-size: 13px !important;
  }
  .card .byline .avatar {
    width: 18px !important;
    height: 18px !important;
  }
  .card .desc {
    font-size: 13px !important;
    line-height: 1.4 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
  }
}
.card.animation-complete {
  animation: none !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.card.animation-complete:hover {
  transform: translateY(-4px) scale(1.02) !important;
  border-color: var(--vp-c-brand) !important;
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}
.card.animation-complete:hover .title {
  color: var(--vp-c-brand) !important;
}
@media (max-width: 719px) {
  .card.animation-complete:hover {
    transform: none !important;
    border-color: #2a2a2a !important;
    box-shadow: none !important;
  }
  .card.animation-complete:hover .title {
    color: var(--vp-c-text-1) !important;
  }
}
.card:nth-child(1) { animation-delay: 0.1s; }
.card:nth-child(2) { animation-delay: 0.2s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.4s; }
.card:nth-child(5) { animation-delay: 0.5s; }
.card:nth-child(6) { animation-delay: 0.6s; }
.card:nth-child(7) { animation-delay: 0.7s; }
.card:nth-child(8) { animation-delay: 0.8s; }
.card:nth-child(9) { animation-delay: 0.9s; }
.card:nth-child(10) { animation-delay: 1.0s; }
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.card:hover:not(.animation-complete) { }
.thumb { display: flex; width: 144px; height: 144px; overflow: hidden; border-radius: 12px; background: var(--vp-c-bg-soft); align-items: center; justify-content: center; flex-shrink: 0; }
.thumb img { max-width: 100%; max-height: 100%; object-fit: contain; object-position: center center; display: block; }
.meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
@media (max-width: 719px) {
  .meta {
    height: auto !important;
    min-height: auto !important;
    justify-content: flex-start !important;
    padding: 8px 0;
  }
}
.title {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5em;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
}
.badges {
  margin-top: 0;
}
@media (max-width: 900px) {
  .title {
    margin-bottom: 0.8em;
  }
  .badges {
    margin-top: 0.3em;
  }
}
@media (max-width: 900px) {
  .title {
    font-size: 1.1rem;
    max-height: 2.2em;
  }
}
@media (max-width: 720px) {
  .title {
    font-size: 1rem;
    line-height: 1.15;
    max-height: 2em;
  }
}
.badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.badge { font-size: 13px; line-height: 1; padding: 8px 12px; border-radius: 999px; background: #2a2a2a; color: #cce; border: 1px solid #3b3b3b; }
.badge.category { background: var(--vp-c-brand, #00b8b8); color: #000; border: 1px solid var(--vp-c-brand, #00b8b8); }
.badge.tag {
  background: #FAF3E3 !important;
  color: #006064 !important;
  border: 1px solid #00b8b8 !important;
}
.dark .badge.tag {
  background: #4a5568 !important;
  color: #e2e8f0 !important;
  border: 1px solid #6c7293 !important;
}
.byline { color: var(--vp-c-text-2); font-size: 0.9rem; display: flex; align-items: center; padding: 0 !important; line-height: 1 !important; height: 20px; gap: 4px; margin-bottom: 6px; }
.byline .author { display: inline-flex; align-items: center; color: var(--vp-c-brand-1); text-decoration: none; font-weight: 600; gap: 4px; }
.byline .author:hover { text-decoration: underline; }
.byline .avatar { width: 21px; height: 21px; border-radius: 50%; border: 1px solid #ddd; background: #fff; margin-right: 0; object-fit: cover; }
.byline .dot { opacity: .6; }
.desc { color: var(--vp-c-text-2); font-size: 14px; line-height: 1.3; margin: 0 !important; padding: 0; }
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 2rem;
  padding: 1rem 0;
  flex-wrap: wrap;
}
.pagination-button {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 40px;
}
@media (max-width: 719px) {
  .pagination {
    gap: 6px;
    padding: 0.8rem 0;
  }
  .pagination-button {
    padding: 10px 14px;
    font-size: 16px;
    min-width: 44px;
    min-height: 44px;
  }
}
.pagination-button:hover:not(:disabled),
.pagination-button.active {
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand);
}
.pagination-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pagination-button:disabled:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}
.blog-header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4rem;
  margin-bottom: 0.5rem;
  flex-wrap: nowrap;
  flex-direction: row;
  position: unset;
}
.blog-title {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.03em;
  margin: 0 1.2rem 0 0;
  line-height: 0.7;
  color: var(--vp-c-text-1);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.blog-title svg {
  margin-bottom: 2px;
}
.blog-authors {
  color: var(--vp-c-text-2, #444);
  font-size: 1.12rem;
  display: flex;
  align-items: baseline;
  gap: 0.3em;
  flex-wrap: wrap;
  min-width: 0;
  margin-bottom: 0;
  position: relative;
  align-items: center;
}
.blog-authors strong {
  margin-right: 0.5em;
}
.author-link {
  position: relative;
  display: inline-block;
}
.author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-right: 0.22em;
  vertical-align: middle;
  box-shadow: 0 2px 8px #0001;
  border: 1px solid #ddd;
  background: #fff;
  object-fit: cover;
}
.blog-authors a {
  color: var(--vp-c-brand-1, #00b8b8);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.07em;
  margin-left: 0.18em;
  margin-right: 0.18em;
  line-height: 1.6;
  display: inline-flex;
  align-items: center;
}
.blog-authors a:hover {
  text-decoration: underline;
}
.new-post-btn {
  background: var(--vp-c-brand);
  color: #000;
  font-weight: 600;
  padding: 0.32em 0.8em;
  border-radius: 10px;
  text-decoration: none;
  font-size: 0.95rem;
  transition: background 0.15s, color 0.15s;
  box-shadow: 0 2px 8px 0 #0001;
  white-space: nowrap;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}
.new-post-btn:hover {
  background: var(--vp-c-brand-dark);
  color: #000;
}
@media (max-width: 889px) {
  .blog-header-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 0 !important;
    padding-top: 0.5rem !important;
    padding-bottom: 0.2rem !important;
    gap: 0 !important;
  }
  .blog-title {
    margin: 0 !important;
    flex-shrink: 0;
    order: 0;
  }
  .new-post-btn {
    background: var(--vp-c-brand);
    color: #000;
    font-weight: 600;
    padding: 0.32em 0.8em;
    border-radius: 10px;
    text-decoration: none;
    font-size: 0.95rem;
    transition: background 0.15s, color 0.15s;
    box-shadow: 0 2px 8px 0 #0001;
    white-space: nowrap;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 !important;
    position: relative;
    top: -6px;
    order: 1;
  }
  .blog-authors {
    width: 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    justify-content: center;
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25em 0.25em;
    text-align: center;
    order: 2;
  }
  .blog-authors strong {
    white-space: nowrap;
    margin-right: 0 !important;
  }
  .author-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0.05em 0.25em !important;
  }
  .author-avatar {
    width: 32px;
    height: 32px;
    margin-right: 0 !important;
    margin-bottom: 3px !important;
  }
  .blog-authors a {
    font-size: 16px;
    margin: 0 !important;
    padding: 0 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
@media (max-width: 719px) {
  .pagination {
    gap: 6px;
    padding: 0.8rem 0;
  }
  .pagination-button {
    padding: 10px 14px;
    font-size: 16px;
    min-width: 44px;
    min-height: 44px;
  }
  .meta {
    height: auto !important;
    min-height: auto !important;
    justify-content: flex-start !important;
    padding: 8px 0;
  }
}
@media (max-width: 500px) {
  .blog-authors a {
    font-size: 10px;
  }
  .blog-authors {
    gap: 0.3em 0.3em;
  }
  .author-link {
    margin: 0.3em 0.3em !important;
  }
}
@media (max-width: 476px) {
  .card .title {
    font-size: 0.95rem !important;
    line-height: 1.18 !important;
    margin-bottom: 0.4em !important;
  }
}
</style>

<style>
body.blog-index-page .vp-doc h2 {
  border-top: none !important;
  padding-top: 0 !important;
  margin-top: 0 !important;
}
body.blog-index-page main,
body.blog-index-page .VPContent,
body.blog-index-page .VPContent .content-container,
body.blog-index-page .VPDoc .content-container,
body.blog-index-page [class*="VPContent"],
body.blog-index-page [class*="content-container"] {
  border-top: none !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>