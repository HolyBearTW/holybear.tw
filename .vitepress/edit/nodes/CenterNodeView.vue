<template>
  <node-view-wrapper class="custom-block center">
    <div class="center-container">
      <node-view-content />
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
</script>

<style scoped>
.custom-block.center {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  padding: 1rem;
  border: 2px dashed var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  position: relative;
}

.custom-block.center::before {
  content: 'CENTER';
  position: absolute;
  top: -10px;
  left: 10px;
  background: var(--vp-c-bg);
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  border-radius: 4px;
}

.center-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
</style>
