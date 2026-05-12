import VPLTheme from '@lando/vitepress-theme-default-plus';
import MyCustomLayout from './MyCustomLayout.vue';
import './style.css';
import OpenCCConverter from '../components/OpenCCConverter.vue';
import Spoiler from './Spoiler.vue';
import { THEME_STORAGE_KEY } from './background/themes';
import ShareButtons from '../components/ShareButtons.vue';
import HeroSection from '../components/HeroSection.vue';

export default {
    extends: VPLTheme,
    Layout: MyCustomLayout,
    enhanceApp({ router, app }) {
        app.component('OpenCCConverter', OpenCCConverter);
        app.component('Spoiler', Spoiler);
        app.component('ShareButtons', ShareButtons);
        app.component('HeroSection', HeroSection);

        if (typeof document === 'undefined') return; // SSR 階段直接跳過

        // --- 注入 Android Chromium GPU 崩潰防禦 CSS ---
        const initCrashFixStyle = () => {
            if (document.getElementById('gpu-crash-fix')) return;
            const style = document.createElement('style');
            style.id = 'gpu-crash-fix';
            style.innerHTML = `
                /* 強迫 Chromium 引擎使用獨立的 GPU 合成層，避免 Android 15 驅動崩潰 */
                body, #app {
                    -webkit-transform: translateZ(0);
                    transform: translateZ(0);
                    backface-visibility: hidden;
                    perspective: 1000px;
                }
                /* 避免固定背景圖引發行動版 GPU 內存溢出 */
                @media (max-width: 768px) {
                    * {
                        background-attachment: scroll !important;
                    }
                }
            `;
            document.head.appendChild(style);
        };
        initCrashFixStyle();

        // --- Body Class 更新邏輯 ---
        function isBlogPage(path: string) {
            return /^\/(en\/)?blog\/(?!$|index|index-new)[\w-]+/.test(path) || /^\/docs\/[\w-]+/.test(path);
        }
        function updateBodyClasses() {
            const isBlog = isBlogPage(window.location.pathname);
            const isHome = !!document.querySelector('.VPHome');
            
            if (isBlog) document.body.classList.add('is-blog-page');
            else document.body.classList.remove('is-blog-page');

            if (isHome) document.body.classList.add('is-home-page');
            else document.body.classList.remove('is-home-page');
        }
        
        // 初始執行一次
        updateBodyClasses();
        // 🚫 [已刪除] setInterval(updateBodyClasses, 500) -> 避免無意義的 GPU 重繪災難

        // --- 其餘原本功能 ---
        let hoverTimer: NodeJS.Timeout | null = null;

        function globalHoverDelegate(e: Event) {
            const target = e.target as HTMLElement;
            const link = target?.closest('.outline-link');
            if (
                link &&
                link instanceof HTMLElement &&
                link.matches('.outline-link')
            ) {
                if (hoverTimer) clearTimeout(hoverTimer);

               // 滑鼠移出時清除 timer
                link.addEventListener('mouseleave', () => {
                     if (hoverTimer) clearTimeout(hoverTimer);
                }, { once: true });

                hoverTimer = setTimeout(() => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        const anchor = document.querySelector(href);
                        if (anchor) {
                            const elementPosition = anchor.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - 50;
                            
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }
                    }
                }, 500) as NodeJS.Timeout;
            }
        }

        function globalClickDelegate(e: Event) {
            const target = e.target as HTMLElement;
            // 處理主題鏈接點擊
            const themeLink = target?.closest('a[href^="#theme-"]');
            if (themeLink && themeLink instanceof HTMLElement) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const href = themeLink.getAttribute('href');
                if (href && href.startsWith('#theme-')) {
                    const themeId = href.replace('#theme-', '');
                    localStorage.setItem(THEME_STORAGE_KEY, themeId);
                    window.dispatchEvent(new CustomEvent('theme-change', {
                        detail: { theme: themeId }
                    }));

                    const dropdown = themeLink.closest('.VPNavBarMenuGroup');
                    if (dropdown) {
                        dropdown.classList.remove('open');
                    }
                }
                return false;
            }

            // 原有的 outline-link 處理邏輯
            const link = target?.closest('.outline-link');
            if (
                link &&
                link instanceof HTMLElement &&
                link.matches('.outline-link')
            ) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const anchor = document.querySelector(href);
                    if (anchor) {
                        const elementPosition = anchor.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - 50;

                        setTimeout(() => {
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }, 10);

                        setTimeout(() => {
                            history.pushState(null, '', href);
                        }, 50);
                    }
                }
                return false;
            }
        }

        function setupGlobalOutlineHoverScroll() {
            document.removeEventListener('mouseover', globalHoverDelegate);
            document.removeEventListener('click', globalClickDelegate, true);
            
            document.addEventListener('mouseover', globalHoverDelegate);
            document.addEventListener('click', globalClickDelegate, true); 
            
            setTimeout(() => {
                const outline = document.querySelector('.VPDocAsideOutline');
                if (outline) {
                    outline.addEventListener('click', (e) => {
                        const target = e.target as HTMLElement;
                        if (target) {
                            const link = target.closest('.outline-link');
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

            let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
            if (!canonical) {
                canonical = document.createElement('link');
                canonical.rel = 'canonical';
                document.head.appendChild(canonical);
            }
            canonical.href = pageUrl;

            let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
            if (!ogUrl) {
                ogUrl = document.createElement('meta');
                ogUrl.setAttribute('property', 'og:url');
                document.head.appendChild(ogUrl);
            }
            ogUrl.setAttribute('content', pageUrl);

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

        // --- 初始化與路由監聽 ---
        setupGlobalOutlineHoverScroll();
        updateCanonicalAndOg();

        window.addEventListener('DOMContentLoaded', () => {
            setupGlobalOutlineHoverScroll();
            updateCanonicalAndOg();
            updateBodyClasses();
        });

        // 取代原本的 setInterval，將更新邏輯綁定在路由切換時
        window.addEventListener('vitepress:pageview', () => {
            setTimeout(() => {
                setupGlobalOutlineHoverScroll();
                updateCanonicalAndOg();
                updateBodyClasses();
            }, 80);
        });

        if (router && typeof router.onAfterRouteChanged === 'function') {
            router.onAfterRouteChanged(() => {
                setTimeout(() => {
                    setupGlobalOutlineHoverScroll();
                    updateCanonicalAndOg();
                    updateBodyClasses();
                }, 50);
            });
        }
        
        // 🚫 [已刪除] setInterval(HEAD_SYNC_INTERVAL) -> 路由監聽已經足夠處理 SEO 標籤同步
    }
};
