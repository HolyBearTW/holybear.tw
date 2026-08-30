<script setup>
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import { useData, withBase } from 'vitepress'
import { Swiper, SwiperSlide } from 'swiper/vue'
// 🌟 引入 EffectFade 模組
import { Autoplay, Navigation, Pagination, EffectFade } from 'swiper/modules'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-vue-next'
import { taxonomyLabel } from '../theme/fuwari/utils/taxonomy'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
// 🌟 引入 Fade 的專屬 CSS
import 'swiper/css/effect-fade'

const props = defineProps({
  posts: { type: Array, default: () => [] }
})

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))
const mounted = ref(false)
const observer = ref(null)
let animationUnlockTimer = null

onMounted(() => {
  mounted.value = true
})

// 組件銷毀時清理監視器，避免記憶體洩漏
onBeforeUnmount(() => {
  if (observer.value) observer.value.disconnect()
  if (animationUnlockTimer) clearTimeout(animationUnlockTimer)
})

const carouselPosts = computed(() => props.posts.slice(0, 10))

const getImageUrl = (image) => {
  if (!image) return '/blog_no_image.svg'
  return image.startsWith('http') ? image : withBase(image)
}

const getCategory = (post) => {
  const category = post.category || post.frontmatter?.category
  const value = Array.isArray(category) ? category[0] : category
  return value ? taxonomyLabel(value, en.value) : ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString(lang.value === 'en' ? 'en-US' : 'zh-TW', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

const handleSwiperInit = (swiper) => {
  const releaseAnimatingLock = (duration = 300) => {
    if (animationUnlockTimer) clearTimeout(animationUnlockTimer)

    animationUnlockTimer = setTimeout(() => {
      swiper.animating = false
    }, Math.max(Number(duration) || 0, 0) + 80)
  }

  // 🌟 建立視窗偵測器：只有輪播圖在畫面上時，才允許自動播放
  observer.value = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        swiper.autoplay.start() // 出現在畫面上 -> 繼續播
      } else {
        swiper.autoplay.stop()  // 離開畫面 -> 強制暫停，放過 GPU
      }
    })
  }, { threshold: 0.1 }) // 只要有 10% 離開視線就觸發

  if (swiper.el) {
    observer.value.observe(swiper.el)
  }

  swiper.on('setTransition', (duration) => {
    releaseAnimatingLock(duration)
  })

  swiper.on('slideChangeTransitionEnd', () => {
    swiper.animating = false
  })
}

// 註冊模組
const modules = [Autoplay, Navigation, Pagination, EffectFade]
</script>

<template>
  <section v-if="mounted && carouselPosts.length > 0" class="hero-section">
    <div class="carousel-container">
      <swiper
        :modules="modules"
        :slides-per-view="1"
        :loop="true"
        effect="fade"
        :fade-effect="{ crossFade: true }"
        :autoplay="{ delay: 5000, disableOnInteraction: false }"
        :pagination="{ clickable: true, el: '.custom-pagination' }"
        :navigation="{ prevEl: '.prev-btn', nextEl: '.next-btn' }"
        @swiper="handleSwiperInit"
        class="main-swiper"
      >
        <swiper-slide v-for="(post, index) in carouselPosts" :key="post.url + index">
          <a :href="withBase(post.url)" class="slide-content">
            <img :src="getImageUrl(post.image || post.frontmatter?.image)" class="slide-img no-zoom" loading="lazy" />
            <div class="slide-overlay"></div>
            <div class="slide-info">
              
              <div class="slide-meta">
                <span class="cat-tag" v-if="post.category || post.frontmatter?.category">
                  {{ getCategory(post) }}
                </span>
                <span class="slide-date" v-if="post.date || post.frontmatter?.date">
                  <Calendar class="date-icon" />
                  {{ formatDate(post.date || post.frontmatter?.date) }}
                </span>
              </div>

              <h2 class="slide-title">{{ post.title || post.frontmatter?.title }}</h2>
              <p class="slide-desc">{{ post.summary || post.frontmatter?.description }}</p>
            </div>
          </a>
        </swiper-slide>
        
        <div class="carousel-controls">
          <button
            type="button"
            class="nav-btn prev-btn"
            :aria-label="lang === 'en' ? 'Previous slide' : '上一則'"
          ><ChevronLeft /></button>
          <div class="custom-pagination"></div>
          <button
            type="button"
            class="nav-btn next-btn"
            :aria-label="lang === 'en' ? 'Next slide' : '下一則'"
          ><ChevronRight /></button>
        </div>
      </swiper>
    </div>
  </section>
</template>

<style scoped>
.hero-section { 
  margin-bottom: 2rem;
  width: 100%;
}

.carousel-container { 
  position: relative; 
  height: 420px; 
  width: 100%;
  z-index: 1; 
  background: transparent;
  padding: 0;
}

.main-swiper,
:deep(.swiper-wrapper),
:deep(.swiper-slide) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

:deep(.swiper-wrapper) {
  will-change: transform, opacity;
}

