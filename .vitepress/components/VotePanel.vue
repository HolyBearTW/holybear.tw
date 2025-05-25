<template>
  <div class="vote-panel">
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
import { ref, watch } from 'vue'
import { useVote } from './useVote'
import { useData } from 'vitepress'
import { computed } from 'vue'

const { page } = useData()
const articleId = computed(() => page.value.relativePath.replaceAll('/', '__'))
const { up, down, vote, unvote, loading, fetchVotes } = useVote(articleId.value)

const userVote = ref(localStorage.getItem('vote_' + articleId.value) || null)

watch(articleId, () => {
  userVote.value = localStorage.getItem('vote_' + articleId.value) || null
})

async function handleVote(type) {
  if (loading.value) return
  if (userVote.value === type) {
    // 收回
    await unvote(type)
    userVote.value = null
    localStorage.removeItem('vote_' + articleId.value)
  } else {
    // 投新票
    if (userVote.value) {
      // 若已投另一票，先收回
      await unvote(userVote.value)
    }
    await vote(type)
    userVote.value = type
    localStorage.setItem('vote_' + articleId.value, type)
  }
  // 強制刷新
  await fetchVotes()
}
</script>
<style scoped>
.vote-panel {
  margin: 2rem 0 1.5rem 0;
  display: flex;
  gap: 1rem;
}
button {
  font-size: 1.1rem;
  padding: 0.5em 1em;
  border-radius: 8px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.active {
  background: #ffe066;
  border-color: #f7b731;
  font-weight: bold;
}
button:hover:not(:disabled) {
  background: #f6f6f6;
}
</style>
