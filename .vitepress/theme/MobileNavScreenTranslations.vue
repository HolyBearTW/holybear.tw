<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useData } from 'vitepress'
import VPLink from 'vitepress/dist/client/theme-default/components/VPLink.vue'
import { useLangs } from 'vitepress/dist/client/theme-default/composables/langs.js'
import { navInjectionKey } from 'vitepress/dist/client/theme-default/composables/nav.js'

const { site, localeIndex } = useData()
const { currentLang, localeLinks } = useLangs({ correspondingLink: true })
const isOpen = ref(false)
const nav = inject(navInjectionKey, null)

const flagByLocaleKey: Record<string, string> = {
  root: '🇹🇼',
  en: '🇺🇸'
}

const groupLabel = computed(() => (localeIndex.value === 'en' ? 'Language' : '語言'))

const localeItems = computed(() => {
  const locales = site.value.locales ?? {}

  return Object.entries(locales)
    .map(([key, value]) => {
      const isCurrent = key === localeIndex.value
      const alternate = localeLinks.value.find((item) => item.text === value.label)
      const href = isCurrent
        ? currentLang.value.link || (key === 'root' ? '/' : `/${key}/`)
        : alternate?.link || (key === 'root' ? '/' : `/${key}/`)

      return {
        key,
        label: value.label,
        href,
        lang: value.lang,
        dir: value.dir,
        flag: flagByLocaleKey[key] || '🌐',
        isCurrent
      }
    })
    .filter((item) => Boolean(item.href))
})

function toggle() {
  isOpen.value = !isOpen.value
}

function handleClick() {
  nav?.closeScreen?.()
}
</script>

<template>
  <div class="VPNavScreenTranslations translations" :class="{ open: isOpen }">
    <button class="title" type="button" :aria-label="groupLabel" @click="toggle">
      <span class="label">{{ groupLabel }}</span>
      <span class="icon chevron" aria-hidden="true"></span>
    </button>

    <ul class="list">
      <li v-for="locale in localeItems" :key="locale.key" class="item">
        <VPLink
          class="link language-link"
          :class="{ current: locale.isCurrent }"
          :href="locale.href"
          :lang="locale.lang"
          :dir="locale.dir"
          @click="handleClick"
        >
          <span class="flag" aria-hidden="true">{{ locale.flag }}</span>
          <span class="text">{{ locale.label }}</span>
        </VPLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.item {
  min-width: 0;
}

.label {
  font-size: 1.08rem;
  line-height: 1.2;
  font-weight: 600;
  color: currentColor;
}

.language-link {
  gap: 8px;
}

.flag {
  font-size: 18px;
  line-height: 1;
}

.text {
  white-space: nowrap;
}
</style>
