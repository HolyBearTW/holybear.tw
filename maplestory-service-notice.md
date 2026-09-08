---
title: 關於這次 MapleKit 事件，我想說的話
description: 關於 MapleKit API 使用與後續處理的完整說明
sidebar: false
aside: false
class: service-notice-page
pageClass: custom-footer-layout
editLink: false
lastUpdated: false
---

<div class="service-notice-hero">
  <p class="service-notice-eyebrow">SERVICE NOTICE</p>
  <h1>關於這次 MapleKit 事件，我想說的話</h1>
  <span class="service-notice-date">公告日期：2026 年 9 月 8 日</span>
</div>

這幾天發生了很多事情，我其實一直都沒有對外回應。

不是因為我覺得自己完全沒錯，也不是覺得裝死等事情過去就好，而是這幾天我自己也一直在重新看整件事情，包括當時到底做了什麼、為什麼會做、後來又為什麼會變成現在這樣。

想了幾天，我覺得我做錯的地方還是應該自己出來講，而不是一直讓別人幫我講。

先說 MapleKit API 這件事情。

我當時的想法其實很簡單，我認為 API 可以從網路上取得，裡面的角色資料本身也不是什麼私人資料，所以我一直覺得拿這些資料來做網站功能應該沒有什麼問題。

現在回頭看，我當時確實把這件事情想得太簡單了。

「資料本身是不是公開的」跟「別人自己架設、自己維護的 API 願不願意讓我的網站這樣使用」，其實不是同一件事情。

尤其後來雙方已經產生爭議，我還是一直站在「這些本來就是公開資料」的角度去想，所以沒有真的站在對方的角度去看，他為了這個服務投入了多少時間、維護成本，以及他到底願不願意讓其他網站用這種方式取得資料。

這部分是我當時沒有想清楚的地方，也是我應該道歉的地方。

最近也有人把我跟朋友私下聊天的截圖公開出來，其中包含我講的「MapleKit 的 API 是公開資料，可以合理取用」以及「人家不給臉沒辦法」。

這些話確實是我講的，我不會因為那是私人對話就說我沒講過。

當時我是把對方當成很熟的朋友，所以很多有情緒的話都直接講了，沒有想過有一天會被截圖公開。但不管它原本是不是私人對話，「人家不給臉沒辦法」這句現在回頭看，我也覺得我的態度很差。

我當時確實有情緒，也確實覺得自己沒有做錯，所以才會講出這種話。這是當時真實的情況，我不想現在為了道歉就把自己講成當時其實什麼都知道、只是故意去做，因為那也不是事實。

但我後來重新了解整件事情之後，我的想法確實有改變。

所以對於我當時沒有先確認清楚 MapleKit 的使用界線就進行整合，以及後續處理事情時不好的態度，我在這裡向 MapleKit 的作者道歉。

**對不起，這件事情是我當時沒有處理好。**

事件發生之後，我已經把網站裡跟 MapleKit 有關的整合移除，也沒有打算換個方式繼續使用。

目前網站正在重新整理資料架構，原本依賴的部分會改成使用 NEXON 官方 API，以及由網站自己建立、自己維護的資料。這也是為什麼這段時間網站有些功能會暫時關閉或重新製作。

我知道有人可能會覺得「事情鬧大了才知道要改」，甚至覺得我現在講這些只是因為被炎上。

這部分我沒有辦法要求每個人一定要相信我。

我現在能做的，就是把有問題的東西停掉，把網站重新做好，之後不要再發生一樣的事情。

我也不會因為道歉，就說這幾天網路上所有對我的說法全部都是對的。有些是我確實做過的事情，有些是別人的解讀，也有一些已經延伸到跟原本 API 爭議沒有什麼關係的事情。

但我不想在這篇一條一條反駁。

因為如果一篇道歉文最後有一半都在講「但是別人也怎樣」，那我覺得這篇道歉也沒有什麼意義。

至少 MapleKit 這件事情，我自己該負責的部分，我願意承認。

我以前做網站很多時候都是先想「這個功能做不做得到」，真的做出來之後才去想其他問題。這次算是讓我很清楚知道，能不能做到跟應不應該這樣做，本來就是兩件不同的事情。

之後不管是 API、資料來源還是其他第三方服務，我都會先把使用方式跟界線確認清楚，而不是等出問題之後才處理。

最後還是再次向 MapleKit 作者說聲對不起。

我知道一句對不起不能把已經發生的事情變成沒有發生，所以剩下的就讓我用之後實際怎麼做來證明。

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
@media (max-width: 767px) { body:has(.service-notice-hero) .VPDoc .container, body:has(.service-notice-hero) .VPContent .container { width: calc(100% - 32px) !important; max-width: calc(100% - 32px) !important; margin-right: auto !important; margin-left: auto !important; padding-right: 0 !important; padding-left: 0 !important; } body:has(.service-notice-hero) .VPDoc .content { padding: 16px !important; border-radius: 16px !important; } .service-notice-hero { padding: 1.5rem 1.25rem; border-radius: 18px; } body:has(.service-notice-hero) .vp-doc > p { font-size: 1rem; line-height: 1.85; } }
@media (min-width: 960px) { body:has(.service-notice-hero) .VPDoc { padding: 0 !important; } }
</style>
