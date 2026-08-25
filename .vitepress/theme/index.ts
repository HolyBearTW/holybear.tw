import VPLTheme from '@lando/vitepress-theme-default-plus';
import MyCustomLayout from './MyCustomLayout.vue';
import './assets/fonts/line-seed/LINESeed.css';
import './style.css';
import OpenCCConverter from '../components/OpenCCConverter.vue';
import Spoiler from './Spoiler.vue';
import { defaultTheme, THEME_STORAGE_KEY } from './background/themes';
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
                /* 僅提升背景層的 GPU 合成，避免祖先 transform 破壞 fixed 背景定位 */
                .mobile-flash-guard,
                .tech-background,
                .animated-background,
                .gaming-rgb-theme,
                .slow-3d-fly-theme,
                .hyperos-background,
                .core-tower-background,
                .christmas-background,
                .halloween-background,
                .gravity-container,
                .gravity-container canvas,
                body.hyperos2-bg::before,
                body.hyperos2-bg::after {
                    -webkit-transform: translate3d(0, 0, 0);
                    transform: translate3d(0, 0, 0);
                    will-change: transform, opacity;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
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

        const initDesktopNavFlyoutFix = () => {
            if (document.getElementById('hb-desktop-nav-flyout-fix')) return;
            const style = document.createElement('style');
            style.id = 'hb-desktop-nav-flyout-fix';
            style.innerHTML = `
                @media (min-width: 960px) {
                    body.is-blog-page .VPNav,
                    body.is-blog-page .VPNavBar,
                    body.is-blog-page .VPNavBar > .wrapper,
                    body.is-blog-page .VPNavBar > .container,
                    body.is-blog-page .VPNavBar .content,
                    body.is-blog-page .VPNavBar .content-body {
                        overflow: visible !important;
                    }

                    body.is-blog-page .VPNav,
                    body.is-blog-page .VPNavBar {
                        z-index: 120 !important;
                        pointer-events: auto !important;
                    }

                    body.is-blog-page .VPFlyout:hover .menu[data-v-546fcfc2],
                    body.is-blog-page .VPFlyout:focus-within .menu[data-v-546fcfc2],
                    body.is-blog-page .VPFlyout .button[aria-expanded="true"] + .menu[data-v-546fcfc2],
                    body.is-blog-page .VPFlyout:hover .menu[data-v-ce7cea34],
                    body.is-blog-page .VPFlyout:focus-within .menu[data-v-ce7cea34],
                    body.is-blog-page .VPFlyout .button[aria-expanded="true"] + .menu[data-v-ce7cea34] {
                        visibility: visible !important;
                        opacity: 1 !important;
                        pointer-events: auto !important;
                    }
                }
            `;
            document.head.appendChild(style);
        };
        initDesktopNavFlyoutFix();

        let activeNavPortal: HTMLElement | null = null;
        let activeNavPortalSource: HTMLElement | null = null;
        let activeNavPortalSignature: string | null = null;
        let isNavPortalHovered = false;
        let lastNavPortalRect: DOMRect | null = null;
        let navPortalCloseTimer: ReturnType<typeof setTimeout> | null = null;

        const syncCurrentThemeSelection = (root: ParentNode = document) => {
            const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || defaultTheme;
            root.querySelectorAll<HTMLElement>('a[href^="#theme-"]').forEach((link) => {
                const isCurrent = link.getAttribute('href') === `#theme-${currentTheme}`;
                link.classList.toggle('active', isCurrent);
                link.classList.toggle('hb-current-theme', isCurrent);
                if (isCurrent) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        };

        const clearDesktopNavPortalCloseTimer = () => {
            if (!navPortalCloseTimer) return;
            clearTimeout(navPortalCloseTimer);
            navPortalCloseTimer = null;
        };

        const isDesktopNavPortalEligible = (root: HTMLElement) => {
            return !!root.querySelector(':scope > .menu > .VPMenu');
        };

        const setDesktopNavSourceHidden = (root: HTMLElement | null, hidden: boolean) => {
            if (!root) return;
            const menu = root.querySelector<HTMLElement>(':scope > .menu');
            const panel = root.querySelector<HTMLElement>(':scope > .menu > .VPMenu, :scope > .VPMenu');

            root.classList.toggle('hb-nav-portal-source', hidden);

            if (!menu || !panel) return;

            if (hidden) {
                menu.style.setProperty('display', 'none', 'important');
                menu.style.setProperty('opacity', '0', 'important');
                menu.style.setProperty('visibility', 'hidden', 'important');
                menu.style.setProperty('pointer-events', 'none', 'important');
                panel.style.setProperty('opacity', '0', 'important');
                panel.style.setProperty('visibility', 'hidden', 'important');
                panel.style.setProperty('pointer-events', 'none', 'important');
            }
            else {
                menu.style.removeProperty('display');
                menu.style.removeProperty('opacity');
                menu.style.removeProperty('visibility');
                menu.style.removeProperty('pointer-events');
                panel.style.removeProperty('opacity');
                panel.style.removeProperty('visibility');
                panel.style.removeProperty('pointer-events');
            }
        };

        const queueDesktopNavPortalRemoval = () => {
            clearDesktopNavPortalCloseTimer();
            navPortalCloseTimer = setTimeout(() => {
                const activeRoot = getActiveDesktopNavRoot();
                if (activeRoot || isNavPortalHovered) return;
                removeDesktopNavPortal();
            }, 420);
        };

        const removeDesktopNavPortal = () => {
            clearDesktopNavPortalCloseTimer();
            setDesktopNavSourceHidden(activeNavPortalSource, false);
            activeNavPortal?.remove();
            activeNavPortal = null;
            activeNavPortalSource = null;
            activeNavPortalSignature = null;
            isNavPortalHovered = false;
            lastNavPortalRect = null;
            document.body.classList.remove('hb-nav-menu-portal-active');
        };

        const getActiveDesktopNavRoot = () => {
            const roots = Array.from(document.querySelectorAll<HTMLElement>('.VPNav .VPFlyout, .VPNav .VPNavBarMenuGroup'));
            return roots.find((root) => {
                if (!isDesktopNavPortalEligible(root)) return false;
                return root.matches(':hover') || root.matches(':focus-within');
            }) || null;
        };

        const syncDesktopNavPortal = () => {
            if (typeof window === 'undefined' || window.innerWidth < 960) {
                removeDesktopNavPortal();
                return;
            }

            clearDesktopNavPortalCloseTimer();
            const activeRoot = getActiveDesktopNavRoot();
            if (!activeRoot && !isNavPortalHovered) {
                queueDesktopNavPortalRemoval();
                return;
            }

            let sourceRoot = activeRoot || (activeNavPortalSource?.isConnected ? activeNavPortalSource : null);
            if (!sourceRoot && isNavPortalHovered && activeNavPortal) {
                const expectsTranslations = activeNavPortal.classList.contains('hb-nav-menu-portal-translations');
                const currentRoots = Array.from(document.querySelectorAll<HTMLElement>('.VPNav .VPFlyout, .VPNav .VPNavBarMenuGroup'));
                sourceRoot = currentRoots.find((root) => {
                    if (!isDesktopNavPortalEligible(root)) return false;
                    const isTranslations = root.classList.contains('VPNavBarTranslations') || root.classList.contains('translations');
                    return isTranslations === expectsTranslations;
                }) || null;
            }
            if (!sourceRoot) {
                removeDesktopNavPortal();
                return;
            }

            const sourceMenu = sourceRoot.querySelector<HTMLElement>(':scope > .menu');
            const sourcePanel = sourceMenu?.querySelector<HTMLElement>(':scope > .VPMenu');
            const sourceButton = sourceRoot.querySelector<HTMLElement>(':scope > .button');

            if (!sourceMenu || !sourcePanel || !sourceButton) {
                removeDesktopNavPortal();
                return;
            }

            if (!activeNavPortal) {
                activeNavPortal = document.createElement('div');
                activeNavPortal.className = 'hb-nav-menu-portal';
                activeNavPortal.style.setProperty('left', '-9999px');
                activeNavPortal.style.setProperty('top', '-9999px');
                activeNavPortal.addEventListener('mouseenter', () => {
                    clearDesktopNavPortalCloseTimer();
                    isNavPortalHovered = true;
                });
                activeNavPortal.addEventListener('mouseleave', () => {
                    isNavPortalHovered = false;
                    queueDesktopNavPortalRemoval();
                });
                document.body.appendChild(activeNavPortal);
            }

            document.body.classList.add('hb-nav-menu-portal-active');

            const buttonRect = sourceButton.getBoundingClientRect();
            const panelRect = sourcePanel.getBoundingClientRect();
            const isTranslationsRoot = sourceRoot.classList.contains('VPNavBarTranslations') || sourceRoot.classList.contains('translations');
            const sourceSignature = `${document.documentElement.lang}\n${sourcePanel.innerHTML}`;
            const measuredWidth = panelRect.width || sourcePanel.scrollWidth || sourceMenu.scrollWidth;
            const preservedWidth = activeNavPortalSource === sourceRoot ? lastNavPortalRect?.width || 0 : 0;
            const fallbackWidth = Math.max(sourceButton.offsetWidth + 20, 168);
            const fallbackHeight = sourcePanel.scrollHeight || sourceMenu.scrollHeight || 0;
            const width = Math.round(measuredWidth || preservedWidth || fallbackWidth);
            const alignmentOffset = sourceRoot.matches('.VPNavBarMenuGroup:has(a[href^="#theme-"])') ? 14 : 0;
            const rawLeft = Math.round(buttonRect.right - width + alignmentOffset);
            const left = Math.max(12, Math.min(rawLeft, window.innerWidth - width - 12));
            const top = Math.round(buttonRect.bottom - 4);
            const height = Math.round(panelRect.height || fallbackHeight);

            if (activeNavPortalSource && activeNavPortalSource !== sourceRoot) {
                setDesktopNavSourceHidden(activeNavPortalSource, false);
            }
            setDesktopNavSourceHidden(sourceRoot, true);

            activeNavPortal.classList.toggle(
                'hb-nav-menu-portal-translations',
                isTranslationsRoot
            );

            if (
                activeNavPortalSource !== sourceRoot ||
                activeNavPortal.childElementCount === 0 ||
                activeNavPortalSignature !== sourceSignature
            ) {
                const nextPanel = sourcePanel.cloneNode(true) as HTMLElement;
                if (activeNavPortal.classList.contains('hb-nav-menu-portal-translations')) {
                    const title = nextPanel.querySelector<HTMLElement>('.title');
                    if (title) {
                        const currentLocaleRow = document.createElement('div');
                        currentLocaleRow.className = 'VPMenuLink';

                        const currentLocaleLabel = document.createElement('span');
                        currentLocaleLabel.className = 'VPLink link lando active hb-current-locale';
                        currentLocaleLabel.textContent = title.textContent || '';
                        const currentLocaleLang = title.getAttribute('lang') || document.documentElement.lang || '';
                        const currentLocaleHrefLang = title.getAttribute('hreflang') || currentLocaleLang;

                        if (currentLocaleLang) {
                            currentLocaleLabel.setAttribute('lang', currentLocaleLang);
                        }

                        if (currentLocaleHrefLang) {
                            currentLocaleLabel.setAttribute('hreflang', currentLocaleHrefLang);
                        }

                        currentLocaleRow.appendChild(currentLocaleLabel);
                        title.replaceWith(currentLocaleRow);
                    }
                }
                syncCurrentThemeSelection(nextPanel);
                nextPanel.style.setProperty('visibility', 'visible', 'important');
                nextPanel.style.setProperty('opacity', '1', 'important');
                nextPanel.style.setProperty('pointer-events', 'auto', 'important');
                activeNavPortal.replaceChildren(nextPanel);
                activeNavPortalSignature = sourceSignature;
            }
            activeNavPortalSource = sourceRoot;

            lastNavPortalRect = new DOMRect(left, top, width, height);

            activeNavPortal.style.setProperty('left', `${left}px`);
            activeNavPortal.style.setProperty('top', `${top}px`);
            activeNavPortal.style.setProperty('width', `${width}px`);
        };

        const updateDesktopNavMenuState = () => {
            if (typeof window === 'undefined') return;

            const isDesktop = window.innerWidth >= 960;
            if (!isDesktop) {
                document.body.classList.remove('hb-nav-menu-open');
                applyDesktopNavMenuOpenStyles(false);
                return;
            }

            const isOpen = isNavPortalHovered || !!document.querySelector(
                '.VPNav .VPFlyout:hover, ' +
                '.VPNav .VPFlyout:focus-within, ' +
                '.VPNav .VPNavBarMenuGroup:hover, ' +
                '.VPNav .VPNavBarMenuGroup:focus-within'
            );

            document.body.classList.toggle('hb-nav-menu-open', isOpen);
            applyDesktopNavMenuOpenStyles(isOpen);
            syncDesktopNavPortal();
        };

        const applyDesktopNavMenuOpenStyles = (isOpen: boolean) => {
            if (!isOpen) {
                removeDesktopNavPortal();
            }
        };

        const scheduleDesktopNavMenuStateUpdate = () => {
            requestAnimationFrame(() => {
                updateDesktopNavMenuState();
            });
        };

        // --- Body Class 更新邏輯 (MutationObserver 版) ---
        function isBlogPage(path: string) {
            return /^\/(en\/)?blog\/(?!$|index|index-new)[\w-]+/.test(path) || /^\/docs\/[\w-]+/.test(path);
        }

        function applyDesktopBlogNavFix() {
            if (typeof window === 'undefined' || window.innerWidth < 960) return;
            if (!document.body.classList.contains('is-blog-page')) return;

            const navSelectors = [
                '.VPNav',
                '.VPNavBar',
                '.VPNavBar > .wrapper',
                '.VPNavBar > .container',
                '.VPNavBar .content',
                '.VPNavBar .content-body',
            ];

            for (const selector of navSelectors) {
                const element = document.querySelector<HTMLElement>(selector);
                if (!element) continue;
                element.style.setProperty('overflow', 'visible', 'important');
            }

            const nav = document.querySelector<HTMLElement>('.VPNav');
            const navBar = document.querySelector<HTMLElement>('.VPNavBar');
            nav?.style.setProperty('z-index', '120', 'important');
            navBar?.style.setProperty('z-index', '120', 'important');
            nav?.style.setProperty('pointer-events', 'auto', 'important');
            navBar?.style.setProperty('pointer-events', 'auto', 'important');
        }
        
        function updateBodyClasses() {
            const isBlog = isBlogPage(window.location.pathname);
            const isHome = !!document.querySelector('.VPHome');
            
            if (isBlog) document.body.classList.add('is-blog-page');
            else document.body.classList.remove('is-blog-page');

            if (isHome) document.body.classList.add('is-home-page');
            else document.body.classList.remove('is-home-page');

            requestAnimationFrame(() => {
                applyDesktopBlogNavFix();
                syncCurrentThemeSelection();
                updateDesktopNavMenuState();
            });
        }

        // 建立 DOM 觀察者，精準取代 setInterval，並加入「絕對領域防護罩」
        if (typeof window !== 'undefined') {
            let timeoutId: NodeJS.Timeout | null = null;

            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                for (const m of mutations) {
                    const target = m.target as Node;
                    // 關鍵修復：如果是文字節點變動(例如音樂秒數)，就往上找它的父元素
                    const el = (target.nodeType === 3 ? target.parentElement : target) as HTMLElement;
                    
                    if (el && typeof el.closest === 'function') {
                        // 🛑 核心防禦：只要這個變動是發生在「輪播圖」或「音樂播放器」裡面，我們直接無視！
                        if (el.closest('.carousel-container') || el.closest('.music-container') || el.closest('.progress')) {
                            continue;
                        }
                    }
                    // 只要有一丁點不是播放器或輪播圖造成的變動（例如切換頁面），就放行
                    shouldUpdate = true;
                    break;
                }

                if (shouldUpdate) {
                    // 防抖機制：即使瞬間收到有效的 DOM 替換請求，也只在 50ms 後執行一次
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        updateBodyClasses();
                    }, 50);
                }
            });

            window.addEventListener('DOMContentLoaded', () => {
                const appContainer = document.querySelector('#app') || document.body;
                observer.observe(appContainer, { 
                    childList: true, 
                    subtree: true 
                    // 注意：這裡絕對不要加 attributes: true，這樣就無敵了
                });
                updateBodyClasses(); // 首次載入先執行一次
            });

            window.addEventListener('resize', applyDesktopBlogNavFix);
            window.addEventListener('resize', scheduleDesktopNavMenuStateUpdate);
            document.addEventListener('mouseover', scheduleDesktopNavMenuStateUpdate, true);
            document.addEventListener('mouseout', scheduleDesktopNavMenuStateUpdate, true);
            document.addEventListener('focusin', scheduleDesktopNavMenuStateUpdate, true);
            document.addEventListener('focusout', scheduleDesktopNavMenuStateUpdate, true);
            document.addEventListener('click', scheduleDesktopNavMenuStateUpdate, true);
        }

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
                    syncCurrentThemeSelection();

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

        // 綁定事件以應對 VitePress 的動態路由
        window.addEventListener('vitepress:pageview', () => {
            setTimeout(() => {
                setupGlobalOutlineHoverScroll();
                updateCanonicalAndOg();
                updateBodyClasses();
                updateDesktopNavMenuState();
            }, 80);
        });

        if (router) {
            const previousBeforeRouteChange = router.onBeforeRouteChange;
            router.onBeforeRouteChange = async (to) => {
                const targetUrl = new URL(to, window.location.origin);
                const isSameDocument = targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search;
                if (!isSameDocument) {
                    window.dispatchEvent(new CustomEvent('holybear-route-loading-start'));
                }
                return previousBeforeRouteChange?.(to);
            };

            const previousAfterRouteChange = router.onAfterRouteChange;
            router.onAfterRouteChange = async (to) => {
                await previousAfterRouteChange?.(to);
                const routePath = new URL(to, window.location.origin).pathname.replace(/\/$/, '');
                if (routePath !== '/maplestory') {
                    window.dispatchEvent(new CustomEvent('holybear-route-loading-finish'));
                } else {
                    // React wrapper normally finishes the loading frame as soon as its content mounts.
                    // Keep a route-level fallback so cached or interrupted mounts can never trap the page.
                    window.setTimeout(() => {
                        const currentPath = window.location.pathname.replace(/\/$/, '');
                        if (currentPath === '/maplestory') {
                            window.dispatchEvent(new CustomEvent('holybear-route-loading-finish'));
                        }
                    }, 1800);
                }
                setTimeout(() => {
                    setupGlobalOutlineHoverScroll();
                    updateCanonicalAndOg();
                    updateBodyClasses();
                    updateDesktopNavMenuState();
                }, 50);
            };
        }
    }
};
