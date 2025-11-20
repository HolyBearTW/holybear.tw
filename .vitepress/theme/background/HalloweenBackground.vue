<template>
  <div class="halloween-background" id="halloween-bg"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// 萬聖節主題背景元件
// 注意：不要在模組載入時就寫入 root 變數，會導致其他主題被覆蓋

// 儲存 interval ids 以便清理
let batIntervalIds = [];
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
  batContainer.style.width = '100vw';
  batContainer.style.height = '100vh';
  batContainer.style.zIndex = '9998';
  batContainer.style.pointerEvents = 'none';

  for (let i = 0; i < 12; i++) {
    const bat = document.createElement('img');
    bat.src = '/image/halloween/halloween2.png';
    bat.style.position = 'absolute';
    bat.style.left = `${Math.random()*100}vw`;
    bat.style.top = `${Math.random()*100}vh`;
    bat.style.width = '48px';
    bat.style.height = 'auto';
    bat.style.opacity = '0.7';
    bat.style.transition = 'transform 1.2s, left 3s, top 3s';
    batContainer.appendChild(bat);

    const id = setInterval(()=>{
      bat.style.left = `${Math.random()*100}vw`;
      bat.style.top = `${Math.random()*100}vh`;
      bat.style.transform = `translateY(${Math.random()*40-20}px) rotate(${Math.random()*40-20}deg)`;
    }, 2000 + Math.random()*1500);
    batIntervalIds.push(id);
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
      <img src="/image/halloween/halloween1.png" style="width:100%;filter:drop-shadow(0 0 48px #ff9800) brightness(1.2);transition:filter 1.2s;" id="pumpkin-img">
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

  batIntervalIds.forEach(id => clearInterval(id));
  batIntervalIds = [];
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
/* Halloween 全域主題色彩強制覆蓋 */
body.theme-halloween {
  --vp-c-brand: #ff9800 !important;
  --vp-c-brand-light: #ffb74d !important;
  --vp-c-brand-lighter: #ffe0b2 !important;
  --vp-c-brand-dark: #e65100 !important;
  --vp-c-brand-darker: #bf360c !important;
  --vp-c-bg: #1a1a1a !important;
  --vp-c-bg-soft: #222 !important;
  --vp-c-text-1: #ff9800 !important;
  --vp-c-text-2: #fff3e0 !important;
}
/* 背景 */
.halloween-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #1a1a1a url('/image/halloween/halloween2.png') repeat;
}

/* 強制覆蓋 VitePress 導航欄、標題、全站顏色 */
body.theme-halloween .VPNav,
body.theme-halloween .VPNavBar,
body.theme-halloween header {
  /* Apply the semi-transparent background directly to the nav bar */
  background: rgba(34,34,34,0.7) url('/image/halloween/halloween1.png') repeat-x !important;
  background-size: 90px auto !important;
  border-bottom: 2px solid #ff9800 !important;
  color: #ff9800 !important;
}
body.theme-halloween .VPNav *,
body.theme-halloween .VPNavBar *,
body.theme-halloween header * {
  color: #ff9800 !important;
}
body.theme-halloween .VPNav::before,
body.theme-halloween .VPNavBar::before,
body.theme-halloween header::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  /* This pseudo-element is now ONLY for the blur effect */
  backdrop-filter: blur(2px) !important;
  -webkit-backdrop-filter: blur(2px) !important;
  pointer-events: none;
}
body.theme-halloween .VPNav > *,
body.theme-halloween .VPNavBar > *,
body.theme-halloween header > * {
  position: relative;
  z-index: 1;
}

/* --- Scrolled State --- */

/* 1. Hide the non-scrolled pseudo-elements to prevent conflicts. */
body.theme-halloween .VPNav.is-scrolled::before,
body.theme-halloween .VPNav.is-scrolled .VPNavBar::before,
body.theme-halloween .VPNav.is-scrolled header::before {
  content: none !important;
}

