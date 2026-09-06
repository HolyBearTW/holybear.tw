<template>
  <div class="maple-survey-page-shell">
    <div
      class="maple-survey-page-brand"
      role="button"
      tabindex="0"
      aria-label="新楓之谷戰力分析，連續點擊五次進入問卷管理"
      @click="handleAdminTitleClick"
      @keydown="handleAdminTitleKeydown"
    >
      <span class="maple-survey-page-brand-icon" aria-hidden="true">
        <img :src="mapleAsset('Maple_Icon.webp')" alt="" decoding="async" />
      </span>
      <h2>新楓之谷戰力分析</h2>
    </div>
    <div class="maple-survey-page-heading">
      <p class="maple-survey-eyebrow">HOLYBEARTW FEEDBACK</p>
      <h1>戰力分析滿意度與未來開發意願調查</h1>
      <p>想了解大家目前對 HolyBearTW 戰力分析的使用感受，以及未來是否希望本站持續維護與開發。問卷約 1 分鐘，回覆僅用於網站功能規劃與服務改善。</p>
    </div>
    <div ref="mount" class="maple-survey-page-card"></div>
    <a class="maple-survey-back-link" href="/maplestory/">← 返回戰力分析</a>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vitepress'
import React from 'react'
import ReactDOM from 'react-dom/client'
import SurveyForm from './maplestory/components/SurveyForm'
import { mapleAsset } from './maplestory/assets'

const mount = ref(null)
const router = useRouter()
let root = null
let adminTitleClickCount = 0
let adminTitleClickTimer = null

const handleAdminTitleClick = () => {
  adminTitleClickCount += 1
  if (adminTitleClickTimer) window.clearTimeout(adminTitleClickTimer)

  if (adminTitleClickCount >= 5) {
    adminTitleClickCount = 0
    void router.go('/admin/survey/')
    return
  }

  adminTitleClickTimer = window.setTimeout(() => {
    adminTitleClickCount = 0
    adminTitleClickTimer = null
  }, 1200)
}

const handleAdminTitleKeydown = (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  handleAdminTitleClick()
}

onMounted(() => {
  if (!mount.value) return
  root = ReactDOM.createRoot(mount.value)
  root.render(React.createElement(SurveyForm))
})

onBeforeUnmount(() => {
  if (adminTitleClickTimer) window.clearTimeout(adminTitleClickTimer)
  root?.unmount()
  root = null
})
</script>

<style>
.maple-survey-page-shell {
  width: min(100%, 900px);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 12px 0 48px;
}

.maple-survey-page-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: fit-content;
  margin: 0 auto 28px;
  color: #f8fafc;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: opacity 160ms ease;
}

.maple-survey-page-brand:hover { opacity: 0.86; }
.maple-survey-page-brand:focus-visible {
  outline: 2px solid #a5b4fc;
  outline-offset: 6px;
  border-radius: 10px;
}

.maple-survey-page-brand-icon {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
}

.maple-survey-page-brand-icon img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.maple-survey-page-brand h2 {
  margin: 0;
  font-size: clamp(1.25rem, 3.5vw, 1.65rem);
  font-weight: 700;
  line-height: 1.3;
}

.maple-survey-page-heading {
  margin: 0 0 20px;
  text-align: center;
}

.maple-survey-page-heading .maple-survey-eyebrow {
  margin: 0 0 8px;
  color: #a5b4fc;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.maple-survey-page-heading h1 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: 1.35;
}

.maple-survey-page-heading > p:last-child {
  max-width: 680px;
  margin: 12px auto 0;
  color: #a5b4cc;
  font-size: 0.9rem;
  line-height: 1.75;
}

.maple-survey-page-card {
  overflow: hidden;
  border: 1px solid rgba(129, 140, 248, 0.32);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(20, 27, 53, 0.96), rgba(18, 25, 43, 0.94));
  box-shadow: 0 16px 44px rgba(3, 7, 18, 0.22);
}

.maple-survey-page-card .maple-survey-form {
  display: grid;
  gap: 20px;
  padding: 28px 30px 30px;
}

.maple-survey-form fieldset {
  display: grid;
  gap: 9px;
  border: 0;
  margin: 0;
  padding: 0;
}

.maple-survey-form legend,
.maple-survey-textarea-label {
  color: #e2e8f0;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.55;
}

/* Give each question title a little breathing room before its choices. */
.maple-survey-form legend { margin-bottom: 5px; }

.maple-survey-form legend span { color: #fda4af; }

.maple-survey-form fieldset label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b8c7dc;
  font-size: 0.88rem;
  line-height: 1.45;
}

