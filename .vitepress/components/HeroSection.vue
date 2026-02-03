<script setup>
import { computed, onMounted, ref } from 'vue'
import { useData, withBase } from 'vitepress'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-vue-next'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const props = defineProps({
  posts: { type: Array, default: () => [] }
})

const { lang } = useData()
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

const carouselPosts = computed(() => props.posts.slice(0, 10))

const getImageUrl = (image) => {
  if (!image) return '/blog_no_image.svg'
  return image.startsWith('http') ? image : withBase(image)
}

// 修正日期顯示邏輯
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString(lang.value === 'en' ? 'en-US' : 'zh-TW', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

const modules = [Autoplay, Navigation, Pagination]
</script>

<template>
  <section v-if="mounted && carouselPosts.length > 0" class="hero-section">
    <div class="carousel-container">
      <swiper
        :modules="modules"
        :slides-per-view="1"
        :loop="true"
        :autoplay="{ delay: 2500, disableOnInteraction: false }"
        :pagination="{ clickable: true, el: '.custom-pagination' }"
        :navigation="{ prevEl: '.prev-btn', nextEl: '.next-btn' }"
        class="main-swiper"
      >
        <swiper-slide v-for="post in carouselPosts" :key="post.url">
          <a :href="withBase(post.url)" class="slide-content">
            <img :src="getImageUrl(post.image || post.frontmatter?.image)" class="slide-img" />
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

/* 1. 外層容器：只負責「限制視野範圍」，不負責圓角 */
.carousel-container { 
  position: relative; 
  height: 420px; 
  width: 100%;
  z-index: 1; 
  background: transparent; /* 背景透明，避免露出底色 */
  
  /* 這裡只負責把「跑到很遠的左右兩邊」的圖切掉 */
  overflow: hidden;
  
  /* 這裡設定圓角是為了配合 Safari 的渲染層級，但真正的裁切在下面 */
  border-radius: 16px; 
  
  /* 移除 mask-image，因為外層不需要做細部裁切 */
  padding: 0 !important;
}

/* 2. Swiper 結構重置 */
.main-swiper,
:deep(.swiper-wrapper),
:deep(.swiper-slide) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 3. 【核心關鍵】內容層：每一張卡片自己切圓角 */
/* 這樣隔壁張圖片怎麼動，都不會影響這張圖的圓角 */
.slide-content {
  display: block; 
  width: 100%;
  height: 100%;
  position: relative;
  text-decoration: none;
  margin: 0 !important;
  padding: 0 !important;
  
  /* 【關鍵 1】圓角在這裡設定 */
  border-radius: 16px;
  
  /* 【關鍵 2】每張卡片自己裁切自己 */
  overflow: hidden;
  
  /* 【關鍵 3 - Safari/Chrome 核彈級修復】 */
  /* 這行指令強制瀏覽器：「這張卡片滑動時，圓角遮罩必須跟著一起動」 */
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  
  /* 建立獨立渲染層，確保隔壁張圖不會疊上來 */
  transform: translateZ(0);
  isolation: isolate;
}

/* 4. 圖片層：維持放大設定，解決白邊 */
.slide-img { 
  position: absolute; 
  top: 0;
  left: 0;
  
  /* 解除限制並填滿 */
  width: 100% !important; 
  height: 100% !important; 
  max-width: none !important; 
  margin: 0 !important; 
  padding: 0 !important;
  
  object-fit: cover; 
  display: block;
  z-index: 1;
  
  /* 維持 1.01 倍放大，填補微小縫隙 */
  transform: scale(1.01); 
  
  transition: transform 0.6s ease;
  will-change: transform;
}

/* Hover 放大效果 */
.slide-content:hover .slide-img { 
  transform: scale(1.05); 
}

/* 遮罩層 */
.slide-overlay { 
  position: absolute; 
  inset: 0; 
  background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); 
  z-index: 2; 
  pointer-events: none; 
}

/* --- 文字與按鈕樣式保持原樣 --- */
.slide-info { position: absolute; bottom: 2.5rem; left: 2rem; right: 2rem; color: #fff; z-index: 10; }
.slide-meta { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.cat-tag { background: var(--vp-c-brand); color: #000; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; }
.slide-date { display: flex; align-items: center; gap: 5px; font-size: 13px; color: rgba(255, 255, 255, 0.8); font-weight: 500; }
.date-icon { width: 14px; height: 14px; }
.slide-title { font-size: 2rem; margin-bottom: 12px; line-height: 1.2; font-weight: 800; }
.slide-desc { opacity: 0.85; font-size: 0.95rem; max-width: 800px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nav-btn { position: absolute; top: 50%; transform: translateY(-50%); z-index: 20; background: rgba(0,0,0,0.3); color: white; border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: 0.3s; opacity: 0; display: flex; align-items: center; justify-content: center; }
.carousel-container:hover .nav-btn { opacity: 1; }
.prev-btn { left: 1rem; }
.next-btn { right: 1rem; }
.custom-pagination { position: absolute; bottom: 1rem !important; left: 50% !important; transform: translateX(-50%); z-index: 20; display: flex; gap: 8px; }
@media (max-width: 768px) {
  .carousel-container { height: 320px; }
  .slide-title { font-size: 1.5rem; }
  .slide-info { bottom: 2rem; left: 1.2rem; right: 1.2rem; }
  .nav-btn { display: none; }
}
</style>