<script setup lang="ts">
import { computed } from 'vue'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { SOUL_ORB_STATS, getSoulOrbAttackBonus } from '@maplecombat/core/buffs/delta'
import { useCharacterStore } from '@maplecombat/stores/character'
import CustomSelect from '@maplecombat/components/character/shared/CustomSelect.vue'

const props = defineProps<{
  mode: 'combat' | 'eff'
}>()

const buffs = useBuffsStore()
const character = useCharacterStore()

const soulOrbStatOptions = computed(() =>
  SOUL_ORB_STATS.map(([value, label]) => ({ value, label })),
)

function onSoulOrbValueInput(event: Event) {
  buffs.setSoulOrbValue(Number((event.target as HTMLInputElement).value))
}

function onFullSoulChange(event: Event) {
  buffs.setSoulOrbFullSoul((event.target as HTMLInputElement).checked)
}

const currentWeaponAtk = computed(
  () => Math.max(0, Number(character.fields.currentWeaponAtk) || 0),
)
const soulOrbWeaponAtk = computed(() =>
  props.mode === 'combat' ? character.combatSoulOrbWeaponAtk : currentWeaponAtk.value,
)
const soulOrbAttackBonus = computed(() => getSoulOrbAttackBonus(soulOrbWeaponAtk.value))
const fullSoulTooltip = computed(
  () =>
    props.mode === 'combat'
      ? `校正後基準武器總攻擊力 ${soulOrbWeaponAtk.value}，滿魂增加 ${soulOrbAttackBonus.value} 攻擊力（10% 無條件捨去）`
      : `目前武器攻擊力 ${currentWeaponAtk.value}，滿魂增加 ${soulOrbAttackBonus.value} 攻擊力（10% 無條件捨去）`,
)
const fullSoulAriaLabel = computed(() =>
  props.mode === 'combat'
    ? `滿魂，依基準武器換算增加 ${soulOrbAttackBonus.value} 攻擊力`
    : `滿魂，增加 ${soulOrbAttackBonus.value} 攻擊力`,
)
</script>

<template>
  <div class="buff-soul-orb-control">
    <label class="buff-soul-orb-field">
      <span>寶珠數值</span>
      <input
        class="buff-soul-orb-value"
        type="number"
        min="0"
        :value="buffs.soulOrb.value || ''"
        inputmode="decimal"
        aria-label="靈魂寶珠數值"
        @input="onSoulOrbValueInput"
      />
    </label>
    <div class="buff-soul-orb-field buff-soul-orb-stat">
      <span>套用屬性（{{ soulOrbStatOptions.length }} 種）</span>
      <CustomSelect
        select-class="soul-orb-select"
        aria-label="靈魂寶珠套用屬性"
        :model-value="buffs.soulOrb.stat"
        :options="soulOrbStatOptions"
        @update:model-value="buffs.setSoulOrbStat"
      />
    </div>
    <label
      class="buff-soul-orb-full"
      :class="{ 'is-active': buffs.soulOrb.fullSoul }"
      :title="fullSoulTooltip"
    >
      <input
        type="checkbox"
        :checked="buffs.soulOrb.fullSoul"
        :aria-label="fullSoulAriaLabel"
        @change="onFullSoulChange"
      />
      <span v-if="mode === 'combat'">滿魂 +{{ soulOrbAttackBonus }}攻 (以基準武器換算)</span>
      <span v-else>滿魂 +{{ soulOrbAttackBonus }}攻</span>
    </label>
  </div>
</template>
