---
title: 關於我
image: /holybear.png
description: 這裡是聖小熊的個人空間，分享我的技術、生活與創作。
sidebar: false
aside: false
toc: false
class: about-page
pageClass: custom-footer-layout
---

<div class="about-hero">
  <img class="about-hero__image" src="/holybear.png" alt="聖小熊形象圖" />
  <div class="about-hero__overlay"></div>
  <div class="about-hero__content">
    <p style="margin: 0 0 1rem; letter-spacing: .18em; text-transform: uppercase; opacity: .82; font-size: clamp(.78rem, 2.8vw, .95rem);">關於聖小熊</p>
    <h1 style="margin: 0 0 1rem; font-size: clamp(2.2rem, 9vw, 4.5rem); line-height: 1.02; text-wrap: balance;">我不是普通的技術人</h1>
    <p style="margin: 0 auto; max-width: 780px; opacity: .92; font-size: clamp(.98rem, 3.6vw, 1.08rem); line-height: 1.8;">
      我喜歡把技術、生活與創作揉在一起。這個網站是我的個人實驗室，寫下每個踩坑的過程、完成後的成就，以及那些值得記錄的小時刻。
    </p>
  </div>
</div>

<style>
.about-hero {
  position: relative;
  border-radius: clamp(20px, 4vw, 32px);
  min-height: clamp(520px, 78vh, 980px);
  margin-bottom: 2.5rem;
  color: white;
  display: flex;
  align-items: center;
  overflow: hidden;
  isolation: isolate;
}

.about-hero__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 32%;
  transform: translateZ(0);
  z-index: -2;
  margin: 0 !important; 
  display: block;
}

.about-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.22));
  z-index: -1;
}

.about-hero__content {
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
  width: 100%;
  padding: clamp(48px, 9vw, 100px) clamp(16px, 4vw, 24px);
}

@media (max-width: 767px) {
  .about-hero {
    min-height: 0 !important;
    height: 500px !important;
    border-radius: 20px !important;
    margin-bottom: 1.5rem !important;
  }

  .about-hero__content {
    padding-top: 28px !important;
    padding-bottom: 28px !important;
  }

  .about-hero__image {
    object-fit: cover !important;
    object-position: center 24% !important;
    transform: scale(1) !important;
  }

  .about-hero__content p:first-child {
    margin-bottom: 0.65rem !important;
  }

  .about-hero__content h1 {
    margin-bottom: 0.75rem !important;
    font-size: clamp(1.8rem, 8vw, 2.4rem) !important;
  }

  .about-hero__content p:last-child {
    font-size: 0.95rem !important;
    line-height: 1.65 !important;
  }
}
</style>

## 這裡是我的核心

- **Android / HyperOS 客製化**：從模組開發到系統優化，我喜歡研究手機底層與 UI 交互。
- **前端與網站製作**：用 VitePress、Vue、React 撐起內容展示，讓每個作品都有漂亮又清爽的入口。
- **內容創作與紀錄**：不只寫程式，也把想法、心得和實驗結果整理成文章。

## 我的風格

這裡的內容風格是：

- 直接、不做作
- 有點 ACG、又不失實用
- 用最簡單的方式，呈現最真實的想法

## 我會做的事情

1. 建網站與技術文件
2. 寫部落格筆記與實驗紀錄
3. 做 Android 模組、工具與小作品
4. 打造有個性的使用者體驗

## 如果你想找我

- 先從我的網站內容開始逛
- 想聊開源、Android、網頁、或創作方式都可以
- 這裡是我的小基地，也是我自己最想分享的地方

> 上面的圖片是我的形象圖，希望可以藉此和各位更加親近。