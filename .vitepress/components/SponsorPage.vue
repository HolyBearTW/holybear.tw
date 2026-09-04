<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEnglish = computed(() => lang.value.toLowerCase().startsWith('en'))

const paymentMethods = computed(() => isEnglish.value ? [
  {
    id: 'paypal',
    title: 'Support with PayPal',
    action: 'Continue to PayPal',
    external: 'Opens PayPal in a new tab',
    href: 'https://paypal.me/holybear0610',
    image: '/image/paypal-support-qr.png?v=20260901',
    imageAlt: 'PayPal support QR code',
    imageWidth: 2048,
    imageHeight: 2048
  },
  {
    id: 'coffee',
    title: 'Buy me a coffee',
    action: 'Continue to Buy Me a Coffee',
    external: 'Opens Buy Me a Coffee in a new tab',
    href: 'https://buymeacoffee.com/holybear',
    image: '/image/buy-me-a-coffee-support-qr.png?v=20260904',
    imageAlt: 'Buy Me a Coffee support QR code',
    imageWidth: 700,
    imageHeight: 700
  }
] : [
  {
    id: 'paypal',
    title: '透過 PayPal 贊助',
    action: '前往 PayPal 贊助',
    external: '將在新分頁開啟 PayPal',
    href: 'https://paypal.me/holybear0610',
    image: '/image/paypal-support-qr.png?v=20260901',
    imageAlt: 'PayPal 贊助 QR Code',
    imageWidth: 2048,
    imageHeight: 2048
  },
  {
    id: 'coffee',
    title: '請我喝杯咖啡',
    action: '前往 Buy Me a Coffee',
    external: '將在新分頁開啟 Buy Me a Coffee',
    href: 'https://buymeacoffee.com/holybear',
    image: '/image/buy-me-a-coffee-support-qr.png?v=20260904',
    imageAlt: 'Buy Me a Coffee 贊助 QR Code',
    imageWidth: 700,
    imageHeight: 700
  }
])

const copy = computed(() => isEnglish.value ? {
  eyebrow: 'SUPPORT HOLYBEAR',
  title: 'Help good ideas keep growing.',
  intro: 'This site is a small, independent corner for useful tools, technical notes, and experiments made with care. Your support gives the next update a little more room to happen.',
  cardTitle: 'Your support helps with',
  items: ['Website and domain upkeep', 'Tool maintenance and data updates', 'More open and experimental projects'],
  qrLabel: 'SCAN TO SUPPORT',
  qrHint: 'Scan the QR code, or use the button below on this device.',
  noteTitle: 'No pressure, truly.',
  note: 'Reading, sharing, or simply finding something useful here already means a lot. Supporting is an extra kindness—not a requirement.',
  thanks: 'Thank you for helping this little corner of the web keep moving forward.'
} : {
  eyebrow: 'SUPPORT HOLYBEAR',
  title: '讓喜歡的內容，繼續長大。',
  intro: '這裡是一個獨立維護的小角落，放著實用工具、技術筆記，以及認真完成的各種實驗。你的一點支持，會讓下一次更新更有餘裕發生。',
  cardTitle: '你的支持會用在',
  items: ['網站、伺服器與網域維護', '工具功能與資料持續更新', '更多開放且有趣的實驗作品'],
  qrLabel: '掃描 QR CODE',
  qrHint: '可以使用相機掃描，也可以在目前裝置直接點擊下方按鈕。',
  noteTitle: '真的，不贊助也沒關係。',
  note: '願意閱讀、分享，或只是在這裡找到一點幫助，對我來說就已經很有意義。贊助是一份額外的心意，從來不是使用網站的條件。',
  thanks: '謝謝你，願意讓這個小小的網站繼續往前。'
})
</script>

