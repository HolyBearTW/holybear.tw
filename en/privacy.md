---
title: Privacy Policy
description: Learn how holybear.tw handles browsing data, local storage, site interactions, and third-party services.
sidebar: false
aside: true
class: privacy-page
pageClass: custom-footer-layout
---

<div class="privacy-hero">
  <p class="privacy-eyebrow">PRIVACY AT A GLANCE</p>
  <h1>Privacy Policy</h1>
  <p>This page explains what stays on your device and what is sent to an external service when you browse HolyBear's Secret Base, leave a comment, or use one of its tools.</p>
  <span class="privacy-updated">Last updated: September 2, 2026</span>
</div>

<div class="privacy-summary">
  <div><strong>No site account required</strong><span>This site has no member accounts and does not directly process payment-card details.</span></div>
  <div><strong>Preferences stay local</strong><span>Most theme, player, search, and editor settings are stored in your browser.</span></div>
  <div><strong>Sent only when used</strong><span>Character lookups, AI analysis, and comments contact the relevant service when you use that feature.</span></div>
</div>

## Where this policy applies

This policy covers `holybear.tw`, including its articles, technical documentation, and browser-based tools. A third-party site you visit from a link is governed by its own privacy policy.

## Data that may be generated while you browse

### Connection and advertising information

To deliver pages, maintain security, understand site usage, and display advertising, the hosting provider, CDN, and third-party services may process ordinary technical information such as your IP address, browser and device type, referring page, access time, and page interactions.

