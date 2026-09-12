---
title: 新楓之谷戰力分析工具服務重新開放及資料來源取得方式說明
description: 新楓之谷戰力分析工具重新開放，以及本站遊戲資料來源與分身同步方式說明
sidebar: false
aside: false
class: service-notice-page
pageClass: custom-footer-layout
editLink: false
lastUpdated: false
---

<div class="service-notice-hero">
  <p class="service-notice-eyebrow">SERVICE NOTICE</p>
  <h1>新楓之谷戰力分析工具服務重新開放及資料來源取得方式說明</h1>
  <span class="service-notice-date">公告日期：2026 年 9 月 12 日</span>
</div>

楓之谷戰力分析現在已經重新開放，可以直接使用了。

這次除了重新整理網站和資料庫以外，我也把網站取得遊戲資料的方式重新整理了一次，所以這邊順便說明一下，**現在網站上的資料到底是怎麼來的。**

## 網站的資料是怎麼取得的？

目前網站的角色、公會、聯盟等遊戲資料，主要都是從 **NEXON 官方 Open API** 取得。

官方 API 提供的是角色本身的各種原始資料，網站取得資料後，會再透過自己的程式進行整理、計算與保存，最後才變成大家在戰力分析裡看到的結果。

所以像網站顯示的戰力、排名以及其他分析結果，並不是直接從其他網站抓一個現成結果回來，而是由本站取得資料後自行處理。

## 那分身資料是怎麼取得的？

分身這部分比較特別。

NEXON API 並不是直接丟一份「這個人的所有分身」清單給網站，所以本站另外建立了自己的角色關聯資料與背景同步機制，透過官方 API 能取得的帳號／聯盟相關資料進行整理與比對，再逐步建立角色之間的關聯。

因為這個過程需要背景慢慢同步大量角色，所以目前部分角色的分身或聯盟資料可能還沒有完全補齊。

如果你查詢時發現少了某些分身，不一定是壞掉了，有可能只是那筆資料還在等待同步，之後會持續自動更新。

## 還有使用其他網站的 API 嗎？

之前網站曾經使用過 **MapleKit API、冒險者小屋 API** 等第三方資料來源。

這些目前都已經移除。

現在相關功能已經改成以 **NEXON 官方 API + 本站自己的資料庫與資料處理流程** 為主，不再依賴上述第三方網站 API。

## 簡單來說

**NEXON 官方 API 提供遊戲原始資料 → 本站取得資料 → 自行整理／計算／建立關聯 → 顯示在戰力分析裡。**

這次也順便把大量角色資料的匯入與同步方式重新整理過，之後資料會持續在背景更新。

網站現在已經可以正常使用，如果遇到資料不完整、數值有問題或功能異常，也可以再回報給我。

<p class="service-notice-signature">聖小熊的秘密基地站長 聖小熊 啟</p>

<a class="service-notice-back" href="/maplestory/">← 返回戰力分析</a>

