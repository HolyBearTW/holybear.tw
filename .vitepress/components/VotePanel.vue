<template>
  <div class="vote-panel" v-if="hydrated">
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

// 這裡包一層 ref
let up = ref(0)
let down = ref(0)
let loading = ref(true)
let vote = null
let unvote = null
let fetchVotes = null

const userVote = ref(null)
const hydrated = ref(false)

function setupVoteForId(id) {
  const voteObj = useVote(id)
  up = voteObj.up
  down = voteObj.down
  loading = voteObj.loading
  vote = voteObj.vote
  unvote = voteObj.unvote
  fetchVotes = voteObj.fetchVotes
}

watch(articleId, (newId) => {
  setupVoteForId(newId)
  if (hydrated.value) {
    userVote.value = localStorage.getItem('vote_' + newId) || null
  }
})

onMounted(() => {
  setupVoteForId(articleId.value)
  userVote.value = localStorage.getItem('vote_' + articleId.value) || null
  hydrated.value = true
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
