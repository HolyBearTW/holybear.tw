<template>
  <div class="vote-panel" v-if="hydrated">
    <button
      class="vote-button vote-button--up"
      @click="handleVote('up')"
      :disabled="loading"
      :class="{ active: userVote === 'up' }"
      :aria-pressed="userVote === 'up'"
    >
      <ThumbsUp :size="17" :stroke-width="2" aria-hidden="true" />
      <span class="vote-button__label">{{ upLabel }}</span>
      <span class="vote-button__count">{{ up }}</span>
    </button>
    <button
      class="vote-button vote-button--down"
      @click="handleVote('down')"
      :disabled="loading"
      :class="{ active: userVote === 'down' }"
      :aria-pressed="userVote === 'down'"
    >
      <ThumbsDown :size="17" :stroke-width="2" aria-hidden="true" />
      <span class="vote-button__label">{{ downLabel }}</span>
      <span class="vote-button__count">{{ down }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useVote } from './useVote'
import { useData } from 'vitepress'
import { ThumbsDown, ThumbsUp } from 'lucide-vue-next'

const { page, site } = useData()
const articleId = computed(() => page.value.relativePath.replaceAll('/', '__'))

const { up, down, vote, unvote, loading, fetchVotes } = useVote(articleId)

const userVote = ref(null)
const hydrated = ref(false)

// 取得當前語系
const lang = computed(() => site.value.lang)

// 不同語言的按鈕文字
const upLabel = computed(() =>
  lang.value.startsWith('en') ? 'Like' : '推'
)
const downLabel = computed(() =>
  lang.value.startsWith('en') ? 'Dislike' : '噓'
)

function refreshUserVote() {
  userVote.value = localStorage.getItem('vote_' + articleId.value) || null
}

onMounted(async () => {
  refreshUserVote()
  hydrated.value = true
  await fetchVotes()
})

watch(articleId, async () => {
  refreshUserVote()
  await fetchVotes()
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
.vote-panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.65rem;
  margin: 2rem 0 1.5rem;
}

.vote-button {
  --vote-accent: var(--vp-c-brand-1);
  display: inline-flex;
  min-width: 7rem;
  min-height: 2.55rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.42rem 0.55rem 0.42rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--vote-accent) 28%, var(--vp-c-divider));
  border-radius: 0.8rem;
  color: #365967;
  background: rgba(247, 252, 253, 0.78);
  box-shadow: 0 6px 18px rgba(35, 76, 94, 0.1);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  backdrop-filter: blur(12px) saturate(120%);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 160ms ease, color 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.vote-button--down { --vote-accent: #d65f73; }

.vote-button > svg {
  flex: none;
  color: var(--vote-accent);
}

.vote-button__count {
  display: inline-grid;
  min-width: 1.7rem;
  min-height: 1.55rem;
  padding: 0 0.4rem;
  place-items: center;
  border-radius: 0.5rem;
  color: var(--vote-accent);
  background: color-mix(in srgb, var(--vote-accent) 12%, transparent);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.vote-button:hover:not(:disabled) {
  transform: translateY(-1px);
  color: var(--vote-accent);
  border-color: color-mix(in srgb, var(--vote-accent) 58%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vote-accent) 9%, rgba(247, 252, 253, 0.92));
  box-shadow: 0 9px 22px color-mix(in srgb, var(--vote-accent) 13%, rgba(35, 76, 94, 0.08));
}

.vote-button.active {
  color: #fff;
  border-color: color-mix(in srgb, var(--vote-accent) 82%, #fff);
  background: color-mix(in srgb, var(--vote-accent) 86%, #12313b);
  box-shadow: 0 9px 24px color-mix(in srgb, var(--vote-accent) 26%, transparent);
}

.vote-button.active > svg,
.vote-button.active .vote-button__count { color: #fff; }
.vote-button.active .vote-button__count { background: rgba(255, 255, 255, 0.17); }

.vote-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--vote-accent) 72%, #fff);
  outline-offset: 3px;
}

.vote-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

:global(.dark) .vote-button {
  color: var(--vp-c-text-2);
  background: rgba(7, 19, 33, 0.82);
  box-shadow: 0 5px 15px color-mix(in srgb, var(--vote-accent) 8%, transparent);
}

:global(.dark) .vote-button--down { --vote-accent: #f18496; }

:global(.dark) .vote-button:hover:not(:disabled) {
  color: var(--vote-accent);
  background: color-mix(in srgb, var(--vote-accent) 11%, rgba(7, 19, 33, 0.88));
  box-shadow: 0 9px 22px color-mix(in srgb, var(--vote-accent) 16%, transparent);
}

:global(.dark) .vote-button.active {
  color: #fff;
  background: color-mix(in srgb, var(--vote-accent) 86%, #12313b);
}

@media (max-width: 420px) {
  .vote-button { min-width: 6.5rem; }
}
</style>