/* 2. Apply blur to VitePress's dedicated scrolled-nav background element. */
body.theme-halloween .VPNav.is-scrolled .VPNavBar-bg {
  /* Use a semi-transparent background to allow the blur to be visible. */
  background-color: rgba(34, 34, 34, 0.7) !important;
  backdrop-filter: blur(2px) !important;
  -webkit-backdrop-filter: blur(2px) !important;
}
body.theme-halloween {
  --vp-c-brand: #ff9800 !important;
  --vp-c-brand-light: #ffb74d !important;
  --vp-c-brand-lighter: #ffe0b2 !important;
  --vp-c-brand-dark: #e65100 !important;
  --vp-c-brand-darker: #bf360c !important;
  --vp-c-bg: #1a1a1a !important;
  --vp-c-bg-soft: #222 !important;
  --vp-c-text-1: #ff9800 !important;
  --vp-c-text-2: #fff3e0 !important;
}
body.theme-halloween h1,
body.theme-halloween h2,
body.theme-halloween h3,
body.theme-halloween h4,
body.theme-halloween h5,
body.theme-halloween h6 {
  color: #ff5722 !important;
  text-shadow: 2px 2px 4px #000 !important;
}

/* 手機選單：固定覆蓋並啟用模糊（與預設主題一致） */
@media (max-width: 959px) {
  body.theme-halloween .VPNavBar {
    z-index: 100000 !important;
  }
  body.theme-halloween .VPNavScreen {
    position: fixed !important;
    inset: 0 !important;
    z-index: 99999 !important;
    background-color: rgba(34,34,34,0.6) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    overflow: auto !important;
  }
  body.theme-halloween .VPNavScreen .VPNavScreenMenu {
    margin: 8vh auto !important;
    max-height: 84vh !important;
    overflow: auto !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1.2rem !important;
  }
}

/* 使用預設的 VPNavScreenMenu 樣式以維持一致性 */
body.theme-halloween .VPNavScreen {
  background-color: transparent !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}

/* 非首頁時：與站內預設一致 */
body.theme-halloween body:not(:has(.VPHome)) .VPNavScreen,
body.theme-halloween :not(:has(.VPHome)) .VPNavScreen {
  background-color: var(--vp-nav-bg-color) !important;
}

body.theme-halloween .VPNavScreen .VPNavScreenMenu .VPNavScreenMenuLink {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: rgba(255,255,255,0.12);
  border-radius: 14px;
  transition: background 0.2s, box-shadow 0.2s;
  font-weight: 600;
  font-size: 1.08em;
  margin: 0.5em 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
body.theme-halloween .VPNavScreen .VPNavScreenMenu .VPNavScreenMenuLink:hover {
  background: rgba(0,255,238,0.18);
  color: #00b8b8;
  box-shadow: 0 4px 16px rgba(0,255,238,0.18);
}

/* 當外層 .VPNavScreen 缺失時，仍保持與預設一致的容器寬度與置中 */
body.theme-halloween .VPNavScreenMenu.menu {
  display: block !important;
  max-width: var(--main-width, 1200px) !important;
  margin: 6vh auto !important;
  padding: 0 1rem !important;
  box-sizing: border-box !important;
}

/* 若 menu 直接為 nav（未被包在 .VPNavScreen），強制 container 行為 */
body.theme-halloween nav.VPNavScreenMenu.menu > .VPNavScreenMenuGroup,
body.theme-halloween nav.VPNavScreenMenu.menu > a {
  display: block !important;
}

/* 按鈕：使用站內按鈕變數以與預設主題一致 */
body.theme-halloween .VPButton,
body.theme-halloween .VPButton.brand,
body.theme-halloween .VPButton.medium,
body.theme-halloween .VPButton.alt {
  border: 1.5px solid var(--vp-button-brand-border, var(--vp-c-brand-light)) !important;
  background: var(--vp-button-brand-bg, var(--vp-c-brand)) !important;
  color: var(--vp-button-brand-text, black) !important;
  box-shadow: 0 2px 12px 0 var(--vp-c-brand-dimm, rgba(0,0,0,0.08)) !important;
}
body.theme-halloween .VPButton.alt {
  background: var(--vp-button-brand-active-bg, var(--vp-button-brand-bg)) !important;
  color: var(--vp-button-brand-active-text, black) !important;
}
body.theme-halloween .VPHome .VPButton.brand {
  transition: all 0.3s ease !important;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.25) !important;
}

/* Change logo and hero image for Halloween theme */
body.theme-halloween .VPImage.logo {
  content: url('/image/halloween/halloween.png');
}

body.theme-halloween .VPHero .image-container .VPImage {
  content: url('/image/halloween/halloween.png');
}
</style>
