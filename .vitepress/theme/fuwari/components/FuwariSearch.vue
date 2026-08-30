<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { useData, useRouter } from 'vitepress'
import { data as searchIndex } from '../search.data'
import { taxonomyLabel, uniqueTaxonomies } from '../utils/taxonomy'

const router = useRouter()
const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))
const open = ref(false)
const query = ref('')
const input = ref<HTMLInputElement | null>(null)

const results = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('zh-TW')
  if (!needle) return []
  return searchIndex
    .filter((item) => `${item.title} ${item.description} ${item.text} ${item.categories.join(' ')} ${item.tags.join(' ')}`.toLocaleLowerCase('zh-TW').includes(needle))
    .slice(0, 12)
    .map((item) => {
      const haystack = item.text || item.description
      const index = haystack.toLocaleLowerCase('zh-TW').indexOf(needle)
      const start = Math.max(0, index < 0 ? 0 : index - 45)
      const excerpt = haystack.slice(start, start + 145)
      return {
        ...item,
        displayCategories: uniqueTaxonomies(item.categories, en.value),
        displayTags: uniqueTaxonomies(item.tags, en.value),
        excerpt: `${start > 0 ? '…' : ''}${excerpt}${haystack.length > start + 145 ? '…' : ''}`,
      }
    })
})

async function show() {
  open.value = true
  await nextTick()
  input.value?.focus()
}

function close() {
  open.value = false
  query.value = ''
}

