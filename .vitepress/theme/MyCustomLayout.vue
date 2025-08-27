<script setup>
    import Theme from 'vitepress/theme'
    import { useData } from 'vitepress'
    import { computed, ref, onMounted } from 'vue'
    import { useAuthors } from '../components/useAuthors.js'
    import FloatingBgmPlayer from './FloatingBgmPlayer.vue'
    import GiscusComments from '../components/GiscusComments.vue'
    import VotePanel from '../components/VotePanel.vue'
    import ViewCounter from '../components/ViewCounter.vue'
    import MigrationNotice from '../components/MigrationNotice.vue'
    import mediumZoom from 'medium-zoom'
        import { data as allPosts } from './posts.data.ts'

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

    const isHomePage = computed(() =>
        page.value && (page.value.path === '/' || page.value.path === '/index.html')
    )

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

    // 直接複製 normalizeUrl 函式


    // 取得當前文章的 posts 資料（用 normalizeUrl 比對）
    // 強化 fallback，嘗試多種 url 格式並加 debug log
    const currentPostData = computed(() => {
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
      if (!found) {
        // debug log
        console.warn('[MyCustomLayout] 找不到文章對應', {
          pagePath: url,
          normUrl,
          candidates,
          allPostUrls: allPosts.map(p => p.url)
        })
      }
      return found
    })

    // 本地預設作者
    const currentAuthor = computed(() =>
      frontmatter.value?.author || currentPostData.value?.author || '未知作者'
    )
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
        if (frontmatter.value?.date) {
            const date = new Date(frontmatter.value.date)
            const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
            const yyyy = twDate.getFullYear()
            const mm = String(twDate.getMonth() + 1).padStart(2, '0')
            const dd = String(twDate.getDate()).padStart(2, '0')
            const hh = String(twDate.getHours()).padStart(2, '0')
            const min = String(twDate.getMinutes()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`
        }
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

    /* === ENTRANCE ANIMATION START === */
    const showIntro = ref(false)
    const STORAGE_KEY = 'intro-video-last-played'
    const HOUR = 60 * 60 * 1000

    function hideIntro() {
        showIntro.value = false
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
    }

    onMounted(() => {
        const lastPlayed = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
        if (Date.now() - lastPlayed < HOUR) {
            showIntro.value = false
        } else {
            showIntro.value = true
        }
    })
    /* === ENTRANCE ANIMATION END === */

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
                    /^\/blog\/?(index|blog_list)?(\.html)?$/.test(path) ||
                    /^\/en\/blog\/?(index|blog_list)?(\.html)?$/.test(path);
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
</script>

<template>
    <!-- 搬家通知彈窗 -->
    <MigrationNotice :intro-finished="!showIntro" />
    
    <!-- === ENTRANCE ANIMATION START === -->
    <div v-if="showIntro" class="intro-video-mask">
        <video ref="introVideo"
               playsinline
               autoplay
               muted
               @ended="hideIntro"
               @error="hideIntro">
            <source src="/video/maple.mp4" type="video/mp4">
        </video>
        <button @click="hideIntro" class="skip-btn">Skip</button>
    </div>
    <!-- === ENTRANCE ANIMATION END === -->
    <FloatingBgmPlayer v-if="!showIntro" />

    <Theme.Layout v-show="!showIntro">
        <template #doc-before>
            <div v-if="!isHomePage" class="blog-post-header-injected">
                <h1 class="blog-post-title">{{ currentTitle }}</h1>
                <div v-if="(frontmatter.category && frontmatter.category.length) || (frontmatter.tag && frontmatter.tag.length)"
                     class="blog-post-meta-row">
                    <span v-for="c in frontmatter.category" :key="'cat-' + c" class="category">{{ c }}</span>
                    <span v-for="t in frontmatter.tag" :key="'tag-' + t" class="tag">{{ t }}</span>
                </div>
                <p class="blog-post-date-in-content">
                    <span class="blog-post-date-main">
                        <span class="author-inline">
                            <img class="post-author-avatar" :src="currentAuthorAvatar" :alt="currentAuthorMeta.name" />
                            <a :href="currentAuthorUrl" target="_blank" rel="noopener" class="author-link-name">{{ currentAuthorMeta.name }}</a>
                            <span v-if="currentDisplayDate" class="dot" aria-hidden="true">•</span>
                            <span v-if="currentDisplayDate">{{ currentDisplayDate }}</span>
                        </span>
                    </span>
                    <span class="blog-post-date-right">
                        <ClientOnly>
                            <ViewCounter :slug="currentSlug" />
                        </ClientOnly>
                    </span>
                </p>
                <div class="blog-post-date-divider"></div>
            </div>
        </template>
        <template #doc-after>
            <ClientOnly>
                <VotePanel />
                <GiscusComments />
            </ClientOnly>
        </template>
    </Theme.Layout>
</template>

<style scoped>
/* 文章內頁 category/tag 樣式與新版列表一致 */
.blog-post-meta-row .category {
    background: #e0f7fa !important;
    color: #00796b !important;
    border-radius: 999px !important;
    border: 1.5px solid #00b8b8 !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
    line-height: 1 !important;
}
.dark .blog-post-meta-row .category {
    background: #00363a !important;
    color: #4dd0e1 !important;
    border-radius: 999px !important;
    border: 1.5px solid #00b8b8 !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
    line-height: 1 !important;
}
.blog-post-meta-row .tag {
    background: #eaf4fb !important;
    color: #2077c7 !important;
    border-radius: 999px !important;
    border: 1px solid #b5d0ea !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
    line-height: 1 !important;
}
.dark .blog-post-meta-row .tag {
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
            width: 100vw;
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

    :deep(.vp-doc h1:first-of-type) {
        display: none !important;
    }

    .blog-post-header-injected {
        position: relative;
        width: 100%;
        padding-left: var(--vp-content-padding);
        padding-right: var(--vp-content-padding);
        padding-top: 0;
        padding-bottom: 0;
        margin-bottom: 0;
        box-sizing: border-box;
        background-color: var(--vp-c-bg);
        z-index: 1;
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

    .category {
        display: inline-block;
        background: #00FFEE;
        color: #000;
        border-radius: 3px;
        padding: 0 0.5em;
        font-size: 0.85em;
    }

    .tag {
        display: inline-block;
        background: #e3f2fd;
        color: #2077c7;
        border-radius: 3px;
        padding: 0 0.5em;
        font-size: 0.85em;
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
        width: 22px;
        height: 22px;
        margin: 0 2px 0 0;
        border-radius: 50%;
        vertical-align: middle;
        box-shadow: 0 2px 8px #0001;
        border: 1px solid #ddd;
        background: #fff;
        object-fit: cover;
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

<style>
    .group + .group[data-v-a84b7c21] {
        border-top: 1px solid var(--vp-c-divider) !important;
        padding-top: 8px !important;
        margin-top: 8px !important;
    }

    section.VPSidebarItem.level-0 {
        padding-bottom: 4px !important;
        padding-top: 0 !important;
    }
</style>