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
let presentIntervalId = null;
let mutationObserver = null;

function startChristmas() {
  if (document.getElementById('christmas-snowflakes') || document.getElementById('christmas-present')) return;

  try {
    const root = document.documentElement;
    root.style.setProperty('--vp-c-brand', '#d93025');
    root.style.setProperty('--vp-c-brand-light', '#e57373');
    root.style.setProperty('--vp-c-brand-dark', '#c62828');
    root.style.setProperty('--vp-c-bg', '#0a192f');
    root.style.setProperty('--vp-c-bg-soft', '#172a45');
    root.style.setProperty('--vp-c-text-1', '#e6f1ff');
    root.style.setProperty('--vp-c-text-2', '#a8b2d1');
  } catch (e) {}

  // --- Snowflakes ---
  const snowflakeContainer = document.createElement('div');
  snowflakeContainer.id = 'christmas-snowflakes';
  snowflakeContainer.style.cssText = 'position:fixed; left:0; top:0; width:100vw; height:100vh; z-index:9998; pointer-events:none;';

  const animateSnow = (snowflake, fallDuration, index) => {
    snowflake.style.transition = 'none';
    snowflake.style.top = '-10vh';
    snowflake.style.left = `${Math.random() * 100}vw`;
    setTimeout(() => {
      snowflake.style.transition = `top ${fallDuration}s linear, left ${fallDuration}s linear`;
      snowflake.style.top = '110vh';
    }, 50);
    const timeoutId = setTimeout(() => animateSnow(snowflake, fallDuration, index), fallDuration * 1000 + 50);
    snowflakeIntervalIds[index] = timeoutId;
  };

  snowflakeIntervalIds = new Array(50);
  for (let i = 0; i < 50; i++) {
    const snowflake = document.createElement('div');
    const size = 4 + Math.random() * 5;
    const fallDuration = 20 + Math.random() * 10;
    snowflake.style.cssText = `position:absolute; left:${Math.random()*100}vw; top: -10vh; width:${size}px; height:${size}px; background:white; border-radius:50%; opacity:${0.3 + Math.random()*0.7}; transition: top ${fallDuration}s linear, left ${fallDuration}s linear;`;
    snowflakeContainer.appendChild(snowflake);
    const initialTimeoutId = setTimeout(() => animateSnow(snowflake, fallDuration, i), Math.random() * fallDuration * 1000);
    snowflakeIntervalIds[i] = initialTimeoutId;
  }
  document.body.appendChild(snowflakeContainer);

  // --- Flying Sleigh ---
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
    position: fixed;
    top: 18%;
    left: 0;
    width: 200px;
    height: 100px;
    background-image: url('/image/christmas/christmas1.png');
    background-size: contain;
    background-repeat: no-repeat;
    animation: fly-by 60s linear infinite;
    animation-delay: 15s;
    transform: translateX(-150%);
    z-index: 9997;
    pointer-events: none;
  `;
  document.body.appendChild(sleigh);


  // --- Present ---
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
  if (document.body.classList.contains('theme-christmas')) startChristmas();
  mutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'class') {
        if (m.target.classList.contains('theme-christmas')) startChristmas(); else stopChristmas();
      }
    }
  });
  mutationObserver.observe(document.body, { attributes: true });
});

onUnmounted(() => {
  if (mutationObserver) mutationObserver.disconnect();
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
body.theme-christmas header {
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
  left: 75%;
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
</style>
