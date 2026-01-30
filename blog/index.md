---
layout: home
title: 日誌
description: 聖小熊與夥伴們的日誌

hero:
  name: "聖小熊與夥伴們的日誌"
  text: "技術筆記與生活感悟"
  tagline: "記錄學習軌跡、創作過程與成長足跡"
  image:
    src: /logo.png
    alt: HolyBearTW Blog
  actions:
    - theme: alt
      text: 跳到底部
      link: "#bottom"
    - theme: alt
      text: 回到主站
      link: "/"
blog: true
---

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import { useAuthors } from '../.vitepress/components/useAuthors.js'
import ArticleMeta from '../.vitepress/theme/ArticleMeta.vue'
import PostMeta from '../.vitepress/theme/PostMeta.vue'
import { data as allPosts } from '../.vitepress/theme/posts.data.ts'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// 狀態管理
// 從 localStorage 讀取使用者偏好的顯示模式，預設為 grid
const savedViewMode = (typeof localStorage !== 'undefined' && localStorage.getItem('blog-view-mode')) as 'grid' | 'list' | null
const viewMode = ref<'grid' | 'list'>(savedViewMode || 'grid')

// 監聽 viewMode 變化並保存到 localStorage
watch(viewMode, (newMode) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('blog-view-mode', newMode)
  }
  // 切換模式時不重新播放動畫，保持卡片的 animation-complete 狀態
})

const selectedAuthor = ref('')
const selectedCategory = ref('')
const selectedTags = ref<string[]>([])

// 浮動視窗狀態
const showAuthorFilter = ref(false)
const showCategoryFilter = ref(false)
const showTagFilter = ref(false)
const showAuthorStats = ref(false)

// 作者統計延遲關閉
let authorStatsTimer: NodeJS.Timeout | null = null

const handleAuthorStatsEnter = () => {
  // 只在桌面版(螢幕寬度 >= 1024px)才顯示彈窗
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return
  }
  
  if (authorStatsTimer) {
    clearTimeout(authorStatsTimer)
    authorStatsTimer = null
  }
  showAuthorStats.value = true
}

const handleAuthorStatsLeave = () => {
  authorStatsTimer = setTimeout(() => {
    showAuthorStats.value = false
  }, 300) // 延遲 0.3 秒
}

// 點擊切換作者統計顯示(桌面版和行動裝置都可用)
const handleAuthorStatsClick = () => {
  // 切換顯示狀態
  showAuthorStats.value = !showAuthorStats.value
  
  // 清除任何待執行的計時器
  if (authorStatsTimer) {
    clearTimeout(authorStatsTimer)
    authorStatsTimer = null
  }
}

// 點擊背景遮罩關閉作者統計
const closeAuthorStats = () => {
  // 立即關閉,不受計時器影響
  showAuthorStats.value = false
  
  // 清除所有計時器
  if (authorStatsTimer) {
    clearTimeout(authorStatsTimer)
    authorStatsTimer = null
  }
}

// 路由
const route = useRoute()

// 作者數據
const { authorsData, isEnglish, getAuthorMeta } = useAuthors()

// 產生顯示用作者陣列
const displayAuthors = computed(() => {
  return Object.keys(authorsData).map(login => {
    const author = authorsData[login];
    return {
      login: login,
      url: author.url,
      name: isEnglish.value && author.name_en ? author.name_en : author.name
    }
  })
})

// 格式化日期為 YYYY-MM-DD HH:mm 格式（含時間）
const formatDate = (dateString: string) => {
  if (!dateString) return '未知日期'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '未知日期'
  const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const yyyy = twDate.getFullYear()
  const mm = String(twDate.getMonth() + 1).padStart(2, '0')
  const dd = String(twDate.getDate()).padStart(2, '0')
  const hh = String(twDate.getHours()).padStart(2, '0')
  const min = String(twDate.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

const fallbackImg = '/blog_no_image.svg'

const onImgError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img && img.src !== fallbackImg) img.src = fallbackImg
}

// 原始文章數據
const rawPosts = computed(() => {
  return allPosts.filter(post => 
    post.frontmatter?.blog === true &&                // 1. 必須標記為 blog
    post.url.startsWith('/blog/') &&                  // 2. 必須是中文日誌路徑
    !['/blog/index', '/blog/index-new', '/blog/blog_list'].includes(post.url) // 3. 排除索引頁
  ).map(post => ({
    ...post,
    image: post.frontmatter?.image || fallbackImg,
    tags: Array.isArray(post.frontmatter?.tags) ? post.frontmatter?.tags : [],
    category: Array.isArray(post.frontmatter?.category) ? post.frontmatter?.category : []
  }))
})

