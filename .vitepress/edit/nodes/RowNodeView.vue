
<template>
  <node-view-wrapper class="custom-block row">
    <node-view-content class="row-content" />
  </node-view-wrapper>
</template>

<script setup lang="ts">
</script>

<style scoped>
.custom-block.row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  border: 2px dashed var(--vp-c-divider-light);
  border-radius: 8px;
  background: rgba(var(--vp-c-bg-soft-rgb), 0.3);
  position: relative;
}

.custom-block.row::before {
  content: 'ROW';
  position: absolute;
  top: -10px;
  left: 10px;
  background: var(--vp-c-bg);
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.row-content {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

/* 確保子節點正確排列 */
.row-content > :deep(.custom-block.half) {
  flex: 1 1 calc(50% - 0.5rem);
  min-width: 0;
  margin: 0;
}

.row-content > :deep(.custom-block.third) {
  flex: 1 1 calc(33.333% - 0.67rem);
  min-width: 0;
  margin: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .row-content > :deep(.custom-block.half),
  .row-content > :deep(.custom-block.third) {
    flex: 1 1 100%;
  }
}
</style>
