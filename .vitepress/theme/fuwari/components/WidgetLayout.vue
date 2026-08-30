<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title: string
  collapsible?: boolean
  defaultOpen?: boolean
}>(), {
  collapsible: false,
  defaultOpen: true,
})

const open = ref(props.defaultOpen)
</script>

<template>
  <!-- Ported component boundary from Fuwari WidgetLayout.astro. -->
  <section class="fuwari-widget fuwari-card-base">
    <button
      v-if="collapsible"
      class="fuwari-widget__toggle"
      type="button"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span>{{ title }}</span>
      <ChevronDown :size="17" :class="{ 'is-open': open }" />
    </button>
    <h2 v-else>{{ title }}</h2>
    <div v-show="!collapsible || open" class="fuwari-widget__content">
      <slot />
    </div>
  </section>
</template>