// 輪播圖專用數據：過濾掉沒有圖片的文章
const carouselPosts = computed(() => {
  return rawPosts.value.filter(post => 
    post.image !== fallbackImg && // 使用 fallbackImg 的就是原本沒圖片的
    post.frontmatter?.image && 
    post.frontmatter.image.trim() !== ''
  )
})

// 過濾邏輯
const filteredPosts = computed(() => {
  let posts = [...rawPosts.value]

  // 作者過濾
  if (selectedAuthor.value) {
    posts = posts.filter(post => post.author === selectedAuthor.value)
  }

  // 類別過濾
  if (selectedCategory.value) {
    posts = posts.filter(post => post.category.includes(selectedCategory.value))
  }

  // 標籤過濾（改為 OR 邏輯：只要包含任一選中標籤即可）
  if (selectedTags.value.length > 0) {
    posts = posts.filter(post =>
      selectedTags.value.some(tag => post.tags.includes(tag))
    )
  }

  // 按日期排序（最新在前）
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// 計算總頁數
const totalPages = computed(() => Math.ceil(filteredPosts.value.length / postsPerPage))

// 分頁後的文章
const pagedPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return filteredPosts.value.slice(start, end)
})

// 分頁相關變量
const postsPerPage = 12
const currentPage = ref(1)

// 生成頁碼數組
const pageNumbers = computed(() => {
  const pages = []
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i)
  }
  return pages
})

// 翻頁函數
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 統計數據
const uniqueAuthors = computed(() => {
  const authors = new Set(rawPosts.value.map(post => post.author))
  return Array.from(authors).filter(Boolean)
})

const uniqueCategories = computed(() => {
  const categories = new Set<string>()
  rawPosts.value.forEach(post => {
    post.category.forEach(cat => categories.add(cat))
  })
  return Array.from(categories).filter(Boolean)
})

const uniqueTags = computed(() => {
  const tags = new Set<string>()
  rawPosts.value.forEach(post => {
    post.tags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).filter(Boolean)
})

// 切換標籤
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 清除篩選
const clearFilters = () => {
  selectedAuthor.value = ''
  selectedCategory.value = ''
  selectedTags.value = []
}

// 關閉所有浮動視窗
const closeAllFilters = () => {
  showAuthorFilter.value = false
  showCategoryFilter.value = false
  showTagFilter.value = false
}

// 文章統計
const authorStats = computed(() => {
  const posts = rawPosts.value
  const authorCounts = new Map<string, number>()
  
  posts.forEach(post => {
    authorCounts.set(post.author, (authorCounts.get(post.author) || 0) + 1)
  })

  // 按貢獻數量排序
  return Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([author, count]) => ({ author, count }))
})

// ========== 版本切換和動畫相關 ==========
// 宣告一個變數來持有 style 元素，但不要在這裡建立它
let styleElement: HTMLStyleElement | null = null

const STORAGE_KEY = 'blog-version-preference'
const isOldVersion = ref(false)

// 設置卡片動畫
const setupCardAnimations = () => {
  const cards = document.querySelectorAll('.article-card')
  cards.forEach((element: any) => {
    // 移除動畫完成類
    element.classList.remove('animation-complete')
    
    // 監聽動畫完成（避免重複綁定）
    if (!element._animationEndBound) {
      element._animationEndBound = true
      element.addEventListener('animationend', function(e) {
        if (e.target === element && !element.classList.contains('animation-complete')) {
          element.classList.add('animation-complete')
        }
      }, { once: true })
    }
  })
}

// 生命週期鉤子
onMounted(async () => {
  // 在 onMounted (僅客戶端) 內部才建立和添加 style 元素
  styleElement = document.createElement('style')
  styleElement.textContent = `
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin: 2rem 0;
}

.pagination-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.pagination-button:hover:not(:disabled) {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.pagination-button.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
`
  document.head.appendChild(styleElement)
  
  // 讀取 localStorage 狀態
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'old') isOldVersion.value = true
    if (saved === 'new') isOldVersion.value = false
  }
  document.body.classList.add('blog-index-page')
  // 等待 DOM 完全更新後再設置動畫
  await nextTick()
  setTimeout(setupCardAnimations, 100)
})

onUnmounted(() => {
  // 移除時要檢查 styleElement 是否存在
  if (styleElement) {
    styleElement.remove()
    styleElement = null // 最好也清除引用
  }
  
  document.body.classList.remove('blog-index-page')
})

// 監聽當前頁變化，重新設置動畫
watch(currentPage, async () => {
  // 等待 DOM 更新完成後再設置動畫
  await nextTick()
  setTimeout(setupCardAnimations, 50) // 添加小延遲確保 DOM 完全更新
})

