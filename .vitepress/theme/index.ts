import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
    Layout: MyCustomLayout,
    enhanceApp({ router }) {
        if (typeof window !== 'undefined') {
            function isBlogPage(path) {
                return /^\/(en\/)?blog\/(?!index$)[^/]+(?:\.html)?(?:[?#].*)?$/.test(path);
            }
            function forceBlogClass() {
                // 保留原有 class，確保最多只有一個 is-blog-page
                const cls = document.body.className.split(' ').filter(c => c && c !== 'is-blog-page');
                if (isBlogPage(window.location.pathname)) {
                    cls.push('is-blog-page');
                }
                document.body.className = cls.join(' ');
            }
            // 首次進站
            forceBlogClass();
            // 輪詢，每 200ms 強制同步一次
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

            window.addEventListener('DOMContentLoaded', () => {
                replayIfChanged();
                setupGlobalOutlineHoverScroll();
            });
            window.addEventListener('vitepress:pageview', () => {
                setTimeout(() => {
                    replayIfChanged();
                    setupGlobalOutlineHoverScroll();
                    updateCanonicalAndOg();
                }, 80);
            });
            // 初始也同步一次
            updateCanonicalAndOg();
            setInterval(() => {
                replayIfChanged();
            }, 200);

            // 改進 router.afterEach 的邏輯，避免使用 window.location.reload
            if (router && typeof router.afterEach === 'function' && typeof router.addRoute === 'function') {
                router.afterEach((to, from) => {
                    if (to.path !== from.path) {
                        // 更新 body 的 class
                        forceBlogClass();
                        // 其他需要執行的操作
                        console.log(`Navigated from ${from.path} to ${to.path}`);
                    }
                });
            }

            // 動態更新 canonical 與 OG 相關標籤（SPA）
            function updateCanonicalAndOg() {
                const siteUrl = 'https://holybear.tw';
                const getCleanPath = (path: string) => {
                    let p = path || '/';
                    // 移除結尾的 /index 或 /index.html
                    p = p.replace(/\/index(?:\.html)?$/, '/');
                    // 移除 .html 後綴
                    p = p.replace(/\.html$/, '');
                    // 確保以 / 開頭
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

                // 同步 og:title, og:description
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

                // 同步 og:image 與 twitter:image，優先使用 build 時注入的 x-page-image
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
            }

            // 初始同步一次
            updateCanonicalAndOg();

            // 使用 VitePress Router 的 hook（若存在）
            if (router && typeof router.onAfterRouteChanged === 'function') {
                router.onAfterRouteChanged(() => {
                    // 略延後以等待內容與標題/描述更新
                    setTimeout(() => {
                        replayIfChanged();
                        setupGlobalOutlineHoverScroll();
                        updateCanonicalAndOg();
                    }, 50);
                });
            }

            // 仍保留頁面瀏覽事件（部分外掛會派送）
            window.addEventListener('vitepress:pageview', () => {
                setTimeout(() => {
                    replayIfChanged();
                    setupGlobalOutlineHoverScroll();
                    updateCanonicalAndOg();
                }, 80);
            });

            // 不再使用 Vue Router 的 afterEach（VitePress router 並非 Vue Router）
            // 先前代碼移除，避免誤用
        }
    }
}