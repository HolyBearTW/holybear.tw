
<template>
  <node-view-wrapper class="custom-block highlight">
    <node-view-content />
  </node-view-wrapper>
</template>

<script setup lang="ts">
</script>

<style scoped>
.custom-block.highlight {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 208, 0, 0.1), rgba(255, 160, 0, 0.05));
  border-left: 4px solid #ffd000;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 2px 8px rgba(255, 208, 0, 0.1);
}

.custom-block.highlight::before {
  content: '💡';
  position: absolute;
  top: -12px;
  left: 20px;
  background: #ffd000;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.custom-block.highlight :deep(p:first-child) {
  margin-top: 0;
}

.custom-block.highlight :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