/* 🗡️ 斬斷 Android 15 GPU 崩潰：純 CSS Grid 無感切換法 */
:deep(.swiper-wrapper) {
  display: grid !important; /* 用 Grid 網格系統取代 Flex */
  transform: none !important; /* 徹底沒收引發當機的 3D 屬性 */
}

:deep(.swiper-slide) {
  grid-area: 1 / 1 !important; /* 魔法在這：讓所有幻燈片擠在同一個格子裡完美重疊！不需 absolute */
  transform: none !important;  
  opacity: 0 !important;       /* 預設全部透明隱藏 */
  pointer-events: none;        /* 隱藏的圖片不干擾點擊 */
  transition: opacity 0.4s ease !important; /* 交給 CSS 順滑淡入淡出 */
  z-index: 1;
}

:deep(.swiper-slide.swiper-slide-active) {
  opacity: 1 !important;       /* 只有加上 active class 的那張才顯示 */
  pointer-events: auto;
  z-index: 2;
}

/* 讓每一張卡片自己決定圓角，並用最單純的方式裁切 */
.slide-content {
  display: block; 
  width: 100%;
  height: 100%;
  position: relative;
  text-decoration: none;
  margin: 0;
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--vp-c-bg, #000); 
  
  /* 這是唯一需要保留來防止 Safari 圓角在動畫時失效的語法，它比 translateZ 更不耗效能 */
  mask-image: radial-gradient(white, black);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

.slide-img { 
  position: absolute; 
  top: 0;
  left: 0;
  width: 100%; 
  height: 100%; 
  margin: 0 !important;
  object-fit: cover; 
  display: block;
  z-index: 1;
  /* 僅保留放大 1.01 倍防止白邊，移除所有 backface-visibility 與 translateZ */
  transform: scale(1.01); 
  transition: transform 0.6s ease;
}

@media (hover: hover) and (pointer: fine) {
  .slide-content:hover .slide-img { 
    transform: scale(1.05); 
  }
}

.slide-overlay { 
  position: absolute; 
  inset: 0; 
  background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); 
  z-index: 2; 
  pointer-events: none; 
}

/* 文字與按鈕樣式 */
.slide-info { position: absolute; bottom: 2.5rem; left: 2rem; right: 2rem; color: #fff; z-index: 10; }
.slide-meta { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.cat-tag { background: var(--vp-c-brand); color: #000; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; }
.slide-date { display: flex; align-items: center; gap: 5px; font-size: 13px; color: rgba(255, 255, 255, 0.8); font-weight: 500; }
.date-icon { width: 14px; height: 14px; }
.slide-title { font-size: 2rem; margin-bottom: 12px; line-height: 1.2; font-weight: 800; }
.slide-desc { opacity: 0.85; font-size: 0.95rem; max-width: 800px; display: -webkit-box; line-clamp: 2; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nav-btn { position: absolute; top: 50%; transform: translateY(-50%); z-index: 20; background: rgba(0,0,0,0.3); color: white; border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: 0.3s; opacity: 0; display: flex; align-items: center; justify-content: center; }
.carousel-container:hover .nav-btn { opacity: 1; }
.prev-btn { left: 1rem; }
.next-btn { right: 1rem; }
.custom-pagination { 
  position: absolute; 
  bottom: 1rem !important; 
  left: 2rem !important; 
  z-index: 20; 
  display: flex; 
  gap: 8px; 
}

.carousel-controls {
  display: contents;
}

:deep(.custom-pagination .swiper-pagination-bullet) {
  width: 9px;
  height: 9px;
  margin: 0 !important;
  border: 1px solid rgba(52, 215, 255, 0.9);
  background: rgba(0, 255, 238, 0.38);
  opacity: 1;
  box-shadow: 0 0 7px rgba(0, 255, 238, 0.38);
  transition: width 0.28s ease, background 0.28s ease, box-shadow 0.28s ease;
}

:deep(.custom-pagination .swiper-pagination-bullet-active) {
  width: 28px;
  border-radius: 999px;
  background: linear-gradient(90deg, #00ffee, #34d7ff);
  box-shadow: 0 0 6px rgba(0, 255, 238, 0.95), 0 0 16px rgba(52, 215, 255, 0.72);
}

@media (max-width: 768px) {
  .hero-section {
    box-sizing: border-box;
    padding-inline: 14px;
  }

  .carousel-container { height: 290px; }
  .main-swiper { height: 100%; overflow: hidden; }
  .slide-title { font-size: 1.5rem; }
  .slide-info { bottom: 4.5rem; left: 1.2rem; right: 1.2rem; }
  .carousel-controls {
    position: absolute;
    left: 50%;
    bottom: 8px;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 36px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    transform: translateX(-50%);
  }
  .custom-pagination {
    position: static;
    width: auto !important;
    transform: none !important;
  }
  .nav-btn {
    position: static;
    display: flex;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(52, 215, 255, 0.58);
    background: rgba(4, 20, 28, 0.34);
    opacity: 0.9;
    transform: none;
    box-shadow: 0 0 12px rgba(0, 255, 238, 0.24);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
  }
  .nav-btn :deep(svg) { width: 18px; height: 18px; }
}

</style>
