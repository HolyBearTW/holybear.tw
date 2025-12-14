<template>
  <div class="christmas-background" id="christmas-bg">
    <div class="moon"></div>
    <!-- Static Christmas Scene -->
    <div class="scene">
      <div class="snowy-ground"></div>
      <div class="house">
        <div class="roof"></div>
        <div class="wall">
          <div class="window"></div>
          <div class="door"></div>
        </div>
      </div>
      <div class="tree tree-1">
        <div class="tree-layer"></div>
        <div class="tree-layer"></div>
        <div class="tree-layer"></div>
      </div>
      <div class="tree tree-2">
        <div class="tree-layer"></div>
        <div class="tree-layer"></div>
        <div class="tree-layer"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// 聖誕節主題背景元件

let snowflakeIntervalIds = [];
let mutationObserver = null;
let htmlObserver = null;

function startChristmas() {
  document.documentElement.classList.add('dark');
  if (document.getElementById('christmas-snowflakes') || document.getElementById('christmas-present')) return;

  try {
    const root = document.documentElement;
    // ... 顏色變數 ...
    root.style.setProperty('--vp-c-brand', '#d93025');
    root.style.setProperty('--vp-c-brand-light', '#e57373');
    root.style.setProperty('--vp-c-brand-dark', '#c62828');
    root.style.setProperty('--vp-c-bg', '#0a192f');
    root.style.setProperty('--vp-c-bg-soft', '#172a45');
    root.style.setProperty('--vp-c-text-1', '#e6f1ff');
    root.style.setProperty('--vp-c-text-2', '#a8b2d1');
  } catch (e) {}

  // --- Snowflakes Container ---
  const snowflakeContainer = document.createElement('div');
  snowflakeContainer.id = 'christmas-snowflakes';
  snowflakeContainer.style.cssText = 'position:fixed; left:0; top:0; width:100vw; height:100vh; z-index:9998; pointer-events:none; overflow: hidden;';

  // --- 核心動畫邏輯 ---
  const animateSnow = (snowflake, index) => {
    // 50% 是前景大光斑(會消失)，50% 是背景細雪
    const isVanishing = Math.random() > 0.5;

    let size, startOpacity, duration;

    // 重置樣式
    snowflake.style.filter = ''; 
    snowflake.style.boxShadow = '';
    snowflake.style.background = '';
    snowflake.style.borderRadius = '50%'; 

    if (isVanishing) {
      // --- 【修改重點：清晰度平衡】 ---
      // 1. 尺寸：維持大尺寸
      size = 30 + Math.random() * 40; // 30px ~ 70px

      // 2. 顏色：關鍵在於「淡」。
      // 改回 radial-gradient 但讓它更透，中心也不要全白
      // 中心透明度 0.6 -> 邊緣 0。這樣既有實體感，又不會像實心湯圓。
      snowflake.style.background = 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)';
      
      // 3. 模糊度：大幅降低！
      // 從原本的 10-20px 降到 3-6px。
      // 這樣看起來就是「失焦的鏡頭光點」，而不是「霧」。
      const blurAmount = 3 + (size / 70) * 3; 
      snowflake.style.filter = `blur(${blurAmount}px)`;
      
      // 4. 起始透明度：因為本體已經很淡了，這裡設高一點確保看得到
      startOpacity = 0.8 + Math.random() * 0.2; 
      
      duration = 10 + Math.random() * 8; 
    } else {
      // --- 【背景細雪】 ---
      size = 3 + Math.random() * 5;
      snowflake.style.background = 'rgba(255, 255, 255, 0.9)'; // 比較實心
      snowflake.style.filter = 'blur(1px)'; // 輕微柔化
      snowflake.style.boxShadow = '0 0 3px rgba(255,255,255,0.5)'; // 微微發光
      startOpacity = 0.6 + Math.random() * 0.4;
      
      duration = 6 + Math.random() * 6;
    }

    // 設定共同樣式
    snowflake.style.width = `${size}px`;
    snowflake.style.height = `${size}px`;
    snowflake.style.opacity = startOpacity;

    // 設定路徑
    const startLeft = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 50;
    const endLeft = startLeft + drift;

    // 設定終點
    // 消失雪只下到畫面 40%~85%
    const endTop = isVanishing ? (40 + Math.random() * 45) : 110;

    // 1. 初始化位置
    snowflake.style.transition = 'none';
    snowflake.style.top = `${-size - 30}px`; 
    snowflake.style.left = `${startLeft}vw`;
    snowflake.style.opacity = startOpacity;

    // 2. 開始動畫
    setTimeout(() => {
      // opacity transition: 配合 duration，如果是消失雪，會變為 0
      snowflake.style.transition = `top ${duration}s linear, left ${duration}s ease-in-out, opacity ${duration}s ease-in`;
      
      snowflake.style.top = `${endTop}vh`;
      snowflake.style.left = `${endLeft}vw`;
      
      if (isVanishing) {
        snowflake.style.opacity = 0; 
      }
    }, 80); 

    // 3. 循環
    const timeoutId = setTimeout(() => {
      animateSnow(snowflake, index);
    }, duration * 1000 + 100);
    
    if (snowflakeIntervalIds) {
      snowflakeIntervalIds[index] = timeoutId;
    }
  };

  snowflakeIntervalIds = new Array(130);

  for (let i = 0; i < 130; i++) {
    const snowflake = document.createElement('div');
    snowflake.style.cssText = `position:absolute; pointer-events:none; will-change: transform, opacity;`;
    snowflakeContainer.appendChild(snowflake);
    
    const initialDelay = Math.random() * 8000; 
    const initialTimeout = setTimeout(() => animateSnow(snowflake, i), initialDelay);
    snowflakeIntervalIds[i] = initialTimeout;
  }
  document.body.appendChild(snowflakeContainer);

  // --- Sleigh (保持不變) ---
  if (!document.getElementById('sleigh-animation-style')) {
    const style = document.createElement('style');
    style.id = 'sleigh-animation-style';
    style.innerHTML = `
      @keyframes fly-by {
        0% { transform: translateX(-150%); }
        100% { transform: translateX(110vw); }
      }
    `;
    document.head.appendChild(style);
  }
  const sleigh = document.createElement('div');
  sleigh.id = 'christmas-sleigh';
  sleigh.style.cssText = `
    position: fixed; top: 18%; left: 0; width: 200px; height: 100px;
    background-image: url('/image/christmas/christmas1.png');
    background-size: contain; background-repeat: no-repeat;
    animation: fly-by 60s linear infinite; animation-delay: 15s;
    transform: translateX(-150%); z-index: 9997; pointer-events: none;
  `;
  document.body.appendChild(sleigh);

  // --- Present (保持不變) ---
  const oneDay = 24 * 60 * 60 * 1000;
  const lastClicked = localStorage.getItem('christmasPresentClicked');
  if (!lastClicked || (Date.now() - lastClicked > oneDay)) {
    const present = document.createElement('div');
    present.id = 'christmas-present';
    present.style.cssText = 'position:fixed; left:50%; bottom:20px; transform:translateX(-50%); z-index:9999; pointer-events:auto; cursor:pointer; font-size:80px; filter:drop-shadow(0 0 20px #ffdd00); transition:transform 0.3s ease;';
    present.onclick = () => {
      alert('Merry Christmas! 小熊祝你聖誕快樂!');
      present.style.display = 'none';
      localStorage.setItem('christmasPresentClicked', Date.now());
    };
    present.innerHTML = '🎁';
    document.body.appendChild(present);
  }
}

