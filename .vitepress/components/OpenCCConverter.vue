<script setup>
import { ref, computed } from 'vue';
import * as OpenCC from 'opencc-js';

// --- 1. 在此新增「純簡轉繁」選項 ---
const conversionOptions = ref([
  { label: '簡轉繁 (台灣化)', from: 'cn', to: 'twp', group: '常用轉換' },
  { label: '簡轉繁 (香港化)', from: 'cn', to: 'hk', group: '常用轉換' },
  { label: '簡轉繁', from: 'cn', to: 't', group: '常用轉換' },
  { label: '繁轉簡', from: 'tw', to: 'cn', group: '常用轉換' },

  { label: '去除台灣化', pipeline: [{ from: 'tw', to: 'cn' }, { from: 'cn', to: 't' }], group: '進階轉換' },
  { label: '去除香港化', pipeline: [{ from: 'hk', to: 'cn' }, { from: 'cn', to: 't' }], group: '進階轉換' },
  
  { label: '台灣繁體 ↔ 香港繁體', from: 'tw', to: 'hk', group: '地區繁體互轉' },
]);

// --- 後續 script 內容完全不變 ---
const groupedOptions = computed(() => {
  return conversionOptions.value.reduce((groups, option) => {
    const groupName = option.group;
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(option);
    return groups;
  }, {});
});

const currentMode = ref(conversionOptions.value[0]);
const inputText = ref('滑鼠和伺服器在台灣是很常見的資訊技術詞彙。');
const outputText = ref('');
const isStacked = ref(false);

const performConversion = () => {
  let text = inputText.value;
  if (currentMode.value.pipeline) {
    for (const step of currentMode.value.pipeline) {
      const converter = OpenCC.Converter(step);
      text = converter(text);
    }
  } else {
    const converter = OpenCC.Converter({ from: currentMode.value.from, to: currentMode.value.to });
    text = converter(text);
  }

  // 替換標點符號為台灣格式
  text = text.replace(/“/g, "「").replace(/”/g, "」");

  outputText.value = text;
};

const setModeAndConvert = (mode) => {
  if (mode.label === '台灣繁體 ↔ 香港繁體') {
    if(currentMode.value.from === 'tw') {
      mode.from = 'hk';
      mode.to = 'tw';
    } else {
      mode.from = 'tw';
      mode.to = 'hk';
    }
  }
  currentMode.value = mode;
  performConversion();
};

performConversion();
</script>

<template>
  <div class="page-container">
    <p class="intro-text">
      <h1>線上簡繁轉換工具</h1>
      <p>這是一個基於 OpenCC-JS 建立的線上繁體、簡體中文轉換工具。請在下方的輸入框貼上您想轉換的文字。</p>
    </p>

    <div class="converter-container">
      <div class="mode-selector">
        <h2 id="conversion-mode"><span class="icon">🔄</span> 選擇轉換模式</h2>
        
        <div 
          v-for="(group, groupName) in groupedOptions" 
          :key="groupName"
          class="button-group-wrapper"
        >
          <h5 class="group-title">{{ groupName }}</h5>
          <div class="buttons-group">
            <button
              v-for="option in group"
              :key="option.label"
              :class="{ active: currentMode.label === option.label }"
              @click="setModeAndConvert(option)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="io-grid" :class="{ 'stacked': isStacked }">
        <div class="textarea-wrapper">
          <h4>原文</h4>
          <textarea v-model="inputText" @input="performConversion" rows="8"></textarea>
          <button @click="isStacked = !isStacked" class="copy-button">切換佈局</button>
        </div>
        <div class="textarea-wrapper">
          <h4>轉換結果</h4>
          <div class="result-box">
            <p>{{ outputText }}</p>
          </div>
          <button @click="navigator.clipboard.writeText(outputText)" class="copy-button">複製</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 您的 Root 和 Page Container 樣式可以保留 */
.page-container {
  max-width: 1190px;
  margin: 0 auto;
  padding: 0 24px 2rem;
}
.intro-text h1 { font-size: 2.2em; font-weight: 600; margin-bottom: 1rem; }
.intro-text p { 
  font-size: 1.1em; 
  color: #666; 
  line-height: 1.6; 
  margin-bottom: 0.5rem; /* 增加小間距 */
}
.converter-container { border: 1px solid var(--vp-c-divider); padding: 1.5rem; border-radius: 12px; background-color: var(--vp-c-bg-soft); }
.mode-selector h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1em;
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.mode-selector h4 .icon { font-size: 1.2em; }

/* --- 2. 在此縮小群組間的垂直間距 --- */
.button-group-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: -1.5rem;
  padding: 8px;
  border-radius: 8px;
}
.group-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  width: 120px;
  text-align: right;
  flex-shrink: 0;
}
.buttons-group { display: flex; flex-wrap: wrap; gap: 10px; }
.buttons-group button {
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  color: black; /* 淺色模式下未選取時文字顏色保持為黑色 */
}
.buttons-group button:hover:not(.active) {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-light);
}
.buttons-group button.active {
  background: var(--vp-c-brand);
  color: black !important; /* 強制淺色模式下選取時文字顏色為黑色 */
  border-color: var(--vp-c-brand);
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .buttons-group button {
    color: var(--vp-c-text-1); /* 深色模式下未選取時文字顏色修正為主文字色 */
  }
  .buttons-group button.active {
    color: var(--vp-c-bg); /* 深色模式下選取時文字顏色保持為背景色 */
  }
}

.io-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
}
.io-grid.stacked {
  grid-template-columns: 1fr;
}

.textarea-wrapper h4 { margin-bottom: 0.75rem; font-weight: 600; color: var(--vp-c-text-1); }
textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 1em;
  resize: vertical;
  height: 200px;
  box-sizing: border-box;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
textarea:focus { border-color: var(--vp-c-brand); outline: none; }
.result-box {
  width: 100%;
  height: 200px;
  background-color: var(--vp-c-bg-soft);
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  overflow: auto;
  box-sizing: border-box;
  font-size: 1em;
  margin-bottom: 0.5rem; /* 增加框框與按鈕之間的小間距 */
}
.result-box p { margin: 0; white-space: pre-wrap; word-wrap: break-word; }

/* 複製按鈕樣式 */
.copy-button {
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  color: black;
}
.copy-button:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-light);
}
.copy-button:active {
  background: var(--vp-c-brand);
  color: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
}

@media (prefers-color-scheme: dark) {
  .copy-button {
    color: var(--vp-c-text-1);
  }
  .copy-button:active {
    color: var(--vp-c-bg);
  }
}

@media (max-width: 768px) {
  .io-grid { grid-template-columns: 1fr; }
  .button-group-wrapper { flex-direction: column; align-items: flex-start; gap: 8px; }
  .group-title { text-align: left; width: auto; }
}

.toggle-layout-button {
  margin-bottom: 1rem;
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  color: black;
}
.toggle-layout-button:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-light);
}
</style>