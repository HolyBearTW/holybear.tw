<template>
  <div class="vote-panel" v-if="hydrated">
    <button
      @click="handleVote('up')"
      :disabled="voteState.value.loading.value"
      :class="{ active: userVote.value === 'up' }"
    >
      👍 推
      <span v-if="!voteState.value.loading.value">({{ voteState.value.up.value }})</span>
      <span v-else>...</span>
    </button>
    <button
      @click="handleVote('down')"
      :disabled="voteState.value.loading.value"
      :class="{ active: userVote.value === 'down' }"
    >
      👎 噓
      <span v-if="!voteState.value.loading.value">({{ voteState.value.down.value }})</span>
      <span v-else>...</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useVote } from './useVote'
import { useData } from 'vitepress'

// 取得目前文章的 articleId
const { page } = useData()
const articleId = computed(() => page.value.relativePath.replaceAll('/', '__'))

// voteState 用 ref 包住（裡面才有 up/down/loading）
const voteState = ref(useVote(articleId.value))
// userVote 也用 ref，保證 template 可 reactivity
const userVote = ref(localStorage.getItem('vote_' + articleId.value) || null)
const hydrated = ref(false)

// 切換文章時，voteState 重新取得、userVote 重新設定、票數重新 fetch
watch(articleId, async (newId) => {
  voteState.value = useVote(newId)
  userVote.value = localStorage.getItem('vote_' + newId) || null
  await voteState.value.fetchVotes()
})

// 首次載入
onMounted(async () => {
  hydrated.value = true
  await voteState.value.fetchVotes()
})

// 投票行為
async function handleVote(type) {
  if (voteState.value.loading.value) return
  if (userVote.value === type) {
    await voteState.value.unvote(type)
    userVote.value = null
    localStorage.removeItem('vote_' + articleId.value)
  } else {
    if (userVote.value) {
      await voteState.value.unvote(userVote.value)
    }
    await voteState.value.vote(type)
    userVote.value = type
    localStorage.setItem('vote_' + articleId.value, type)
  }
  await voteState.value.fetchVotes()
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
  padding: 0.5em 1.5em;
  border-radius: 16px;
  border: 2px solid var(--vp-button-brand-border, #33FFFF);
  background: var(--vp-button-brand-bg, #00FFEE);
  color: var(--vp-button-brand-text, black);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px 0 rgba(0,255,238,0.08);
  transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
}
button:hover:not(:disabled) {
  background: var(--vp-button-brand-hover-bg, #33FFFF);
  color: var(--vp-button-brand-hover-text, black);
  border-color: var(--vp-button-brand-hover-border, #33FFFF);
  box-shadow: 0 2px 16px 0 rgba(0,255,238,0.18);
}
button.active {
  background: var(--vp-c-brand-dark, #00CCEE);
  color: var(--vp-button-brand-active-text, black);
  border-color: var(--vp-c-brand-darker, #0099BB);
  box-shadow: 0 2px 16px 0 rgba(0,204,238,0.30);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
