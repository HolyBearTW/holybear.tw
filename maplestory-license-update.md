---
title: 聖小熊的秘密基地網站程式碼授權調整公告
description: 網站程式碼由 AGPL-3.0 轉採 MIT 授權的範圍、第三方內容及歷史版本說明
sidebar: false
aside: false
class: service-notice-page
pageClass: custom-footer-layout
editLink: false
lastUpdated: false
---

<div class="service-notice-hero">
  <p class="service-notice-eyebrow">SERVICE NOTICE</p>
  <h1>網站程式碼授權調整公告</h1>
  <span class="service-notice-date">公告日期：正式發布前補上</span>
</div>

聖小熊的秘密基地網站經過持續開發及重構，為了讓程式碼的使用規範更加清楚，**本站已將具備重新授權權利的網站程式碼由 GNU AGPL-3.0 調整為 MIT License。**

此次變更已將相關貢獻者及原始專案的程式碼授權問題列入確認範圍；僅對完成授權確認的程式碼適用 MIT。

## 這次調整了什麼？

MIT 是較寬鬆的開源授權。使用者可依授權條款使用、修改及再散布相關網站程式碼，包括商業用途與閉源衍生版本，但仍須保留必要的著作權及授權聲明。

**這不代表整個網站的所有內容都開放以 MIT 使用。**

## 哪些內容不包含在內？

Blog 文章及翻譯、圖片、影音、字型、商標、遊戲素材和其他第三方資源，仍依各原作者及權利人的授權條款處理。程式碼授權調整不會改變使用者資料、API 資料或其他營運資料的使用權限。

## 過去的 AGPL 版本怎麼辦？

先前已依 AGPL-3.0 授權發布的版本，原有授權及使用者權利仍然有效。本次 MIT 授權適用範圍，以正式發布後的版本、根目錄授權及範圍說明為準。

完整內容可參閱 [網站程式碼 MIT 授權](https://github.com/HolyBearTW/holybear.tw/blob/main/LICENSE) 與 [授權範圍說明](https://github.com/HolyBearTW/holybear.tw/blob/main/LICENSE_SCOPE.md)。

感謝過去協助本站開發及提供程式碼的貢獻者。這次調整也希望讓網站的原始碼來源、使用方式及不同內容的權利界線更加明確。

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