function stopChristmas() {
  const oldSnowflakes = document.getElementById('christmas-snowflakes');
  if (oldSnowflakes) oldSnowflakes.remove();
  const oldPresent = document.getElementById('christmas-present');
  if (oldPresent) oldPresent.remove();
  const oldSleigh = document.getElementById('christmas-sleigh');
  if (oldSleigh) oldSleigh.remove();
  const oldSleighStyle = document.getElementById('sleigh-animation-style');
  if (oldSleighStyle) oldSleighStyle.remove();

  snowflakeIntervalIds.forEach(id => clearTimeout(id));
  snowflakeIntervalIds = [];

  try {
    const root = document.documentElement;
    const props = ['--vp-c-brand', '--vp-c-brand-light', '--vp-c-brand-dark', '--vp-c-bg', '--vp-c-bg-soft', '--vp-c-text-1', '--vp-c-text-2'];
    props.forEach(prop => root.style.removeProperty(prop));
  } catch (e) {}
}

onMounted(() => {
  if (typeof document === 'undefined') return;
  if (document.body.classList.contains('theme-christmas')) {
    startChristmas();
  }

  mutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'class') {
        if (m.target.classList.contains('theme-christmas')) {
          startChristmas();
        } else {
          stopChristmas();
        }
      }
    }
  });
  mutationObserver.observe(document.body, { attributes: true });

  htmlObserver = new MutationObserver(() => {
    if (document.body.classList.contains('theme-christmas') && !document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  });
  htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => {
  if (mutationObserver) mutationObserver.disconnect();
  if (htmlObserver) htmlObserver.disconnect();
  stopChristmas();
});
</script>

