<script setup lang="ts">
// 戰鬥力係數/P寵攻擊下拉（輸入框 + 預設選項選單）。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useStringField } from '@maplecombat/composables/useField'
import StatInput from './StatInput.vue'

const props = defineProps<{
  id: string
  options: { value: string; label: string }[]
  toggleLabel: string
}>()

const isOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const model = useStringField(props.id)

function chooseOption(value: string) {
  model.value = value
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (rootEl.value && !event.composedPath().includes(rootEl.value)) isOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div
    ref="rootEl"
    class="power-coefficient-combobox"
    :class="{ 'is-open': isOpen }"
    data-power-coefficient-menu
  >
    <StatInput :id="id" @focus="isOpen = true" />
    <button
      type="button"
      class="power-coefficient-toggle"
      :aria-label="toggleLabel"
      :aria-expanded="isOpen"
      @click.stop="isOpen = !isOpen"
    ></button>
    <div class="power-coefficient-menu" role="listbox">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="power-coefficient-option"
        :data-value="option.value"
        role="option"
        @click.stop="chooseOption(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
