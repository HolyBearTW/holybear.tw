<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import type { CalculatorMode } from '@maplecombat/stores/ui'
import type { CombatFormulaInputs } from '@maplecombat/core/combatPower'
import type { ActualFormulaInputs } from '@maplecombat/core/actualDamage'

const props = defineProps<{ initialMode: CalculatorMode }>()
const emit = defineEmits<{ close: [] }>()
const store = useCharacterStore()

// 單模式：依開啟時的分頁固定顯示，不在對話框內切換戰鬥力/實戰。
const isCombat = props.initialMode === 'calculator'
const modeLabel = isCombat ? '戰鬥力資料' : '實戰資料'
const kickerLabel = isCombat ? '確認面板與「技能.消耗」項目' : '目前面板值確認'
const showBuff = ref(false)

interface PreviewItem {
  key: string
  label: string
  /** 代入值（戰鬥力公式實際使用）；實戰則為輸入值 */
  value: number
  suffix?: string
  /** 戰鬥力專用：遊戲面板等值 */
  panel?: number
  /** 戰鬥力專用：技能.消耗精簡字串（非零段，已含負號）；無則空字串 */
  skillText?: string
}

const items = computed<PreviewItem[]>(() => {
  if (isCombat) {
    return combatItems(showBuff.value ? store.combatPreviewWithBuff : store.combatPreviewNoBuff)
  }
  return effItems(showBuff.value ? store.effPreviewWithBuff : store.effPreviewNoBuff)
})

function formatValue(value: number, suffix = ''): string {
  if (!Number.isFinite(value)) return '-'
  const factor = suffix === '%' || Math.abs(value) < 100 ? 1000 : 1
  const floored = Math.floor(value * factor) / factor
  return `${floored.toLocaleString('zh-TW')}${suffix}`
}

/** 把非零技能.消耗段組成精簡字串（如 −404 / −10%）；全為 0 回傳空字串 */
function skillText(parts: { value: number; suffix?: string }[]): string {
  return parts
    .filter((p) => p.value > 0)
    .map((p) => `−${formatValue(p.value, p.suffix)}`)
    .join(' / ')
}

function combatItems(data: CombatFormulaInputs): PreviewItem[] {
  const statItem = (
    key: string,
    label: string,
    b: { total: number; panel: number; skillBase: number; skillPercent: number },
  ): PreviewItem => ({
    key,
    label,
    value: b.total,
    panel: b.panel,
    skillText: skillText([{ value: b.skillBase }, { value: b.skillPercent, suffix: '%' }]),
  })
  const dmgItem = (
    key: string,
    label: string,
    d: { value: number; panel: number; skill: number },
  ): PreviewItem => ({
    key,
    label,
    value: d.value,
    suffix: '%',
    panel: d.panel,
    skillText: skillText([{ value: d.skill, suffix: '%' }]),
  })

  const list: PreviewItem[] = [
    statItem('main', store.statLabels.main, data.main),
    statItem('sub', store.statLabels.sub, data.sub),
  ]
  if (data.subtwo && store.statLabels.secondSub) {
    list.push(statItem('subtwo', store.statLabels.secondSub, data.subtwo))
  }
  list.push(
    statItem('attack', '攻擊力', data.attack),
    dmgItem('attackPercent', '攻擊力%', {
      value: data.attack.percent,
      panel: data.attack.percent + data.attack.skillPercent,
      skill: data.attack.skillPercent,
    }),
    dmgItem('damage', '傷害', data.damageDetail),
    dmgItem('bossDamage', 'Boss 傷害', data.bossDamageDetail),
    dmgItem('critDamage', '爆擊傷害', data.critDamageDetail),
  )
  return list
}

function effItems(data: ActualFormulaInputs): PreviewItem[] {
  const stat = (key: string, label: string, value: number, suffix = ''): PreviewItem => ({
    key,
    label,
    value,
    suffix,
  })
  const list: PreviewItem[] = [
    stat('main', store.statLabels.main, data.main.total),
    stat('sub', store.statLabels.sub, data.sub.total),
  ]
  if (data.subtwo && store.statLabels.secondSub) {
    list.push(stat('subtwo', store.statLabels.secondSub, data.subtwo.total))
  }
  list.push(
    stat('attack', '攻擊力', data.attack.total),
    stat('attackPercent', '攻擊力%', data.attack.percent, '%'),
    stat('damage', '傷害', data.damage, '%'),
    stat('bossDamage', 'Boss 傷害', data.bossDamage, '%'),
    stat('critDamage', '爆擊傷害', data.critDamage, '%'),
  )
  return list
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="maplecombat-embedded-overlay-root">
    <div class="stat-preview-backdrop" role="presentation" @mousedown.self="emit('close')">
      <section
        class="stat-preview-dialog"
        :class="isCombat ? 'is-combat' : 'is-eff'"
        role="dialog"
        aria-modal="true"
        aria-label="數值預覽"
      >
        <header class="stat-preview-head">
          <div>
            <span class="stat-preview-kicker">{{ kickerLabel }}</span>
            <h2>數值總覽</h2>
          </div>
          <button
            type="button"
            class="stat-preview-close"
            aria-label="關閉數值預覽"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <div class="stat-preview-toolbar">
          <span class="stat-preview-mode">{{ modeLabel }}</span>
          <div class="stat-preview-toggle" role="group" aria-label="原始 / 含 Buff 切換">
            <button type="button" :class="{ active: !showBuff }" @click="showBuff = false">
              原始
            </button>
            <button type="button" :class="{ active: showBuff }" @click="showBuff = true">
              含 Buff
            </button>
          </div>
        </div>

        <p v-if="isCombat" class="stat-preview-note">
          先用<b>面板</b>對照遊戲，再確認「<b>技能.消耗</b>」是否有填。
          <b>校正後</b>是實際計算用值，已扣除技能.消耗並套用校正；即使面板正確，技能.消耗填錯仍會影響戰鬥力的計算結果。
        </p>

        <table v-if="isCombat" class="stat-preview-table">
          <thead>
            <tr>
              <th class="sp-col-item">項目</th>
              <th>面板</th>
              <th>校正後</th>
              <th>技能.消耗</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.key">
              <td class="sp-item">{{ item.label }}</td>
              <td class="sp-num sp-panel">{{ formatValue(item.panel ?? 0, item.suffix) }}</td>
              <td class="sp-num sp-formula">{{ formatValue(item.value, item.suffix) }}</td>
              <td class="sp-num sp-skill">{{ item.skillText || '—' }}</td>
            </tr>
          </tbody>
        </table>

        <table v-else class="stat-preview-table stat-preview-table--eff">
          <thead>
            <tr>
              <th class="sp-col-item">項目</th>
              <th>數值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.key">
              <td class="sp-item">{{ item.label }}</td>
              <td class="sp-num sp-formula">{{ formatValue(item.value, item.suffix) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>
