<template>
  <div style="display:none"></div>
</template>

<style>
/* === 全站自動進場動畫（由下到上） === */
.main,
.items,
.box,
.post-item,
 .VPDoc .vp-doc > * {
  animation: fadeInUp 0.6s ease !important;
}
/* ====== 動畫 keyframes 及動畫 class ====== */

/* 首頁主題切換動畫 */
@keyframes hyperOSColors1to2 {
  0%, 100% {
    background-position: 80% 20%, 80% 90%, 20% 90%, 20% 20%, 0% 50%;
  }
  10% {
    background-position: 60% 10%, 85% 80%, 10% 80%, 30% 30%, 10% 60%;
  }
  20% {
    background-position: 40% 40%, 70% 60%, 30% 70%, 40% 40%, 20% 70%;
  }
  30% {
    background-position: 20% 60%, 60% 40%, 50% 60%, 50% 50%, 30% 80%;
  }
  40% {
    background-position: 10% 80%, 50% 20%, 70% 50%, 60% 60%, 40% 90%;
  }
  50% {
    background-position: 30% 60%, 40% 80%, 90% 40%, 70% 70%, 50% 100%;
  }
  60% {
    background-position: 50% 40%, 30% 60%, 80% 20%, 80% 80%, 60% 80%;
  }
  70% {
    background-position: 70% 20%, 20% 40%, 60% 80%, 90% 90%, 70% 60%;
  }
  80% {
    background-position: 90% 40%, 10% 20%, 40% 60%, 100% 100%, 80% 40%;
  }
  90% {
    background-position: 100% 60%, 80% 10%, 20% 40%, 80% 80%, 90% 20%;
  }
  100% {
    background-position: 80% 20%, 80% 90%, 20% 90%, 20% 20%, 0% 50%;
  }
}

@keyframes hyperOSColors2to3 {
  0%,20%   { opacity: 0; }
  25%,45%  { opacity: 0.6; background-position: 80% 20%, 80% 90%, 20% 90%, 20% 20%; }
  50%,70%  { opacity: 0; }
  75%,95%  { opacity: 0.6; background-position: 75% 25%, 85% 85%, 25% 85%, 25% 25%; }
  100%     { opacity: 0; }
}

