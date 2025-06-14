<template>
  <div>
    <div>hydrated: {{ hydrated ? 'yes' : 'no' }}</div>
    <div>voteState: {{ voteState.value ? 'ok' : 'not ready' }}</div>
    <div>voteState.value.up: {{ voteState.value?.up?.value }}</div>
    <div>voteState.value.down: {{ voteState.value?.down?.value }}</div>
    <div>userVote: {{ userVote.value }}</div>
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

async function setupVoteStateAndFetch(aid) {
  voteState.value = useVote(aid)
  console.log('useVote 回傳:', voteState.value)
  userVote.value = localStorage.getItem('vote_' + aid) || null
  if (voteState.value && voteState.value.fetchVotes) {
    await voteState.value.fetchVotes()
  } else {
    console.error('voteState.value 沒 fetchVotes，useVote 應該沒正確 return！')
  }
}

onMounted(async () => {
  hydrated.value = true
  await setupVoteStateAndFetch(articleId.value)
})

watch(articleId, async (newId) => {
  await setupVoteStateAndFetch(newId)
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