// 監聽 isOldVersion 變化並保存到 localStorage
watch(isOldVersion, (newValue) => {
  if (typeof window !== 'undefined') {
    if (newValue) {
      localStorage.setItem(STORAGE_KEY, 'old')
    } else {
      localStorage.setItem(STORAGE_KEY, 'new')
    }
  }
})
</script>

<ClientOnly>
  <!-- 將 HeroSection 移出 blog-container 以便獨立控制寬度 -->
  <div class="hero-wrapper">
    <HeroSection :posts="carouselPosts" />
  </div>

  <div class="blog-container">
    <!-- 已移除內部的 HeroSection -->
  <!-- 儀表板控制面板 - 三欄佈局 -->
  <div class="dashboard-panel">
    <!-- 左側：文章統計 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon articles">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ filteredPosts.length }}</div>
          <div class="stat-label">篇文章</div>
        </div>
      </div>
    </div>
    <!-- 中間：文章統計圖表 -->
    <div 
      class="author-contribution-wrapper"
      @click="handleAuthorStatsClick"
    >
      <!-- 原始摘要卡片（保持不動） -->
      <div class="author-contribution-section">
        <div class="stat-icon authors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ uniqueAuthors.length }}</div>
          <div class="stat-label">位夥伴</div>
        </div>
      </div>
      <!-- 背景遮罩（全螢幕） -->
      <transition name="fade">
        <div 
          v-if="showAuthorStats" 
          class="modal-backdrop"
          @click.stop="closeAuthorStats"
        ></div>
      </transition>
      <!-- 浮動詳細資訊面板 -->
      <transition name="scale-fade">
        <div 
          v-if="showAuthorStats" 
          class="author-details-modal"
          @click.stop
        >
          <div class="modal-header">
            <h3 class="modal-title">📊 文章統計</h3>
          </div>
          <div class="modal-body">
            <div 
              v-for="(stat, index) in authorStats" 
              :key="stat.author"
              class="author-stat-row"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div class="author-name">{{ getAuthorMeta(stat.author).name }}</div>
              <div class="author-bar-container">
                <div 
                  class="author-bar"
                  :style="{ 
                    width: `${(stat.count / authorStats[0].count) * 100}%`,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
                  }"
                >
                  <span class="bar-label">{{ stat.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
    <!-- 右側：篩選按鈕組（垂直排列） -->
    <div class="filters-section">
      <button 
        @click="showAuthorFilter = !showAuthorFilter; showCategoryFilter = false; showTagFilter = false"
        :class="{ active: selectedAuthor }"
        class="filter-btn author-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </svg>
        <span>作者</span>
        <span v-if="selectedAuthor" class="filter-badge">1</span>
      </button>
      <button 
        @click="showCategoryFilter = !showCategoryFilter; showAuthorFilter = false; showTagFilter = false"
        :class="{ active: selectedCategory }"
        class="filter-btn category-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>類別</span>
        <span v-if="selectedCategory" class="filter-badge">1</span>
      </button>
      <button 
        @click="showTagFilter = !showTagFilter; showAuthorFilter = false; showCategoryFilter = false"
        :class="{ active: selectedTags.length > 0 }"
        class="filter-btn tag-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
        <span>標籤</span>
        <span v-if="selectedTags.length > 0" class="filter-badge">{{ selectedTags.length }}</span>
      </button>
      <button 
        v-if="selectedAuthor || selectedCategory || selectedTags.length > 0"
        @click="clearFilters"
        class="clear-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        清除篩選
      </button>
    </div>
  </div>

  <!-- 作者篩選浮動視窗 -->
  <div v-if="showAuthorFilter">
    <div class="modal-backdrop" @click="closeAllFilters"></div>
    <div class="filter-modal-overlay" @click="closeAllFilters">
      <div class="filter-modal" @click.stop>
        <div class="filter-modal-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            選擇作者
          </h3>
          <button @click="closeAllFilters" class="close-modal-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="filter-modal-content">
          <button
            v-for="author in uniqueAuthors"
            :key="author"
            @click="selectedAuthor = selectedAuthor === author ? '' : author; closeAllFilters()"
            :class="{ active: selectedAuthor === author }"
            class="filter-option author-option"
          >
            {{ getAuthorMeta(author).name }}
            <svg v-if="selectedAuthor === author" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 類別篩選浮動視窗 -->
  <div v-if="showCategoryFilter">
    <div class="modal-backdrop" @click="closeAllFilters"></div>
    <div class="filter-modal-overlay" @click="closeAllFilters">
      <div class="filter-modal" @click.stop>
        <div class="filter-modal-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            選擇類別
          </h3>
          <button @click="closeAllFilters" class="close-modal-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="filter-modal-content">
          <button
            v-for="cat in uniqueCategories"
            :key="cat"
            @click="selectedCategory = selectedCategory === cat ? '' : cat; closeAllFilters()"
            :class="{ active: selectedCategory === cat }"
            class="filter-option category-option"
          >
            {{ cat }}
            <svg v-if="selectedCategory === cat" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 標籤篩選浮動視窗 -->
  <div v-if="showTagFilter">
    <div class="modal-backdrop" @click="closeAllFilters"></div>
    <div class="filter-modal-overlay" @click="closeAllFilters">
      <div class="filter-modal" @click.stop>
        <div class="filter-modal-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            選擇標籤（可多選）
          </h3>
          <button @click="closeAllFilters" class="close-modal-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="filter-modal-subtitle">
          選擇多個標籤時，會顯示包含任一所選標籤的文章
        </div>
        <div class="filter-modal-content">
          <button
            v-for="tag in uniqueTags"
            :key="tag"
            @click="toggleTag(tag)"
            :class="{ active: selectedTags.includes(tag) }"
            class="filter-option tag-option"
          >
            {{ tag }}
            <svg v-if="selectedTags.includes(tag)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
        <div class="filter-modal-footer">
          <button @click="closeAllFilters" class="apply-filter-btn">
            確定
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 文章列表區域 -->
  <div class="articles-section">
    <!-- 文章列表頭部 -->
    <div class="articles-header">
      <h2>文章列表</h2>
      <div class="view-switcher">
        <button
          @click="viewMode = 'grid'"
          :class="{ active: viewMode === 'grid' }"
          class="view-icon-btn"
          title="網格視圖"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <button
          @click="viewMode = 'list'"
          :class="{ active: viewMode === 'list' }"
          class="view-icon-btn"
          title="列表視圖"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <!-- 文章網格/列表 -->
    <div :class="['articles-list', viewMode]">
      <a
        v-for="post in pagedPosts"
        :key="post.url"
        :href="post.url"
        class="article-card"
      >
        <div class="article-image">
          <img :src="post.image" :alt="post.title" @error="onImgError" loading="lazy" class="no-zoom">
        </div>
        <div class="article-content">
          <h3 class="article-title">{{ post.title }}</h3>
          <div class="article-meta">
            <span class="meta-item author">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              {{ getAuthorMeta(post.author).name }}
            </span>
            <span class="meta-item date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {{ formatDate(post.date) }}
            </span>
          </div>
          <p v-if="post.summary" class="article-summary">{{ post.summary }}</p>
          <div class="article-tags">
            <span v-for="cat in post.category" :key="cat" class="tag category">{{ cat }}</span>
            <span v-for="tag in post.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </a>
    </div>
    <!-- 空狀態 -->
    <div v-if="filteredPosts.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
        <path d="M9.5 9.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.1-1.2 1.5-2 2.2-.6.5-.6 1.3-.6 1.3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="11.5" cy="15.5" r="0.5" fill="currentColor" />
      </svg>
      <p>沒有找到符合條件的文章</p>
    </div>
  </div>
  
  <!-- 分頁控制 -->
  <div v-if="totalPages > 1" class="pagination">
    <button class="pagination-button" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">上一頁</button>
    <button v-for="page in pageNumbers" :key="page" class="pagination-button" :class="{ active: page === currentPage }" @click="goToPage(page)">{{ page }}</button>
    <button class="pagination-button" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">下一頁</button>
  </div>
</div>
</ClientOnly>

<style scoped>
.blog-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* 儀表板控制面板 - 三欄佈局 */
.dashboard-panel {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 160px;
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: stretch; /* 改為 stretch 讓所有項目高度一致 */
}

/* 左側統計區域 */
.stats-section {
  position: relative;
}

/* 統計卡片 */
.stat-card {
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 垂直置中 */
  gap: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.articles {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.authors {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-info {
  text-align: center;
  width: 100%;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

/* 中間文章統計區域容器 */
.author-contribution-wrapper {
  position: relative;
  height: 100%;
}

/* 原始摘要卡片 */
.author-contribution-section {
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 垂直置中 */
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.author-contribution-wrapper:hover .author-contribution-section {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--vp-c-brand);
}

/* 全螢幕背景遮罩 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 999;
  cursor: pointer;
}

/* 浮動詳細資訊面板 */
.author-details-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--vp-c-bg);
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 面板標題 */
.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-align: left;
}

/* 面板內容 */
.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

/* 作者統計行 */
.author-stat-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
  animation: slideInLeft 0.3s ease forwards;
  opacity: 0;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.author-stat-row:last-child {
  margin-bottom: 0;
}

.author-name {
  font-size: 1rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  text-align: right;
}

/* 橫向直方圖容器 */
.author-bar-container {
  position: relative;
  height: 32px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  overflow: hidden;
}

/* 橫向直方圖 */
.author-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 0.75rem;
  border-radius: 8px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  min-width: 40px;
}

.bar-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 背景遮罩動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 浮動面板縮放淡入動畫 */
.scale-fade-enter-active {
  animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-fade-leave-active {
  animation: scaleOut 0.3s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
}

/* 淡入滑動動畫 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 篩選按鈕區域 */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch; /* 改為 stretch 讓所有按鈕寬度一致 */
  justify-content: center; /* 垂直置中 */
  height: 100%; /* 確保佔滿高度以便置中 */
}

/* 篩選按鈕 */
.filter-btn {
  padding: 0.75rem 1.25rem;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex; /* 改回 flex,讓按鈕撐滿容器 */
  align-items: center;
  justify-content: center; /* 內容置中 */
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  position: relative;
  white-space: nowrap; /* 防止文字換行 */
}

.filter-btn svg {
  flex-shrink: 0; /* 防止 icon 被壓縮 */
}

/* 淺色模式：加強對比度 */
html:not(.dark) .filter-btn {
  border-color: rgba(0, 200, 220, 0.3);
  background: rgba(240, 250, 255, 0.9);
  color: rgba(0, 150, 200, 1);
}

.filter-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: rgba(0, 255, 238, 0.1);
  transform: translateY(-1px);
}

/* 淺色模式 hover */
html:not(.dark) .filter-btn:hover {
  background: rgba(0, 255, 238, 0.15);
  box-shadow: 0 2px 8px rgba(0, 255, 238, 0.2);
}

.filter-btn.active {
  border-color: var(--vp-c-brand);
  background: rgba(0, 255, 238, 0.1);
  color: var(--vp-c-brand);
}

/* 淺色模式 active */
html:not(.dark) .filter-btn.active {
  background: rgba(0, 255, 238, 0.15);
  box-shadow: 0 2px 8px rgba(0, 255, 238, 0.2);
}

/* 移除特定按鈕的自定義顏色，保持主題色一致性 */
.filter-btn.author-btn.active,
.filter-btn.category-btn.active,
.filter-btn.tag-btn.active {
  border-color: var(--vp-c-brand);
  background: rgba(0, 255, 238, 0.1);
  color: var(--vp-c-brand);
}

.filter-badge {
  background: var(--vp-c-brand);
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn {
  padding: 0.75rem 1.25rem;
  border: 2px solid #ef4444;
  background: #fee2e2;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex; /* 改回 flex,讓按鈕撐滿容器 */
  align-items: center;
  justify-content: center; /* 內容置中 */
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #ef4444;
  font-weight: 500;
  white-space: nowrap; /* 防止文字換行 */
}

.clear-btn svg {
  flex-shrink: 0; /* 防止 icon 被壓縮 */
}

.clear-btn:hover {
  background: #ef4444;
  color: white;
  transform: translateY(-1px);
}

/* 浮動視窗 */
.filter-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.filter-modal {
  background: var(--vp-c-bg);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.filter-modal-subtitle {
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.filter-modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-text-1);
}

.close-modal-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: var(--vp-c-text-2);
}

.close-modal-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.filter-modal-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-content: flex-start;
}

.filter-option {
  padding: 0.625rem 1.25rem;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-option:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: rgba(0, 255, 238, 0.1);
  transform: translateY(-1px);
}

.filter-option.active {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-bg);
}

