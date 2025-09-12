---
layout: home
title: 線上簡繁轉換工具
description: 這是一個基於 OpenCC-JS 建立的線上繁體、簡體中文轉換工具，特別新增了簡轉繁功能，支援台灣化、香港化等多種模式，讓使用者能快速、準確地完成文字轉換。

hero:
  name: 線上簡繁轉換工具
  text: 快速、準確的簡繁轉換
  tagline: 支援多種轉換模式，適合各種需求
  image:
    src: /logo.png
    alt: 聖小熊的秘密基地
  actions:
    - theme: brand
      text: 開始使用
      link: converter#conversion-mode
---
<ClientOnly>
<OpenCCConverter />
</ClientOnly>

<style>
   /* 針對 VitePress 文章頁面中，主要內容區塊裡的第一個 h2 標題 */
    h2:first-child {
    border-top: none !important;
    padding-top: 5px !important;
    margin-top: 5px !important;
    }
    .vp-doc > div > h2:first-child .header-anchor {
    margin-top: -20px;
    }
</style>