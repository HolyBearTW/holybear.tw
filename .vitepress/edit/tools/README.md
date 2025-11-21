# 多欄布局工具包

此目錄包含從 `@lando/vitepress-theme-default-plus` 主題移植的多欄布局相關工具，讓您的組件可以輕鬆實現兩欄、三欄等布局功能。

## 📁 文件說明

### `tabs-enhancer.ts`
標籤頁組件增強器，提供 `enhanceAppWithTabs` 函數來註冊標籤頁組件。

### `PluginTabs.vue`
標籤頁主組件，基於 `vitepress-plugin-tabs` 的實現。

### `PluginTabsTab.vue`
標籤頁內容組件。

### `composables/` 目錄
包含所有標籤頁相關的組合函數：
- `useStabilizeScrollPosition.ts` - 滾動位置穩定化
- `useTabsSelectedState.ts` - 標籤頁狀態管理
- `useTabLabels.ts` - 標籤頁標籤提取
- `useTabsSingleState.ts` - 單個標籤頁狀態
- `useUid.ts` - 唯一 ID 生成

## 🚀 使用方法

### 1. 安裝依賴
```bash
npm install markdown-it-container
```

### 2. 在組件中引入
```javascript
import { registerLayoutContainers } from './tools/layout-containers-example.js';
import './tools/complete-container-styles.scss';
import PluginTabs from './tools/PluginTabs.vue';
import PluginTabsTab from './tools/PluginTabsTab.vue';
```

### 3. 註冊容器
```javascript
const md = new MarkdownIt();
registerLayoutContainers(md);
```

### 4. 在 Vue 組件中註冊 PluginTabs
```javascript
import { defineOptions } from 'vue';

defineOptions({
  components: {
    PluginTabs,
    PluginTabsTab
  }
});
```

## 📱 支持的容器

### 布局容器
- **`half`** - 兩欄布局 (50% 寬度)
- **`third`** - 三欄布局 (33% 寬度)
- **`center`** - 居中布局
- **`left`** - 左對齊
- **`right`** - 右對齊

### 內容容器
- **`highlight`** - 高亮提示
- **`thumbnail`** - 縮圖
- **`caption`** - 圖片說明
- **`card`** - 卡片樣式

### 方框容器
- **`box`** - 默認方框
- **`box-blue`** - 藍色方框
- **`box-brand`** - 品牌色方框
- **`box-green`** - 綠色方框
- **`box-red`** - 紅色方框
- **`box-yellow`** - 黃色方框

### 標籤頁容器 (使用自定義 PluginTabs 組件)
- **`tabs`** - 默認標籤頁
- **`tabs box`** - 方框樣式標籤頁
- **`tabs box-blue`** - 藍色方框標籤頁
- **`tabs box-brand`** - 品牌色方框標籤頁
- **`tabs box-green`** - 綠色方框標籤頁
- **`tabs box-red`** - 紅色方框標籤頁
- **`tabs box-yellow`** - 黃色方框標籤頁

## 📝 Markdown 使用方式

### 布局容器
```markdown
::: half
左側內容
:::

::: half
右側內容
:::

::: third
第一欄
:::

::: third
第二欄
:::

::: third
第三欄
:::

::: center
居中內容
:::
```

### 內容容器
```markdown
::: highlight
高亮提示內容
:::

:::: thumbnail
![圖片](image.jpg)
::: caption
圖片說明
::::
```

### 方框容器
```markdown
::: box
默認方框內容
:::

::: box-blue
藍色方框內容
:::
```

### 標籤頁容器
```markdown
:::tabs
== 標籤1
標籤1內容
== 標籤2
標籤2內容
:::

:::tabs box-brand
== 標籤1
標籤1內容
== 標籤2
標籤2內容
:::
```

## 📱 響應式設計

- **桌面端**: 正常顯示多欄
- **平板端** (≤767px): 三欄變為兩欄
- **手機端** (≤420px): 全部變為單欄

## 🔧 自定義

您可以修改 `complete-container-styles.scss` 來自定義樣式，或修改 `layout-containers.js` 添加新容器。

## 📚 技術實現

- **布局容器**: 使用 `display: inline-block` 和 `width` 百分比實現
- **標籤頁**: 使用自定義 Vue 組件實現，提供完整的無障礙支持和狀態管理
- **響應式**: 使用媒體查詢實現移動端適配
- **主題集成**: 使用 CSS 變數支持主題切換

## 🎯 與主題的差異

此工具包提供了 `@lando/vitepress-theme-default-plus` 主題的完整容器樣式支持，讓您可以在任何 VitePress 項目中使用相同的容器功能，而無需依賴完整主題。