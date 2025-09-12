import MyCustomLayout from './MyCustomLayout.vue';
import './style.css';
import OpenCCConverter from '../components/OpenCCConverter.vue';

export default {
    Layout: MyCustomLayout,
    enhanceApp({ router, app }) {
        // ✅ 就是這一行！在此註冊您的元件
        app.component('OpenCCConverter', OpenCCConverter);

        // --- 您原本的所有其他程式碼都保留 ---
        if (typeof document === 'undefined') return; // SSR 階段直接跳過

        // 恢復 is-blog-page 判斷，只加在文章內頁
        function isBlogPage(path) {
            // 只針對 /blog/xxxx 文章頁（不是 /blog/ 或 /blog/index）
            return /^\/(en\/)?(blog|docs)\/(?!index$)[^/]+(?:\.html)?(?:[?#].*)?$/.test(path);
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
                            // 簡單的一次性滾動，計算準確位置
                            const elementPosition = anchor.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - 50;
                            
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }
                    }
                }, 120) as NodeJS.Timeout;
            }
        }

        function globalClickDelegate(e) {
            const link = e.target.closest('.outline-link');
            if (
                link &&
                link instanceof HTMLElement &&
                link.matches('.outline-link')
            ) {
                // 更強力地阻止預設行為
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // 阻止其他監聽器
                
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const anchor = document.querySelector(href);
                    if (anchor) {
                        // 完全複製懸停時的邏輯
                        const elementPosition = anchor.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - 50;
                        
                        // 使用 setTimeout 確保在其他事件處理完後執行
                        setTimeout(() => {
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }, 10);
                        
                        // 更新 URL，但不觸發跳轉
                        setTimeout(() => {
                            history.pushState(null, '', href);
                        }, 50);
                    }
                }
                return false; // 額外保險
            }
        }

        function setupGlobalOutlineHoverScroll() {
            document.removeEventListener('mouseover', globalHoverDelegate);
            document.removeEventListener('click', globalClickDelegate);
            document.addEventListener('mouseover', globalHoverDelegate);
            
            // 使用更強制性的方式綁定點擊事件
            document.addEventListener('click', globalClickDelegate, true); // 使用 capture phase
            
            // 額外的保險措施：直接在側邊欄綁定事件
            setTimeout(() => {
                const outline = document.querySelector('.VPDocAsideOutline');
                if (outline) {
                    outline.addEventListener('click', (e) => {
                        if (e.target && e.target instanceof HTMLElement) {
                            const link = e.target.closest('.outline-link');
                            if (link && link.getAttribute('href')?.startsWith('#')) {
                                e.preventDefault();
                                e.stopPropagation();
                                globalClickDelegate(e);
                            }
                        }
                    }, true);
                }
            }, 500);
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
};