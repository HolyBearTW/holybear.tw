<template>
  <node-view-wrapper class="custom-block third">
    <node-view-content />
  </node-view-wrapper>
</template>

<script setup lang="ts">

















</script>

<style scoped>
.custom-block.third {
  flex: 1 1 calc(33.333% - 0.67rem);
  min-width: 0;
  padding: 1rem;
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg);
  position: relative;
}

.custom-block.third::before {
  content: '1/3';
  position: absolute;
  top: -10px;
  right: 10px;
  background: var(--vp-c-brand-1);
  color: white;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  border-radius: 4px;
  font-weight: bold;
}
</style>
