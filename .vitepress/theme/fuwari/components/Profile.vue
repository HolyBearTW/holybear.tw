<script setup lang="ts">
import { Github, Send, UserRound } from 'lucide-vue-next'
import { withBase } from 'vitepress'
import { computed } from 'vue'
import { useData } from 'vitepress'
import type { FuwariProfile } from '../types'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

// Ported from Fuwari: src/components/widget/Profile.astro
defineProps<{ config: FuwariProfile }>()
const icons = { github: Github, telegram: Send }
</script>

<template>
  <section class="fuwari-profile fuwari-card-base">
    <a class="fuwari-profile__image-link" :href="withBase(en ? '/en/about' : '/about')" :aria-label="en ? 'Go to the About page' : '前往關於頁面'">
      <img :src="withBase(config.avatar)" :alt="en ? 'HolyBear profile image' : 'HolyBear 個人圖片'">
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
