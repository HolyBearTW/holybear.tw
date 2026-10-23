<template>
  <div class="halloween-background" id="halloween-bg"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import halloweenBatUrl from './assets/halloween/halloween2.png?url'
import halloweenPumpkinUrl from './assets/halloween/halloween1.png?url'

// 萬聖節主題背景元件
// 注意：不要在模組載入時就寫入 root 變數，會導致其他主題被覆蓋

// 儲存南瓜動畫 interval，以便清理
let pumpkinIntervalId = null;
let mutationObserver = null;
let navObserver = null;

// 處理導覽列開關：開啟時隱藏蝙蝠，避免覆蓋
function handleNavToggle() {
  if (typeof document === 'undefined') return;
  const isNavOpen = document.documentElement.classList.contains('vp-mobile-nav-open');
  const bats = document.getElementById('halloween-bats');
  if (bats) {
    bats.style.display = isNavOpen ? 'none' : '';
  }
}

function startHalloween() {
  // 防呆：已經存在就不再建立
  if (document.getElementById('halloween-bats') || document.getElementById('halloween-pumpkin')) return;

  // 設定 Halloween 專屬 CSS 變數（以 inline 覆蓋，切換時會移除）
  try {
    const root = document.documentElement;
    root.style.setProperty('--vp-c-brand', '#ff9800');
    root.style.setProperty('--vp-c-brand-light', '#ffb74d');
    root.style.setProperty('--vp-c-brand-lighter', '#ffe0b2');
    root.style.setProperty('--vp-c-brand-dark', '#e65100');
    root.style.setProperty('--vp-c-brand-darker', '#bf360c');
    root.style.setProperty('--vp-c-bg', '#1a1a1a');
    root.style.setProperty('--vp-c-bg-soft', '#222');
    root.style.setProperty('--vp-c-text-1', '#ff9800');
    root.style.setProperty('--vp-c-text-2', '#fff3e0');
  } catch (e) {
    // ignore
  }

  // 立即對導航列、標題與文字套用 inline style（解決某些樣式被 inline 覆蓋或未即時更新的問題）
  try {
    const navSelectors = ['.VPNav', '.VPNavBar', 'header'];
    navSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        // 儲存舊的 inline style，方便還原
        el.setAttribute('data-hb-old-style', el.getAttribute('style') || '');
        el.style.borderBottom = '2px solid #ff9800';
        el.style.color = '#ff9800';
      });
      document.querySelectorAll(sel + ' *').forEach(ch => {
        ch.setAttribute('data-hb-old-color', ch.style.color || '');
        ch.style.color = '#ff9800';
      });
    });

    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      h.setAttribute('data-hb-old-style', h.getAttribute('style') || '');
      h.style.color = '#ff5722';
      h.style.textShadow = '2px 2px 4px #000';
    });
  } catch (e) {}

  // --- 1. 蝙蝠動畫 (滿版) ---
  const batContainer = document.createElement('div');
  batContainer.id = 'halloween-bats';
  batContainer.style.position = 'fixed';
  batContainer.style.left = '0';
  batContainer.style.top = '0';
  batContainer.style.width = '100%';
  batContainer.style.height = '100dvh';
  batContainer.style.minHeight = '100dvh';
  batContainer.style.zIndex = '9998';
  batContainer.style.pointerEvents = 'none';
  batContainer.style.transform = 'translate3d(0, 0, 0)';
  batContainer.style.backfaceVisibility = 'hidden';
  batContainer.style.contain = 'paint';

  for (let i = 0; i < 12; i++) {
    const bat = document.createElement('div');
    bat.className = 'halloween-bat';
    bat.style.left = `${Math.random() * 92}vw`;
    bat.style.top = `${Math.random() * 88}vh`;
    bat.style.setProperty('--bat-drift-x', `${Math.random() * 64 - 32}px`);
    bat.style.setProperty('--bat-drift-y', `${Math.random() * 42 - 21}px`);
    bat.style.setProperty('--bat-flight-duration', `${7 + Math.random() * 5}s`);
    bat.style.setProperty('--bat-flap-duration', `${0.44 + Math.random() * 0.2}s`);
    bat.style.setProperty('--bat-flight-delay', `${Math.random() * -8}s`);
    bat.style.setProperty('--bat-flap-delay', `${Math.random() * -0.8}s`);

    const leftWing = document.createElement('img');
    leftWing.src = halloweenBatUrl;
    leftWing.className = 'halloween-bat-wing halloween-bat-wing-left';
    leftWing.alt = '';
    leftWing.setAttribute('aria-hidden', 'true');

    const rightWing = document.createElement('img');
    rightWing.src = halloweenBatUrl;
    rightWing.className = 'halloween-bat-wing halloween-bat-wing-right';
    rightWing.alt = '';
    rightWing.setAttribute('aria-hidden', 'true');

    const body = document.createElement('img');
    body.src = halloweenBatUrl;
    body.className = 'halloween-bat-body';
    body.alt = '';
    body.setAttribute('aria-hidden', 'true');

    bat.append(leftWing, rightWing, body);
    batContainer.appendChild(bat);
  }
  document.body.appendChild(batContainer);

  // 新增：立即檢查導覽列狀態，避免主題切換時蝙蝠覆蓋已開啟的選單
  handleNavToggle();

  // --- 2. 南瓜燈怪物 (位置在下方 + 可點擊) ---
  const pumpkinLastClicked = localStorage.getItem('halloweenPumpkinClicked');
  const oneDay = 24 * 60 * 60 * 1000;

  if (!pumpkinLastClicked || (Date.now() - parseInt(pumpkinLastClicked, 10) >= oneDay)) {
    const pumpkin = document.createElement('div');
    pumpkin.id = 'halloween-pumpkin';
    pumpkin.style.position = 'fixed';
    pumpkin.style.left = '50%';
    pumpkin.style.bottom = '20px';
    pumpkin.style.top = 'auto';
    pumpkin.style.transform = 'translateX(-50%)';
    pumpkin.style.zIndex = '9999';
    pumpkin.style.pointerEvents = 'auto';
    pumpkin.style.cursor = 'pointer';

    pumpkin.onclick = () => {
      alert('halloween! 小熊祝你萬聖節快樂!');
      const p = document.getElementById('halloween-pumpkin');
      if (p) p.remove();
      if (pumpkinIntervalId) {
        clearInterval(pumpkinIntervalId);
        pumpkinIntervalId = null;
      }
      localStorage.setItem('halloweenPumpkinClicked', Date.now().toString());
    };

    pumpkin.innerHTML = `
    <div style="position:relative;width:320px;height:220px;">
      <img src="${halloweenPumpkinUrl}" style="width:100%;filter:drop-shadow(0 0 48px #ff9800) brightness(1.2);transition:filter 1.2s;" id="pumpkin-img">
      <div id="pumpkin-glow" style="position:absolute;left:80px;top:120px;width:160px;height:80px;background:radial-gradient(circle,#fff200 60%,#ff9800 100%);border-radius:50%;opacity:0.7;filter:blur(16px);transition:background 1.2s; pointer-events: none;"></div>
    </div>
  `;
    document.body.appendChild(pumpkin);

    // 南瓜呼吸燈動畫
    const pumpkin_glowColors = [
      ['#fff200', '#ff9800'],
      ['#ff9800', '#fff200'],
      ['#fff200', '#ff9800'],
      ['#ff9800', '#fff200']
    ];
    let pumpkin_idx = 0;
    pumpkinIntervalId = setInterval(()=>{
      pumpkin_idx = (pumpkin_idx+1) % pumpkin_glowColors.length;
      const glow = document.getElementById('pumpkin-glow');
      if (glow) glow.style.background = `radial-gradient(circle,${pumpkin_glowColors[pumpkin_idx][0]} 60%,${pumpkin_glowColors[pumpkin_idx][1]} 100%)`;
      const img = document.getElementById('pumpkin-img');
      if (img) img.style.filter = `drop-shadow(0 0 48px ${pumpkin_glowColors[pumpkin_idx][1]}) brightness(1.2)`;
    }, 1200);
  }
}

