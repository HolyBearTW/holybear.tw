<template>
  <div>
    <div>hydrated: {{ hydrated ? 'yes' : 'no' }}</div>
    <div>voteState: {{ voteState && voteState.value ? 'ok' : 'not ready' }}</div>
    <div v-if="hydrated && voteState.value" class="vote-panel">
      <button
        @click="handleVote('up')"
        :disabled="voteState.value.loading.value"
        :class="{ active: userVote === 'up' }"
      >👍 推 ({{ voteState.value.up.value }})</button>
      <button
        @click="handleVote('down')"
        :disabled="voteState.value.loading.value"
        :class="{ active: userVote === 'down' }"
      >👎 噓 ({{ voteState.value.down.value }})</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useVote } from './useVote'
import { useData } from 'vitepress'

const { page } = useData()
const articleId = computed(() => page.value.relativePath.replaceAll('/', '__'))

const voteState = ref(null)
const userVote = ref(null)
const hydrated = ref(false)

function setupVote(id) {
  console.log('setupVote called with id:', id)
  voteState.value = useVote(id)
}

onMounted(() => {
  console.log('articleId.value in onMounted:', articleId.value)
  setupVote(articleId.value)
  userVote.value = localStorage.getItem('vote_' + articleId.value) || null
  hydrated.value = true
  voteState.value.fetchVotes()
})

watch(articleId, (newId) => {
  setupVote(newId)
  userVote.value = localStorage.getItem('vote_' + newId) || null
  voteState.value.fetchVotes()
})

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
