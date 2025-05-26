<template>
  <div class="vote-panel" v-if="showPanel">
    <button
      @click="handleVote('up')"
      :disabled="loading"
      :class="{ active: userVote === 'up' }"
    >👍 推 ({{ up }})</button>
    <button
      @click="handleVote('down')"
      :disabled="loading"
      :class="{ active: userVote === 'down' }"
    >👎 噓 ({{ down }})</button>
  </div>
</template>
<script setup>
import { ref, watch, onMounted } from 'vue'
import { useVote } from './useVote'
import { useData } from 'vitepress'
import { computed } from 'vue'

const { page } = useData()
const articleId = computed(() => page.value.relativePath.replaceAll('/', '__'))
const { up, down, vote, unvote, loading, fetchVotes } = useVote(articleId.value)

const userVote = ref(null)
const showPanel = ref(false)

onMounted(() => {
  userVote.value = localStorage.getItem('vote_' + articleId.value) || null
  showPanel.value = true
})

watch(articleId, () => {
  if (showPanel.value) {
    userVote.value = localStorage.getItem('vote_' + articleId.value) || null
  }
})

async function handleVote(type) {
  if (loading.value) return
  if (userVote.value === type) {
    await unvote(type)
    userVote.value = null
    localStorage.removeItem('vote_' + articleId.value)
  } else {
    if (userVote.value) {
      await unvote(userVote.value)
    }
    await vote(type)
    userVote.value = type
    localStorage.setItem('vote_' + articleId.value, type)
  }
  await fetchVotes()
}
</script>
<style scoped>
/* ...你的原本樣式... */
</style>