<style>
/* --- Global Overrides --- */
body.theme-christmas {
  --vp-c-brand: #d93025 !important;
  --vp-c-brand-light: #e57373 !important;
  --vp-c-bg: #0a192f !important;
  --vp-c-text-1: #e6f1ff !important;
}

/* Header Text Style (Sharper Glow) */
body.theme-christmas h1,
body.theme-christmas h2,
body.theme-christmas h3,
body.theme-christmas h4,
body.theme-christmas h5,
body.theme-christmas h6 {
  color: #f0c44c !important;
  text-shadow: 0 0 2px #ffffff, 0 0 8px #f0c44c, 0 0 14px #d93025 !important;
}

/* Nav Bar background */
body.theme-christmas .VPNav,
body.theme-christmas .VPNavBar,
body.theme-christmas header,
body.theme-christmas .VPPage .VPNav,
body.theme-christmas .VPPage .VPNavBar {
  background: linear-gradient(rgba(18, 18, 18, 0.75), rgba(18, 18, 18, 0.75)), url('/image/christmas/christmas2.png') repeat-x 0% 0% !important;
  background-size: auto 60px !important;
  border-bottom: 2px solid rgb(240, 196, 76) !important;
}

/* Hide the yellow bottom border on blog pages */
body.theme-christmas.is-blog-page .VPNav,
body.theme-christmas.is-blog-page .VPNavBar,
body.theme-christmas.is-blog-page header {
  border-bottom: none !important;
}

/* --- Background Scene --- */
.christmas-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to bottom, #0c1445, #1b2735 70%, #090a0f);
  overflow: hidden;
}

.moon {
  position: absolute;
  top: 10%;
  left: 85%;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  box-shadow: -15px 9px 0 0 #f0e68c;
  filter: drop-shadow(0 0 15px #f0e68c);
}

.scene {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 300px;
  z-index: 1;
}

.snowy-ground {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 80px;
  background: #f0f4f7;
}

.house {
  position: absolute;
  bottom: 75px;
  left: 20%;
  width: 150px;
  height: 120px;
}

.roof {
  width: 0;
  height: 0;
  border-left: 90px solid transparent;
  border-right: 90px solid transparent;
  border-bottom: 60px solid #a0522d;
  position: absolute;
  top: -60px;
  left: -15px;
}
.roof::after { /* Snow on roof */
  content: '';
  position: absolute;
  top: 50px;
  left: -85px;
  width: 170px;
  height: 15px;
  background: #f0f4f7;
  border-radius: 5px;
}

.wall {
  width: 100%;
  height: 100%;
  background: #d2b48c;
}

.window {
  position: absolute;
  top: 30px;
  left: 20px;
  width: 30px;
  height: 30px;
  background: #f0e68c;
  box-shadow: inset 0 0 10px #ffc700;
}

.door {
  position: absolute;
  bottom: 0;
  right: 20px;
  width: 40px;
  height: 70px;
  background: #8b4513;
}

.tree {
  position: absolute;
  bottom: 75px;
}
.tree-1 { right: 15%; }
.tree-2 { right: 25%; transform: scale(0.8); bottom: 70px; }

.tree .tree-layer {
  position: relative;
  margin: 0 auto;
  width: 0;
  height: 0;
  border-left: 30px solid transparent;
  border-right: 30px solid transparent;
  border-bottom: 50px solid #006400;
  margin-bottom: -10px;
}
.tree .tree-layer:nth-child(2) { transform: scale(1.2); }
.tree .tree-layer:nth-child(3) { transform: scale(1.4); }

/* Change logo and hero image for Christmas theme */
body.theme-christmas .VPImage.logo {
  content: url('/image/christmas/christmas.png');
}

body.theme-christmas .VPHero .image-container .VPImage {
  content: url('/image/christmas/christmas.png');
}
</style>
