---
title: 如何在部落格中使用防劇透組件？
description: 介紹如何使用 Spoiler 組件來隱藏敏感或劇透內容，提供更好的閱讀體驗。
image: https://i.redd.it/bnnb0cfnz5681.png
tag:
  - VitePress
  - Vue
  - 組件
  - 防劇透
category:
  - 技術分享
---

<div style="text-align:center">
  <img src="https://i.redd.it/bnnb0cfnz5681.png" style="display:inline-block;" />
</div>

嗨，大家好！今天想跟大家分享一個我最近為部落格開發的小功能 —— **防劇透組件（Spoiler Component）**。

在寫文章時，有時候會需要放一些可能是劇透的圖片或內容，但又不想直接暴露給讀者。這個組件就是為了解決這個問題而生的！

## 為什麼需要防劇透組件？

寫部落格時，可能會遇到以下情況：

- 遊戲攻略文章，不想直接暴露關鍵畫面
- 影評或動漫評論，需要隱藏關鍵劇情圖片
- 教學文章的答案或結果，讓讀者可以先思考
- 瑟瑟的圖文不想直接被看見
- 任何您覺得需要「點擊才顯示」的內容

## 使用方式

這個組件提供了兩種使用方式，都非常簡單！

### 方式一：直接指定圖片來源

最簡單的方式，就是用 `src` 屬性直接指定圖片：

```markdown
<Spoiler src="/image/cat.png" alt="可愛的貓咪" reason="超萌貓貓注意！" />
```

**實際效果：**

<Spoiler src="/image/cat.png" alt="可愛的貓咪" reason="超萌貓貓注意！" />

### 方式二：包裹 Markdown 內容

如果您想要包裹整段 Markdown 內容（例如多張圖片或混合內容），可以使用標籤包裹的方式：

```markdown
<Spoiler reason="這裡有多張可愛貓貓">

![貓貓1](/image/cat.png)
![貓貓2](/image/cat.png)

</Spoiler>
```

**實際效果：**

<Spoiler reason="這裡有多張可愛貓貓">

![貓貓1](/image/cat.png)
![貓貓2](/image/cat.png)

</Spoiler>

## 屬性說明

這個組件支援以下屬性：

| 屬性 | 說明 | 預設值 |
|------|------|--------|
| `src` | 圖片來源路徑 | - |
| `alt` | 圖片替代文字 | `'劇透內容'` |
| `reason` | 警告文字，顯示為什麼被隱藏 | `'劇透內容'` |

## 更多範例

### 使用預設警告文字

如果不指定 `reason`，會自動顯示「劇透內容」：

<Spoiler src="/image/cat.png" />

### 自訂警告文字

可以根據內容特性，自訂警告文字：

<Spoiler src="/image/cat.png" reason="警告：此圖片可能導致你想養貓" />

## 技術細節

如果您對實作細節有興趣，這個組件的核心特點：

- 使用 Vue 3 開發，支援 slot 和 props 兩種使用方式
- 利用 CSS `filter: blur(50px)` 實現模糊效果
- 點擊後會有流暢的顯示動畫
- 響應式設計，在各種裝置上都能正常運作

希望這個小工具能幫助您在寫部落格時，提供更好的閱讀體驗！