<template>
  <main class="sponsor-page">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <section class="sponsor-hero" aria-labelledby="sponsor-title">
      <div class="hero-copy">
        <div class="brand-mark">
          <img src="/favicon.png?v=20260816-face-cutout" alt="" width="48" height="48">
          <span>{{ copy.eyebrow }}</span>
        </div>

        <h1 id="sponsor-title">{{ copy.title }}</h1>
        <p class="intro">{{ copy.intro }}</p>

        <div class="support-uses">
          <p class="uses-title">{{ copy.cardTitle }}</p>
          <ul>
            <li v-for="item in copy.items" :key="item">
              <span class="check" aria-hidden="true">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="payment-options">
        <aside
          v-for="payment in paymentMethods"
          :key="payment.id"
          class="payment-card"
          :class="`payment-card--${payment.id}`"
          :aria-label="payment.title"
        >
          <div class="qr-heading">
            <span class="qr-kicker">{{ copy.qrLabel }}</span>
            <h2>{{ payment.title }}</h2>
            <p>{{ copy.qrHint }}</p>
          </div>

          <a
            class="qr-frame"
            :href="payment.href"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${payment.action}（${payment.external}）`"
          >
            <img
              :src="payment.image"
              :alt="payment.imageAlt"
              :width="payment.imageWidth"
              :height="payment.imageHeight"
            >
          </a>

          <a
            class="primary-action"
            :href="payment.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{{ payment.action }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
          <span class="external-note">{{ payment.external }}</span>
        </aside>
      </div>
    </section>

    <section class="gentle-note">
      <span class="note-line" aria-hidden="true"></span>
      <div>
        <h2>{{ copy.noteTitle }}</h2>
        <p>{{ copy.note }}</p>
      </div>
      <p class="thanks">{{ copy.thanks }}</p>
    </section>
  </main>
</template>

<style scoped>
.sponsor-page {
  --sponsor-accent: #36a7e0;
  --sponsor-deep: #27366f;
  position: relative;
  isolation: isolate;
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 112px 0 72px;
  color: var(--vp-c-text-1);
}

.ambient {
  position: absolute;
  z-index: -1;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(12px);
  opacity: .16;
}

.ambient-one {
  top: 64px;
  right: 2%;
  width: 360px;
  height: 360px;
  background: var(--sponsor-accent);
}

.ambient-two {
  bottom: 40px;
  left: -8%;
  width: 260px;
  height: 260px;
  background: var(--vp-c-brand-1);
  opacity: .1;
}

.sponsor-hero {
  display: grid;
  grid-template-columns: minmax(0, .88fr) minmax(0, 1.12fr);
  gap: clamp(40px, 5vw, 72px);
  align-items: center;
}

.payment-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 30px;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .19em;
}

.brand-mark img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: 0 10px 28px rgba(0, 0, 0, .14);
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  max-width: 700px;
  font-size: clamp(48px, 6.4vw, 82px);
  font-weight: 760;
  line-height: 1.08;
  letter-spacing: -.045em;
  text-wrap: balance;
}

.intro {
  max-width: 650px;
  margin-top: 28px;
  color: var(--vp-c-text-2);
  font-size: clamp(17px, 1.7vw, 20px);
  line-height: 1.9;
}

.support-uses {
  max-width: 620px;
  margin-top: 42px;
  padding-top: 26px;
  border-top: 1px solid var(--vp-c-divider);
}

.uses-title {
  margin-bottom: 15px;
  color: var(--vp-c-text-3);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .14em;
}

.support-uses ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.support-uses li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--vp-c-text-1);
  font-size: 15px;
}

.check {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--sponsor-accent) 15%, transparent);
  color: var(--sponsor-accent);
  font-size: 13px;
  font-weight: 900;
}

.payment-card {
  --payment-accent: var(--sponsor-accent);
  position: relative;
  overflow: hidden;
  padding: 22px;
  border: 1px solid color-mix(in srgb, var(--payment-accent) 30%, var(--vp-c-divider));
  border-radius: 30px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 90%, transparent);
  box-shadow: 0 28px 80px rgba(12, 22, 52, .14);
  backdrop-filter: blur(16px);
}

.payment-card::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -70px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: var(--payment-accent);
  opacity: .09;
}

.qr-heading {
  position: relative;
  margin-bottom: 22px;
}

.qr-kicker {
  color: var(--payment-accent);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: .2em;
}

.qr-heading h2 {
  margin-top: 7px;
  border: 0;
  padding: 0;
  font-size: 25px;
  line-height: 1.3;
}

.qr-heading p {
  margin-top: 7px;
  color: var(--vp-c-text-3);
  font-size: 13px;
  line-height: 1.65;
}

.qr-frame {
  display: block;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1;
  border: 10px solid #fff;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 14px 38px rgba(18, 29, 63, .13);
  transition: transform .25s ease, box-shadow .25s ease;
}

.qr-frame:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 46px rgba(18, 29, 63, .19);
}

.qr-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.primary-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  margin-top: 20px;
  padding: 14px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--sponsor-deep), #31458e 58%, #278fc5);
  color: #fff !important;
  font-size: 15px;
  font-weight: 760;
  text-decoration: none !important;
  box-shadow: 0 12px 26px rgba(39, 54, 111, .2);
  transition: transform .2s ease, box-shadow .2s ease;
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(39, 54, 111, .28);
}

.primary-action svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.payment-card--coffee {
  --payment-accent: #ffdd00;
}

.payment-card--coffee .primary-action {
  background: #ffdd00;
  color: #16120a !important;
  box-shadow: 0 12px 26px rgba(152, 126, 0, .2);
}

.payment-card--coffee .primary-action:hover {
  box-shadow: 0 16px 32px rgba(152, 126, 0, .3);
}

.qr-frame:focus-visible,
.primary-action:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--sponsor-accent) 72%, white);
  outline-offset: 4px;
}

.external-note {
  display: block;
  margin-top: 10px;
  color: var(--vp-c-text-3);
  font-size: 11px;
  text-align: center;
}

.gentle-note {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) minmax(240px, .6fr);
  gap: 24px;
  align-items: start;
  margin-top: 92px;
  padding: 38px 0 10px;
  border-top: 1px solid var(--vp-c-divider);
}

.note-line {
  width: 52px;
  height: 2px;
  margin-top: 14px;
  background: linear-gradient(90deg, var(--sponsor-deep), var(--sponsor-accent));
}

.gentle-note h2 {
  border: 0;
  padding: 0;
  font-size: 22px;
  line-height: 1.4;
}

.gentle-note div p {
  max-width: 610px;
  margin-top: 10px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.8;
}

.thanks {
  padding-top: 2px;
  color: var(--vp-c-text-3);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  font-style: italic;
  line-height: 1.8;
}

@media (max-width: 1050px) {
  .sponsor-hero {
    grid-template-columns: 1fr;
    gap: 46px;
  }

  .payment-options {
    width: min(100%, 820px);
    justify-self: center;
  }
}

@media (max-width: 800px) {
  .sponsor-page {
    width: min(100% - 32px, 620px);
    padding: 84px 0 52px;
  }

  h1 {
    font-size: clamp(42px, 12vw, 62px);
  }

  .intro {
    margin-top: 22px;
    font-size: 16px;
  }

  .payment-options {
    grid-template-columns: 1fr;
    width: min(100%, 480px);
  }

  .gentle-note {
    grid-template-columns: 38px 1fr;
    gap: 18px;
    margin-top: 64px;
    padding-top: 30px;
  }

  .note-line {
    width: 38px;
  }

  .thanks {
    grid-column: 2;
    margin-top: 8px;
  }
}

@media (max-width: 480px) {
  .sponsor-page {
    width: min(100% - 24px, 430px);
    padding-top: 72px;
  }

  .brand-mark {
    margin-bottom: 24px;
  }

  .brand-mark img {
    width: 42px;
    height: 42px;
  }

  .support-uses {
    margin-top: 32px;
  }

  .payment-card {
    padding: 20px;
    border-radius: 24px;
  }

  .qr-frame {
    border-width: 7px;
    border-radius: 16px;
  }

  .gentle-note {
    display: block;
  }

  .note-line {
    display: block;
    margin: 0 0 20px;
  }

  .thanks {
    margin-top: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .qr-frame,
  .primary-action {
    transition: none;
  }
}
</style>

<style>
body.holy-bear-page-enter .sponsor-page .brand-mark,
body.holy-bear-page-enter .sponsor-page h1,
body.holy-bear-page-enter .sponsor-page .intro,
body.holy-bear-page-enter .sponsor-page .support-uses,
body.holy-bear-page-enter .sponsor-page .payment-card,
body.holy-bear-page-enter .sponsor-page .gentle-note {
  animation: holyBearTextBounceIn .85s cubic-bezier(.68, -.6, .32, 1.6) both !important;
}

body.holy-bear-page-enter .sponsor-page h1 { animation-delay: .06s !important; }
body.holy-bear-page-enter .sponsor-page .intro { animation-delay: .13s !important; }
body.holy-bear-page-enter .sponsor-page .support-uses { animation-delay: .2s !important; }
body.holy-bear-page-enter .sponsor-page .payment-card { animation-delay: .16s !important; }
body.holy-bear-page-enter .sponsor-page .gentle-note { animation-delay: .28s !important; }

body.holy-bear-page-enter.holy-bear-route-enter .sponsor-page .brand-mark,
body.holy-bear-page-enter.holy-bear-route-enter .sponsor-page h1,
body.holy-bear-page-enter.holy-bear-route-enter .sponsor-page .intro,
body.holy-bear-page-enter.holy-bear-route-enter .sponsor-page .support-uses,
body.holy-bear-page-enter.holy-bear-route-enter .sponsor-page .payment-card,
body.holy-bear-page-enter.holy-bear-route-enter .sponsor-page .gentle-note {
  animation-name: holyBearRouteBounceIn !important;
}

/* Dynamic themes whose canvas stays dark even when VitePress is in light mode. */
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page {
  color: #effcff;
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page h1,
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .gentle-note h2 {
  color: #f5fdff !important;
  text-shadow: 0 2px 12px rgba(2, 18, 31, .94);
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .brand-mark,
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .intro,
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .gentle-note div p {
  color: #dcecf1;
  text-shadow: 0 2px 9px rgba(2, 18, 31, .94);
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .uses-title,
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .thanks {
  color: #c2d9e1;
  text-shadow: 0 2px 8px rgba(2, 18, 31, .92);
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .support-uses li {
  color: #effcff;
  text-shadow: 0 2px 8px rgba(2, 18, 31, .9);
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .support-uses,
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .gentle-note {
  border-color: rgba(202, 235, 243, .32);
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .payment-card {
  color: #173746;
  background: rgba(249, 253, 255, .88);
  border-color: rgba(143, 194, 207, .72);
  box-shadow: 0 28px 80px rgba(2, 18, 31, .34);
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .qr-heading h2 {
  color: #173746 !important;
  text-shadow: none;
}

html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .qr-heading p,
html:not(.dark) body:is(.theme-coretower, .theme-gaming, .theme-gravityfield, .theme-slow3dfly, .theme-halloween, .theme-christmas) .sponsor-page .external-note {
  color: #526b78;
  text-shadow: none;
}

/* Every animated theme gets explicit dark-mode contrast instead of inheriting canvas colors. */
html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page {
  color: #f2fbff;
}

html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page h1,
html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .gentle-note h2 {
  color: #f5fdff !important;
  text-shadow: 0 2px 12px rgba(0, 0, 0, .82);
}

html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .intro,
html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .gentle-note div p {
  color: #d7e3e8;
}

html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .brand-mark,
html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .uses-title,
html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .thanks,
html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .external-note {
  color: #b8ced7;
}

html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .support-uses li {
  color: #edf9fc;
}

html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .payment-card {
  background: rgba(6, 20, 31, .86);
  border-color: rgba(82, 211, 222, .34);
  box-shadow: 0 28px 80px rgba(0, 0, 0, .34);
}

html.dark body:is(.theme-coretower, .theme-tech, .theme-gravityfield, .theme-animated, .theme-gaming, .theme-slow3dfly, .theme-halo, .theme-hyperos, .theme-hyperos2, .theme-halloween, .theme-christmas) .sponsor-page .qr-heading h2 {
  color: #f2fbff !important;
}

/* Animated themes that become light keep dark copy, with a stable translucent surface. */
html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page h1,
html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page .gentle-note h2 {
  color: #172b38 !important;
  text-shadow: 0 2px 10px rgba(255, 255, 255, .9);
}

html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page .intro,
html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page .gentle-note div p,
html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page .brand-mark,
html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page .thanks {
  color: #385260;
  text-shadow: 0 1px 8px rgba(255, 255, 255, .92);
}

html:not(.dark) body:is(.theme-tech, .theme-animated, .theme-halo, .theme-hyperos, .theme-hyperos2) .sponsor-page .payment-card {
  background: rgba(249, 253, 255, .88);
  border-color: rgba(143, 194, 207, .62);
}

@media (prefers-reduced-motion: reduce) {
  body.holy-bear-page-enter .sponsor-page .brand-mark,
  body.holy-bear-page-enter .sponsor-page h1,
  body.holy-bear-page-enter .sponsor-page .intro,
  body.holy-bear-page-enter .sponsor-page .support-uses,
  body.holy-bear-page-enter .sponsor-page .payment-card,
  body.holy-bear-page-enter .sponsor-page .gentle-note {
    animation: none !important;
  }
}
</style>
