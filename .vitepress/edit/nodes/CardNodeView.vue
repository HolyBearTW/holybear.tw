
<template>
  <node-view-wrapper class="custom-block card">
    <div class="card-header">
      <h3 class="card-title">{{ node.attrs.title }}</h3>
    </div>
    <div class="card-body">
      <node-view-content />
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">

defineProps<{
  node: {
    attrs: {
      title: string
    }
  }
}>()
</script>

<style scoped>
.custom-block.card {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.custom-block.card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  background: var(--vp-c-bg-soft);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.card-body {
  padding: 1.5rem;
}

.card-body :deep(p:first-child) {
  margin-top: 0;
}

.card-body :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
