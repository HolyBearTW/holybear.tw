<template>
  <div class="container">
    <span class="bear">🐻</span>
    <h1>404　迷路了！</h1>
    <p>
      這裡什麼都沒有，<br>
      小熊正在尋找出口中……<br>
      <strong>不如跟小熊一起回首頁吧！</strong>
    </p>
    <a class="btn-home" href="/">帶我回首頁</a>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.title = '聖小熊的祕密基地'
})
</script>

<style scoped>
/* 避免全局 html, body 樣式干擾，這裡只針對主要內容設計 */
.container {
  min-height: 100vh;
  /* 垂直置中 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2rem 1rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  margin: 0 auto;
}
.bear {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  display: block;
}
h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: #00bfae;
}
p {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.15rem;
  line-height: 1.8;
}
.btn-home {
  display: inline-block;
  padding: 0.75em 2em;
  background: #00bfae;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,191,174,0.09);
  transition: background 0.2s;
}
.btn-home:hover {
  background: #008c7f;
}
</style>