function stopHalloween() {
  const oldBats = document.getElementById('halloween-bats');
  if (oldBats) oldBats.remove();
  const oldPumpkin = document.getElementById('halloween-pumpkin');
  if (oldPumpkin) oldPumpkin.remove();

  if (pumpkinIntervalId) {
    clearInterval(pumpkinIntervalId);
    pumpkinIntervalId = null;
  }

  // 移除我們設定的 inline CSS 變數，讓其他主題/預設樣式接手
  try {
    const root = document.documentElement;
    root.style.removeProperty('--vp-c-brand');
    root.style.removeProperty('--vp-c-brand-light');
    root.style.removeProperty('--vp-c-brand-lighter');
    root.style.removeProperty('--vp-c-brand-dark');
    root.style.removeProperty('--vp-c-brand-darker');
    root.style.removeProperty('--vp-c-bg');
    root.style.removeProperty('--vp-c-bg-soft');
    root.style.removeProperty('--vp-c-text-1');
    root.style.removeProperty('--vp-c-text-2');
  } catch (e) {}

  // 還原在 startHalloween 時以 inline 設定的樣式
  try {
    const navSelectors = ['.VPNav', '.VPNavBar', 'header'];
    navSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const old = el.getAttribute('data-hb-old-style');
        if (old !== null) {
          if (old === '') el.removeAttribute('style'); else el.setAttribute('style', old);
          el.removeAttribute('data-hb-old-style');
        } else {
          // 若沒有儲存舊樣式，清除我們可能留下的特定 inline 屬性
          el.style.background = '';
          el.style.backgroundSize = '';
          el.style.borderBottom = '';
          el.style.color = '';
        }
      });
      document.querySelectorAll(sel + ' *').forEach(ch => {
        const oldColor = ch.getAttribute('data-hb-old-color');
        if (oldColor !== null) {
          ch.style.color = oldColor;
          ch.removeAttribute('data-hb-old-color');
        } else {
          // 若沒有原始 color，清空 inline color，交由 CSS 決定
          ch.style.color = '';
        }
      });
    });

    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      const old = h.getAttribute('data-hb-old-style');
      if (old !== null) {
        if (old === '') h.removeAttribute('style'); else h.setAttribute('style', old);
        h.removeAttribute('data-hb-old-style');
      } else {
        h.style.color = '';
        h.style.textShadow = '';
      }
    });
  } catch (e) {}
}

