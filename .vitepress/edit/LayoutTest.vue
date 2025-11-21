<template>
  <div class="layout-test">
    <h2>多欄布局測試</h2>

    <div class="test-section">
      <h3>兩欄布局</h3>
      <div class="markdown-preview vp-doc">
        <div class="custom-block half">
          <p>這是左側內容</p>
          <ul>
            <li>項目 1</li>
            <li>項目 2</li>
          </ul>
        </div>
        <div class="custom-block half">
          <p>這是右側內容</p>
          <ol>
            <li>第一項</li>
            <li>第二項</li>
          </ol>
        </div>
      </div>
    </div>

    <div class="test-section">
      <h3>三欄布局</h3>
      <div class="markdown-preview vp-doc">
        <div class="custom-block third">
          <p>第一欄</p>
          <p><strong>粗體文字</strong></p>
        </div>
        <div class="custom-block third">
          <p>第二欄</p>
          <p><em>斜體文字</em></p>
        </div>
        <div class="custom-block third">
          <p>第三欄</p>
          <p><code>代碼片段</code></p>
        </div>
      </div>
    </div>

    <div class="test-section">
      <h3>居中布局</h3>
      <div class="markdown-preview vp-doc">
        <div class="custom-block center">
          <p>這是居中的內容</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 測試組件 - 驗證多欄布局樣式是否正確應用
</script>

<style scoped>
@import './tools/layout-styles.scss';

.layout-test {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 3rem;
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.test-section h3 {
  margin-top: 0;
  color: var(--vp-c-brand-1);
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}

.markdown-preview {
  background: var(--vp-c-bg);
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

/* 確保測試樣式與實際預覽一致 */
.markdown-preview.vp-doc :deep(.custom-block.half),
.markdown-preview.vp-doc :deep(.custom-block.third) {
  background: var(--vp-c-bg-alt);
  padding: 1rem;
  margin: 0.5rem 0;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.markdown-preview.vp-doc :deep(.custom-block.center) {
  background: var(--vp-c-bg-alt);
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}
</style>