/* 統一使用主題色，移除特定選項的顏色 */
.author-option.active,
.category-option.active,
.tag-option.active {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-bg);
}

.filter-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}

.apply-filter-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--vp-c-brand);
  color: var(--vp-c-bg);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.apply-filter-btn:hover {
  background: #33FFFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 255, 238, 0.2);
}

/* 文章列表區域 */
.articles-section {
  margin-top: 2rem;
}

.articles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.articles-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--vp-c-text-1);
}

.view-switcher {
  display: flex;
  gap: 0.5rem;
}

.view-icon-btn {
  width: 40px;
  height: 40px;
  border: 2px solid #e5e2da;
  background: #F9F6F2;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.view-icon-btn:hover {
  border-color: #00b8b8;
  background: #fff;
  color: #00b8b8;
}

.view-icon-btn.active {
  border-color: #00b8b8;
  background: #00b8b8;
  color: white;
}

.dark .view-icon-btn {
  border-color: #2a2a2a;
  background: #1c1c1c;
  color: #999;
}

.dark .view-icon-btn:hover {
  border-color: #00b8b8;
  background: #0a0a0a;
  color: #00b8b8;
}

.dark .view-icon-btn.active {
  border-color: #00b8b8;
  background: #00b8b8;
  color: white;
}

.article-card {
  background: #F9F6F2 !important;
  border: 1px solid #e5e2da !important;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  color: inherit;
  display: block;
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.6s ease forwards;
}

