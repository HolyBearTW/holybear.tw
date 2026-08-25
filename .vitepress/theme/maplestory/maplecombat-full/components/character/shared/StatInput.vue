<script setup lang="ts">
// 數字輸入欄位：綁定 character store 欄位
// （滾輪不改值、擋上下方向鍵、欄位長度限制）。
import { useStringField } from '@maplecombat/composables/useField'

const props = withDefaults(
  defineProps<{
    id: string
    /** 套用角色輸入長度限制（僅戰鬥力/實戰資料分頁欄位） */
    restrict?: boolean
    inputClass?: string
    min?: string
    max?: string
    placeholder?: string
    /** 唯讀（萌獸終傷啟用逐條來源時，% 欄位顯示加總值且不可手改） */
    readonly?: boolean
  }>(),
  {
    restrict: false,
    inputClass: '',
    min: undefined,
    max: undefined,
    placeholder: undefined,
    readonly: false,
  },
)

const emit = defineEmits<{ userEdit: [] }>()

const model = useStringField(props.id, props.restrict)

function onWheel(event: WheelEvent) {
  // 滾輪滾動時，短暫將輸入框設為唯讀，不影響聚焦
  if (props.readonly) return
  const el = event.target as HTMLInputElement
  el.readOnly = true
  setTimeout(() => {
    el.readOnly = false
  }, 0)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
  }
}
</script>

<template>
  <input
    :id="id"
    v-model="model"
    type="number"
    step="any"
    :class="inputClass || undefined"
    :min="min"
    :max="max"
    :placeholder="placeholder"
    :readonly="readonly || undefined"
    @input="emit('userEdit')"
    @wheel="onWheel"
    @keydown="onKeydown"
  />
</template>