.maple-survey-form input[type='radio'] { accent-color: #818cf8; }

.maple-survey-score-options { display: flex; flex-wrap: wrap; gap: 8px; }
.maple-survey-score-options label { position: relative; display: block; }
.maple-survey-score-options input { position: absolute; opacity: 0; }
.maple-survey-score-options span {
  display: grid;
  width: 44px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 9px;
  color: #cbd5e1;
  cursor: pointer;
  font-weight: 700;
}
.maple-survey-score-options input:checked + span {
  border-color: #a5b4fc;
  background: rgba(99, 102, 241, 0.35);
  color: #fff;
}
.maple-survey-score-hint {
  display: flex;
  justify-content: space-between;
  max-width: 260px;
  color: #8292aa;
  font-size: 0.74rem;
}

.maple-survey-textarea-label { display: grid; gap: 7px; }
.maple-survey-textarea-label textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1.6;
  padding: 11px 12px;
}
.maple-survey-textarea-label textarea:focus {
  outline: 2px solid rgba(129, 140, 248, 0.55);
  outline-offset: 1px;
}
.maple-survey-captcha { min-height: 65px; }
.maple-survey-help,
.maple-survey-privacy {
  margin: -8px 0 0;
  color: #8292aa;
  font-size: 0.74rem;
  line-height: 1.55;
}
.maple-survey-error,
.maple-survey-success { margin: -6px 0 0; font-size: 0.84rem; line-height: 1.55; }
.maple-survey-error { color: #fda4af; }
.maple-survey-success { color: #86efac; }
.maple-survey-submit {
  justify-self: start;
  border: 1px solid rgba(129, 140, 248, 0.65);
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.2);
  color: #e0e7ff;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 10px 20px;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.maple-survey-submit:hover:not(:disabled) {
  border-color: #a5b4fc;
  background: rgba(99, 102, 241, 0.38);
  transform: translateY(-1px);
}
.maple-survey-submit:disabled { cursor: not-allowed; opacity: 0.5; }
.maple-survey-back-link {
  display: inline-block;
  margin-top: 18px;
  color: #a5b4fc;
  font-size: 0.84rem;
  text-decoration: none;
}
.maple-survey-back-link:hover { color: #c7d2fe; text-decoration: underline; }

html:not(.dark) .maple-survey-page-heading h1,
html:not(.dark) .maple-survey-form legend,
html:not(.dark) .maple-survey-textarea-label { color: #1e2b4a; }
html:not(.dark) .maple-survey-page-heading > p:last-child,
html:not(.dark) .maple-survey-form fieldset label { color: #526784; }
html:not(.dark) .maple-survey-page-card {
  border-color: rgba(67, 56, 202, 0.24);
  background: linear-gradient(135deg, rgba(248, 250, 255, 0.98), rgba(239, 246, 255, 0.97));
  box-shadow: 0 16px 36px rgba(45, 55, 90, 0.12);
}
html:not(.dark) .maple-survey-textarea-label textarea {
  border-color: rgba(67, 56, 202, 0.22);
  background: rgba(255, 255, 255, 0.85);
  color: #243654;
}

/* Core Tower and Gravity Field keep their dark artwork in light appearance.
   The survey is a standalone page, so its local light-mode palette needs the
   same explicit theme override as the surrounding site chrome. */
html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-page-brand,
html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-page-heading h1 {
  color: #f8fafc !important;
  text-shadow: 0 2px 10px rgba(2, 18, 31, 0.68) !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-page-heading > p:last-child {
  color: #b8c8d8 !important;
  text-shadow: 0 1px 8px rgba(2, 18, 31, 0.52) !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-page-card {
  border-color: rgba(129, 140, 248, 0.32) !important;
  background: linear-gradient(135deg, rgba(20, 27, 53, 0.96), rgba(18, 25, 43, 0.94)) !important;
  box-shadow: 0 16px 44px rgba(3, 7, 18, 0.22) !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-form legend,
html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-textarea-label {
  color: #e2e8f0 !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-form fieldset label {
  color: #b8c7dc !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-score-options span {
  color: #cbd5e1 !important;
  border-color: rgba(148, 163, 184, 0.34) !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-score-options input:checked + span {
  color: #ffffff !important;
  border-color: #a5b4fc !important;
  background: rgba(99, 102, 241, 0.35) !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-score-hint,
html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-help,
html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-privacy {
  color: #8292aa !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-textarea-label textarea {
  border-color: rgba(129, 140, 248, 0.28) !important;
  background: rgba(15, 23, 42, 0.72) !important;
  color: #e2e8f0 !important;
}

html:not(.dark) body:is(.theme-coretower, .theme-gravityfield) .maple-survey-back-link {
  color: #a5b4fc !important;
}

@media (max-width: 640px) {
  .maple-survey-page-shell { padding: 4px 12px 32px; }
  .maple-survey-page-brand { margin-bottom: 22px; }
  .maple-survey-page-brand-icon,
  .maple-survey-page-brand-icon img { width: 44px; height: 44px; }
  .maple-survey-page-heading { margin-bottom: 16px; text-align: left; }
  .maple-survey-page-heading h1 { font-size: 1.4rem; }
  .maple-survey-page-heading > p:last-child { font-size: 0.84rem; }
  .maple-survey-page-card .maple-survey-form { gap: 18px; padding: 22px 16px 24px; }
  .maple-survey-score-options span { width: 40px; height: 36px; }
}
</style>