<style>
body:has(.service-notice-hero) { --vp-layout-max-width: 1440px; --main-width: 1440px; }
body:has(.service-notice-hero) .VPContent,
body:has(.service-notice-hero) .VPDoc,
body:has(.service-notice-hero) .VPDoc .container,
body:has(.service-notice-hero) .VPDoc .content,
body:has(.service-notice-hero) .VPDoc .content-container,
body:has(.service-notice-hero) .VPDoc .content-body,
body:has(.service-notice-hero) .VPDoc .vp-doc { width: 100% !important; max-width: none !important; min-width: 0 !important; box-sizing: border-box !important; }
body:has(.service-notice-hero) .VPDoc .container,
body:has(.service-notice-hero) .VPContent .container { width: min(1120px, calc(100vw - 96px)) !important; max-width: min(1120px, calc(100vw - 96px)) !important; margin-right: auto !important; margin-left: auto !important; padding-right: 32px !important; padding-left: 32px !important; box-sizing: border-box !important; }
body:has(.service-notice-hero) .vp-doc { color: var(--vp-c-text-1); }
.service-notice-hero { position: relative; overflow: hidden; margin: 0 0 2rem; padding: clamp(1.6rem, 5vw, 3.1rem); border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 26%, var(--vp-c-divider)); border-radius: 24px; background: linear-gradient(140deg, color-mix(in srgb, var(--vp-c-brand-soft) 72%, var(--vp-c-bg)), color-mix(in srgb, var(--vp-c-bg-soft) 90%, transparent)); box-shadow: 0 18px 50px color-mix(in srgb, var(--vp-c-brand-1) 9%, transparent); }
.service-notice-hero::after { position: absolute; top: -90px; right: -70px; width: 240px; height: 240px; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 24%, transparent); border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--vp-c-brand-1) 17%, transparent), transparent 68%); content: ''; pointer-events: none; }
.service-notice-hero h1 { position: relative; z-index: 1; margin: .35rem 0 1rem; border: 0; font-size: clamp(2.1rem, 6vw, 3.5rem); line-height: 1.08; }
.service-notice-eyebrow { position: relative; z-index: 1; margin: 0 !important; color: var(--vp-c-brand-1); font-size: .76rem; font-weight: 800; letter-spacing: .14em; }
.service-notice-date { display: inline-flex; position: relative; z-index: 1; padding: .35rem .7rem; border: 1px solid var(--vp-c-divider); border-radius: 999px; color: var(--vp-c-text-2); background: color-mix(in srgb, var(--vp-c-bg) 80%, transparent); font-size: .78rem; }
body:has(.service-notice-hero) .vp-doc > p { margin: 1.15rem 0; color: var(--vp-c-text-2); font-size: 1.04rem; line-height: 1.9; }
body:has(.service-notice-hero) .vp-doc > p strong { color: var(--vp-c-text-1); font-size: 1.08em; }
body:has(.service-notice-hero) .vp-doc h2 { margin-top: 2.6rem; border-top: 1px solid var(--vp-c-divider); padding-top: 1.5rem; }
.service-notice-signature { margin-top: 2.5rem !important; color: var(--vp-c-text-1) !important; font-weight: 700; text-align: right; }
.service-notice-back { display: inline-flex; align-items: center; margin-top: 1.5rem; padding: .55rem .9rem; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 32%, var(--vp-c-divider)); border-radius: 999px; color: var(--vp-c-brand-1) !important; background: color-mix(in srgb, var(--vp-c-brand-soft) 58%, transparent); font-weight: 750; text-decoration: none !important; }
.service-notice-back:hover { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
html:not(.dark) .service-notice-hero { border-color: rgba(34, 126, 145, .24); background: linear-gradient(140deg, rgba(244, 252, 253, .96), rgba(225, 242, 247, .9)); box-shadow: 0 18px 48px rgba(36, 93, 112, .13); }
html:not(.dark) .service-notice-hero h1 { color: #173747; }
html:not(.dark) .service-notice-eyebrow { color: #007f91; }
html:not(.dark) .service-notice-date { border-color: rgba(45, 102, 119, .24); color: #47636f; background: rgba(255, 255, 255, .72); }
html:not(.dark) body:has(.service-notice-hero) .vp-doc > p { color: #3c5968; }
html:not(.dark) body:has(.service-notice-hero) .vp-doc > p strong { color: #173747; }
html:not(.dark) .service-notice-back { color: #006b7c !important; border-color: rgba(34, 126, 145, .3); background: rgba(225, 242, 247, .72); }
@media (max-width: 767px) { body:has(.service-notice-hero) .VPDoc .container, body:has(.service-notice-hero) .VPContent .container { width: 100% !important; max-width: 100% !important; margin-right: auto !important; margin-left: auto !important; padding-right: 0 !important; padding-left: 0 !important; } body:has(.service-notice-hero) .VPDoc .content { padding: var(--hb-mobile-doc-card-padding) !important; border-radius: var(--hb-mobile-doc-radius) !important; } .service-notice-hero { padding: 1.5rem 1.25rem; border-radius: 18px; } body:has(.service-notice-hero) .vp-doc > p { font-size: 1rem; line-height: 1.85; } body:has(.service-notice-hero) .vp-doc h2 { margin-top: 2.2rem; padding-top: 1.25rem; } }
@media (min-width: 960px) { body:has(.service-notice-hero) .VPDoc { padding: 0 !important; } }
</style>
