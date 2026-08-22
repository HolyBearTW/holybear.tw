<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BuffDefinition } from '@maplecombat/core/buffs/parse'
import { buffImageFor } from '@maplecombat/data/buffSource'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { useUiStore, type ViewKey } from '@maplecombat/stores/ui'
import BuffOverlay from './BuffOverlay.vue'

const props = defineProps<{
  view: ViewKey
}>()

const buffs = useBuffsStore()
const ui = useUiStore()
const allBuffTrigger = ref<HTMLButtonElement | null>(null)

const selectedCount = computed(() =>
  buffs.table.categories.reduce(
    (total, category) =>
      total +
      category.buffs.filter((buff) => {
        const level = buffs.state[buff.id] || 0
        if (level <= 0) return false
        const abilities = buff.levels[buff.type === 'check' ? 1 : level] || []
        return abilities.some((ability) => ability.active)
      }).length,
    0,
  ),
)

const nonPermanentBuffs = computed(() =>
  buffs.table.categories.flatMap((category) =>
    category.buffs
      .filter((buff) => buff.nonPermanent && buff.name !== '一擊必殺')
      .map((buff) => ({
        buff,
        categoryKey: category.key,
        imageSrc: buffImageFor(category.key, buff.name),
      })),
  ),
)

const isCurrentView = computed(() => ui.activeView === props.view)
const panelId = computed(
  () => `buffOverlay${props.view[0].toUpperCase()}${props.view.slice(1)}Panel`,
)

function levelValue(buff: BuffDefinition) {
  return buffs.preferredLevel(buff.id)
}

function toggleQuickBuff(buff: BuffDefinition) {
  if (buff.type === 'level') {
    const current = buffs.state[buff.id] || 0
    buffs.setLevel(buff.id, current > 0 ? 0 : levelValue(buff))
    return
  }
  buffs.toggle(buff.id)
}
</script>

<template>
  <section class="buff-summary-bar" aria-label="Buff 快速設定">
    <div class="buff-quick-row">
      <span class="buff-quick-count" title="目前實際套入實戰計算的 Buff 數量">
        <span>套用中 Buff</span>
        <strong>{{ selectedCount }} 項</strong>
      </span>

      <div class="buff-quick-chips" aria-label="非常駐 Buff 快速切換">
        <div
          v-for="item in nonPermanentBuffs"
          :key="item.buff.id"
          class="buff-quick-chip-wrap"
          :class="{ 'is-active': (buffs.state[item.buff.id] || 0) > 0 }"
        >
          <button
            type="button"
            class="buff-quick-chip"
            :aria-label="item.buff.shortName || item.buff.name"
            :title="item.buff.shortName || item.buff.name"
            :aria-pressed="(buffs.state[item.buff.id] || 0) > 0"
            @click="toggleQuickBuff(item.buff)"
          >
            <span class="buff-quick-icon-frame" aria-hidden="true">
              <img
                v-if="item.imageSrc"
                class="buff-quick-icon"
                :src="item.imageSrc"
                :alt="item.buff.name"
                draggable="false"
              />
              <span v-else class="buff-quick-icon buff-quick-icon--missing"></span>
              <span v-if="item.buff.type === 'level'" class="buff-quick-level-label">
                {{ levelValue(item.buff) }}
              </span>
            </span>
          </button>
        </div>
      </div>

      <button
        ref="allBuffTrigger"
        type="button"
        class="buff-quick-all"
        :aria-expanded="ui.buffDrawerOpen && isCurrentView"
        :aria-controls="panelId"
        @click="ui.buffDrawerOpen = true"
      >
        選擇 Buff
      </button>
    </div>

    <BuffOverlay
      v-if="ui.buffDrawerOpen && isCurrentView"
      :panel-id="panelId"
      :return-focus="allBuffTrigger"
    />
  </section>
</template>
