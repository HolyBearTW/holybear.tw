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

            // 動態更新 canonical 與 og:url，確保 SPA 導航時正確變更
            function updateCanonicalAndOg() {
                const siteUrl = 'https://holybear.tw';
                const cleanPath = (path: string) => {
                    let p = path;
                    // 移除結尾的 /index 或 /index.html
                    p = p.replace(/\/index(?:\.html)?$/, '/');
                    // 移除 .html 後綴
                    p = p.replace(/\.html$/, '');
                    // 確保以 / 開頭
                    if (!p.startsWith('/')) p = '/' + p;
                    return p;
                };
                const pageUrl = siteUrl + cleanPath(window.location.pathname);

                // 更新/建立 canonical link
                let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
                if (!canonical) {
                    canonical = document.createElement('link');
                    canonical.setAttribute('rel', 'canonical');
                    document.head.appendChild(canonical);
                }
                canonical.setAttribute('href', pageUrl);

                // 更新/建立 og:url
                let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
                if (!ogUrl) {
                    ogUrl = document.createElement('meta');
                    ogUrl.setAttribute('property', 'og:url');
                    document.head.appendChild(ogUrl);
                }
                ogUrl.setAttribute('content', pageUrl);
            }

            window.addEventListener('vitepress:pageview', () => {
                setTimeout(() => {
                    updateCanonicalAndOg();
                }, 80);
            });
        }
    }
}