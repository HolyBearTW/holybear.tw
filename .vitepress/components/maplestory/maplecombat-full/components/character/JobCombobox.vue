<script setup lang="ts">
// 職業選擇 combobox：搜尋過濾 + 鍵盤導覽。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { jobOptions, jobMatchesSearch, normalizeJobText } from '@maplecombat/data/jobs'
import { useCharacterStore } from '@maplecombat/stores/character'

const store = useCharacterStore()
const isOpen = ref(false)
const searchText = ref(store.selectedJobName)
const isDirty = ref(false)
const activeIndex = ref(-1)
const pickerEl = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const filteredOptions = computed(() => {
  const raw = !isDirty.value && searchText.value === store.selectedJobName ? '' : searchText.value
  const normalized = normalizeJobText(raw)
  return jobOptions.filter((job) => jobMatchesSearch(job, normalized))
})

function open() {
  isOpen.value = true
  if (activeIndex.value < 0) {
    activeIndex.value = filteredOptions.value.findIndex((j) => j.name === store.selectedJobName)
    if (activeIndex.value < 0) activeIndex.value = 0
  }
}

function close() {
  isOpen.value = false
  activeIndex.value = -1
  isDirty.value = false
  searchText.value = store.selectedJobName
}

function select(jobName: string) {
  store.selectJobByName(jobName)
  close()
  searchInput.value?.blur()
}

function moveActive(direction: number) {
  if (!isOpen.value) open()
  const count = filteredOptions.value.length
  if (!count) return
  activeIndex.value = (activeIndex.value + direction + count) % count
  const button = listEl.value?.querySelectorAll('.job-option-button')[activeIndex.value]
  button?.scrollIntoView({ block: 'nearest' })
}

function toggleOpen() {
  if (isOpen.value) close()
  else open()
}

function onControlPointerDown(event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  isDirty.value = false
  toggleOpen()
  searchInput.value?.blur()
}

function onInput() {
  isDirty.value = true
  activeIndex.value = -1
  isOpen.value = true
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter') {
    const option = filteredOptions.value[activeIndex.value]
    if (isOpen.value && option) {
      event.preventDefault()
      select(option.name)
    }
  } else if (event.key === 'Escape') {
    close()
  }
}

function onBlur() {
  window.setTimeout(() => {
    if (pickerEl.value?.contains(document.activeElement)) return
    close()
  }, 0)
}

function onDocumentClick(event: MouseEvent) {
  if (pickerEl.value && !event.composedPath().includes(pickerEl.value)) close()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div id="jobPicker" ref="pickerEl" class="job-picker">
    <div id="jobCombobox" class="job-combobox" :class="{ 'is-open': isOpen }">
      <div class="job-combobox-control">
        <label class="job-combobox-label" for="jobSearchInput">職業</label>
        <input
          id="jobSearchInput"
          ref="searchInput"
          v-model="searchText"
          type="text"
          role="combobox"
          aria-autocomplete="none"
          :aria-expanded="isOpen"
          aria-controls="jobOptionList"
          autocomplete="off"
          placeholder="選擇職業"
          readonly
          @pointerdown="onControlPointerDown"
          @input="onInput"
          @keydown="onKeydown"
          @blur="onBlur"
        />
        <button
          id="jobComboboxToggle"
          type="button"
          class="job-combobox-toggle"
          aria-label="開啟職業清單"
          :aria-expanded="isOpen"
          @pointerdown="onControlPointerDown"
          @click.stop
        >
          <svg
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>
      <div id="jobOptionList" ref="listEl" class="job-option-list" role="listbox" :hidden="!isOpen">
        <div v-if="!filteredOptions.length" class="job-option-empty">找不到符合的職業</div>
        <button
          v-for="(job, index) in filteredOptions"
          v-else
          :id="`job-option-${index}`"
          :key="job.name"
          type="button"
          class="job-option-button"
          :class="{
            'is-active': index === activeIndex,
            'is-selected': job.name === store.selectedJobName,
          }"
          :data-job-name="job.name"
          role="option"
          :aria-selected="job.name === store.selectedJobName"
          @mousedown.prevent
          @click="select(job.name)"
        >
          <span class="job-option-name">{{ job.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
