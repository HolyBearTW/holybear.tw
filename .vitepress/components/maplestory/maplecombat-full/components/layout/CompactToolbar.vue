<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiStore, type ViewKey } from '@maplecombat/stores/ui'
import { useImportExport } from '@maplecombat/composables/useImportExport'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useStateSlotsStore, type StateSlotId } from '@maplecombat/stores/stateSlots'

const ui = useUiStore()
const { fileInput, onExport, onImportFileChange } = useImportExport()
const store = useCharacterStore()
const slots = useStateSlotsStore()
const stateMenuOpen = ref(false)
const stateMenuRef = ref<HTMLElement | null>(null)
const dialogBackdropPressed = ref(false)

type StateDialogKind = 'rename' | 'copy' | 'apply' | 'reset'
interface StateDialog {
  kind: StateDialogKind
  title: string
  message: string
  selectedState?: StateSlotId
  selectedStates?: StateSlotId[]
  names?: Partial<Record<StateSlotId, string>>
}
const stateDialog = ref<StateDialog | null>(null)

const tabs: { view: ViewKey; label: string; hint: string }[] = [
  { view: 'characterInput', label: '角色與 Buff', hint: '人物資料' },
  { view: 'equipmentChange', label: '裝備替換', hint: '裝備模擬' },
  { view: 'valueConversion', label: '效率與戒指', hint: '數值換算' },
]

function activateState(id: StateSlotId | 'weighted') {
  closeStateMenu()
  store.activateWorkspaceSlot(id)
}

