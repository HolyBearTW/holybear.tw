
import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'
import mediumZoom from 'medium-zoom'

export default {
    Layout: MyCustomLayout,
    enhanceApp({ router }) {
        // 監聽 .vp-doc 動畫結束時再初始化 medium-zoom，確保動畫後 DOM 穩定
                    // SPA 切換時，先初始化 medium-zoom，並監聽 .vp-doc DOM 變動
                                    // 全域 body observer，僅在瀏覽器環境下執行，避免 SSR 報錯
                                    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                                        (function setupGlobalZoomObserver() {
                                            const w = window as any;
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
                                                if (doc && !(doc as any).__zoom_observed) {
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
                                                    (doc as any).__zoom_observed = true;
                                                }
                                            });
                                            bodyObserver.observe(document.body, { childList: true, subtree: true });
                                            w.__ZOOM_BODY_OBSERVER__ = bodyObserver;
                                            // 首次進入時主動觸發一次
                                            const doc = document.querySelector('.vp-doc');
                                            if (doc && !(doc as any).__zoom_observed) {
                                                setupMediumZoom();
                                                const observer = new MutationObserver(() => {
                                                    setupMediumZoom();
                                                });
                                                observer.observe(doc, { childList: true, subtree: true });
                                                w.__ZOOM_OBSERVER__ = observer;
                                                (doc as any).__zoom_observed = true;
                                            }
                                        })();
                                    }
        if (typeof document === 'undefined') return; // SSR 階段直接跳過

        // medium-zoom 整合，讓所有 markdown 內圖片支援點擊放大
        // medium-zoom 實例全域保存，確保每次都先 detach
    let zoomInstance: ReturnType<typeof mediumZoom> | null = null;
    function setupMediumZoom() {
          // DEBUG: setTimeout 外先 log 一次
          // 等待 DOM 完全更新，延長至 300ms
          setTimeout(() => {
              if (zoomInstance) {
                  zoomInstance.detach();
                  zoomInstance = null;
              }
              // 僅在文章頁啟用 medium-zoom，不在列表頁（含英文版）啟用
                        const path = location.pathname;
                        const isBlogList =
                            /^\/blog\/?(index|blog_list)?(\.html)?$/.test(path) ||
                            /^\/en\/blog\/?(index|blog_list)?(\.html)?$/.test(path);
                        if (isBlogList) return;
              const zoomImgs = document.querySelectorAll('.vp-doc img:not(.no-zoom)');
              if (zoomImgs.length > 0) {
                  zoomInstance = mediumZoom('.vp-doc img:not(.no-zoom)', {
                      background: getComputedStyle(document.documentElement).getPropertyValue('color-scheme') === 'dark'
                          ? 'rgba(0,0,0,0.85)'
                          : 'rgba(255,255,255,0.95)',
                      margin: 24,
                      scrollOffset: 40
                  });
                  (window as any).__ZOOM__ = zoomInstance;
              }
          }, 500);
    }
        // 初始執行
        setupMediumZoom();
            // 進階：SPA 切換時，強制 detach 所有 medium-zoom 實例再初始化
            window.addEventListener('vitepress:pageview', () => {
                // 全域強制 detach（保險起見）
                                try {
                                    const w = window as any;
                                    if (w.__ZOOM__) w.__ZOOM__.detach();
                                    if (w.mediumZoom) w.mediumZoom.detach && w.mediumZoom.detach();
                                } catch(e) {}
                                let start = performance.now();
                                function waitForVpDocImages() {
                                    const imgs = document.querySelectorAll('.vp-doc img:not(.no-zoom)');
                                    if (imgs.length > 0) {
                                        setupMediumZoom();
                                    } else if (performance.now() - start < 1200) {
                                        requestAnimationFrame(waitForVpDocImages);
                                    } else {
                                        // 最多等 1.2 秒，沒圖片也強制初始化一次
                                        setupMediumZoom();
                                    }
                                }
                                waitForVpDocImages();
            });

        // 恢復 is-blog-page 判斷，只加在文章內頁
        function isBlogPage(path) {
            // 只針對 /blog/xxxx 文章頁（不是 /blog/ 或 /blog/index 或 /blog/blog_list）
            return /^\/(en\/)?blog\/(?!index$|blog_list$)[^/]+(?:\.html)?(?:[?#].*)?$/.test(path);
        }
        function forceBlogClass() {
            // 保留原有 class，確保最多只有一個 is-blog-page
            const cls = document.body.className.split(' ').filter(c => c && c !== 'is-blog-page');
            if (isBlogPage(window.location.pathname)) {
                cls.push('is-blog-page');
            }
            document.body.className = cls.join(' ');
        }
        forceBlogClass();
        setInterval(forceBlogClass, 200);

        // --- 其餘原本功能 ---
        let lastContent: string | null = null;
        let hoverTimer: NodeJS.Timeout | null = null;

        function replayIfChanged() {
            const doc = document.querySelector('.vp-doc') as HTMLElement;
            if (!doc) return;
            const current = doc.innerHTML;
            if (current !== lastContent) {
                doc.classList.remove('fade-in-up');
                void (doc as any).offsetWidth;
                doc.classList.add('fade-in-up');
                lastContent = current;
            }
        }

        function globalHoverDelegate(e) {
            const link = e.target.closest('.outline-link');
            if (
                link &&
                link instanceof HTMLElement &&
                link.matches('.outline-link')
            ) {
                if (hoverTimer) clearTimeout(hoverTimer);
                hoverTimer = setTimeout(() => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        const anchor = document.querySelector(href);
                        if (anchor) {
                            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                }, 120) as NodeJS.Timeout;
            }
        }

        function setupGlobalOutlineHoverScroll() {
            document.removeEventListener('mouseover', globalHoverDelegate);
            document.addEventListener('mouseover', globalHoverDelegate);
        }

        // --- SEO 與 head 標籤動態同步 ---
        function updateCanonicalAndOg(): string {
            const siteUrl = 'https://holybear.tw';
            const getCleanPath = (path: string) => {
                let p = path || '/';
                p = p.replace(/\/index(?:\.html)?$/, '/');
                p = p.replace(/\.html$/, '');
                if (!p.startsWith('/')) p = '/' + p;
                return p;
            };
            const pagePath = getCleanPath(window.location.pathname);
            const pageUrl = siteUrl + pagePath;

            // canonical
            let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
            if (!canonical) {
                canonical = document.createElement('link');
                canonical.rel = 'canonical';
                document.head.appendChild(canonical);
            }
            canonical.href = pageUrl;

            // og:url
            let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
            if (!ogUrl) {
                ogUrl = document.createElement('meta');
                ogUrl.setAttribute('property', 'og:url');
                document.head.appendChild(ogUrl);
            }
            ogUrl.setAttribute('content', pageUrl);

            // og:title, og:description
            const docTitle = document.title || '';
            const descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
            const docDesc = descEl?.content || '';
            let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
            if (!ogTitle) {
                ogTitle = document.createElement('meta');
                ogTitle.setAttribute('property', 'og:title');
                document.head.appendChild(ogTitle);
            }
            ogTitle.setAttribute('content', docTitle);
            let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
            if (!ogDesc) {
                ogDesc = document.createElement('meta');
                ogDesc.setAttribute('property', 'og:description');
                document.head.appendChild(ogDesc);
            }
            ogDesc.setAttribute('content', docDesc);

            // og:image, twitter:image
            const pageImageMeta = document.querySelector('meta[name="x-page-image"]') as HTMLMetaElement | null;
            const pageImage = pageImageMeta?.content || '';
            if (pageImage) {
                let ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
                if (!ogImage) {
                    ogImage = document.createElement('meta');
                    ogImage.setAttribute('property', 'og:image');
                    document.head.appendChild(ogImage);
                }
                ogImage.setAttribute('content', pageImage);

                let twitterImage = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
                if (!twitterImage) {
                    twitterImage = document.createElement('meta');
                    twitterImage.setAttribute('name', 'twitter:image');
                    document.head.appendChild(twitterImage);
                }
                twitterImage.setAttribute('content', pageImage);
            }
            return pageUrl;
        }

        // 初始同步一次，並保存最後同步的 URL
        let lastSyncedUrl = updateCanonicalAndOg();

        // 首次進站
        replayIfChanged();
        setupGlobalOutlineHoverScroll();
        updateCanonicalAndOg();

        // 輪詢，每 200ms 強制同步一次
        setInterval(() => {
            forceBlogClass();
            replayIfChanged();
        }, 200);

        // 監聽 VitePress 事件與路由
        window.addEventListener('DOMContentLoaded', () => {
            replayIfChanged();
            setupGlobalOutlineHoverScroll();
            updateCanonicalAndOg();
        });
        window.addEventListener('vitepress:pageview', () => {
            setTimeout(() => {
                replayIfChanged();
                setupGlobalOutlineHoverScroll();
                lastSyncedUrl = updateCanonicalAndOg();
            }, 80);
        });
        if (router && typeof router.onAfterRouteChanged === 'function') {
            router.onAfterRouteChanged(() => {
                setTimeout(() => {
                    replayIfChanged();
                    setupGlobalOutlineHoverScroll();
                    lastSyncedUrl = updateCanonicalAndOg();
                }, 50);
            });
        }

        // 定期同步 head（canonical/og）
        const HEAD_SYNC_INTERVAL = 1200;
        setInterval(() => {
            const siteUrl = 'https://holybear.tw';
            const currentPath = window.location.pathname
                .replace(/\/index(?:\.html)?$/, '/')
                .replace(/\.html$/, '');
            const normalized = currentPath.startsWith('/') ? currentPath : '/' + currentPath;
            const currentUrl = siteUrl + normalized;
            const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
            const ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
            const mismatch = !canonical || canonical.href !== currentUrl || !ogUrl || ogUrl.content !== currentUrl;
            const urlChanged = currentUrl !== lastSyncedUrl;
            if (urlChanged || mismatch) {
                lastSyncedUrl = updateCanonicalAndOg();
            }
        }, HEAD_SYNC_INTERVAL);
    }
}