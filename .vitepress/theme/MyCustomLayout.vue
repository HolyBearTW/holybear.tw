<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed, onMounted, onUnmounted, watch, ref, provide, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import { useAuthors } from '../components/useAuthors.js'
import FloatingBgmPlayer from './FloatingBgmPlayer.vue'
import CelebrationEntry from './CelebrationEntry.vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'
import ViewCounter from '../components/ViewCounter.vue'
import MigrationNotice from '../components/MigrationNotice.vue'
import mediumZoom from 'medium-zoom'
import { data as allPosts } from './posts.data.ts'
import NavThemeHandler from './NavThemeHandler.vue'
import Tech from './background/TechBackground.vue'
import Animated from './background/AnimatedBackground.vue'
import GamingRGB from './background/GamingRGB.vue'
import Slow3DFly from './background/Slow3DFly.vue'
import Halo from './background/CircularHaloBackgroud.vue'
import HyperOS from './background/HyperOSTheme.vue'
import HyperOS2 from './background/HyperOS2Theme.vue'
import CoreTower from './background/CoreTowerBackground.vue'
import Christmas from './background/ChristmasBackground.vue'
import Halloween from './background/HalloweenBackground.vue'
import GravityFieldSimulation from './background/GravityFieldSimulation.vue'
import HolyBearLoadingFrame from './HolyBearLoadingFrame.vue'
import FuwariSearch from './fuwari/components/FuwariSearch.vue'
import { 
  defaultTheme, 
  THEME_CHANGE_EVENT,
  getAllThemeIds,
  getInitialBackgroundTheme
} from './background/themes'

const { isDark } = useData()
declare const __GIT_COMMIT_HASH__: string
declare const __GIT_COMMIT_DATE__: string
const copyrightStartYear = 2025
const currentYear = new Date().getFullYear()
const copyrightYears = currentYear > copyrightStartYear
    ? `${copyrightStartYear} - ${currentYear}`
    : String(copyrightStartYear)
const gitCommitHash = __GIT_COMMIT_HASH__
const gitCommitDate = __GIT_COMMIT_DATE__
const gitCommitUrl = `https://github.com/HolyBearTW/holybear.tw/commit/${gitCommitHash}`

// 當前背景主題
const currentBackgroundTheme = ref(defaultTheme)

const mobileFallbackBackground = computed(() => {
    const theme = currentBackgroundTheme.value
    const darkFallbackThemes = new Set(['tech', 'gaming', 'gravityfield', 'slow3dfly', 'coretower', 'halloween', 'christmas'])
    const adaptiveThemes = new Set(['animated', 'hyperos', 'hyperos2', 'halo', 'none'])

    if (darkFallbackThemes.has(theme)) {
        return '#061018'
    }

    if (adaptiveThemes.has(theme)) {
        return isDark.value ? '#061018' : '#f7fbfc'
    }

    return isDark.value ? '#061018' : '#f7fbfc'
})

const mobileFlashGuardStyle = computed(() => ({
    backgroundColor: mobileFallbackBackground.value
}))

// ============================================
// 　　　　　　　深淺色模式切換邏輯
// ============================================

// 動畫標誌
let isAnimating = false;