async function navigate(url: string) {
  close()
  await router.go(url)
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    open.value ? close() : show()
  } else if (event.key === 'Escape' && open.value) {
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Vue port of Typelin/fuwari Search.svelte, backed by a VitePress content index. -->
  <div class="fuwari-nav-search-wrap">
    <button type="button" class="VPNavBarSearchButton fuwari-nav-search" :aria-label="en ? 'Search site' : '搜尋全站'" @click="show">
      <span class="vpi-search" aria-hidden="true"></span>
      <span class="text">{{ en ? 'Search' : '搜尋' }}</span>
      <span class="keys" aria-hidden="true">
        <kbd class="key-cmd">&#x2318;</kbd>
        <kbd class="key-ctrl">Ctrl</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  </div>

  <Teleport to="body">
    <div v-if="open" class="fuwari-search-overlay" role="presentation" @mousedown.self="close">
      <section class="fuwari-search-panel" role="dialog" aria-modal="true" :aria-label="en ? 'Search site' : '搜尋全站'">
        <label class="fuwari-search-panel__input">
          <Search :size="20" aria-hidden="true" />
          <input ref="input" v-model="query" type="search" :placeholder="en ? 'Search the Blog, docs, and other pages…' : '搜尋 Blog、文件與其他頁面…'">
          <button type="button" :aria-label="en ? 'Close search' : '關閉搜尋'" @click="close"><X :size="19" /></button>
        </label>
        <div class="fuwari-search-panel__results">
          <button v-for="item in results" :key="item.url" type="button" @click="navigate(item.url)">
            <strong>{{ item.title }}</strong>
            <small>{{ item.url }}</small>
            <span v-if="item.categories.length || item.tags.length" class="fuwari-search-panel__meta">
              <em v-for="category in item.displayCategories" :key="`category-${category}`">{{ taxonomyLabel(category, en) }}</em>
              <i v-for="tag in item.displayTags" :key="`tag-${tag}`"># {{ taxonomyLabel(tag, en) }}</i>
            </span>
            <span>{{ item.excerpt }}</span>
          </button>
          <p v-if="query && !results.length">{{ en ? `No results found for “${query}”.` : `找不到符合「${query}」的內容。` }}</p>
          <p v-else-if="!query">{{ en ? 'Enter a keyword to start searching.' : '輸入關鍵字開始搜尋。' }}</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.fuwari-nav-search-wrap { display: flex; align-items: center; justify-content: flex-end; }
.fuwari-nav-search { display: flex; align-items: center; gap: 8px; height: var(--vp-nav-height); padding: 8px 14px; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 35%, var(--vp-c-divider)); color: var(--vp-c-text-2); background: color-mix(in srgb, var(--vp-c-bg) 56%, transparent); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); font-size: 20px; -webkit-backdrop-filter: blur(14px) saturate(118%); backdrop-filter: blur(14px) saturate(118%); }
.fuwari-nav-search .text,
.fuwari-nav-search .keys,
.fuwari-nav-search .key-cmd { display: none; }
:global(:root.mac .fuwari-nav-search .key-cmd) { display: inline; }
:global(:root.mac .fuwari-nav-search .key-ctrl) { display: none; }
.fuwari-nav-search kbd { font-family: inherit; font-weight: 500; }
.fuwari-nav-search:hover { color: var(--vp-c-brand-1); border-color: color-mix(in srgb, var(--vp-c-brand-1) 38%, transparent); }
.fuwari-search-overlay { position: fixed; z-index: 1000; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding: calc(var(--vp-nav-height, 64px) + 2rem) 1rem 1rem; background: rgba(9, 8, 16, 0.28); -webkit-backdrop-filter: blur(6px) saturate(108%); backdrop-filter: blur(6px) saturate(108%); }
.fuwari-search-panel { width: min(42rem, 100%); max-height: min(42rem, calc(100vh - var(--vp-nav-height, 64px) - 4rem)); overflow: hidden; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 36%, var(--vp-c-divider)); border-radius: 1rem; color: var(--vp-c-text-1); background: color-mix(in srgb, var(--vp-c-bg) 68%, transparent); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28); -webkit-backdrop-filter: blur(18px) saturate(125%); backdrop-filter: blur(18px) saturate(125%); }
.fuwari-search-panel__input { display: flex; align-items: center; gap: 0.65rem; padding: 0.75rem 0.85rem; border-bottom: 1px solid var(--vp-c-divider); color: var(--vp-c-brand-1); }
.fuwari-search-panel__input input { min-width: 0; flex: 1; border: 0; outline: 0; color: var(--vp-c-text-1); background: transparent; font: inherit; font-size: 1rem; }
.fuwari-search-panel__input input::-webkit-search-cancel-button { display: none; }
.fuwari-search-panel__input button { display: grid; width: 2rem; height: 2rem; place-items: center; border: 0; border-radius: 0.45rem; color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); cursor: pointer; }
.fuwari-search-panel__results { max-height: calc(min(42rem, 100vh - var(--vp-nav-height, 64px) - 4rem) - 3.6rem); overflow-y: auto; padding: 0.5rem; }
.fuwari-search-panel__results > button { display: grid; min-width: 0; width: 100%; overflow: hidden; padding: 0.7rem 0.8rem; border: 0; border-radius: 0.7rem; color: inherit; background: transparent; text-align: left; white-space: normal; cursor: pointer; }
.fuwari-search-panel__results > button:hover { background: var(--vp-c-bg-soft); }
.fuwari-search-panel__results strong { min-width: 0; color: var(--vp-c-text-1); overflow-wrap: anywhere; }
.fuwari-search-panel__results small { min-width: 0; margin: 0.12rem 0 0.25rem; color: var(--vp-c-brand-1); overflow-wrap: anywhere; }
.fuwari-search-panel__results span,
.fuwari-search-panel__results p { min-width: 0; color: var(--vp-c-text-2); font-size: 0.85rem; line-height: 1.55; overflow-wrap: anywhere; word-break: break-word; }
.fuwari-search-panel__meta { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.12rem 0 0.35rem; }
.fuwari-search-panel__meta em,
.fuwari-search-panel__meta i { padding: 0.12rem 0.42rem; border-radius: 999px; color: var(--vp-c-brand-1); background: color-mix(in srgb, var(--vp-c-brand-1) 13%, transparent); font-size: 0.72rem; font-style: normal; line-height: 1.4; }
.fuwari-search-panel__meta i { color: var(--vp-c-text-2); background: color-mix(in srgb, var(--vp-c-text-2) 12%, transparent); }
.fuwari-search-panel__results p { padding: 1rem; text-align: center; }
@media (min-width: 768px) {
  .fuwari-nav-search-wrap { flex-grow: 1; padding-left: 24px; }
  .fuwari-nav-search { height: auto; padding: 8px 12px; border-radius: 8px; font-size: 14px; line-height: 1; }
  .fuwari-nav-search .text { display: inline; font-size: 13px; }
  .fuwari-nav-search .keys { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font-size: 12px; }
  :global(.VPNavBarSearch.search:empty) { flex-grow: 0; padding-left: 0; }
}
@media (min-width: 960px) {
  .fuwari-nav-search-wrap { padding-left: 32px; }
}
@media (max-width: 760px) {
  .fuwari-search-overlay { padding-top: calc(var(--vp-nav-height, 64px) + 0.75rem); }
  .fuwari-nav-search { border-color: transparent; background: transparent; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
  .fuwari-nav-search:hover { border-color: transparent; background: color-mix(in srgb, var(--vp-c-bg-soft) 54%, transparent); }
  .fuwari-nav-search:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -4px; }
}
</style>
