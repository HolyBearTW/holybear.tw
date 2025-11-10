<template>
  <div class="animated-background">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
    <div class="blob blob-4"></div>
    <div class="blob blob-5"></div>
  </div>
</template>

<style scoped>
.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
    background: linear-gradient(135deg, #f8f7ff 0%, #fef9fb 50%, #f5f8ff 100%);
  }
  html:not(.dark) .animated-background {
    background:
      radial-gradient(circle at 71% 95%, #91C2FA 0%, transparent 50%),
      radial-gradient(circle at 14% 27%, #F9D9AD 0%, transparent 50%),
      radial-gradient(circle at 80% 27%, #FBC0ED 0%, transparent 50%),
      radial-gradient(circle at 22% 80%, #BAB2FA 0%, transparent 50%),
      linear-gradient(135deg, #f8f7ff 0%, #fef9fb 50%, #f5f8ff 100%);
    background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 100% 100%;
    background-position: 80% 20%, 80% 90%, 20% 90%, 20% 20%, 0% 50%;
  }
  html.dark .animated-background {
    background: linear-gradient(135deg, #0a0a14 0%, #14141e 50%, #1e1e28 100%);
  }

html.dark .animated-background {
  background: linear-gradient(135deg, #0a0a14 0%, #14141e 50%, #1e1e28 100%);
}

  /* blob 樣式（基礎） */
  .blob {
    position: absolute;
    border-radius: 50%;
    opacity: 0.4;
    filter: blur(40px);
    pointer-events: auto;
    mix-blend-mode: lighten;
    z-index: 0;
  }
  /* blob 樣式（基礎） */
  .blob {
    position: absolute;
    border-radius: 50%;
    opacity: 0.4;
    filter: blur(40px);
    pointer-events: auto;
    mix-blend-mode: lighten;
  }
/* 淺色模式 blob 強化 */
html:not(.dark) .blob {
  opacity: 0.6;
  filter: blur(32px);
  mix-blend-mode: normal;
}
/* 各 blob 位置與顏色 */
.blob-1 {
  width: 400px;
  height: 400px;
  left: 10vw;
  top: 20vh;
  background: radial-gradient(circle, #91C2FA 0%, transparent 70%);
  animation: blobMove1 24s ease-in-out infinite;
}
.blob-2 {
  width: 300px;
  height: 300px;
  left: 60vw;
  top: 10vh;
  background: radial-gradient(circle, #F9D9AD 0%, transparent 70%);
  animation: blobMove2 28s ease-in-out infinite;
}
.blob-3 {
  width: 350px;
  height: 350px;
  left: 30vw;
  top: 60vh;
  background: radial-gradient(circle, #FBC0ED 0%, transparent 70%);
  animation: blobMove3 32s ease-in-out infinite;
}
.blob-4 {
  width: 250px;
  height: 250px;
  left: 80vw;
  top: 70vh;
  background: radial-gradient(circle, #BAB2FA 0%, transparent 70%);
  animation: blobMove4 36s ease-in-out infinite;
}
.blob-5 {
  width: 200px;
  height: 200px;
  left: 50vw;
  top: 40vh;
  background: radial-gradient(circle, #4facfe 0%, transparent 70%);
  animation: blobMove5 40s ease-in-out infinite;
}
/* 淺色模式 blob 顏色加深 */
html:not(.dark) .blob-1 {
  background: radial-gradient(circle, #5a9cfb 0%, #91C2FA 60%, transparent 80%);
}
html:not(.dark) .blob-2 {
  background: radial-gradient(circle, #e8b26a 0%, #F9D9AD 60%, transparent 80%);
}
html:not(.dark) .blob-3 {
  background: radial-gradient(circle, #e97ac6 0%, #FBC0ED 60%, transparent 80%);
}
html:not(.dark) .blob-4 {
  background: radial-gradient(circle, #8c7cfb 0%, #BAB2FA 60%, transparent 80%);
}
html:not(.dark) .blob-5 {
  background: radial-gradient(circle, #3576e6 0%, #4facfe 60%, transparent 80%);
}
@keyframes blobMove3 {
  0%,100% { left: 30vw; top: 60vh; }
  50% { left: 35vw; top: 65vh; }
}
@keyframes blobMove1 {
  0%,100% { left: 10vw; top: 20vh; }
  50% { left: 30vw; top: 40vh; }
}
@keyframes blobMove2 {
  0%,100% { left: 60vw; top: 10vh; }
  50% { left: 75vw; top: 35vh; }
}
@keyframes blobMove3 {
  0%,100% { left: 30vw; top: 60vh; }
  50% { left: 50vw; top: 80vh; }
}
@keyframes blobMove4 {
  0%,100% { left: 80vw; top: 70vh; }
  50% { left: 60vw; top: 90vh; }
}
@keyframes blobMove5 {
  0%,100% { left: 50vw; top: 40vh; }
  50% { left: 70vw; top: 60vh; }
}
</style>