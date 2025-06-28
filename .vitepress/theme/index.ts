import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
    Layout: MyCustomLayout,
    enhanceApp() {
        if (typeof window !== 'undefined') {
            // --- is-blog-page 控制 ---
            function isBlogPage(path) {
                // 根據你的文章網址格式調整這個正則！
                return /^\/(en\/)?blog\/(?!index\.html$)[^/]+\.html(?:[?#].*)?$/.test(path);
            }
            function updateBlogClass() {
                document.body.classList.remove('is-blog-page');
                if (isBlogPage(window.location.pathname)) {
                    document.body.classList.add('is-blog-page');
                }
            }
            // 首次進站
            updateBlogClass();
            // 監聽 VitePress 路由切換
            window.addEventListener('vitepress:pageview', updateBlogClass);
            // 監聽前進/返回
            window.addEventListener('popstate', updateBlogClass);
            // MutationObserver 監聽內容區變動
            const targetNode = document.querySelector('.VPSidebar') || document.getElementById('app');
            if (targetNode) {
                let debounceTimer = null;
                const observer = new MutationObserver(() => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(updateBlogClass, 100);
                });
                observer.observe(targetNode, { childList: true, subtree: true });
            }

            // --- 原本的功能 ---
            let lastContent = null;
            let hoverTimer = null;

            function replayIfChanged() {
                const doc = document.querySelector('.vp-doc');
                if (!doc) return;
                const current = doc.innerHTML;
                if (current !== lastContent) {
                    doc.classList.remove('fade-in-up');
                    void doc.offsetWidth;
                    doc.classList.add('fade-in-up');
                    lastContent = current;
                }
            }

            function replaceDocSearchHitSource() {
                document.querySelectorAll('.DocSearch-Hit-source').forEach(el => {
                    if (el.textContent === "Documentation") {
                        el.textContent = "搜尋結果";
                    }
                });
            }

            // --- 這裡是最終穩定版 ---
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
                    }, 120);
                }
            }

            // 只 setup 一次，全域代理
            function setupGlobalOutlineHoverScroll() {
                document.removeEventListener('mouseover', globalHoverDelegate);
                document.addEventListener('mouseover', globalHoverDelegate);
            }

            window.addEventListener('DOMContentLoaded', () => {
                replayIfChanged();
                replaceDocSearchHitSource();
                setupGlobalOutlineHoverScroll();
            });
            window.addEventListener('vitepress:pageview', () => {
                setTimeout(() => {
                    replayIfChanged();
                    replaceDocSearchHitSource();
                    setupGlobalOutlineHoverScroll();
                }, 80);
            });
            setInterval(() => {
                replayIfChanged();
                replaceDocSearchHitSource();
            }, 200);
        }
    }
}