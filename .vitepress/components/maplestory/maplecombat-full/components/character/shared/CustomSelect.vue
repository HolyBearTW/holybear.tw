<script setup lang="ts">
// 自訂下拉（武器套組/星火/毀滅盾牌）：含鍵盤操作。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'

const props = defineProps<{
  id?: string
  options: { value: string; label: string }[]
  modelValue?: string
  // 樣式掛鉤：標記在隱藏的原生 select 上，供 `.xxx + .custom-select` 取用（多實例時取代 id）
  selectClass?: string
  ariaLabel?: string
  blurOnChoose?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const store = useCharacterStore()
const isOpen = ref(false)
const openUp = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

// 展開時若下方空間不足（如靈魂寶珠在面板底部），改往上展開，避免被視窗下緣切掉
watch(isOpen, async (open) => {
  if (!open) return
  await nextTick()
  const trigger = rootEl.value?.querySelector('.custom-select-trigger')
  const list = listEl.value
  if (!trigger || !list) return
  const triggerRect = trigger.getBoundingClientRect()
  let clipTop = 0
  let clipBottom = window.innerHeight

  const inspectAncestors = (start: Element | null) => {
    let node = start
    while (node) {
      const style = getComputedStyle(node)
      const overflow = `${style.overflow} ${style.overflowY}`
      if (/(auto|scroll|hidden|clip)/.test(overflow)) {
        const rect = node.getBoundingClientRect()
        clipTop = Math.max(clipTop, rect.top)
        clipBottom = Math.min(clipBottom, rect.bottom)
      }
      node = node.parentElement
    }
  }

  inspectAncestors(trigger.parentElement)
  const root = trigger.getRootNode()
  if (root instanceof ShadowRoot) inspectAncestors(root.host.parentElement)

  const spaceBelow = Math.max(0, clipBottom - triggerRect.bottom)
  const spaceAbove = Math.max(0, triggerRect.top - clipTop)
  const needed = list.scrollHeight + 8
  openUp.value = spaceBelow < needed && spaceAbove > spaceBelow
})

// 有傳 modelValue → v-model 模式（如靈魂寶珠走 buffs store）；否則沿用 characterStore.fields[id]
const value = computed({
  get: () =>
    props.modelValue !== undefined ? props.modelValue : String(store.fields[props.id ?? ''] ?? ''),
  set: (v: string) => {
    if (props.modelValue !== undefined) emit('update:modelValue', v)
    else if (props.id) store.setField(props.id, v)
  },
})
const selectedLabel = computed(
  () => props.options.find((o) => o.value === value.value)?.label ?? props.options[0]?.label ?? '',
)

function choose(optionValue: string) {
  value.value = optionValue
  isOpen.value = false
  if (props.blurOnChoose) {
    nextTick(() => (document.activeElement as HTMLElement | null)?.blur())
  }
}

function step(direction: number) {
  const index = props.options.findIndex((o) => o.value === value.value)
  const next = Math.min(Math.max(index + direction, 0), props.options.length - 1)
  if (props.options[next]) value.value = props.options[next].value
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    isOpen.value = !isOpen.value
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    isOpen.value = true
    step(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    isOpen.value = true
    step(-1)
  } else if (event.key === 'Escape') {
    isOpen.value = false
  }
}

function onDocumentClick(event: MouseEvent) {
  if (rootEl.value && !event.composedPath().includes(rootEl.value)) isOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <span ref="rootEl" class="custom-select-root">
    <select
      :id="id"
      v-model="value"
      class="custom-select-native"
      :class="selectClass"
      :aria-label="ariaLabel"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <div class="custom-select" :class="{ 'is-open': isOpen, 'is-up': openUp }">
      <button
        type="button"
        class="custom-select-trigger"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-label="ariaLabel"
        @click="isOpen = !isOpen"
        @keydown="onTriggerKeydown"
      >
        {{ selectedLabel }}
      </button>
      <div ref="listEl" class="custom-select-list" role="listbox">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="custom-select-option"
          :class="{ 'is-selected': option.value === value }"
          :data-value="option.value"
          role="option"
          :aria-selected="option.value === value"
          @click="choose(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </span>
</template>

<style scoped>
.custom-select-root {
  display: contents;
}
</style>
