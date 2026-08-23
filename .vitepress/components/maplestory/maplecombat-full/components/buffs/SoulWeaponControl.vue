<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { LEGACY_SOUL_SKILL_IDS } from '@maplecombat/core/buffs/delta'
import { SOUL_FIGHTING_SPIRIT_ID } from '@maplecombat/core/buffs/towerRing'
import {
  SOUL_WEAPON_OPTION_STAT_OPTIONS,
  soulWeaponResonanceAttack,
} from '@maplecombat/core/soulWeapon'
import CustomSelect from '@maplecombat/components/character/shared/CustomSelect.vue'

const character = useCharacterStore()
const buffs = useBuffsStore()
const gradeOptions = Array.from({ length: 10 }, (_, index) => ({
  value: String(index + 1),
  label: `階級 ${index + 1}`,
}))
const enabled = computed(() => character.fields.soulWeaponEnabled === true)

function setEnabled(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    LEGACY_SOUL_SKILL_IDS.forEach((id) => buffs.setLevel(id, 0))
    const grade = Math.max(1, Math.min(10, Number(character.fields.soulWeaponGrade) || 7))
    character.setField('towerRingSoulLevel', String(grade))
    buffs.rememberPreferredLevel(SOUL_FIGHTING_SPIRIT_ID, grade)
  }
  character.setField('soulWeaponEnabled', checked)
}

function setGrade(value: string): void {
  const grade = Math.max(1, Math.min(10, Math.trunc(Number(value) || 1)))
  character.setField('soulWeaponGrade', String(grade))
  character.setField('towerRingSoulLevel', String(grade))
  buffs.rememberPreferredLevel(SOUL_FIGHTING_SPIRIT_ID, grade)
  if ((buffs.state[SOUL_FIGHTING_SPIRIT_ID] || 0) > 0) {
    buffs.setLevel(SOUL_FIGHTING_SPIRIT_ID, grade)
  }
}

function setNumberField(id: string, event: Event, minimum: number, maximum: number): number {
  const input = event.target as HTMLInputElement
  const value = Math.max(minimum, Math.min(maximum, Math.trunc(Number(input.value) || 0)))
  character.setField(id, String(value))
  input.value = String(value)
  return value
}

function setLevel(event: Event): void {
  const level = setNumberField('soulWeaponLevel', event, 0, 100)
  character.setField('soulWeaponPowerIncrease', String(soulWeaponResonanceAttack(level)))
}

function setPower(event: Event): void {
  setNumberField('soulWeaponPowerIncrease', event, 0, 9999)
}

function setOptionValue(event: Event): void {
  setNumberField('soulWeaponOptionValue', event, 0, 99999)
}
</script>

<template>
  <div class="buff-soul-weapon-control" :class="{ 'is-enabled': enabled }">
    <label class="buff-soul-weapon-toggle">
      <input
        type="checkbox"
        :checked="enabled"
        aria-label="啟用新版靈魂武器"
        @change="setEnabled"
      />
      <span>啟用新版靈魂武器</span>
    </label>

    <div class="buff-soul-weapon-fields" :aria-disabled="!enabled">
      <label class="buff-soul-weapon-field">
        <span>靈魂武器等級</span>
        <input
          type="number"
          min="0"
          max="100"
          :disabled="!enabled"
          :value="character.fields.soulWeaponLevel"
          inputmode="numeric"
          aria-label="靈魂武器等級"
          @change="setLevel"
        />
      </label>

      <div class="buff-soul-weapon-field">
        <span>階級</span>
        <CustomSelect
          :model-value="String(character.fields.soulWeaponGrade || '1')"
          :options="gradeOptions"
          select-class="soul-weapon-select"
          aria-label="靈魂武器階級"
          :disabled="!enabled"
          @update:model-value="setGrade"
        />
      </div>

      <label class="buff-soul-weapon-field">
        <span>共鳴攻擊（常駐）</span>
        <input
          type="number"
          min="0"
          max="9999"
          :disabled="!enabled"
          :value="character.fields.soulWeaponPowerIncrease"
          inputmode="numeric"
          aria-label="靈魂武器共鳴攻擊"
          @change="setPower"
        />
      </label>

      <div class="buff-soul-weapon-field buff-soul-weapon-option-stat">
        <span>靈魂烙印屬性</span>
        <CustomSelect
          :model-value="String(character.fields.soulWeaponOptionStat || 'none')"
          :options="SOUL_WEAPON_OPTION_STAT_OPTIONS"
          select-class="soul-weapon-option-select"
          aria-label="靈魂烙印套用屬性"
          :disabled="!enabled"
          @update:model-value="character.setField('soulWeaponOptionStat', $event)"
        />
      </div>

      <label class="buff-soul-weapon-field">
        <span>烙印數值</span>
        <input
          type="number"
          min="0"
          max="99999"
          :disabled="!enabled"
          :value="character.fields.soulWeaponOptionValue"
          inputmode="decimal"
          aria-label="靈魂烙印數值"
          @change="setOptionValue"
        />
      </label>
    </div>

    <p class="buff-soul-weapon-note">
      共鳴攻擊與靈魂烙印為常駐能力；API 有資料時會自動帶入，調整後立即反映在戰力與實戰試算。
    </p>
  </div>
</template>
