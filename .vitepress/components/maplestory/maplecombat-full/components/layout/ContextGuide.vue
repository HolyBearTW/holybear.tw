<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    open?: boolean
    tone?: 'info' | 'warning'
  }>(),
  { open: false, tone: 'info' },
)
</script>

<template>
  <details class="holybear-context-guide" :class="`is-${tone}`" :open="open">
    <summary>
      <span class="holybear-context-guide-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M4.5 3.5h8A2.5 2.5 0 0 1 15 6v10.5H7A2.5 2.5 0 0 1 4.5 14V3.5Z" />
          <path d="M7 6.5h5M7 9.5h5M7 12.5h3" />
        </svg>
      </span>
      <span class="holybear-context-guide-copy">
        <strong>{{ title }}</strong>
      </span>
      <span class="holybear-context-guide-chevron" aria-hidden="true"></span>
    </summary>
    <div class="holybear-context-guide-body">
      <slot />
    </div>
  </details>
</template>
