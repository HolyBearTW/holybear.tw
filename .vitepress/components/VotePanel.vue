<template>
  <div>
    <div>
      hydrated: {{ hydrated ? 'yes' : 'no' }}<br>
      voteState: {{ voteState.value ? 'ok' : 'not ready' }}<br>
      typeof voteState.value.up: {{ typeof voteState.value?.up }}<br>
      typeof voteState.value.down: {{ typeof voteState.value?.down }}<br>
      voteState.value.up.value: {{ voteState.value?.up?.value }}<br>
      voteState.value.down.value: {{ voteState.value?.down?.value }}<br>
      voteState.value.loading.value: {{ voteState.value?.loading?.value }}<br>
      userVote: {{ userVote.value }}
    </div>
    <div 
      class="vote-panel" 
      v-if="hydrated && voteState.value?.up && voteState.value?.down && voteState.value?.loading"
    >
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
  console.log('voteState.value.up:', voteState.value?.up)
  console.log('voteState.value.down:', voteState.value?.down)
  console.log('voteState.value.loading:', voteState.value?.loading)
  console.log('voteState.value.fetchVotes:', voteState.value?.fetchVotes)

  userVote.value = localStorage.getItem('vote_' + aid) || null

  if (voteState.value && typeof voteState.value.fetchVotes === 'function') {
    try {
      await voteState.value.fetchVotes()
      console.log('fetchVotes 完成:', {
        up: voteState.value.up?.value,
        down: voteState.value.down?.value,
        loading: voteState.value.loading?.value
      })
    } catch (e) {
      console.error('fetchVotes 失敗:', e)
    }
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
