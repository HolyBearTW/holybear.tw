<template>
  <div>
    <button @click="vote('up')" :disabled="loading">👍 推 ({{ up }})</button>
    <button @click="vote('down')" :disabled="loading">👎 噓 ({{ down }})</button>
  </div>
</template>
<script setup>
import { useVote } from './useVote'
import { useData } from 'vitepress'
import { computed } from 'vue'

const { page } = useData()
const articleId = computed(() => page.value.relativePath)
const { up, down, vote, loading } = useVote(articleId.value)
</script>
