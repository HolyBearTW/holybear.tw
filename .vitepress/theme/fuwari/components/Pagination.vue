<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))

defineProps<{ page: number; pages: number }>()
const emit = defineEmits<{ change: [page: number] }>()
</script>

<template>
  <!-- Vue port of Fuwari src/components/control/Pagination.astro. -->
  <nav v-if="pages > 1" class="fuwari-pagination fuwari-card-base" :aria-label="en ? 'Post pagination' : '文章分頁'">
    <button :disabled="page <= 1" :aria-label="en ? 'Previous page' : '上一頁'" @click="emit('change', page - 1)"><ChevronLeft :size="19" /></button>
    <button v-for="item in pages" :key="item" :class="{ active: item === page }" :aria-current="item === page ? 'page' : undefined" @click="emit('change', item)">{{ item }}</button>
    <button :disabled="page >= pages" :aria-label="en ? 'Next page' : '下一頁'" @click="emit('change', page + 1)"><ChevronRight :size="19" /></button>
  </nav>
</template>