.article-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: #00b8b8 !important;
}

.article-card:hover .article-title {
  color: #00b8b8;
}

/* 動畫完成後的樣式 */
.article-card.animation-complete {
  animation: none !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: all 0.3s ease !important;
}

.article-card.animation-complete:hover {
  transform: translateY(-4px) scale(1.02) !important;
  border-color: #00b8b8 !important;
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.article-card.animation-complete:hover .article-title {
  color: #00b8b8 !important;
}

/* 為每張卡片添加延遲效果，讓它們依序出現 */
.article-card:nth-child(1) { animation-delay: 0s; }
.article-card:nth-child(2) { animation-delay: 0.1s; }
.article-card:nth-child(3) { animation-delay: 0.2s; }
.article-card:nth-child(4) { animation-delay: 0.3s; }
.article-card:nth-child(5) { animation-delay: 0.4s; }
.article-card:nth-child(6) { animation-delay: 0.5s; }
.article-card:nth-child(7) { animation-delay: 0.6s; }
.article-card:nth-child(8) { animation-delay: 0.7s; }
.article-card:nth-child(9) { animation-delay: 0.8s; }
.article-card:nth-child(10) { animation-delay: 0.9s; }

.dark .article-card {
  background: #1c1c1c !important;
  border-color: #2a2a2a !important;
}

.dark .article-card:hover {
  border-color: #00b8b8 !important;
}

/* 文章列表基礎樣式 */
.articles-list {
  display: grid;
}

.articles-list.grid {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.articles-list.list {
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 平板以上：列表模式間距加大 (匹配 blog/index.md) */
@media (min-width: 720px) {
  .articles-list.list {
    gap: 20px;
  }
}

.article-card {
  background: #F9F6F2 !important;
  border: 1px solid #e5e2da !important;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  color: inherit;
  display: block;
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.6s ease forwards;
}

.article-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: #00b8b8 !important;
}

.article-card:hover .article-title {
  color: #00b8b8;
}

/* 動畫完成後的樣式 */
.article-card.animation-complete {
  animation: none !important;
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: all 0.3s ease !important;
}

.article-card.animation-complete:hover {
  transform: translateY(-4px) scale(1.02) !important;
  border-color: #00b8b8 !important;
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.article-card.animation-complete:hover .article-title {
  color: #00b8b8 !important;
}

.dark .article-card {
  background: #1c1c1c !important;
  border-color: #2a2a2a !important;
}

.dark .article-card:hover {
  border-color: #00b8b8 !important;
}

/* ===== 網格模式樣式 ===== */
.articles-list.grid .article-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.articles-list.grid .article-image {
  width: 100%;
  height: 200px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.articles-list.grid .article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 12px;
}

/* 預設圖片特殊處理：完整顯示不裁切 */
.articles-list.grid .article-image img[src*="blog_no_image"] {
  object-fit: contain;
}

.articles-list.grid .article-content {
  padding: 1.5rem;
  margin-left: 1rem;
}

.articles-list.grid .article-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.articles-list.grid .article-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.articles-list.grid .meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.articles-list.grid .meta-item svg {
  color: var(--vp-c-text-3);
}

.articles-list.grid .article-summary {
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.articles-list.grid .article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.articles-list.grid .tag {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

.articles-list.grid .tag.category {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
}

/* 網格模式：手機版調整 */
@media (max-width: 768px) {
  .articles-list.grid {
    grid-template-columns: 1fr !important;
    gap: 1.5rem;
  }

  .articles-list.grid .article-card {
    display: flex !important;
    flex-direction: column !important;
  }

  .articles-list.grid .article-image {
    width: 100%;
    height: 180px;
    margin: 0;
    padding: 0;
  }

  .articles-list.grid .article-content {
    padding: 1rem !important;
    margin: 0 !important;
  }

  .articles-list.grid .article-title {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .articles-list.grid .article-summary {
    font-size: 0.9rem;
    -webkit-line-clamp: 3;
  }
}

/* ===== 列表模式樣式 - 完全採用 blog/index.md 的卡片布局 ===== */
.articles-list.list .article-card {
  display: flex !important;
  flex-direction: row !important; /* 所有尺寸都使用水平排列 */
  align-items: center !important;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: #F9F6F2 !important;
  border: 1px solid #e5e2da !important;
  color: #222 !important;
  min-height: 144px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .articles-list.list .article-card {
  background: #1c1c1c !important;
  border-color: #2a2a2a !important;
}

.articles-list.list .article-card:hover {
  transform: translateY(-4px) scale(1.02) !important;
  border-color: #00b8b8 !important;
  box-shadow: 0 8px 25px rgba(0, 184, 184, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.articles-list.list .article-card:hover .article-title {
  color: #00b8b8 !important;
}

/* 手機版和平板：調整尺寸和間距 */
@media (max-width: 768px) {
  .articles-list.list .article-card {
    align-items: center; /* 手機版改為垂直置中 */
    gap: 12px;
    padding: 12px;
    min-height: auto;
  }
  
  .articles-list.list .article-card:hover {
    transform: none !important;
    border-color: #2a2a2a !important;
    box-shadow: none !important;
  }
  
  .articles-list.list .article-card:hover .article-title {
    color: var(--vp-c-text-1) !important;
  }
}

/* 列表模式：article-image 變成固定大小的 thumb */
.articles-list.list .article-image {
  display: flex !important;
  width: 144px !important;
  height: 144px !important;
  overflow: hidden;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  align-items: center;
  justify-content: center;
  flex-shrink: 0 !important;
}

.articles-list.list .article-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center center;
  display: block;
}

@media (max-width: 768px) {
  .articles-list.list .article-image {
    width: 100px !important;
    height: 100px !important;
    margin: 0 !important;
    flex-shrink: 0;
    align-self: center !important;
  }
}

/* 列表模式：article-content 樣式調整 */
.articles-list.list .article-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 144px;
}

/* 列表模式：使用 order 調整顯示順序 (匹配 blog/index.md) */
.articles-list.list .article-title {
  order: 1;
}

.articles-list.list .article-tags {
  order: 2;
}

.articles-list.list .article-meta {
  order: 3;
}

.articles-list.list .article-summary {
  order: 4;
}

/* 手機版和平板 article-content 調整 (完全匹配 blog/index.md 的 .meta) */
@media (max-width: 768px) {
  .articles-list.list .article-content {
    height: auto !important;
    min-height: auto !important;
    justify-content: flex-start !important;
    padding: 8px 0;
  }
}

/* 列表模式：article-title 樣式調整 (完全匹配 blog/index.md 的 .title) */
.articles-list.list .article-title {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5em;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0; /* 確保能夠正確換行 */
}

@media (max-width: 900px) {
  .articles-list.list .article-title {
    font-size: 1.1rem;
    max-height: 2.2em;
    margin-bottom: 0.8em;
  }
}

@media (max-width: 720px) {
  .articles-list.list .article-title {
    font-size: 1rem;
    line-height: 1.15;
    max-height: 2em;
  }
}

/* 手機版和平板：進一步調整標題間距 (匹配 blog/index.md) */
@media (max-width: 768px) {
  .articles-list.list .article-title {
    font-size: 18px !important;
    line-height: 1.3 !important;
    margin-bottom: 8px !important;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    white-space: normal;
    max-height: 4.2em;
  }
}

/* 列表模式：article-tags 樣式調整 (完全匹配 blog/index.md 的 .badges) */
.articles-list.list .article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  margin-top: 0;
}

@media (max-width: 900px) {
  .articles-list.list .article-tags {
    margin-top: 0.3em;
  }
}

/* 列表模式：tag 樣式調整 (完全匹配 blog/index.md 的 .badge) */
.articles-list.list .article-tags .tag,
.articles-list.list .article-tags .tag.category {
  font-size: 13px !important;
  line-height: 1 !important;
  padding: 8px 12px !important;
  border-radius: 999px !important;
}

/* 手機版和平板：縮小標籤尺寸 (匹配 blog/index.md) */
@media (max-width: 768px) {
  .articles-list.list .article-tags {
    margin-bottom: 8px !important;
  }
  
  .articles-list.list .article-tags .tag,
  .articles-list.list .article-tags .tag.category {
    font-size: 11px !important;
    padding: 4px 8px !important;
  }
}

.articles-list.list .article-tags .tag {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

/* category 標籤顏色 (匹配網格模式) */
.articles-list.list .article-tags .tag.category {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
  color: white !important;
  border: none !important;
}

.dark .articles-list.list .article-tags .tag.category {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
  color: white !important;
  border: none !important;
}

/* 列表模式：article-meta 樣式調整 (匹配網格模式的對齊方式) */
.articles-list.list .article-meta {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  padding: 0 !important;
  gap: 1rem;
  margin-bottom: 6px;
  flex-wrap: nowrap;
}

.articles-list.list .article-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.articles-list.list .article-meta .meta-item svg {
  opacity: 0.6;
  flex-shrink: 0;
}

/* 手機版和平板：調整 meta 樣式 (匹配網格模式) */
@media (max-width: 768px) {
  .articles-list.list .article-meta {
    font-size: 13px !important;
    gap: 0.75rem !important;
    flex-wrap: nowrap !important;
  }
  
  .articles-list.list .article-meta .meta-item {
    gap: 0.375rem !important;
  }
  
  .articles-list.list .article-meta .meta-item svg {
    width: 12px !important;
    height: 12px !important;
  }
}

/* 列表模式：article-summary 樣式調整 (完全匹配 blog/index.md 的 .desc) */
.articles-list.list .article-summary {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.3;
  margin: 0 !important;
  padding: 0;
}

/* 手機版和平板：調整摘要樣式 (匹配 blog/index.md) */
@media (max-width: 768px) {
  .articles-list.list .article-summary {
    font-size: 13px !important;
    line-height: 1.4 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
  }
}

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--vp-c-text-2);
}

.empty-state svg {
  margin: 0 auto 1rem;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-size: 1.125rem;
}

/* 分頁樣式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 2rem;
  padding: 1rem 0;
  flex-wrap: wrap;
}

.pagination-button {
  padding: 8px 12px;
  border: 1px solid #e5e2da;
  background: #F9F6F2;
  color: #333;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 40px;
}

.pagination-button:hover:not(:disabled),
.pagination-button.active {
  background: #00b8b8;
  color: white;
  border-color: #00b8b8;
}

.pagination-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-button:disabled:hover {
  background: #F9F6F2;
  color: #333;
  border-color: #e5e2da;
}

/* 暗黑模式 */
.dark .pagination-button {
  background: #1c1c1c;
  border-color: #2a2a2a;
  color: #e0e0e0;
}

.dark .pagination-button:hover:not(:disabled),
.dark .pagination-button.active {
  background: #00b8b8;
  color: white;
  border-color: #00b8b8;
}

.dark .pagination-button:disabled:hover {
  background: #1c1c1c;
  color: #e0e0e0;
  border-color: #2a2a2a;
}

/* 手機版分頁樣式調整 */
@media (max-width: 768px) {
  .pagination {
    gap: 6px;
    padding: 0.8rem 0;
  }
  
  .pagination-button {
    padding: 10px 14px;
    font-size: 16px;
    min-width: 44px;
    min-height: 44px;
  }
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .dashboard-panel {
    grid-template-columns: 1.5fr 1.5fr 150px;
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
  }
  
  .stat-value {
    font-size: 2rem;
  }
  
  .stat-label {
    font-size: 0.85rem;
  }
  
  .filter-btn {
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .blog-container {
    padding: 1rem;
  }
  
  .dashboard-panel {
    grid-template-columns: 2.5fr 2.5fr 100px;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 0.75rem;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .stat-value {
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
  
  .filter-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }
  
  .filter-btn svg {
    width: 14px;
    height: 14px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-btn,
  .clear-btn {
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
  }

  .author-stats-chart {
    font-size: 0.9rem;
  }

  .author-stats-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin-top: 0;
    max-width: 90%;
    max-height: 70vh;
    overflow-y: auto;
  }
}

@media (max-width: 480px) {
  .filter-modal {
    max-width: 95%;
    max-height: 80vh;
  }

  .stat-value {
    font-size: 1.75rem;
  }
}
</style>

<style>
body.blog-index-page .vp-doc h2 {
  border-top: none !important;
  padding-top: 0 !important;
  margin-top: 0 !important;
}
body.blog-index-page main,
body.blog-index-page .VPContent,
body.blog-index-page .VPContent .content-container,
body.blog-index-page .VPDoc .content-container,
body.blog-index-page [class*="VPContent"],
body.blog-index-page [class*="content-container"] {
  border-top: none !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>

<style scoped>
.blog-container {
  padding-top: 0 !important; /* 消除頂部間距 */
  margin-top: 0;             /* 下方內容與 Hero 的間距由 Hero 決定 */
}

.hero-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 2rem 0 2rem; /* 給予適當的左右間距，順便給上方空間 */
}

@media (max-width: 768px) {
  .hero-wrapper {
    padding: 1rem 1rem 0 1rem;
  }
}

/* 針對 HeroSection 的微調 */
.hero-section {
  margin-top: 0;
  margin-bottom: 2rem;
}
</style>

<div id="bottom"></div>