function closeStateMenu() {
  stateMenuOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!stateMenuOpen.value) return
  if (stateMenuRef.value && event.composedPath().includes(stateMenuRef.value)) return
  closeStateMenu()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.repeat) return
  if (event.key === 'Escape') {
    if (stateDialog.value) {
      event.preventDefault()
      closeDialog()
      return
    }
    if (stateMenuOpen.value) {
      event.preventDefault()
      closeStateMenu()
    }
    return
  }
  if (event.key === 'Enter' && stateDialog.value && canConfirmStateDialog()) {
    event.preventDefault()
    confirmStateDialog()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

function stateName(id: StateSlotId): string {
  return slots.workspace.states.find((state) => state.id === id)?.name ?? id
}

function activeStateId(): StateSlotId | null {
  return slots.workspace.activeSlot === 'weighted' ? null : (slots.workspace.activeSlot as StateSlotId)
}

function openRenameDialog() {
  if (slots.workspace.activeSlot === 'weighted' || !slots.activeState) return
  stateDialog.value = {
    kind: 'rename',
    title: '編輯狀態名稱',
    message: '可一次修改 5 個狀態名稱，最多 12 字。',
    names: Object.fromEntries(slots.workspace.states.map((state) => [state.id, state.name])) as Partial<
      Record<StateSlotId, string>
    >,
  }
  closeStateMenu()
}

function openCopyDialog() {
  const active = activeStateId()
  if (!active) return
  stateDialog.value = {
    kind: 'copy',
    title: '複製目前狀態到...',
    message: '可多選目標狀態，確認後會覆蓋目標狀態。',
    selectedStates: [],
  }
  closeStateMenu()
}

function openApplyDialog() {
  const active = activeStateId()
  if (!active) return
  stateDialog.value = {
    kind: 'apply',
    title: '套用其他狀態到目前',
    message: '目前狀態會被選擇的來源狀態覆蓋。',
  }
  closeStateMenu()
}

function openResetDialog() {
  const active = activeStateId()
  if (!active) return
  stateDialog.value = {
    kind: 'reset',
    title: '重設目前狀態',
    message: `${stateName(active)} 的實戰資料與 Buff 會被重設。`,
  }
  closeStateMenu()
}

function closeDialog() {
  stateDialog.value = null
  dialogBackdropPressed.value = false
}

function onDialogBackdropMouseDown(event: MouseEvent) {
  dialogBackdropPressed.value = event.target === event.currentTarget
}

function onDialogBackdropClick(event: MouseEvent) {
  const shouldClose = dialogBackdropPressed.value && event.target === event.currentTarget
  dialogBackdropPressed.value = false
  if (shouldClose) closeDialog()
}

function isDialogStateSelected(id: StateSlotId): boolean {
  const dialog = stateDialog.value
  if (!dialog) return false
  if (dialog.kind === 'copy') {
    return dialog.selectedStates?.includes(id) ?? false
  }
  return dialog.selectedState === id
}

function toggleDialogState(id: StateSlotId) {
  const dialog = stateDialog.value
  const active = activeStateId()
  if (!dialog || !active || id === active) return
  if (dialog.kind === 'copy') {
    const selected = new Set(dialog.selectedStates ?? [])
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    dialog.selectedStates = Array.from(selected)
    return
  }
  if (dialog.kind === 'apply') {
    dialog.selectedState = id
  }
}

function confirmStateDialog() {
  const dialog = stateDialog.value
  const active = activeStateId()
  if (!dialog || !active) return
  if (dialog.kind === 'rename') {
    slots.workspace.states.forEach((state) => {
      slots.renameState(state.id, dialog.names?.[state.id] ?? '')
    })
  } else if (dialog.kind === 'copy') {
    const targets = (dialog.selectedStates ?? []).filter((id) => id !== active)
    if (!targets.length) return
    targets.forEach((target) => slots.copyState(active, target))
  } else if (dialog.kind === 'apply') {
    if (!dialog.selectedState || dialog.selectedState === active) return
    slots.copyState(dialog.selectedState, active)
    store.reloadWorkspaceSlot(active)
  } else if (dialog.kind === 'reset') {
    slots.resetState(active)
    store.reloadWorkspaceSlot(active)
  }
  closeDialog()
}

function canConfirmStateDialog(): boolean {
  const dialog = stateDialog.value
  const active = activeStateId()
  if (!dialog || !active) return false
  if (dialog.kind === 'copy') {
    return (dialog.selectedStates ?? []).some((id) => id !== active)
  }
  if (dialog.kind === 'apply') {
    return !!dialog.selectedState && dialog.selectedState !== active
  }
  return true
}
</script>

<template>
  <div class="compact-toolbar">
    <div class="ct-main-row">
      <div class="ct-product">
        <strong>完整公式計算</strong>
        <small>角色資料、換裝與實戰效率</small>
      </div>
      <nav class="ct-tabs" aria-label="計算機功能分類">
        <button
          v-for="tab in tabs"
          :key="tab.view"
          type="button"
          class="ct-tab"
          :class="{ active: ui.activeView === tab.view }"
          @click="ui.activeView = tab.view"
        >
          <small>{{ tab.hint }}</small>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
      <div class="ct-actions">
        <span class="ct-group-label">資料管理</span>
        <button type="button" class="ct-btn" title="匯入資料" @click="fileInput?.click()">
          匯入
        </button>
        <button type="button" class="ct-btn" title="儲存資料" @click="onExport">儲存</button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          style="display: none"
          @change="onImportFileChange"
        />
      </div>
    </div>

    <div class="ct-state-row">
      <div class="ct-state-heading">
        <strong>實戰情境</strong>
        <small>每個情境可分別設定 Buff</small>
      </div>
      <div class="ct-state-tabs" aria-label="狀態切換">
        <button
          v-for="state in slots.workspace.states"
          :key="state.id"
          type="button"
          class="ct-state-tab"
          :class="{ active: slots.workspace.activeSlot === state.id }"
          :title="state.name"
          @click="activateState(state.id)"
        >
          {{ state.name }}
        </button>
        <button
          type="button"
          class="ct-state-tab ct-state-tab--weighted"
          :class="{ active: slots.isWeightedActive }"
          @click="activateState('weighted')"
        >
          加權
        </button>
      </div>
      <details
        ref="stateMenuRef"
        class="ct-state-menu"
        :open="stateMenuOpen"
        @toggle="stateMenuOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary class="ct-state-menu-trigger">管理情境</summary>
        <div class="ct-state-menu-panel">
          <button type="button" :disabled="slots.isWeightedActive" @click="openRenameDialog">
            編輯狀態名稱
          </button>
          <button type="button" :disabled="slots.isWeightedActive" @click="openCopyDialog">
            複製目前狀態到...
          </button>
          <button type="button" :disabled="slots.isWeightedActive" @click="openApplyDialog">
            套用其他狀態到目前
          </button>
          <button type="button" :disabled="slots.isWeightedActive" @click="openResetDialog">
            重設目前狀態
          </button>
        </div>
      </details>
    </div>

    <div class="maplecombat-embedded-overlay-root">
      <div
        v-if="stateDialog"
        class="ct-dialog-backdrop"
        @mousedown="onDialogBackdropMouseDown"
        @click="onDialogBackdropClick"
      >
        <div class="ct-dialog" role="dialog" aria-modal="true" @click.stop>
          <div class="ct-dialog-head">
            <strong>{{ stateDialog.title }}</strong>
            <button type="button" class="ct-dialog-close" aria-label="關閉" @click="closeDialog">×</button>
          </div>
          <p>{{ stateDialog.message }}</p>

          <div v-if="stateDialog.kind === 'rename'" class="ct-dialog-name-grid">
            <label v-for="(state, index) in slots.workspace.states" :key="state.id" class="ct-dialog-name-row">
              <span>狀態{{ index + 1 }}</span>
              <input v-model="stateDialog.names![state.id]" type="text" maxlength="12" />
            </label>
          </div>

          <div v-if="stateDialog.kind === 'copy' || stateDialog.kind === 'apply'" class="ct-dialog-state-grid">
            <button
              v-for="state in slots.workspace.states"
              :key="state.id"
              type="button"
              :disabled="state.id === slots.workspace.activeSlot"
              :aria-pressed="isDialogStateSelected(state.id)"
              :class="{ active: isDialogStateSelected(state.id) }"
              @click="toggleDialogState(state.id)"
            >
              {{ state.name }}
            </button>
          </div>

          <div class="ct-dialog-actions">
            <button type="button" class="ct-dialog-secondary" @click="closeDialog">取消</button>
            <button
              type="button"
              class="ct-dialog-primary"
              :disabled="!canConfirmStateDialog()"
              @click="confirmStateDialog"
            >
              確認
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
