<script setup>
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import { useData, withBase } from 'vitepress'
import { Swiper, SwiperSlide } from 'swiper/vue'
// 🌟 引入 EffectFade 模組
import { Autoplay, Navigation, Pagination, EffectFade } from 'swiper/modules'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-vue-next'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
// 🌟 引入 Fade 的專屬 CSS
import 'swiper/css/effect-fade'

const props = defineProps({
  posts: { type: Array, default: () => [] }
})

const { lang } = useData()
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
                  {{ Array.isArray(post.category || post.frontmatter?.category) ? (post.category || post.frontmatter?.category)[0] : (post.category || post.frontmatter?.category) }}
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
        
        <button class="nav-btn prev-btn"><ChevronLeft /></button>
        <button class="nav-btn next-btn"><ChevronRight /></button>
        <div class="custom-pagination"></div>
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

/* 🗡️ 斬斷 Android 15 GPU 崩潰的防禦 (配合 JS 的 animating 保險解鎖) */
:deep(.swiper-wrapper) {
  transform: none !important;
}

:deep(.swiper-slide) {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  transform: none !important;
  transition-property: opacity !important;
}

:deep(.swiper-slide.swiper-slide-active) {
  position: relative !important;
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

@media (max-width: 768px) {
  .carousel-container { height: 320px; }
  .slide-title { font-size: 1.5rem; }
  .slide-info { bottom: 2rem; left: 1.2rem; right: 1.2rem; }
  .custom-pagination { left: 1.2rem !important; }
  .nav-btn { display: none; }
}

</style>