provide('toggle-appearance', async () => {
    // 1. 檢查
    if (typeof document === 'undefined' || isAnimating) {
        return
    }

    isAnimating = true;

    // 2. 獲取當前狀態
    const isDarkNow = isDark.value; // 切換前的狀態
    const direction = isDarkNow ? 'to-light' : 'to-dark';

    // 3. === 統一的動畫邏輯 (適用於所有頁面) ===
    
            // 判斷是否為 canvas 動畫主題
            const canvasThemes = ['tech', 'animated', 'gaming', 'slow3dfly', 'gravityfield'];
            let overlayStyle = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                width: 100%; height: 100%;
                z-index: 0;
                pointer-events: none;
                transition: transform 1.5s cubic-bezier(0.4, 0, 0.2, 1);
            `;
            let useCanvasImage = false;
            if (canvasThemes.includes(currentBackgroundTheme.value)) {
                // 嘗試取得主背景 canvas
                const canvas = document.querySelector('.ClientOnly canvas, canvas');
                if (canvas && canvas instanceof HTMLCanvasElement) {
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        overlayStyle += `background: url('${dataUrl}') center/cover no-repeat;`;
                        useCanvasImage = true;
                    } catch(e) {}
                }
            }
            if (!useCanvasImage) {
                // 取得 body 的所有背景屬性
                const bodyStyle = window.getComputedStyle(document.body);
                const bgProps = [
                    'background',
                    'backgroundImage',
                    'backgroundSize',
                    'backgroundPosition',
                    'backgroundRepeat',
                    'backgroundColor'
                ];
                bgProps.forEach(prop => {
                    const val = bodyStyle.getPropertyValue(prop);
                    if (val) {
                        overlayStyle += `${prop}: ${val};`;
                    }
                });
            }
            // 創建全屏遮罩
            const overlay = document.createElement('div');
            overlay.className = 'theme-transition-overlay';
            overlay.setAttribute('data-direction', direction);
            overlay.style.cssText = overlayStyle;
            // 插入到 body 的第一個子元素之前，確保在內容下方
            document.body.insertBefore(overlay, document.body.firstChild);

    // 4. **!! 核心修改 !!**
    // 立即切換主題 (使用 Vue ref, 而不是手動改 class)
    isDark.value = !isDarkNow;
    await nextTick(); // 等待 Vue 響應並更新 DOM (VitePress 會更新 <html> class)

    // 5. 觸發滑出動畫
    requestAnimationFrame(() => {
        if (direction === 'to-light') {
            overlay.style.transform = 'translateY(-100%)';
        } else { // 'to-dark'
            overlay.style.transform = 'translateY(100%)';
        }
    });

    // 6. 清理
    setTimeout(() => {
        overlay.remove();
        isAnimating = false;
    }, 1500);
});

// 監聽主題切換事件
const handleThemeChange = (event: Event) => {
  const customEvent = event as CustomEvent
  const newTheme = customEvent.detail.theme
  console.log('Layout 收到主題切換事件:', newTheme) // 調試用
  currentBackgroundTheme.value = newTheme
  
  // 更新 body class 以應用主題特定樣式
  updateBodyClass(newTheme)
}

  // 更新 body class - 檢查 browser 環境避免 SSR 錯誤
const updateBodyClass = (theme: string) => {
  if (typeof document === 'undefined') return
  
    // 動態獲取並移除所有主題 class
    const allThemeIds = getAllThemeIds()
    const allThemeClasses = allThemeIds.map(id => `theme-${id}`)
    document.body.classList.remove(...allThemeClasses)

    const isAboutPage = /^(?:en\/)?about\.md$/.test(page.value?.relativePath || '')
    document.body.classList.toggle('about-page', !!isAboutPage)
  
  // 添加當前主題 class
  if (theme && theme !== 'none') {
    document.body.classList.add(`theme-${theme}`)
  }
}

const updateScrollTopClass = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  document.body.classList.toggle('hb-at-scroll-top', window.scrollY <= 1)
}

let blogHashAlignmentTimers: number[] = []

const alignBlogHashTarget = () => {
  if (typeof window === 'undefined' || !document.body.classList.contains('is-blog-page') || !window.location.hash) return

  let targetId = window.location.hash.slice(1)
  try {
    targetId = decodeURIComponent(targetId)
  } catch {
    // Keep the original hash when it contains an incomplete escape sequence.
  }

  const target = document.getElementById(targetId)
  if (!target?.closest('.VPDoc .vp-doc')) return

  const targetTop = window.matchMedia('(max-width: 959px)').matches ? 112 : 72
  const currentTop = target.getBoundingClientRect().top
  if (Math.abs(currentTop - targetTop) < 1) return

  window.scrollTo({
    top: Math.max(0, window.scrollY + currentTop - targetTop),
    behavior: 'auto'
  })
}

const scheduleBlogHashAlignment = () => {
  if (typeof window === 'undefined') return

  blogHashAlignmentTimers.forEach(timer => window.clearTimeout(timer))
  blogHashAlignmentTimers = [60, 450, 1100].map(delay => window.setTimeout(alignBlogHashTarget, delay))
}

const handleBlogSidebarMenuToggle = (event: MouseEvent) => {
  if (!(event.target instanceof Element) || !document.body.classList.contains('is-blog-page')) return

  const hashLink = event.target.closest<HTMLAnchorElement>(
    '.VPDocAsideOutline a[href^="#"], .VPLocalNavOutlineDropdown a[href^="#"]'
  )
  const rawHash = hashLink?.getAttribute('href') || ''
  if (hashLink && rawHash.length > 1) {
    let targetId = rawHash.slice(1)
    try {
      targetId = decodeURIComponent(targetId)
    } catch {
      // Keep the original id when the link contains an incomplete escape sequence.
    }

    if (document.getElementById(targetId)) {
      event.preventDefault()
      event.stopImmediatePropagation()

      const outlineButton = document.querySelector<HTMLElement>('.VPLocalNavOutlineDropdown > button.open')
      outlineButton?.click()

      if (window.location.hash !== rawHash) {
        window.history.pushState(window.history.state, '', rawHash)
      }
      scheduleBlogHashAlignment()
      return
    }
  }

  const menuButton = event.target.closest('.VPLocalNav .menu')
  const outlineButton = event.target.closest('.VPLocalNavOutlineDropdown > button')
  const sidebar = document.querySelector('.VPSidebar')
  if ((!menuButton && !outlineButton) || !sidebar?.classList.contains('open')) return

  const backdrop = document.querySelector<HTMLElement>('.VPBackdrop')
  if (!backdrop) return

  if (outlineButton) {
    // 目錄與日誌列表互斥：先收起側欄，再讓原本的目錄事件繼續執行。
    backdrop.click()
    return
  }

  // VitePress 的按鈕只負責開啟側欄；再次點擊時沿用遮罩既有的關閉流程。
  event.preventDefault()
  event.stopImmediatePropagation()
  backdrop.click()
}

onMounted(() => {
  // 只在客戶端執行 localStorage 和 DOM 操作
  if (typeof window !== 'undefined') {
    // 從 localStorage 載入主題
    const initialTheme = getInitialBackgroundTheme()
    currentBackgroundTheme.value = initialTheme
    updateBodyClass(initialTheme)
    
    // 監聽主題切換事件
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.addEventListener('scroll', updateScrollTopClass, { passive: true })
    window.addEventListener('hashchange', scheduleBlogHashAlignment)
    document.addEventListener('click', handleBlogSidebarMenuToggle, true)
    updateScrollTopClass()
    scheduleBlogHashAlignment()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.removeEventListener('scroll', updateScrollTopClass)
    window.removeEventListener('hashchange', scheduleBlogHashAlignment)
    document.removeEventListener('click', handleBlogSidebarMenuToggle, true)
    blogHashAlignmentTimers.forEach(timer => window.clearTimeout(timer))
    blogHashAlignmentTimers = []
    document.body.classList.remove('hb-at-scroll-top')
  }
})


// 根據網址 query 切換動畫元件
// 監聽主題選單點擊，動態切換網址 query 並觸發動畫切換

        // 只保留一份 normalizeUrl function
        function normalizeUrl(url) {
            if (url === '/blog/' || url === '/en/blog/') {
                return url;
            }
            if (url.endsWith('/index.html')) {
                return url.replace(/\/index\.html$/, '');
            }
            if (url.endsWith('.html')) {
                return url.replace(/\.html$/, '');
            }
            if (url.endsWith('.md')) {
                return url.replace(/\.md$/, '');
            }
            if (url.endsWith('/') && url !== '/') {
                return url.slice(0, -1);
            }
            return url;
        }

    const { frontmatter, page, locale, lang } = useData()

    const fallbackImg = '/blog_no_image.svg'

    // 原始文章數據 (複製自 blog/index.md 的邏輯)
    const rawPosts = computed(() => {
        const isEn = lang.value === 'en'
        const prefix = isEn ? '/en/blog/' : '/blog/'

        return allPosts.filter(post => 
            post.frontmatter?.blog === true &&                // 1. 必須標記為 blog
            post.url.startsWith(prefix) &&                    // 2. 根據語言選擇路徑
            post.frontmatter?.image &&                        // 3. 關鍵：必須有寫 image 欄位
            post.frontmatter?.image.trim() !== '' &&          // 4. 確保 image 不是空白字串
            !post.url.endsWith('/index') &&                   // 5. 排除 index (通用)
            !['/blog/index-new', '/blog/blog_list'].includes(post.url) // 6. 排除其他特定頁面
        ).map(post => ({
            ...post,
            image: post.frontmatter?.image || fallbackImg, 
            tags: Array.isArray(post.frontmatter?.tags) ? post.frontmatter?.tags : [],
            category: Array.isArray(post.frontmatter?.category) ? post.frontmatter?.category : []
        }))
    })

    const isHomePage = computed(() => {
        // 使用 relativePath 準確判斷是否為根目錄首頁 (含多語言)
        // 排除 blog/index.md 這種也使用 home layout 的頁面
        if (!page.value) return false
        const p = page.value.relativePath
        return p === 'index.md' || p === 'zh_TW/index.md' || p === 'en/index.md'
    })

    const route = useRoute()

    const isBlogArticlePage = computed(() => {
        const relativePath = page.value?.relativePath || ''
        return relativePath.startsWith('blog/') || relativePath.startsWith('en/blog/')
    })

    const syncLegacyBlogTableBorders = () => {
        if (typeof document === 'undefined' || !isBlogArticlePage.value) return

        const legacyBorderElements = document.querySelectorAll<HTMLElement>(
            '.VPDoc .vp-doc table[style], .VPDoc .vp-doc table [style]'
        )

        legacyBorderElements.forEach((element) => {
            const storedValue = element.dataset.hbOriginalTableBorder

            if (!isDark.value) {
                const inlineBorder = element.style.getPropertyValue('border')
                if (inlineBorder && storedValue === undefined) {
                    element.dataset.hbOriginalTableBorder = inlineBorder
                    element.dataset.hbOriginalTableBorderPriority = element.style.getPropertyPriority('border')
                    element.style.removeProperty('border')
                }
                return
            }

            if (storedValue !== undefined) {
                element.style.setProperty(
                    'border',
                    storedValue,
                    element.dataset.hbOriginalTableBorderPriority || ''
                )
                delete element.dataset.hbOriginalTableBorder
                delete element.dataset.hbOriginalTableBorderPriority
            }
        })
    }

    const scheduleLegacyBlogTableBorderSync = () => {
        nextTick(() => {
            requestAnimationFrame(syncLegacyBlogTableBorders)
        })
    }

    onMounted(scheduleLegacyBlogTableBorderSync)

    watch(
        [isDark, () => route.path],
        scheduleLegacyBlogTableBorderSync
    )

    const isDocsPage = computed(() => {
        const relativePath = page.value?.relativePath || ''
        return relativePath.startsWith('docs/')
    })

    const shouldShowDocHeader = computed(() => isBlogArticlePage.value || isDocsPage.value)
    const shouldShowVotePanel = computed(() => isBlogArticlePage.value || isDocsPage.value)

    const currentTitle = computed(() =>
        frontmatter.value
            ? (frontmatter.value.title || (isEnglish.value ? 'Unknown post title' : '無標題文章'))
            : (isEnglish.value ? 'Unknown post data' : '文章元素未定義')
    )
    const currentSlug = computed(() =>
        frontmatter.value?.slug || page.value?.path || frontmatter.value?.title || 'unknown'
    )

    // 作者資訊陣列
    const { getAuthorMeta, isEnglish } = useAuthors()

    const footerCopy = computed(() => isEnglish.value
        ? {
            ariaLabel: 'Site footer',
            sitemap: 'Sitemap',
            poweredPrefix: 'Powered by',
            poweredSuffix: '',
            sourcePrefix: 'Source code',
            archive: 'archived on GitHub',
            location: 'Based in Taiwan, serving Chinese-speaking communities worldwide.',
            servicesLabel: 'Website services',
            githubTitle: 'Hosted on GitHub Pages',
            cloudflareTitle: 'Using Cloudflare services'
        }
        : {
            ariaLabel: '網站頁尾',
            sitemap: '網站地圖',
            poweredPrefix: '由',
            poweredSuffix: '強力驅動',
            sourcePrefix: '本站程式碼',
            archive: '已在 GitHub 存檔',
            location: '本站立足於台灣，為全球華人提供服務',
            servicesLabel: '網站服務',
            githubTitle: '由 GitHub Pages 提供網站托管',
            cloudflareTitle: '使用 Cloudflare 服務'
        }
    )

        // skeleton loading 至少顯示 650ms
        const isMetaLoadingRaw = computed(() => {
            if (!allPosts || allPosts.length === 0) return false;
            return !isHomePage.value && !currentPostData.value;
        });
        const isMetaLoadingWithDelay = ref(true);
        function triggerMetaLoadingDelay() {
            isMetaLoadingWithDelay.value = true;
            setTimeout(() => {
                isMetaLoadingWithDelay.value = false;
            }, 650);
        }
        onMounted(() => {
            triggerMetaLoadingDelay();
        });
        watch(
            () => route.path,
            () => {
                triggerMetaLoadingDelay();
                updateBodyClass(currentBackgroundTheme.value);
            }
        );
        const isMetaLoading = computed(() => isMetaLoadingRaw.value || isMetaLoadingWithDelay.value);
    // 直接複製 normalizeUrl 函式


    // 取得當前文章的 posts 資料（用 normalizeUrl 比對）
    // 強化 fallback，嘗試多種 url 格式並加 debug log
        const currentPostData = computed(() => {
            // 如果是 docs 頁面，直接回傳 null，不比對 blog posts
            if (page.value?.path && page.value.path.startsWith('/docs/')) {
                return null;
            }
            if (!allPosts || allPosts.length === 0) return null;
            // 優先用 page.value.path，若為空則 fallback 用 window.location.pathname
            let url = page.value?.path
            if (!url && typeof window !== 'undefined') {
                url = window.location.pathname
            }
            url = url || ''
            const normUrl = normalizeUrl(url)
            // 嘗試多種格式
            const candidates = [
                normUrl,
                normUrl.endsWith('/') ? normUrl.slice(0, -1) : normUrl + '/',
                normUrl + '.html',
                normUrl + '.md',
                normUrl.replace(/\/index$/, ''),
            ]
            const found = allPosts.find(post => candidates.includes(post.url))
            // 不再顯示警告
            return found
        })

    // 本地預設作者
    // 統一用 currentPostData 的 meta，完全 mirror 列表
    const currentAuthor = computed(() => currentPostData.value?.author || '未知作者')
    const currentAuthorMeta = computed(() => getAuthorMeta(currentAuthor.value))
    const currentAuthorAvatar = computed(() =>
        currentAuthorMeta.value.login
            ? `https://github.com/${currentAuthorMeta.value.login}.png`
            : '/logo.png'
    )
    const currentAuthorUrl = computed(() =>
        currentAuthorMeta.value.url || 'https://holybear.tw/'
    )
    const currentDisplayDate = computed(() => {
        if (currentPostData.value?.date) {
            const date = new Date(currentPostData.value.date)
            const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
            const yyyy = twDate.getFullYear()
            const mm = String(twDate.getMonth() + 1).padStart(2, '0')
            const dd = String(twDate.getDate()).padStart(2, '0')
            const hh = String(twDate.getHours()).padStart(2, '0')
            const min = String(twDate.getMinutes()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`
        }
        return isEnglish.value ? 'Unknown date' : '未知日期'
    })

    // /* === ENTRANCE ANIMATION START === */
    // const showIntro = ref(false)
    // const STORAGE_KEY = 'intro-video-last-played'
    // const HOUR = 60 * 60 * 1000

    // function hideIntro() {
    //     showIntro.value = false
    //     localStorage.setItem(STORAGE_KEY, Date.now().toString())
    // }

    // onMounted(() => {
    //     const lastPlayed = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    //     if (Date.now() - lastPlayed < HOUR) {
    //         showIntro.value = false
    //     } else {
    //         showIntro.value = true
    //     }
    // })
    // /* === ENTRANCE ANIMATION END === */

    // === medium-zoom SPA/observer 全域邏輯 ===
    // 監聽 .vp-doc 動畫結束時再初始化 medium-zoom，確保動畫後 DOM 穩定
    // SPA 切換時，先初始化 medium-zoom，並監聽 .vp-doc DOM 變動
    // 全域 body observer，僅在瀏覽器環境下執行，避免 SSR 報錯
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        (function setupGlobalZoomObserver() {
            const w = window;
            // 先移除舊 observer
            if (w.__ZOOM_BODY_OBSERVER__) {
                w.__ZOOM_BODY_OBSERVER__.disconnect();
                w.__ZOOM_BODY_OBSERVER__ = null;
            }
            if (w.__ZOOM_OBSERVER__) {
                w.__ZOOM_OBSERVER__.disconnect();
                w.__ZOOM_OBSERVER__ = null;
            }
            // 強制 detach zoom
            try {
                if (w.__ZOOM__) w.__ZOOM__.detach();
                if (w.mediumZoom) w.mediumZoom.detach && w.mediumZoom.detach();
            } catch(e) {}
            // 綁定 body observer
            const bodyObserver = new MutationObserver(() => {
                const doc = document.querySelector('.vp-doc');
                if (doc && !doc.__zoom_observed) {
                    // 初始化 zoom
                    setupMediumZoom();
                    // 綁定 .vp-doc observer
                    if (w.__ZOOM_OBSERVER__) {
                        w.__ZOOM_OBSERVER__.disconnect();
                        w.__ZOOM_OBSERVER__ = null;
                    }
                    const observer = new MutationObserver(() => {
                        setupMediumZoom();
                    });
                    observer.observe(doc, { childList: true, subtree: true });
                    w.__ZOOM_OBSERVER__ = observer;
                    doc.__zoom_observed = true;
                }
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });
            w.__ZOOM_BODY_OBSERVER__ = bodyObserver;
            // 首次進入時主動觸發一次
            const doc = document.querySelector('.vp-doc');
            if (doc && !doc.__zoom_observed) {
                setupMediumZoom();
                const observer = new MutationObserver(() => {
                    setupMediumZoom();
                });
                observer.observe(doc, { childList: true, subtree: true });
                w.__ZOOM_OBSERVER__ = observer;
                doc.__zoom_observed = true;
            }
        })();
    } else {
        // SSR 階段直接跳過
        // 將 return 包裹在函數中以避免語法錯誤
        (function skipSSR() {
            return;
        })();
    }

    // medium-zoom 整合，讓所有 markdown 內圖片支援點擊放大
    // medium-zoom 實例全域保存，確保每次都先 detach
    let zoomInstance = null;
    function setupMediumZoom() {
        // 等待 DOM 完全更新，延長至 300ms
        setTimeout(() => {
            if (zoomInstance) {
                zoomInstance.detach();
                zoomInstance = null;
            }
            // 僅在文章頁啟用 medium-zoom，不在列表頁（含英文版）啟用
            if (typeof location !== 'undefined') {
                const path = location.pathname;
                const isBlogList =
                    /^\/blog(?:\/|\/index(?:\.html)?)?$/.test(path) ||
                    /^\/en\/blog(?:\/|\/index(?:\.html)?)?$/.test(path);
                if (isBlogList) return;
            }
            const zoomImgs = document.querySelectorAll('.vp-doc img:not(.no-zoom)');
            if (zoomImgs.length > 0) {
                zoomInstance = mediumZoom('.vp-doc img:not(.no-zoom)', {
                    background: getComputedStyle(document.documentElement).getPropertyValue('color-scheme') === 'dark'
                        ? 'rgba(0,0,0,0.85)'
                        : 'rgba(255,255,255,0.95)',
                    margin: 24,
                    scrollOffset: 40
                });
                if (typeof window !== 'undefined') {
                    window.__ZOOM__ = zoomInstance;
                }
            }
        }, 500);
    }

    // 初始執行
    if (typeof window !== 'undefined') {
        setupMediumZoom();
        // 進階：SPA 切換時，強制 detach 所有 medium-zoom 實例再初始化
        window.addEventListener('vitepress:pageview', () => {
            // 全域強制 detach（保險起見）
            try {
                const w = window;
                if (w.__ZOOM__) w.__ZOOM__.detach();
                if (w.mediumZoom) w.mediumZoom.detach && w.mediumZoom.detach();
            } catch(e) {}
        });
    }

    // 隱藏 giscus "Discussion not found" 警告（dev/prod 皆生效）
    if (typeof window !== 'undefined') {
        const origLog = window.console.log;
        const origWarn = window.console.warn;
        const origError = window.console.error;
        function filterGiscus(args) {
            return (
                args[0] &&
                typeof args[0] === 'string' &&
                args[0].includes('giscus') &&
                args[0].includes('Discussion not found')
            );
        }
        window.console.log = function (...args) {
            if (filterGiscus(args)) return;
            origLog.apply(window.console, args);
        };
        window.console.warn = function (...args) {
            if (filterGiscus(args)) return;
            origWarn.apply(window.console, args);
        };
        window.console.error = function (...args) {
            if (filterGiscus(args)) return;
            origError.apply(window.console, args);
        };
    }
</script>

<template>
    <HolyBearLoadingFrame />
    <MigrationNotice :intro-finished="true" />
    <FloatingBgmPlayer />
    <ClientOnly>
        <CelebrationEntry />
    </ClientOnly>
    <div class="mobile-flash-guard" :style="mobileFlashGuardStyle" aria-hidden="true"></div>

    <ClientOnly>
        <Tech v-if="currentBackgroundTheme === 'tech'" />
        <Animated v-if="currentBackgroundTheme === 'animated'" />
        <GamingRGB v-if="currentBackgroundTheme === 'gaming'" />
        <Slow3DFly v-if="currentBackgroundTheme === 'slow3dfly'" />
        <Halo v-if="currentBackgroundTheme === 'halo'" />
        <HyperOS v-if="currentBackgroundTheme === 'hyperos'" />
        <HyperOS2 v-if="currentBackgroundTheme === 'hyperos2'" />
        <CoreTower v-if="currentBackgroundTheme === 'coretower'" />
        <Halloween v-if="currentBackgroundTheme === 'halloween'" />
        <GravityFieldSimulation v-if="currentBackgroundTheme === 'gravityfield'" />
        <Christmas v-if="currentBackgroundTheme === 'christmas'" />
    </ClientOnly>

    <component :is="DefaultTheme.Layout">
        <template #layout-top>
            <NavThemeHandler />
        </template>
        <template #nav-bar-content-before>
            <FuwariSearch />
        </template>
        <!-- Home Page: Carousel between Hero and Features -->
        <template #home-features-before>
            <div v-if="isHomePage" class="VPFeatures VPHomeFeatures" style="padding-top: 0 !important; padding-bottom: 2rem !important; display: flex; justify-content: center;">
                <div class="container home-carousel-container">
                    <HeroSection :posts="rawPosts" />
                </div>
            </div>
        </template>

        <template #doc-before>
            <div v-if="shouldShowDocHeader" class="blog-post-header-injected">
                <h1 class="blog-post-title">{{ currentTitle }}</h1>
                
                <div v-if="(frontmatter.category && frontmatter.category.length) || (frontmatter.tags && frontmatter.tags.length)" class="blog-post-meta-row">
                    <span v-for="c in frontmatter.category" :key="'cat-' + c" class="category">{{ c }}</span>
                    <span v-for="(t, i) in frontmatter.tags" :key="'tags-' + t + '-' + i" class="tags">{{ t }}</span>
                </div>

                <p class="blog-post-date-in-content">
                    <span class="blog-post-date-main">
                        <span v-if="isBlogArticlePage && !isMetaLoading" class="author-inline">
                            <img class="post-author-avatar" :src="currentAuthorAvatar" :alt="currentAuthorMeta.name" />
                            <a :href="currentAuthorUrl" target="_blank" rel="noopener" class="author-link-name">{{ currentAuthorMeta.name }}</a>
                            <span v-if="currentDisplayDate" class="dot" aria-hidden="true">•</span>
                            <span v-if="currentDisplayDate">{{ currentDisplayDate }}</span>
                        </span>
                        <ClientOnly v-else-if="isBlogArticlePage">
                            <span class="author-inline">
                                <div class="meta-content-wrapper skeleton-wrapper">
                                    <span class="post-author-avatar skeleton skeleton-avatar"></span>
                                    <span class="skeleton skeleton-meta-bar"></span>
                                </div>
                            </span>
                        </ClientOnly>
                    </span>
                    <span v-if="isBlogArticlePage" class="blog-post-date-right">
                        <ClientOnly>
                            <ViewCounter :slug="currentSlug" />
                        </ClientOnly>
                    </span>
                </p>
                <div class="blog-post-date-divider"></div>
            </div>
        </template>
        <template #doc-after>
            <ClientOnly v-if="isBlogArticlePage">
                <ShareButtons />
            </ClientOnly>
            <ClientOnly v-if="shouldShowVotePanel">
                <VotePanel />
            </ClientOnly>
            <ClientOnly v-if="isBlogArticlePage">
                <GiscusComments />
            </ClientOnly>
        </template>
        <template #layout-bottom>
            <footer class="BlogVPFooter" :aria-label="footerCopy.ariaLabel">
                <div class="container">
                    <p class="footer-line copyright">
                        <a href="https://github.com/HolyBearTW/holybear.tw/blob/main/LICENSE" target="_blank" rel="license noopener">AGPL-3.0 Licensed</a>
                        &copy; {{ copyrightYears }}
                        <a href="https://github.com/HolyBearTW" target="_blank" rel="noopener">HolyBear</a>
                    </p>
                    <p class="footer-line">
                        <a href="/rss.xml" target="_blank" rel="alternate" type="application/rss+xml">RSS</a>
                        <span aria-hidden="true"> / </span>
                        <a href="/sitemap.xml" target="_blank">{{ footerCopy.sitemap }}</a>
                    </p>
                    <p class="footer-line">
                        {{ footerCopy.poweredPrefix }} <a href="https://vitepress.dev/" target="_blank" rel="noopener">VitePress</a>{{ isEnglish ? ', ' : '、' }}<a href="https://astro.build/" target="_blank" rel="noopener">Astro</a>{{ isEnglish ? ' and ' : ' 和 ' }}<a href="https://github.com/saicaca/fuwari" target="_blank" rel="noopener">Fuwari</a> {{ footerCopy.poweredSuffix }}
                    </p>
                    <p class="footer-line">
                        {{ footerCopy.sourcePrefix }}
                        <a href="https://github.com/HolyBearTW/holybear.tw" target="_blank" rel="noopener">{{ footerCopy.archive }}</a>
                        <a class="footer-commit" :href="gitCommitUrl" target="_blank" rel="noopener">({{ gitCommitHash }} @ {{ gitCommitDate }})</a>
                    </p>
                    <p class="footer-line footer-location">{{ footerCopy.location }}</p>
                    <div class="footer-hosts" :aria-label="footerCopy.servicesLabel">
                        <a class="footer-host" href="https://pages.github.com/" target="_blank" rel="noopener" :title="footerCopy.githubTitle">
                            <img src="/cdn/github.svg" alt="GitHub Pages" />
                        </a>
                        <a class="footer-host" href="https://www.cloudflare.com/" target="_blank" rel="noopener" :title="footerCopy.cloudflareTitle">
                            <img src="/cdn/cloudflare.svg" alt="Cloudflare" />
                        </a>
                    </div>
                </div>
            </footer>
        </template>
    </component>
</template>

<style scoped>
/* 文章內頁 category/tag 樣式與新版列表一致 */
.blog-post-meta-row .category {
    background: #e0f7fa !important;
    color: #00796b !important;
    border-radius: 999px !important;
    border: 1.5px solid #00b8b8 !important;
    padding: 10px 12px 6px 12px !important; /* 上10px，下6px，左右12px */
    font-size: 13px !important;
    line-height: 1 !important;
}
.dark .blog-post-meta-row .category {
    background: #00363a !important;
    color: #4dd0e1 !important;
    border-radius: 999px !important;
    border: 1.5px solid #00b8b8 !important;
    padding: 10px 12px 6px 12px !important; /* 上10px，下6px，左右12px */
    font-size: 13px !important;
    line-height: 1 !important;
}
.blog-post-meta-row .tags {
    background: #eaf4fb !important;
    color: #2077c7 !important;
    border-radius: 999px !important;
    border: 1px solid #b5d0ea !important;
    padding: 10px 12px 6px 12px !important; /* 上10px，下6px，左右12px */
    font-size: 13px !important;
    line-height: 1 !important;
}
.dark .blog-post-meta-row .tags {
    background: #23263a !important;
    color: #b5c6e0 !important;
    border: 1px solid #3b3b3b !important;
}
    /* === ENTRANCE ANIMATION START === */
    .intro-video-mask {
        position: fixed;
        z-index: 9999;
        inset: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.8s;
    }

        .intro-video-mask video {
            width: 100%;
            height: 100vh;
            object-fit: cover;
            display: block;
        }

    .skip-btn {
        position: absolute;
        top: 30px;
        right: 30px;
        z-index: 10000;
        padding: 8px 18px;
        font-size: 1rem;
        background: rgba(0,0,0,0.7);
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
    }

        .skip-btn:hover {
            background: rgba(0,0,0,0.9);
        }
    /* === ENTRANCE ANIMATION END === */

    .blog-post-header-injected {
        padding-top: 30px !important;
    }

    :deep(.vp-doc) {
        padding-top: 0 !important;
        margin-top: 0 !important;
    }

    :deep(.vp-doc > p:first-of-type) {
        margin-top: 0;
    }

    @media (max-width: 768px) {
        .blog-post-header-injected {
            padding-left: var(--vp-content-padding);
            padding-right: var(--vp-content-padding);
            padding-top: 0;
            padding-bottom: 0;
            margin-bottom: 0;
        }

        :deep(.vp-doc) {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }

        :deep(.vp-doc > p:first-of-type) {
            margin-top: 0;
        }
    }

    .blog-post-title {
        font-size: 2rem;
        line-height: 1.2;
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: var(--vp-c-text-1);
    }

    .blog-post-meta-row {
        margin-bottom: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
    }

    .blog-post-date-in-content {
        color: var(--vp-c-text-2);
        font-size: 0.85rem;
        margin-top: 0;
        margin-bottom: 0.2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5em;
    }

    .blog-post-date-main {
        display: inline-flex;
        align-items: center;
        gap: 0.3em;
    }

    .blog-post-date-right {
        display: inline-flex;
        align-items: center;
        margin-left: 1em;
    }

    .author-inline {
        display: flex;
        align-items: center;
        gap: 0.2em;
    }

    .post-author-avatar {
        width: 21px;
        height: 21px;
        border-radius: 50%;
        border: 1px solid #ddd;
        background: #fff;
        margin-right: 4px;
        object-fit: cover;
        vertical-align: middle;
        box-shadow: 0 2px 8px #0001;
        display: inline-block;
    }

    .author-link-name {
        color: var(--vp-c-brand-1, #00b8b8);
        text-decoration: none;
        font-weight: normal;
        line-height: 1;
        display: inline-block;
        vertical-align: middle;
        margin-right: 0;
        padding-right: 0;
    }

        .author-link-name:hover {
            text-decoration: underline;
        }

    .blog-post-date-divider {
        border-bottom: 1px dashed var(--vp-c-divider);
        margin-bottom: 0.5rem;
    }
    .dot {
        opacity: .6;
        margin: 0 0.1em;
    }
    :deep(.vp-doc p),
    :deep(.vp-doc ul),
    :deep(.vp-doc ol),
    :deep(.vp-doc img),
    :deep(.vp-doc table),
    :deep(.vp-doc blockquote),
    :deep(.vp-doc pre),
    :deep(.vp-doc .custom-block),
    :deep(.vp-doc h2),
    :deep(.vp-doc h3),
    :deep(.vp-doc h4),
    :deep(.vp-doc h5),
    :deep(.vp-doc h6) {
        margin-top: 1rem;
        margin-bottom: 1rem;
    }

    :deep(.vp-doc div[class*="language-"]) {
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
    }
</style>

<style scoped>
    .meta-content-wrapper, .skeleton-wrapper, .author-inline {
        height: 28px;
        display: flex;
        align-items: center;
    }
    .post-author-avatar, .skeleton-avatar {
        width: 21px;
        height: 21px;
        border-radius: 50% !important;
        border: 1px solid #ddd;
        background: #fff;
        margin-right: 4px;
        object-fit: cover;
        vertical-align: middle;
        box-shadow: 0 2px 8px #0001;
        display: inline-block;
        box-sizing: border-box;
    }
    .skeleton-avatar {
        background-color: var(--vp-c-bg-soft);
        box-shadow: none;
        border-radius: 50% !important;
    }
    .skeleton {
        background-color: var(--vp-c-bg-soft);
        border-radius: 4px;
    }
    .skeleton-meta-bar {
        width: 160px;
        height: 14px;
        display: inline-block;
        margin-left: 0;
    }
    .blog-post-date-divider {
        border-bottom: 1px dashed var(--vp-c-divider);
        margin-bottom: 0.5rem;
        margin-top: 0;
    }
</style>

<style>
/* ============================================
    content-body - 內容主體區域
    功能: 文檔主要內容區域,包含文章正文
    ============================================ */

/* 內容區域圓角 */
.VPDoc .content:not(.VPDocAsideOutline):not(.VPDocAsideOutline *) {
  border-radius: 18px !important;
}

@media (max-width: 767px) {
    .VPDoc .container,
    .VPContent .container {
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        box-sizing: border-box !important;
    }

    .VPDoc .content:not(.VPDocAsideOutline):not(.VPDocAsideOutline *) {
        padding: 16px !important;
        border-radius: 16px !important;
    }
}

body.about-page .VPDoc .container,
body.about-page .VPDoc,
body.about-page .VPDoc .vp-doc,
body.about-page .VPDoc .content-body,
body.about-page .VPDoc .content-container,
body.about-page .VPDoc .content {
    max-width: none !important;
}

body.about-page {
    --vp-layout-max-width: 1440px;
    --main-width: 1440px;
}

body.about-page .VPContent,
body.about-page .VPDoc .container {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
}

body.about-page .VPDoc .content {
    width: 100% !important;
}

body.about-page .VPDoc,
body.about-page .VPDoc .content-container,
body.about-page .VPDoc .content,
body.about-page .VPDoc .vp-doc {
    overflow-x: visible !important;
}

body.about-page .VPDoc .vp-doc > *,
body.about-page .VPDoc .content :not(pre) {
    max-width: 100%;
    box-sizing: border-box;
}


body.about-page .VPDoc .container,
body.about-page .VPContent .container {
    width: min(1440px, calc(100vw - 64px)) !important;
    max-width: min(1440px, calc(100vw - 64px)) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    padding-left: 32px !important;
    padding-right: 32px !important;
    box-sizing: border-box !important;
}

@media (max-width: 767px) {
    body.about-page .VPDoc .container,
    body.about-page .VPContent .container {
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }

    body.about-page .VPDoc .content:not(.VPDocAsideOutline):not(.VPDocAsideOutline *) {
        padding: 16px !important;
        border-radius: 16px !important;
    }
}

@media (min-width: 960px) {
    body.about-page .VPDoc {
        padding: 0 !important;
    }

    body.about-page .VPDoc .aside,
    body.about-page .VPDocAside,
    body.about-page .VPDocOutlineDropdown {
        display: none !important;
    }
}

@media (min-width: 1201px) {
    body.about-page .VPNavBar {
        padding-left: 0 !important;
        padding-right: 0 !important;
    }

    body.about-page .VPDoc.has-aside .content-container,
    body.about-page .VPDoc.has-aside .content,
    body.about-page .VPDoc.has-sidebar .content-container,
    body.about-page .VPDoc.has-sidebar .content {
        max-width: none !important;
        padding-right: 0 !important;
    }
}

/* Light Mode - 內容區域背景 (透射模糊) */
.VPDoc .content:not(.VPDocAsideOutline):not(.VPDocAsideOutline *) {
  background-color: rgba(255, 255, 255, 0.5) !important;
  padding: 24px;
  border-radius: 18px !important;
  overflow: hidden !important;
}

.VPContent{
    /* removed global background to avoid mobile navbar dark overlay */
}
.dark .VPContent{
    /* removed global background to avoid mobile navbar dark overlay */
}

/* Dark Mode - 內容區域背景 (透射模糊) */
.dark .VPDoc .content:not(.VPDocAsideOutline):not(.VPDocAsideOutline *)
  {
  background-color: rgba(26, 26, 30, 0.8) !important;
  border-radius: 18px !important;
  overflow: hidden !important;
}

/* Light Mode - 內容區域文字顏色 */
.content-body,
.VPDoc .content,
.vp-doc {
  color: #1a1a1a !important;
}

/* Dark Mode - 內容區域文字顏色 */
.dark .content-body,
.dark .VPDoc .content,
.dark .vp-doc {
  color: #ffffff !important;
}

/* ============================================
    💡 【已移除】
    視圖過渡動畫 (View Transition API)
    (此區塊的 CSS 已被移除，因為新邏輯不使用 View Transition)
    ============================================ */
</style>

<style>
/* 修正側邊欄選單項目對齊 */
.VPSidebar .VPSidebarItem .link,
.VPSidebar .VPSidebarItem .text {
  margin-left: -3px !important;  /* 負數往左移，正數往右移 */
}

@media (max-width: 1440px) {
  /* 手機版側邊欄選單項目對齊 */
  .VPSidebar .VPSidebarItem .link,
  .VPSidebar .VPSidebarItem .text {
    margin-left: 0 !important;
  }
}

/* 側邊欄 group 分隔線樣式與對齊 - 只針對側邊欄,不影響主內容區 */
.VPSidebar .group + .group {
    border-top: 1px solid var(--vp-c-divider) !important;
    padding-top: 8px !important;
    margin-top: 8px !important;
    /* 只有 group 裡沒有 VPLink link link 才加負 margin */
    margin-left: -7px !important;
    margin-right: -7px !important;
}

/* VPLink link link 裡的 text 額外對齊 */
.VPSidebar .group + .group .VPLink.link.link:has(.text) {
    margin-left: 5px !important;
    margin-right: 5px !important;
}
.VPSidebar .group + .group h2.text {
    margin-left: 3px !important;
    margin-right: 3px !important;
}
.group:first-of-type .VPSidebarItem.level-0 > .item > h2.text {
    margin-left: -5px !important;
    margin-right: -5px !important;
}
section.VPSidebarItem.level-0 {
        padding-bottom: 4px !important;
        padding-top: 0 !important;
}

@media (max-width: 1440px) {
.VPSidebar .group + .group {
    margin-left: 0 !important;  /* 手機版取消負數對齊 */
    margin-right: 0 !important; /* 手機版取消負數對齊 */
    }
.VPSidebar .group  + .group .VPLink.link.link:has(.text),
.VPSidebar .group + .group h2.text {
    margin-left: 0 !important;
    margin-right: 0 !important;
    }
.group:first-of-type .VPSidebarItem.level-0 > .item > h2.text {
    margin-left: 0 !important;
    margin-right: 0 !important;
    }
}
</style>

<style>
/* ============================================
    VPNavScreenMenuGroup 動畫增強（僅移動端）
    功能: 為手機版選單群組添加流暢動畫效果，內容隨展開往下推移
    ============================================ */

@media (max-width: 768px) {
  /* 選單群組容器動畫 - 使用 max-height 實現平滑展開 */
  .VPNavScreenMenuGroup {
    height: auto !important;
    padding-bottom: 0 !important;
    transition: 
      grid-template-rows 0.48s cubic-bezier(0.4, 0, 0.2, 1),
      border-color 0.5s ease !important;
    overflow: hidden;
  }

  /* 按鈕基礎動畫 */
  .VPNavScreenMenuGroup .button {
    transition: 
      color 0.3s ease,
      background-color 0.3s ease,
      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.3s ease !important;
    transform-origin: center;
  }

  /* 按鈕點擊效果 */
  .VPNavScreenMenuGroup .button:active {
    transform: scale(0.98) !important;
  }

  /* 按鈕圖標旋轉動畫 */
  .VPNavScreenMenuGroup .button-icon {
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    display: inline-block;
  }

  .VPNavScreenMenuGroup.open .button-icon {
        transform: translateY(-50%) rotate(45deg) !important;
  }

  /* 展開內容容器 - 平滑高度展開動畫 */
  .VPNavScreenMenuGroup .items {
    display: grid;
    max-height: 0;
    opacity: 0;
    margin: 0 !important;
    padding-top: 0 !important;
    visibility: visible !important;
    pointer-events: none;
    overflow: hidden;
    transition: 
      max-height 0.48s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.28s ease,
      padding-top 0.48s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .VPNavScreenMenuGroup.open .items {
    max-height: 1000px; /* 足夠大的值以容納所有項目 */
    opacity: 1;
    padding-top: 10px !important;
    pointer-events: auto;
    transition: 
      max-height 1.5s cubic-bezier(0.4, 0, 0.2, 1),       /* 展開時：立即展開高度 */
      opacity 0.35s ease 0.15s,
      padding-top 0.48s cubic-bezier(0.4, 0, 0.2, 1) !important; /* 展開時：延遲 0.15s 再淡入 */
  }

  /* 單個項目淡入動畫 - 從左滑入 */
  .VPNavScreenMenuGroup .item,
  .VPNavScreenMenuGroup .group {
    opacity: 0;
    transform: translateX(-12px);
    transition: 
      opacity 0.25s ease,                                  /* 收起時：快速淡出 */
      transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; /* 收起時：快速滑出 */
  }

  .VPNavScreenMenuGroup.open .item,
  .VPNavScreenMenuGroup.open .group {
    opacity: 1;
    transform: translateX(0);
    transition: 
      opacity 0.3s ease,                                   /* 展開時：平滑淡入 */
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; /* 展開時：平滑滑入 */
  }

  /* 交錯延遲動畫 - 支持最多 15 個項目，波浪式出現 */
  .VPNavScreenMenuGroup.open .item:nth-child(1),
  .VPNavScreenMenuGroup.open .group:nth-child(1) {
    transition-delay: 0.12s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(2),
  .VPNavScreenMenuGroup.open .group:nth-child(2) {
    transition-delay: 0.16s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(3),
  .VPNavScreenMenuGroup.open .group:nth-child(3) {
    transition-delay: 0.20s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(4),
  .VPNavScreenMenuGroup.open .group:nth-child(4) {
    transition-delay: 0.24s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(5),
  .VPNavScreenMenuGroup.open .group:nth-child(5) {
    transition-delay: 0.28s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(6),
  .VPNavScreenMenuGroup.open .group:nth-child(6) {
    transition-delay: 0.32s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(7),
  .VPNavScreenMenuGroup.open .group:nth-child(7) {
    transition-delay: 0.36s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(8),
  .VPNavScreenMenuGroup.open .group:nth-child(8) {
    transition-delay: 0.40s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(9),
  .VPNavScreenMenuGroup.open .group:nth-child(9) {
    transition-delay: 0.44s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(10),
  .VPNavScreenMenuGroup.open .group:nth-child(10) {
    transition-delay: 0.48s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(11),
  .VPNavScreenMenuGroup.open .group:nth-child(11) {
    transition-delay: 0.52s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(12),
  .VPNavScreenMenuGroup.open .group:nth-child(12) {
    transition-delay: 0.56s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(13),
  .VPNavScreenMenuGroup.open .group:nth-child(13) {
    transition-delay: 0.60s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(14),
  .VPNavScreenMenuGroup.open .group:nth-child(14) {
    transition-delay: 0.64s !important;
  }

  .VPNavScreenMenuGroup.open .item:nth-child(15),
  .VPNavScreenMenuGroup.open .group:nth-child(15) {
    transition-delay: 0.68s !important;
  }

  /* 項目懸停效果 */
  .VPNavScreenMenuGroup .item:hover,
  .VPNavScreenMenuGroup .group:hover {
    transform: translateX(4px) !important;
    transition: transform 0.2s ease !important;
  }

  /* 按鈕文字動畫 */
  .VPNavScreenMenuGroup .button-text {
    display: inline-block;
    transition: transform 0.3s ease !important;
  }

  .VPNavScreenMenuGroup.open .button-text {
    transform: scale(1.05) !important;
  }
}
</style>

<style>
/* Hero 文字動畫 */
.VPHero .name {
  background-image: -webkit-linear-gradient(120deg, #C1836C 0%, #F7E1C4 20%, #8F70FF 40%, #00FFEE 60%, #33FFFF 100%);
  background-size: 400% 400%;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: holyBearVitePressHeroGradient 10s ease-in-out infinite alternate !important;
    isolation: isolate !important;
    transform: translate3d(0, 0, 0) !important;
    backface-visibility: hidden !important;
    will-change: filter, background-position;
}
html.dark .VPHero .name {
  animation: holyBearVitePressHeroGradient 10s ease-in-out infinite alternate !important;
}
.VPHero .image-bg {
  background-image: -webkit-linear-gradient(120deg, #C1836C 0%, #F7E1C4 20%, #8F70FF 40%, #00FFEE 60%, #33FFFF 100%) !important;
  background-size: 400% 400% !important;
  background-repeat: no-repeat !important;
  width: 320px !important;
  height: 320px !important;
  opacity: 0.48 !important;
  filter: blur(30px) saturate(1.2) !important;
  transform: translate3d(-50%, -50%, 0) scale(1.12) !important;
  z-index: 0 !important;
  animation: holyBearVitePressHeroGradient 10s ease-in-out infinite alternate !important;
  animation-play-state: running !important;
  will-change: background-position;
}

.VPHero .image-container {
  isolation: isolate;
}

.VPHero .image-src {
  z-index: 1 !important;
}

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
@keyframes holyBearVitePressHeroGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

</style>

<style>
/* 文章頁腳 */
.VPFooter {
    background: transparent !important;
    background-color: transparent !important;
    border-top: none !important;
}
.dark .VPFooter {
    background: transparent !important;
    background-color: transparent !important;
}
.BlogVPFooter {
    display: flex;
    width: 100%;
    padding: 16px 20px 12px;
    background: transparent !important;
    background-color: transparent !important;
    border-top: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    text-align: center;
    font-size: 14px;
    color: #67676c !important;
}
.dark .BlogVPFooter {
        background: transparent !important;
        background-color: transparent !important;
    color: #98989f !important;
}
.dark .BlogVPFooter {
    background: transparent !important;
    background-color: transparent !important;
}
.BlogVPFooter .container {
    max-width: 960px;
    margin: 0 auto;
    background: transparent !important;
    background-color: transparent !important;
}
.BlogVPFooter .footer-line {
    margin: 0 0 2px;
    line-height: 1.35;
}
.BlogVPFooter a {
    color: var(--vp-c-brand-1);
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s ease;
}
.BlogVPFooter a:hover {
    color: var(--vp-c-brand-2);
    text-decoration: underline;
}
.BlogVPFooter .footer-location {
    color: color-mix(in srgb, currentColor 76%, transparent);
    font-size: inherit;
}
.BlogVPFooter .footer-commit {
    margin-left: 4px;
    color: color-mix(in srgb, currentColor 54%, transparent);
    font-size: 12px;
}
.BlogVPFooter .footer-hosts {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 28px;
}
.BlogVPFooter .footer-host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
}
.BlogVPFooter .footer-host img {
    display: block;
    width: auto;
    height: 22px;
    padding: 3px 7px;
    border-radius: 5px;
    background: #fff;
}

.back-link {
  /* 隱藏原本內容 */
  color: transparent !important;
  position: relative;
}
.back-link::after {
  content: "<- 返回部落格";
  color: var(--vp-c-brand-1);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  pointer-events: none;
}

/* Home Page Hero Section Wrapper - Removed as we now use VPFeatures container */

.home-carousel-container {
  margin: 0 auto;
  max-width: 1150px !important; /* 強制覆蓋預設 container 寬度 */
  width: 100%;
}

@media (max-width: 1150px) {
  .home-carousel-container {
  max-width: 95% !important; /* 強制覆蓋預設 container 寬度 */
  }
}
</style>
