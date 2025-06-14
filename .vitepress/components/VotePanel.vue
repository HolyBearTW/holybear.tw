<template>
  <div>
    <div>hydrated: {{ hydrated ? 'yes' : 'no' }}</div>
    <div>voteState: {{ voteState && voteState.value ? 'ok' : 'not ready' }}</div>
    <div>voteState.value.up: {{ voteState?.value?.up }}</div>
    <div>voteState.value.down: {{ voteState?.value?.down }}</div>
    <div>userVote: {{ userVote }}</div>
    <div class="vote-panel" v-if="hydrated && voteState.value && voteState.value.up && voteState.value.down">
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

onMounted(async () => {
  voteState.value = useVote(articleId.value)
  userVote.value = localStorage.getItem('vote_' + articleId.value) || null
  hydrated.value = true
  await voteState.value.fetchVotes()
})

watch(articleId, async (newId) => {
  voteState.value = useVote(newId)
  userVote.value = localStorage.getItem('vote_' + newId) || null
  await voteState.value.fetchVotes()
})

async function handleVote(type) {
  if (!voteState.value || voteState.value.loading.value) return
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
