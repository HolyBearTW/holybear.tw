<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import bearPortrait from '../theme/assets/images/holybear-800.webp?url'

const celebrationAt = Date.UTC(2026, 8, 27, 16)
const now = ref(Date.now())
const wishIsOpen = ref(false)
let timer: number | undefined

const daysUntil = computed(() => Math.max(0, Math.ceil((celebrationAt - now.value) / 86_400_000)))
const eventState = computed(() => {
  if (now.value < celebrationAt) return `距離第 500 天還有 ${daysUntil.value} 天`
  return '第 500 天，今天正式抵達'
})

const confetti = Array.from({ length: 22 }, (_, index) => ({
  left: `${4 + ((index * 47) % 92)}%`,
  delay: `${(index % 7) * -0.7}s`,
  duration: `${5.8 + (index % 5) * 0.75}s`,
  rotate: `${(index * 37) % 180}deg`
}))

onMounted(() => {
  document.body.classList.add('is-days500-page')
  timer = window.setInterval(() => { now.value = Date.now() }, 60_000)
})

onBeforeUnmount(() => {
  document.body.classList.remove('is-days500-page')
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <main class="days500" :class="{ 'wish-open': wishIsOpen }">
    <div class="ambient ambient-one" />
    <div class="ambient ambient-two" />
    <div class="grain" />

    <div class="confetti" aria-hidden="true">
      <i
        v-for="(piece, index) in confetti"
        :key="index"
        :style="{
          '--left': piece.left,
          '--delay': piece.delay,
          '--duration': piece.duration,
          '--rotate': piece.rotate,
          '--tone': String((index % 4) + 1)
        }"
      />
    </div>

    <section class="hero" aria-labelledby="celebration-title">
      <div class="topline">
        <span class="brand"><i class="brand-dot" /> HOLYBEAR</span>
        <span class="edition">COMMEMORATIVE EDITION · 2026</span>
      </div>

      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">SEP 28 · 五百日紀念</p>
          <h1 id="celebration-title">
            <span class="number">500</span>
            <span class="title-words"><b>DAYS</b><em>Celebration</em></span>
          </h1>
          <p class="lead">
            有些日子值得準時慶祝，<br>
            有些累積，值得選一個更大的數字好好記住。
          </p>
          <p class="statement">
            這不是補過一場遲到的週年，<br class="desktop-break">
            而是把 <strong>5/16 的一週年</strong>，一起帶到第 500 天。
          </p>

          <div class="hero-actions">
            <button class="wish-button" type="button" @click="wishIsOpen = !wishIsOpen">
              <span>{{ wishIsOpen ? '收起這份心意' : '打開第 500 天的心意' }}</span>
              <span class="button-arrow" aria-hidden="true">↗</span>
            </button>
            <span class="event-state">{{ eventState }}</span>
          </div>
        </div>

        <div class="seal-area" aria-label="從一週年延續至五百天的紀念章">
          <div class="orbit orbit-outer" aria-hidden="true">
            <svg viewBox="0 0 430 430" role="presentation">
              <defs>
                <path
                  id="days500-orbit-path"
                  d="M 215,215 m -190,0 a 190,190 0 1,1 380,0 a 190,190 0 1,1 -380,0"
                />
              </defs>
              <circle cx="215" cy="215" r="190" />
              <text textLength="360" lengthAdjust="spacing">
                <textPath href="#days500-orbit-path" startOffset="5%">
                  500 DAYS · CREATING WITH HEART ·
                </textPath>
              </text>
            </svg>
          </div>
          <div class="orbit orbit-inner" />
          <div class="seal">
            <img :src="bearPortrait" alt="聖小熊" width="220" height="220">
            <span class="seal-glint" />
          </div>
          <div class="year-stamp">
            <small>ALSO CELEBRATING</small>
            <strong>1 YEAR</strong>
            <span>2025.05.16 — 2026.05.16</span>
          </div>
        </div>
      </div>

    </section>

    <section v-show="wishIsOpen" class="wish-reveal" aria-live="polite">
      <div class="wish-inner">
        <p class="wish-kicker">A NOTE FOR DAY 500</p>
        <blockquote>
          <span>「謝謝你在這段路上來過、停留過，或只是偶爾想起這裡。</span>
          <span><strong>第 500 天</strong>不是句點，而是一個更有份量的逗號。」</span>
        </blockquote>
        <p class="signature">— HolyBear · 2026.09.28</p>
      </div>
    </section>

    <section class="timeline-section" aria-labelledby="timeline-title">
      <div class="section-heading">
        <p>ONE STORY, TWO MILESTONES</p>
        <h2 id="timeline-title">週年沒有缺席，<br>它只是成為 500 天的一部分。</h2>
      </div>

      <div class="timeline" role="list">
        <article class="milestone beginning" role="listitem">
          <div class="milestone-index">001</div>
          <time datetime="2025-05-16">2025.05.16</time>
          <h3>故事開始</h3>
          <p>從第一篇文字、第一個作品、第一位停下來的人開始，品牌有了自己的時間。</p>
        </article>

        <div class="timeline-line" aria-hidden="true">
          <span class="progress progress-one">365 DAYS</span>
          <span class="progress progress-two">+135 DAYS</span>
        </div>

        <article class="milestone anniversary" role="listitem">
          <div class="milestone-index">365</div>
          <time datetime="2026-05-16">2026.05.16</time>
          <h3>一週年</h3>
          <p>沒有被遺忘，也不需要補辦。這一天確認了初心，並繼續走向下一個值得記住的數字。</p>
          <span class="milestone-tag">1st Anniversary</span>
        </article>

        <article class="milestone finale" role="listitem">
          <div class="milestone-index">500</div>
          <time datetime="2026-09-28">2026.09.28</time>
          <h3>五百天</h3>
          <p>累積不只以年計算。第 500 天，把過去的意義完整接住，也替未來留下新的起點。</p>
          <span class="milestone-tag">500 Days Celebration</span>
        </article>
      </div>
    </section>

    <section class="meaning-section" aria-label="五百天的品牌意義">
      <div class="meaning-number">500</div>
      <div class="meaning-copy">
        <p class="meaning-kicker">THE MEANING OF CONTINUING</p>
        <h2>紀念的不是日曆，<br>是我們真的走了這麼遠。</h2>
        <p>
          一週年代表「我們開始了」；五百天代表「我們仍然在這裡」。
          兩個里程碑放在一起，讓每一次創作、每一次相遇，都成為持續累積的品牌資產。
        </p>
        <dl>
          <div><dt>365</dt><dd>記住初心</dd></div>
          <div><dt>+135</dt><dd>持續前進</dd></div>
          <div><dt>500</dt><dd>一起慶祝</dd></div>
        </dl>
      </div>
    </section>

    <footer class="celebration-footer">
      <div>
        <span class="footer-mark">
          <img src="/favicon.png?v=20260816-face-cutout" alt="聖小熊網站 Logo" width="40" height="40">
        </span>
        <p><strong>500 DAYS, AND COUNTING.</strong><br>下一個里程碑，我們繼續一起抵達。</p>
      </div>
      <time datetime="2026-09-28">SEP · 28 · 2026</time>
    </footer>
  </main>
</template>

<style scoped>
.days500 {
  --ink: #f9f5eb;
  --muted: #b9b7b2;
  --night: #0d101a;
  --night-soft: #151a28;
  --gold: #f2c96d;
  --orange: #ff7657;
  position: relative;
  margin-top: calc(-1 * var(--vp-nav-height, 64px));
  min-height: 100vh;
  overflow: hidden;
  color: var(--ink);
  background:
    radial-gradient(circle at 82% 13%, rgba(255, 118, 87, .12), transparent 25rem),
    radial-gradient(circle at 14% 54%, rgba(242, 201, 109, .08), transparent 32rem),
    var(--night);
  font-family: "LINE Seed TW", "Noto Sans TC", system-ui, sans-serif;
  isolation: isolate;
}

.grain {
  position: absolute;
  inset: 0;
  opacity: .14;
  pointer-events: none;
  z-index: -1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.86' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.28'/%3E%3C/svg%3E");
}

.ambient { position: absolute; border-radius: 999px; filter: blur(6px); pointer-events: none; z-index: -1; }
.ambient-one { width: 22rem; height: 22rem; right: -10rem; top: 34rem; border: 1px solid rgba(242,201,109,.18); }
.ambient-two { width: 40rem; height: 40rem; left: -30rem; top: 8rem; border: 1px solid rgba(255,255,255,.1); }

.hero, .timeline-section, .meaning-section, .celebration-footer {
  width: min(1240px, calc(100% - 64px));
  margin-inline: auto;
}

.hero { padding: calc(70px + var(--vp-nav-height, 64px)) 0 18px; }
.topline { display: flex; align-items: center; justify-content: space-between; gap: 24px; font-size: 11px; letter-spacing: .2em; color: var(--muted); }
.brand { color: var(--ink); font-weight: 800; letter-spacing: .24em; }
.brand-dot { display: inline-block; width: 7px; height: 7px; margin-right: 9px; border-radius: 50%; background: var(--orange); box-shadow: 0 0 18px var(--orange); }
.hero-grid { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(420px, .92fr); align-items: center; gap: 60px; padding: 70px 0 14px; }
.eyebrow, .section-heading > p, .meaning-kicker, .wish-kicker { color: var(--gold); font-size: 12px; font-weight: 800; letter-spacing: .25em; }
h1 { display: flex; align-items: flex-end; margin: 10px 0 26px; font-family: Georgia, "Times New Roman", serif; line-height: .74; letter-spacing: -.07em; }
.number { font-size: clamp(112px, 15vw, 224px); color: var(--gold); text-shadow: 0 16px 70px rgba(242,201,109,.14); }
.title-words { display: flex; flex-direction: column; padding: 0 0 9px 15px; letter-spacing: 0; line-height: 1; }
.title-words b { font-family: "LINE Seed TW", sans-serif; font-size: clamp(28px, 3.7vw, 54px); letter-spacing: .14em; }
.title-words em { margin-top: 10px; color: var(--orange); font-size: clamp(25px, 3vw, 43px); font-weight: 400; }
.lead { margin: 0 0 24px; font-size: clamp(23px, 2.5vw, 38px); line-height: 1.48; letter-spacing: -.025em; }
.statement { max-width: 680px; margin: 0; padding-left: 18px; border-left: 2px solid var(--orange); color: var(--muted); font-size: 16px; line-height: 1.9; }
.statement strong { color: var(--ink); }
.hero-actions { display: flex; align-items: center; gap: 18px; margin-top: 34px; }
.wish-button { display: inline-flex; align-items: center; gap: 26px; padding: 15px 19px 15px 22px; border: 1px solid var(--gold); border-radius: 999px; color: #17130b; background: var(--gold); font: inherit; font-size: 14px; font-weight: 800; cursor: pointer; transition: transform .25s ease, box-shadow .25s ease; }
.wish-button:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(242,201,109,.18); }
.button-arrow { font-size: 18px; transition: transform .3s ease; }
.wish-open .button-arrow { transform: rotate(135deg); }
.event-state { color: var(--muted); font-size: 12px; letter-spacing: .07em; }

.seal-area { position: relative; min-height: 500px; display: grid; place-items: center; }
.seal { position: relative; width: min(300px, 66vw); aspect-ratio: 1; border-radius: 50%; padding: 18px; background: linear-gradient(145deg, #ffe49c, #b36e28 48%, #ffe7a8 76%, #8b4d1c); box-shadow: 0 32px 90px rgba(0,0,0,.42), inset 0 0 0 2px rgba(255,255,255,.45); z-index: 2; }
.seal::before { content: ""; position: absolute; inset: 8px; border: 1px dashed rgba(79,43,12,.55); border-radius: 50%; }
.seal img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; border-radius: 50%; filter: sepia(.18) saturate(.85) contrast(1.05); }
.seal-glint { position: absolute; inset: 18px; border-radius: 50%; background: linear-gradient(120deg, rgba(255,255,255,.36), transparent 31%, transparent 65%, rgba(255,226,150,.12)); mix-blend-mode: screen; }
.orbit { position: absolute; border-radius: 50%; }
.orbit-outer { width: 430px; height: 430px; animation: spin 36s linear infinite; }
.orbit-outer svg { display: block; width: 100%; height: 100%; overflow: visible; }
.orbit-outer circle { fill: none; stroke: rgba(242,201,109,.22); stroke-width: 1; }
.orbit-outer text { fill: var(--gold); font-family: "LINE Seed TW", sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .19em; }
.orbit-inner { width: 356px; height: 356px; border: 1px dashed rgba(255,255,255,.15); animation: spin-reverse 38s linear infinite; }
.year-stamp { position: absolute; right: 0; bottom: 36px; z-index: 3; display: flex; flex-direction: column; min-width: 220px; padding: 17px 21px; border: 1px solid rgba(255,255,255,.18); background: rgba(21,26,40,.82); backdrop-filter: blur(14px); transform: rotate(-3deg); box-shadow: 0 18px 50px rgba(0,0,0,.3); }
.year-stamp small { color: var(--orange); font-size: 9px; letter-spacing: .2em; }
.year-stamp strong { margin: 2px 0 4px; font-family: Georgia, serif; font-size: 34px; color: var(--gold); }
.year-stamp span { color: var(--muted); font-size: 10px; letter-spacing: .08em; }
.wish-reveal { color: #3b2618; background: linear-gradient(135deg, #f7d67f 0%, var(--gold) 48%, #efb85c 100%); }
.wish-inner { width: min(1180px, calc(100% - 48px)); margin: auto; padding-block: clamp(58px, 8vw, 104px); text-align: center; }
.wish-kicker { margin-bottom: 26px; color: #6e4419; }
.wish-reveal blockquote { position: static !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; color: #3b2618 !important; background: transparent !important; font-family: Georgia, "Noto Serif TC", serif; font-size: clamp(24px, 2.55vw, 38px); font-weight: 700; line-height: 1.65; opacity: 1 !important; transform: none !important; -webkit-text-fill-color: #3b2618 !important; }
.wish-reveal blockquote span { display: block; }
.wish-reveal blockquote strong { color: #9d3f2c !important; font: inherit; -webkit-text-fill-color: #9d3f2c !important; }
.signature { margin-top: 26px; font-size: 12px; letter-spacing: .16em; }

.timeline-section { padding: clamp(90px, 12vw, 160px) 0; }
.section-heading { display: grid; grid-template-columns: .65fr 1.35fr; gap: 40px; align-items: start; margin-bottom: 72px; }
.section-heading h2, .meaning-copy h2 { margin: 0; font-family: Georgia, "Noto Serif TC", serif; font-size: clamp(34px, 4.6vw, 66px); line-height: 1.22; letter-spacing: -.04em; }
.timeline { display: grid; grid-template-columns: 1fr 1.6fr 1fr 1fr; gap: 26px; align-items: stretch; }
.milestone { position: relative; min-height: 330px; padding: 28px; border: 1px solid rgba(255,255,255,.13); background: rgba(255,255,255,.025); }
.milestone-index { position: absolute; right: 22px; top: 17px; color: rgba(255,255,255,.08); font-family: Georgia, serif; font-size: 60px; line-height: 1; }
.milestone time { color: var(--gold); font-size: 11px; letter-spacing: .17em; }
.milestone h3 { margin: 112px 0 14px; font-family: Georgia, "Noto Serif TC", serif; font-size: 30px; }
.milestone p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.85; }
.milestone-tag { position: absolute; bottom: 22px; left: 28px; color: var(--orange); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.anniversary { border-color: rgba(242,201,109,.38); }
.finale { border: 0; color: #17130b; background: var(--gold); transform: translateY(-18px); box-shadow: 0 30px 70px rgba(0,0,0,.2); }
.finale time, .finale .milestone-tag { color: #8c431e; }
.finale p { color: #4d412c; }
.finale .milestone-index { color: rgba(52,32,12,.11); }
.timeline-line { position: relative; min-height: 330px; display: flex; align-items: center; }
.timeline-line::before { content: ""; width: 100%; height: 1px; background: linear-gradient(90deg, var(--gold) 0 65%, var(--orange) 65% 100%); }
.timeline-line::after { content: ""; position: absolute; left: 64%; width: 9px; height: 9px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 8px rgba(242,201,109,.1); }
.progress { position: absolute; top: calc(50% - 28px); color: var(--muted); font-size: 9px; letter-spacing: .14em; }
.progress-one { left: 18%; }
.progress-two { right: 0; color: var(--orange); }

.meaning-section { display: grid; grid-template-columns: .82fr 1.18fr; gap: clamp(36px, 8vw, 110px); align-items: center; padding: 30px 0 150px; }
.meaning-number { color: transparent; -webkit-text-stroke: 1px rgba(242,201,109,.5); font-family: Georgia, serif; font-size: clamp(150px, 24vw, 340px); line-height: .8; letter-spacing: -.1em; transform: translateX(-.04em); }
.meaning-copy > p:not(.meaning-kicker) { max-width: 630px; margin: 28px 0 34px; color: var(--muted); line-height: 1.9; }
.meaning-copy dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin: 0; background: rgba(255,255,255,.13); }
.meaning-copy dl > div { padding: 19px; background: var(--night); }
.meaning-copy dt { color: var(--gold); font-family: Georgia, serif; font-size: 28px; }
.meaning-copy dd { margin: 4px 0 0; color: var(--muted); font-size: 12px; }

.celebration-footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; padding: 46px 0 58px; border-top: 1px solid rgba(255,255,255,.15); }
.celebration-footer > div { display: flex; align-items: center; gap: 18px; }
.footer-mark { display: grid; place-items: center; width: 52px; height: 52px; padding: 6px; border-radius: 50%; background: var(--gold); box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); }
.footer-mark img { display: block; width: 100%; height: 100%; object-fit: contain; }
.celebration-footer p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.7; }
.celebration-footer p strong { color: var(--ink); letter-spacing: .1em; }
.celebration-footer time { color: var(--gold); font-family: Georgia, serif; font-size: 17px; letter-spacing: .13em; }

.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 4; }
.confetti i { --piece-color: var(--gold); position: absolute; left: var(--left); top: -20px; width: 5px; height: 13px; opacity: .4; background: var(--piece-color); transform: rotate(var(--rotate)); animation: fall var(--duration) var(--delay) linear infinite; }
.confetti i[style*="--tone: 2"] { --piece-color: var(--orange); width: 8px; height: 8px; border-radius: 50%; }
.confetti i[style*="--tone: 3"] { --piece-color: #f7efe0; }
.confetti i[style*="--tone: 4"] { --piece-color: #8f8274; height: 9px; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spin-reverse { to { transform: rotate(-360deg); } }
@keyframes fall { 0% { transform: translate3d(0,-20px,0) rotate(var(--rotate)); } 100% { transform: translate3d(28px,105vh,0) rotate(calc(var(--rotate) + 480deg)); } }

@media (max-width: 980px) {
  .hero-grid { grid-template-columns: 1fr; padding-top: 58px; }
  .seal-area { min-height: 470px; }
  .timeline { grid-template-columns: 1fr 1fr; }
  .timeline-line { display: none; }
  .beginning { grid-column: 1 / -1; min-height: 250px; }
  .beginning h3 { margin-top: 70px; }
  .finale { transform: none; }
  .meaning-section { grid-template-columns: 1fr; }
  .meaning-number { font-size: clamp(140px, 43vw, 320px); }
}

@media (min-width: 981px) {
  .section-heading h2,
  .meaning-copy h2 { font-size: clamp(42px, 4vw, 58px); }
}

@media (max-width: 640px) {
  .hero, .timeline-section, .meaning-section, .celebration-footer { width: min(100% - 36px, 1240px); }
  .hero { padding-top: calc(42px + var(--vp-nav-height, 64px)); }
  .edition { display: none; }
  .hero-grid { gap: 18px; padding: 56px 0 36px; }
  h1 { align-items: flex-start; flex-direction: column; gap: 12px; margin-bottom: 28px; line-height: 1; }
  .number { font-size: clamp(116px, 40vw, 170px); line-height: .86; }
  .title-words { flex-direction: row; align-items: baseline; gap: 10px; padding: 0 0 0 4px; }
  .title-words b { font-size: 28px; }
  .title-words em { margin: 0; font-size: 29px; }
  .lead { font-size: 24px; }
  .desktop-break { display: none; }
  .hero-actions { align-items: flex-start; flex-direction: column; }
  .seal-area { min-height: 420px; }
  .orbit-outer { width: 340px; height: 340px; }
  .orbit-inner { width: 290px; height: 290px; }
  .seal { width: 238px; }
  .year-stamp { right: -2px; bottom: 25px; min-width: 190px; }
  .section-heading { grid-template-columns: 1fr; margin-bottom: 48px; }
  .timeline { grid-template-columns: 1fr; }
  .beginning { grid-column: auto; }
  .milestone { min-height: 285px; }
  .milestone-tag { position: static; display: block; margin-top: 18px; }
  .meaning-section { padding-bottom: 90px; }
  .meaning-copy dl { grid-template-columns: 1fr; }
  .meaning-copy dl > div { display: flex; align-items: baseline; justify-content: space-between; }
  .celebration-footer { align-items: flex-start; flex-direction: column; gap: 18px; }
  .celebration-footer > div { align-items: center; flex-direction: row; }
  .celebration-footer time { margin-left: 70px; }
}

@media (prefers-reduced-motion: reduce) {
  .orbit, .confetti i { animation: none !important; }
  .wish-reveal, .wish-button, .button-arrow { transition: none !important; }
}

:global(body.is-days500-page) {
  --vp-c-brand: #f2c96d;
  --vp-c-brand-light: #ffe197;
  --vp-c-brand-dark: #d8a94b;
  --vp-c-brand-darker: #a9672d;
  --vp-c-brand-dimm: rgba(242, 201, 109, .18);
  --vp-c-brand-1: #f2c96d;
  --vp-c-brand-2: #ff7657;
  --vp-c-brand-3: #d8a94b;
  background: #0d101a !important;
}

:global(html body.is-days500-page .VPNav:has(.VPNavBar)),
:global(html body.is-days500-page .VPNav:has(.VPNavBar) .VPNavBar),
:global(html body.is-days500-page .VPNav:has(.VPNavBar) .VPNavBar > .wrapper),
:global(html body.is-days500-page .VPNav:has(.VPNavBar) .VPNavBar > .container),
:global(html body.is-days500-page .VPNav:has(.VPNavBar) .VPNavBar .content),
:global(html body.is-days500-page .VPNav:has(.VPNavBar) .VPNavBar .content-body) {
  background: rgba(13, 16, 26, .9) !important;
  -webkit-backdrop-filter: blur(20px) saturate(125%) !important;
  backdrop-filter: blur(20px) saturate(125%) !important;
}

/* The site's light-mode scroll-top rules are intentionally very specific. */
:global(html:not(.dark) body.is-days500-page .VPNav:has(.VPNavBar.top)),
:global(html:not(.dark) body.is-days500-page .VPNav:has(.VPNavBar.top) .VPNavBar),
:global(html:not(.dark) body.is-days500-page .VPNav:has(.VPNavBar.top) .VPNavBar > .wrapper),
:global(html:not(.dark) body.is-days500-page .VPNav:has(.VPNavBar.top) .VPNavBar > .container),
:global(html:not(.dark) body.is-days500-page .VPNav:has(.VPNavBar.top) .VPNavBar .content),
:global(html:not(.dark) body.is-days500-page .VPNav:has(.VPNavBar.top) .VPNavBar .content-body) {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

:global(html body.is-days500-page.hb-at-scroll-top .VPNav:has(.VPNavBar.top)),
:global(html body.is-days500-page.hb-at-scroll-top .VPNav:has(.VPNavBar.top) .VPNavBar),
:global(html body.is-days500-page.hb-at-scroll-top .VPNav:has(.VPNavBar.top) .VPNavBar > .wrapper),
:global(html body.is-days500-page.hb-at-scroll-top .VPNav:has(.VPNavBar.top) .VPNavBar > .container),
:global(html body.is-days500-page.hb-at-scroll-top .VPNav:has(.VPNavBar.top) .VPNavBar .content),
:global(html body.is-days500-page.hb-at-scroll-top .VPNav:has(.VPNavBar.top) .VPNavBar .content-body) {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

:global(html body.is-days500-page.hb-at-scroll-top .VPNavBar.top) {
  border-bottom-color: transparent !important;
  box-shadow: none !important;
}

:global(html body.is-days500-page.is-days500-page .VPNavBar) {
  border-bottom: 1px solid rgba(242, 201, 109, .14) !important;
  box-shadow: 0 12px 38px rgba(0, 0, 0, .16) !important;
}

:global(body.is-days500-page .VPNavBar .divider-line) {
  background-color: rgba(242, 201, 109, .14) !important;
}

:global(body.is-days500-page .VPNavBarTitle .title),
:global(body.is-days500-page .VPNavBarMenuLink),
:global(body.is-days500-page .VPNavBarMenuGroup .text),
:global(body.is-days500-page .VPNavBarHamburger .container) {
  color: #f9f5eb !important;
}

:global(body.is-days500-page .VPNavBarMenuLink:hover),
:global(body.is-days500-page .VPNavBarMenuLink.active),
:global(body.is-days500-page .VPNavBarMenuGroup:hover .text) {
  color: #f2c96d !important;
}

:global(html:not(.dark) body.is-days500-page .VPNavBarSearchButton) {
  color: #f9f5eb !important;
  background: rgba(255, 255, 255, .055) !important;
  border-color: rgba(242, 201, 109, .22) !important;
}

:global(html:not(.dark) body.is-days500-page .VPNavBarSearchButton:hover) {
  background: rgba(242, 201, 109, .1) !important;
  border-color: rgba(242, 201, 109, .45) !important;
}

:global(html:not(.dark) body.is-days500-page .VPNavBarSearchButton .DocSearch-Button-Key) {
  color: #d7d1c6 !important;
  background: rgba(255,255,255,.08) !important;
  border-color: rgba(255,255,255,.12) !important;
}

:global(html:not(.dark) body.is-days500-page .VPSwitchAppearance),
:global(html:not(.dark) body.is-days500-page .VPSocialLink),
:global(html:not(.dark) body.is-days500-page .VPNavBarTranslations .button),
:global(html:not(.dark) body.is-days500-page .VPNavBarMenuGroup .button) {
  color: #f9f5eb !important;
}

:global(html:not(.dark) body.is-days500-page .VPNavBarHamburger .top),
:global(html:not(.dark) body.is-days500-page .VPNavBarHamburger .middle),
:global(html:not(.dark) body.is-days500-page .VPNavBarHamburger .bottom) {
  background-color: #f9f5eb !important;
}

:global(body.is-days500-page .VPNavScreen) {
  color: #f9f5eb !important;
  background: #0d101a !important;
}

:global(html body.is-days500-page.is-days500-page .BlogVPFooter) {
  position: relative;
  padding: 30px 20px 24px !important;
  color: #8f9097 !important;
  background: #090c14 !important;
  border-top: 1px solid rgba(242, 201, 109, .14) !important;
}

:global(body.is-days500-page .BlogVPFooter::before) {
  content: "500 DAYS · 2025.05.16 — 2026.09.28";
  position: absolute;
  left: 50%;
  top: 0;
  padding: 0 13px;
  color: #f2c96d;
  background: #090c14;
  transform: translate(-50%, -50%);
  font-family: Georgia, serif;
  font-size: 10px;
  letter-spacing: .16em;
  white-space: nowrap;
}

:global(body.is-days500-page .BlogVPFooter a) {
  color: #f2c96d !important;
}

:global(body.is-days500-page .BlogVPFooter a:hover) {
  color: #ff7657 !important;
}

:global(body.is-days500-page .music-container:not(.minimized)::before) {
  background: rgba(13, 16, 26, .78) !important;
}

:global(body.is-days500-page .music-container:not(.minimized)) {
  border-color: rgba(242, 201, 109, .2) !important;
  box-shadow: 0 18px 44px rgba(0,0,0,.32), 0 0 0 1px rgba(242,201,109,.07) inset !important;
}
</style>