onMounted(() => {
  if (typeof document === 'undefined') return;

  // 啟動或停止，視當前 body class
  if (document.body.classList.contains('theme-halloween')) startHalloween();

  // 監聽 body class 變化（切換佈景主題時不需 F5）
  mutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'class') {
        const has = document.body.classList.contains('theme-halloween');
        if (has) startHalloween(); else stopHalloween();
      }
    }
  });
  mutationObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // 監聽根元素 class 變化（vp-mobile-nav-open）
  navObserver = new MutationObserver(handleNavToggle);
  navObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (navObserver) {
    navObserver.disconnect();
    navObserver = null;
  }
  stopHalloween();
});
</script>

<style>
/* 背景 */
.halloween-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: #1a1a1a;
  background-image: url('./assets/halloween/halloween-theme-wide-background.webp');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.halloween-bat {
  position: absolute;
  display: block;
  width: 48px;
  aspect-ratio: 1;
  opacity: 0.72;
  transform: translate3d(0, 0, 0);
  animation: halloween-bat-flight var(--bat-flight-duration, 9s) ease-in-out var(--bat-flight-delay, 0s) infinite alternate;
  will-change: transform;
}

.halloween-bat-wing,
.halloween-bat-body {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.halloween-bat-wing {
  z-index: 1;
  transform-box: border-box;
  will-change: transform;
}

.halloween-bat-wing-left {
  clip-path: inset(0 50% 0 0);
  /* The source sprite is a single bat: hinge the left wing at its shoulder. */
  transform-origin: 40% 44%;
  animation: halloween-bat-left-flap var(--bat-flap-duration, 0.54s) ease-in-out var(--bat-flap-delay, 0s) infinite alternate;
}

.halloween-bat-wing-right {
  clip-path: inset(0 0 0 50%);
  transform-origin: 60% 44%;
  animation: halloween-bat-right-flap var(--bat-flap-duration, 0.54s) ease-in-out var(--bat-flap-delay, 0s) infinite alternate;
}

.halloween-bat-body {
  z-index: 2;
  /* Keep the head, shoulders, and wing roots stationary over the moving halves. */
  clip-path: inset(33% 34% 10% 34%);
}

@keyframes halloween-bat-left-flap {
  from { transform: rotate(12deg); }
  to { transform: rotate(-17deg); }
}

@keyframes halloween-bat-right-flap {
  from { transform: rotate(-12deg); }
  to { transform: rotate(17deg); }
}

@keyframes halloween-bat-flight {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
  50% { transform: translate3d(var(--bat-drift-x), var(--bat-drift-y), 0) rotate(3deg); }
}

@media (prefers-reduced-motion: reduce) {
  .halloween-bat,
  .halloween-bat-wing-left,
  .halloween-bat-wing-right {
    animation: none;
  }
}

@media (max-width: 600px) {
  .halloween-background {
    background-image: url('./assets/halloween/halloween-theme-mobile-background.webp');
    background-position: center top;
  }
}
</style>