This site loads Google AdSense and NEXON Open API Analytics. These services may use cookies or similar technologies for measurement, abuse prevention, and ad delivery. You can block or clear cookies in your browser and manage personalized advertising through [Google's ad settings](https://myadcenter.google.com/). Disabling cookies may affect some features and may not remove every advertisement.

### Article interactions

Article view totals and like/dislike totals are stored as aggregate counts in Google Firebase Cloud Firestore. Your browser separately remembers which articles have already been counted and your current vote so it can reduce duplicate counts and display the correct state. This site does not create a personal account for these interactions.

Comments are provided by Giscus and GitHub Discussions. When the comments area loads or you comment with GitHub, Giscus and GitHub process the relevant data under their own terms. Public comments also appear in the corresponding GitHub Discussion.

## Data stored in your browser

This site uses `localStorage` for experience-related state, which may include:

- Color and background themes, player volume, and playback state.
- Article interaction state, notice choices, and tab preferences.
- Drafts, current content, and history in the article editor.
- MapleStory character searches, favorites, calculator settings, and feature-tour state.
- NEXON, Google Gemini, OpenAI, or compatible-service API keys you enter, plus a custom endpoint and model name.

Local storage is not automatically uploaded to holybear.tw merely because it exists. When you perform a character lookup or request AI analysis, however, the required API key, query, and analysis content are sent by your browser to the service you selected. Avoid storing private API keys on shared or untrusted devices.

You can remove these records using a feature's clear option or your browser's site-data settings.

## Services contacted by site tools

### MapleStory character and growth data

When you search for a character or use growth and ranking features, query details such as a character name, OCID, or date range may be sent to the NEXON Open API or Mapler House API. The returned content is game-character data supplied by those services. This site is not affiliated with, endorsed by, or acting on behalf of NEXON Korea Corporation.

### AI analysis and compatible services

Only when you actively request AI analysis does the site send the game-character data and prompt required for that analysis, together with the API key you entered, directly from your browser to Google Gemini, OpenAI, or the compatible service you specified. Use only HTTPS services you trust and review their privacy and retention rules.

### Other external content

Some pages may load GitHub avatars, external images, fonts, weather, or other content. The provider receives ordinary connection information when your browser makes those requests. The blog weather card requests the weather for a fixed location—New Taipei City—and does not read your device location.

## How data is used and protected

The data described above is used to provide pages and tools, remember your settings, count content interactions, improve the experience, display advertising, and maintain site security. This site does not sell personal information you actively provide.

The site uses HTTPS and managed third-party platforms and aims to limit what it retains directly. No method of network transmission or storage, however, can be guaranteed to be completely secure.

## Your choices

- Clear cookies and site data for holybear.tw in your browser.
- Remove API keys, search history, or favorites in the MapleStory tool's settings.
- Adjust personalized advertising through Google's advertising controls.
- Edit or delete a Giscus comment through GitHub.
- Contact me about data managed directly by this site using the address below.

## Third-party policies

Third-party providers may process data in other countries or regions, subject to their own terms and retention periods. See:

- [How Google uses information from partner sites](https://policies.google.com/technologies/partner-sites?hl=en)
- [Firebase privacy and security](https://firebase.google.com/support/privacy)
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- [NEXON Privacy Policy](https://www.nexon.com/main/en/legal/privacy/)
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Mapler House Privacy Policy](https://www.maplerhouse.com/zh-tw/policy)

## Children's privacy

This site is not an account service designed for children under 13 and does not knowingly ask children for personal information. Please contact me if you believe inappropriate information has been provided to this site.

## Changes and contact

I may update this policy when site features or third-party services change. The revised date will be shown at the top of this page.

Questions about this policy or how data is handled can be sent to [holybear@holybear.tw](mailto:holybear@holybear.tw).

<style>
body:has(.privacy-hero) .VPDoc .container { max-width: 1120px; }
body:has(.privacy-hero) .vp-doc { color: var(--vp-c-text-1); }
.privacy-hero { position: relative; overflow: hidden; margin: 0 0 1.6rem; padding: clamp(1.6rem, 5vw, 3.1rem); border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 26%, var(--vp-c-divider)); border-radius: 24px; background: linear-gradient(140deg, color-mix(in srgb, var(--vp-c-brand-soft) 72%, var(--vp-c-bg)), var(--vp-c-bg-soft)); box-shadow: 0 18px 50px color-mix(in srgb, var(--vp-c-brand-1) 9%, transparent); }
.privacy-hero::after { position: absolute; top: -90px; right: -70px; width: 240px; height: 240px; border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 24%, transparent); border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--vp-c-brand-1) 17%, transparent), transparent 68%); content: ''; pointer-events: none; }
.privacy-hero h1 { position: relative; z-index: 1; margin: .35rem 0 .75rem; border: 0; font-size: clamp(2.1rem, 6vw, 3.5rem); line-height: 1.08; }
.privacy-hero > p:not(.privacy-eyebrow) { position: relative; z-index: 1; max-width: 760px; margin: 0 0 1.15rem; color: var(--vp-c-text-2); font-size: 1.04rem; line-height: 1.85; }
.privacy-eyebrow { margin: 0 !important; color: var(--vp-c-brand-1); font-size: .76rem; font-weight: 800; letter-spacing: .14em; }
.privacy-updated { display: inline-flex; position: relative; z-index: 1; padding: .35rem .7rem; border: 1px solid var(--vp-c-divider); border-radius: 999px; color: var(--vp-c-text-2); background: color-mix(in srgb, var(--vp-c-bg) 80%, transparent); font-size: .78rem; }
.privacy-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; margin: 0 0 2.2rem; }
.privacy-summary > div { padding: 1.05rem; border: 1px solid var(--vp-c-divider); border-radius: 16px; background: color-mix(in srgb, var(--vp-c-bg-soft) 86%, transparent); }
.privacy-summary strong, .privacy-summary span { display: block; }
.privacy-summary strong { margin-bottom: .35rem; color: var(--vp-c-brand-1); font-size: .95rem; }
.privacy-summary span { color: var(--vp-c-text-2); font-size: .86rem; line-height: 1.65; }
body:has(.privacy-hero) .vp-doc h2 { margin-top: 2.35rem; padding-top: 1.2rem; border-top-color: color-mix(in srgb, var(--vp-c-brand-1) 20%, var(--vp-c-divider)); }
body:has(.privacy-hero) .vp-doc h3 { margin-top: 1.65rem; }
body:has(.privacy-hero) .vp-doc p, body:has(.privacy-hero) .vp-doc li { line-height: 1.85; }
html:not(.dark) .privacy-hero { border-color: rgba(34, 126, 145, .24); background: linear-gradient(140deg, rgba(244, 252, 253, .96), rgba(225, 242, 247, .9)); box-shadow: 0 18px 48px rgba(36, 93, 112, .13); }
html:not(.dark) .privacy-hero h1 { color: #173747; }
html:not(.dark) .privacy-hero > p:not(.privacy-eyebrow) { color: #3c5968; }
html:not(.dark) .privacy-eyebrow { color: #007f91; }
html:not(.dark) .privacy-updated { border-color: rgba(45, 102, 119, .24); color: #47636f; background: rgba(255, 255, 255, .72); }
html:not(.dark) .privacy-summary > div { border-color: rgba(43, 104, 120, .2); background: rgba(249, 253, 254, .9); box-shadow: 0 10px 24px rgba(42, 91, 107, .08); }
html:not(.dark) .privacy-summary strong { color: #007e8f; }
html:not(.dark) .privacy-summary span { color: #425e6b; }
html:not(.dark) body:has(.privacy-hero) .vp-doc a { color: #006b7c !important; text-decoration-color: rgba(0, 107, 124, .45); }
html:not(.dark) body:has(.privacy-hero) .vp-doc a:hover { color: #004f5d !important; text-decoration-color: currentColor; }
@media (max-width: 720px) { .privacy-hero { border-radius: 18px; } .privacy-summary { grid-template-columns: 1fr; } .privacy-summary > div { padding: .9rem 1rem; } }
</style>
