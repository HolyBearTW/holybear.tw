import MyCustomLayout from './MyCustomLayout.vue'
import './style.css'

export default {
    Layout: MyCustomLayout,
    enhanceApp() {
        if (typeof window !== 'undefined') {
            function isBlogListPage(path) {
                return /^\/(en\/)?blog\/?(index\.html)?$/.test(path);
            }

            function forceBlogClass() {
                const cls = document.body.className.split(' ').filter(c => c && c !== 'is-blog-page');
                if (isBlogListPage(window.location.pathname)) {
                    cls.push('is-blog-page');
                }
                document.body.className = cls.join(' ');
            }

            forceBlogClass();
            setInterval(forceBlogClass, 200);

            let lastContent = null;
            let hoverTimer = null;

            function replayIfChanged() {
                const doc = document.querySelector('.vp-doc');
                if (!doc) return;

                if (isBlogListPage(window.location.pathname)) return;

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

            function globalHoverDelegate(e) {
                const link = e.target.closest('.outline-link');
                if (link && link instanceof HTMLElement && link.matches('.outline-link')) {
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