@keyframes gradientRotate {
  0% {
    background-position: 0% 50%;
  }
  25% {
    background-position: 100% 50%;
  }
  50% {
    background-position: 100% 100%;
  }
  75% {
    background-position: 50% 100%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hero 文字與圖片動畫（原 style.css） */
.VPHero .name {
  background: var(--vp-home-hero-name-background);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: gradientRotate 5s ease infinite;
}
html.dark .VPHero .name {
  animation: gradientRotate 5s ease infinite, dynamicGlow 5s ease infinite;
}
.VPHero .image-bg {
  background-image: var(--vp-home-hero-image-background-image);
  background-size: 400% 400%;
  animation: gradientRotate 5s ease infinite;
}

/* 多彩發光動畫（恢復原 style.css 寫法） */
@keyframes dynamicGlow {
  0%   { filter: drop-shadow(-1.6px -1.6px 8px #03141a); }
  10%  { filter: drop-shadow(-1.6px -1.6px 8px #4D55E0); }
  20%  { filter: drop-shadow(-1.2px -1.2px 8px #9901DF); }
  30%  { filter: drop-shadow(-0.8px -0.8px 8px #7A01E0); }
  40%  { filter: drop-shadow(-0.4px -0.4px 8px #5A00E0); }
  50%  { filter: drop-shadow(0px 0px 8px #5A00E0); }
  60%  { filter: drop-shadow(-0.4px -0.4px 8px #5100E6); }
  70%  { filter: drop-shadow(-0.8px -0.8px 8px #4800EB); }
  80%  { filter: drop-shadow(-1.2px -1.2px 8px #3500F5); }
  90%  { filter: drop-shadow(-1.6px -1.6px 8px #1B04F5); }
  100% { filter: drop-shadow(-1.6px -1.6px 8px #0008F5); }
}

/* fadeInUp 動畫 class（可全站共用） */
.fade-in-up {
  animation: fadeInUp 0.6s ease !important;
}

/*
  ====== 文章內頁也套用首頁 HyperOS 背景動畫 ======
  這裡將首頁的 ::before/::after 背景動畫，複製一份給非首頁（文章內頁）
*/
body:not(:has(.VPHome))::before {
  /* 深色模式：HyperOS 多層漸變動畫背景 */
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
  background: 
    radial-gradient(circle at 63% 50%, #005094 0%, transparent 50%),
    radial-gradient(circle at 88% 69%, #874A26 0%, transparent 50%),
    radial-gradient(circle at 75% 80%, #761045 0%, transparent 50%),
    radial-gradient(circle at 17% 66%, #291E73 0%, transparent 50%),
    linear-gradient(135deg, #0a0a14 0%, #14141e 50%, #1e1e28 100%);
  background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 100% 100%;
  background-position: 80% 20%, 80% 90%, 20% 90%, 20% 20%, 0% 50%;
  animation: hyperOSColors1to2 8s ease-in-out infinite;
}
html:not(.dark) body:not(:has(.VPHome))::before {
  /* 淺色模式：HyperOS 多層漸變動畫背景 + 統一動畫 */
  background: 
    radial-gradient(circle at 71% 95%, #91C2FA 0%, transparent 50%),
    radial-gradient(circle at 14% 27%, #F9D9AD 0%, transparent 50%),
    radial-gradient(circle at 80% 27%, #FBC0ED 0%, transparent 50%),
    radial-gradient(circle at 22% 80%, #BAB2FA 0%, transparent 50%),
    linear-gradient(135deg, #f8f7ff 0%, #fef9fb 50%, #f5f8ff 100%);
  background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 100% 100%;
  background-position: 80% 20%, 80% 90%, 20% 90%, 20% 20%, 0% 50%;
  animation: gradientRotate 8s linear infinite;
  filter: blur(50px);
}
html:not(.dark) body:not(:has(.VPHome))::after {
  /* 淺色模式：HyperOS 輔助層動畫背景 */
  background: 
    radial-gradient(circle at 60% 40%, rgba(145, 194, 250, 0.6) 0%, transparent 45%),
    radial-gradient(circle at 40% 70%, rgba(250, 191, 237, 0.6) 0%, transparent 45%);
}


/* === 首頁與 Hero 動畫（原 style.css） === */
body:has(.VPHome)::before {
  background:
    radial-gradient(circle at 63% 50%, #005094 0%, transparent 50%),
    radial-gradient(circle at 88% 69%, #874A26 0%, transparent 50%),
    radial-gradient(circle at 75% 80%, #761045 0%, transparent 50%),
    radial-gradient(circle at 17% 66%, #291E73 0%, transparent 50%),
    linear-gradient(135deg, #0a0a14 0%, #14141e 50%, #1e1e28 100%);
  background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 100% 100%;
  animation: hyperOSColors1to2 5s ease-in-out infinite;
  filter: blur(60px);
}
body:has(.VPHome)::after {
  background:
    radial-gradient(circle at 81% 14%, rgba(0, 79, 148, 0.7) 0%, transparent 45%),
    radial-gradient(circle at 24% 72%, rgba(117, 15, 69, 0.7) 0%, transparent 45%);
  background-size: 200% 200%, 200% 200%;
  animation: hyperOSColors2to3 6s ease-in-out infinite;
  opacity: 0;
  mix-blend-mode: screen;
}
html:not(.dark) body:has(.VPHome)::before {
  background:
    radial-gradient(circle at 71% 95%, #91C2FA 0%, transparent 50%),
    radial-gradient(circle at 14% 27%, #F9D9AD 0%, transparent 50%),
    radial-gradient(circle at 80% 27%, #FBC0ED 0%, transparent 50%),
    radial-gradient(circle at 22% 80%, #BAB2FA 0%, transparent 50%),
    linear-gradient(135deg, #f8f7ff 0%, #fef9fb 50%, #f5f8ff 100%);
  background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 100% 100%;
  animation: gradientRotate 5s ease-in-out infinite;
  filter: blur(50px);
}
html:not(.dark) body:has(.VPHome)::after {
  background:
    radial-gradient(circle at 60% 40%, rgba(145, 194, 250, 0.6) 0%, transparent 45%),
    radial-gradient(circle at 40% 70%, rgba(250, 191, 237, 0.6) 0%, transparent 45%);
  opacity: 0.5;
}
</style>