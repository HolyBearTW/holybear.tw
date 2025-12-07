<template>
  <node-view-wrapper class="custom-block half">
    <node-view-content />
  </node-view-wrapper>
</template>

<script setup lang="ts">
</script>

<style scoped>
.custom-block.half {
  flex: 1 1 calc(50% - 0.5rem);
  min-width: 0;
  padding: 1rem;
  border: 2px solid var(--vp-c-brand-2);
  border-radius: 8px;
  background: var(--vp-c-bg);
  position: relative;
}

.custom-block.half::before {
  content: '1/2';
  position: absolute;
  top: -10px;
  right: 10px;
  background: var(--vp-c-brand-2);
  color: white;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  border-radius: 4px;
  font-weight: bold;
}
</style>
