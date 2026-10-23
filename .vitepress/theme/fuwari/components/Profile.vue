<script setup lang="ts">
import { Github, Send, UserRound } from 'lucide-vue-next'
import { withBase, useData } from 'vitepress'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import halloweenTechIslandAvatarUrl from '../../background/assets/halloween/halloween-tech-island-character.png?url'
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from '../../background/themes'
import type { FuwariProfile } from '../types'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

// Ported from Fuwari: src/components/widget/Profile.astro
const props = defineProps<{ config: FuwariProfile }>()
const icons = { github: Github, telegram: Send }

const isHalloweenSelected = () => {
  if (typeof document === 'undefined') return false
  if (
    document.body.classList.contains('theme-halloween') ||
    document.documentElement.dataset.backgroundTheme === 'halloween'
  ) {
    return true
  }
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'halloween'
  } catch {
    return false
  }
}

const isHalloweenTheme = ref(isHalloweenSelected())
const avatarSrc = computed(() => (
  isHalloweenTheme.value ? halloweenTechIslandAvatarUrl : withBase(props.config.avatar)
))

const updateSeasonalAvatar = (event: Event) => {
  isHalloweenTheme.value = (event as CustomEvent<{ theme?: string }>).detail?.theme === 'halloween'
}

onMounted(() => {
  isHalloweenTheme.value = isHalloweenSelected()
  window.addEventListener(THEME_CHANGE_EVENT, updateSeasonalAvatar)
})

onBeforeUnmount(() => {
  window.removeEventListener(THEME_CHANGE_EVENT, updateSeasonalAvatar)
})
</script>

<template>
  <section class="fuwari-profile fuwari-card-base">
    <a
      class="fuwari-profile__image-link"
      :class="{ 'is-halloween-avatar': isHalloweenTheme }"
      :href="withBase(en ? '/en/about' : '/about')"
      :aria-label="en ? 'Go to the About page' : '前往關於頁面'"
    >
      <img :src="avatarSrc" :alt="en ? 'HolyBear profile image' : 'HolyBear 個人圖片'">
      <span class="fuwari-profile__image-hover" aria-hidden="true"><UserRound :size="44" /></span>
    </a>
    <div class="fuwari-profile__content">
      <h2>{{ config.name }}</h2>
      <span class="fuwari-profile__accent" aria-hidden="true"></span>
      <p>{{ config.bio }}</p>
      <div class="fuwari-profile__links">
        <a v-for="item in config.links" :key="item.name" :href="item.url" target="_blank" rel="me noopener" :aria-label="item.name">
          <component :is="icons[item.icon]" :size="21" />
        </a>
      </div>
    </div>
  </section>
</template>
