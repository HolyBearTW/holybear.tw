<template>
  <node-view-wrapper :class="boxClass">
    <node-view-content />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  node: {
    attrs: {
      color: string
    }
  }
}>()

const boxClass = computed(() => {
  return `custom-block box-${props.node.attrs.color}`
})
</script>

<style scoped>
.custom-block[class*='box-'] {
  margin: 1rem 0;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid;
  position: relative;
}

.custom-block[class*='box-']::before {
  position: absolute;
  top: -12px;
  left: 20px;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

/* Red Box */
.custom-block.box-red {
  background: rgba(255, 90, 90, 0.1);
  border-color: #ff5a5a;
}

.custom-block.box-red::before {
  content: 'IMPORTANT';
  background: #ff5a5a;
  color: white;
}

/* Yellow Box */
.custom-block.box-yellow {
  background: rgba(255, 193, 7, 0.1);
  border-color: #ffc107;
}

.custom-block.box-yellow::before {
  content: 'WARNING';
  background: #ffc107;
  color: #000;
}

/* Green Box */
.custom-block.box-green {
  background: rgba(76, 175, 80, 0.1);
  border-color: #4caf50;
}

.custom-block.box-green::before {
  content: 'SUCCESS';
  background: #4caf50;
  color: white;
}

/* Blue Box */
.custom-block.box-blue {
  background: rgba(33, 150, 243, 0.1);
  border-color: #2196f3;
}

.custom-block.box-blue::before {
  content: 'INFO';
  background: #2196f3;
  color: white;
}

/* Brand Box */
.custom-block.box-brand {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.custom-block.box-brand::before {
  content: 'NOTE';
  background: var(--vp-c-brand-1);
  color: white;
}

.custom-block[class*='box-'] :deep(p:first-child) {
  margin-top: 0;
}

.custom-block[class*='box-'] :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
