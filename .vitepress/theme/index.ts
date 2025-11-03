import MyCustomLayout from './MyCustomLayout.vue';
import './style.css';
import OpenCCConverter from '../components/OpenCCConverter.vue';
import Spoiler from './Spoiler.vue';

export default {
    Layout: MyCustomLayout,
    enhanceApp({ router, app }) {
        // ✅ 就是這一行！在此註冊您的元件
        app.component('OpenCCConverter', OpenCCConverter);
        app.component('Spoiler', Spoiler);

        // --- 您原本的所有其他程式碼都保留 ---
        if (typeof document === 'undefined') return; // SSR 階段直接跳過

        // 確保預設為深色模式（首次訪問時）
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const savedTheme = localStorage.getItem('vitepress-theme-appearance');
            if (!savedTheme) {
                // 首次訪問,設定為深色模式
                localStorage.setItem('vitepress-theme-appearance', 'dark');
                document.documentElement.classList.add('dark');
            }
        }

        // 恢復 is-blog-page 判斷，只加在文章內頁（不是首頁、index-new等列表頁）
        function isBlogPage(path: string) {
            // 匹配 /blog/xxxx、/en/blog/xxxx、/docs/xxxx 文章頁（不是列表頁）
            return /^\/(en\/)?blog\/(?!$|index|index-new)[\w-]+/.test(path) || /^\/docs\/[\w-]+/.test(path);
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

        // ==================== 深色/淺色模式切換動畫效果 ====================
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            let isAnimating = false;
            
            // 攔截主題切換按鈕的點擊事件
            document.addEventListener('click', (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                const switchBtn = target?.closest('.VPSwitchAppearance');
                
                if (switchBtn && !isAnimating) {
                    e.preventDefault();
                    e.stopPropagation();
                    isAnimating = true;
                    
                    // 檢查是否在首頁
                    const isHomePage = document.querySelector('.VPHome') !== null;
                    
                    // 獲取當前主題
                    const isDark = document.documentElement.classList.contains('dark');
                    const direction = isDark ? 'to-light' : 'to-dark';
                    
                    // === 文章內頁的動畫邏輯 ===
                    if (!isHomePage) {
                        // 捕獲當前的背景色（主內容區和側邊欄）
                        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                        const sidebar = document.querySelector('.VPSidebar, aside') as HTMLElement;
                        const sidebarBg = sidebar ? window.getComputedStyle(sidebar).backgroundColor : bodyBg;
                        
                        // 創建舊背景容器（在內容下方，模擬首頁的邏輯）
                        const oldBgContainer = document.createElement('div');
                        oldBgContainer.className = 'theme-transition-overlay';
                        oldBgContainer.setAttribute('data-direction', direction);
                        oldBgContainer.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            width: 100%;
                            height: 100%;
                            z-index: -1;
                            pointer-events: none;
                            transition: transform 1.5s cubic-bezier(0.4, 0, 0.2, 1);
                            overflow: hidden;
                        `;
                        
                        // 檢查側邊欄位置
                        if (sidebar) {
                            const sidebarRect = sidebar.getBoundingClientRect();
                            
                            // 創建側邊欄區域的舊背景
                            const sidebarBgDiv = document.createElement('div');
                            sidebarBgDiv.style.cssText = `
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: ${sidebarRect.right}px;
                                height: 100%;
                                background: ${sidebarBg};
                            `;
                            oldBgContainer.appendChild(sidebarBgDiv);
                            
                            // 創建主內容區背景（從側邊欄右側開始）
                            const mainBg = document.createElement('div');
                            mainBg.style.cssText = `
                                position: absolute;
                                top: 0;
                                left: ${sidebarRect.right}px;
                                right: 0;
                                bottom: 0;
                                background: ${bodyBg};
                            `;
                            oldBgContainer.appendChild(mainBg);
                        } else {
                            // 沒有側邊欄時，主內容區佔滿整個寬度
                            const mainBg = document.createElement('div');
                            mainBg.style.cssText = `
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${bodyBg};
                            `;
                            oldBgContainer.appendChild(mainBg);
                        }
                        
                        // 插入到 body 的第一個子元素之前（在內容下方）
                        document.body.insertBefore(oldBgContainer, document.body.firstChild);
                        
                        // 強制導航欄立即變透明並禁用過渡效果
                        const nav = document.querySelector('.VPNav') as HTMLElement;
                        const navBar = document.querySelector('.VPNavBar') as HTMLElement;
                        if (nav) {
                            nav.style.setProperty('transition', 'none', 'important');
                            nav.style.setProperty('background-color', 'transparent', 'important');
                        }
                        if (navBar) {
                            navBar.style.setProperty('transition', 'none', 'important');
                            navBar.style.setProperty('background-color', 'transparent', 'important');
                            navBar.style.setProperty('border-bottom-color', 'transparent', 'important');
                        }
                        

                        
                        // 立即切換主題並保存到 localStorage
                        if (isDark) {
                            document.documentElement.classList.remove('dark');
                            localStorage.setItem('vitepress-theme-appearance', 'light');
                        } else {
                            document.documentElement.classList.add('dark');
                            localStorage.setItem('vitepress-theme-appearance', 'dark');
                        }
                        
                        // 觸發滑出動畫
                        requestAnimationFrame(() => {
                            if (direction === 'to-light') {
                                oldBgContainer.style.transform = 'translateY(-100%)';
                            } else {
                                oldBgContainer.style.transform = 'translateY(100%)';
                            }
                        });
                        
                        // 清理
                        setTimeout(() => {
                            oldBgContainer.remove();
                            
                            // 恢復導航欄的正常樣式
                            const nav = document.querySelector('.VPNav') as HTMLElement;
                            const navBar = document.querySelector('.VPNavBar') as HTMLElement;
                            if (nav) {
                                nav.style.removeProperty('transition');
                                nav.style.removeProperty('background-color');
                            }
                            if (navBar) {
                                navBar.style.removeProperty('transition');
                                navBar.style.removeProperty('background-color');
                                navBar.style.removeProperty('border-bottom-color');
                            }
                            
                            isAnimating = false;
                        }, 1500);
                        
                        return;
                    }
                    
                    // === 首頁的背景推開動畫邏輯 ===
                    
                    // ⚠️ 重要：在切換主題之前先捕獲當前背景樣式
                    const beforeStyle = window.getComputedStyle(document.body, '::before');
                    const afterStyle = window.getComputedStyle(document.body, '::after');
                    
                    // 創建容器來包裝兩層背景
                    const oldBgContainer = document.createElement('div');
                    oldBgContainer.className = 'theme-transition-bg-container';
                    oldBgContainer.setAttribute('data-direction', direction);
                    oldBgContainer.style.cssText = `
                        position: fixed;
                        top: -10%;
                        left: -10%;
                        right: -10%;
                        bottom: -10%;
                        width: 120%;
                        height: 120%;
                        z-index: -1;
                        pointer-events: none;
                        transition: transform 1.5s cubic-bezier(0.4, 0, 0.2, 1);
                        overflow: hidden;
                    `;
                    
                    // 創建 ::before 層的副本
                    const oldBg = document.createElement('div');
                    oldBg.style.cssText = `
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        background: ${beforeStyle.background} !important;
                        background-size: ${beforeStyle.backgroundSize} !important;
                        background-position: ${beforeStyle.backgroundPosition} !important;
                        filter: ${beforeStyle.filter} !important;
                        animation: ${beforeStyle.animation} !important;
                        opacity: 1 !important;
                        transition: none !important;
                    `;
                    oldBgContainer.appendChild(oldBg);
                    
                    // 創建 ::after 層的副本（如果有的話）
                    const afterBg = afterStyle.background;
                    if (afterBg && afterBg !== 'none' && afterBg !== 'rgba(0, 0, 0, 0)') {
                        const oldBgAfter = document.createElement('div');
                        oldBgAfter.style.cssText = `
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            right: 0 !important;
                            bottom: 0 !important;
                            background: ${afterStyle.background} !important;
                            background-size: ${afterStyle.backgroundSize} !important;
                            background-position: ${afterStyle.backgroundPosition} !important;
                            filter: ${afterStyle.filter} !important;
                            mix-blend-mode: ${afterStyle.mixBlendMode} !important;
                            opacity: ${afterStyle.opacity} !important;
                            animation: ${afterStyle.animation} !important;
                            transition: none !important;
                        `;
                        oldBgContainer.appendChild(oldBgAfter);
                    }
                    
                    // 插入到 body 的第一個子元素之前，與 ::before 同層級
                    document.body.insertBefore(oldBgContainer, document.body.firstChild);
                    
                    // 立即切換主題並保存到 localStorage（讓新背景在下方）
                    if (isDark) {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('vitepress-theme-appearance', 'light');
                    } else {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('vitepress-theme-appearance', 'dark');
                    }
                    
                    // 觸發滑出動畫
                    requestAnimationFrame(() => {
                        if (direction === 'to-light') {
                            oldBgContainer.style.transform = 'translateY(-100%)';
                        } else {
                            oldBgContainer.style.transform = 'translateY(100%)';
                        }
                    });
                    
                    // 動畫結束後清理
                    setTimeout(() => {
                        oldBgContainer.remove();
                        isAnimating = false;
                    }, 1500);
                }
            }, true);
        }

        // --- 其餘原本功能 ---
        let lastContent: string | null = null;
        let hoverTimer: NodeJS.Timeout | null = null;

            // 萬聖節主題自動切換
            function isHalloweenPeriod() {
                const now = new Date();
                // 2025/10/31 00:00 ~ 2025/11/01 12:00
                const start = new Date('2025-10-31T00:00:00+08:00');
                const end = new Date('2025-11-01T12:00:00+08:00');
                return now >= start && now < end;
            }
            function setHalloweenTheme(enable: boolean) {
                if (enable) {
                    if (!document.body.classList.contains('halloween-theme')) {
                        document.body.classList.add('halloween-theme');
                    }
                    // 以 import 方式載入萬聖節動畫 JS（蝙蝠+南瓜燈怪物）
                    import('../components/halloween-effect.js').then(mod => {
                        if (mod && typeof mod.showHalloweenEffect === 'function') {
                            mod.showHalloweenEffect();
                        }
                    });
                } else {
                    document.body.classList.remove('halloween-theme');
                    const css = document.getElementById('halloween-css');
                    if (css) css.remove();
                    // 移除萬聖節動畫
                    const bats = document.getElementById('halloween-bats');
                    if (bats) bats.remove();
                    const pumpkin = document.getElementById('halloween-pumpkin');
                    if (pumpkin) pumpkin.remove();
                    const effectJs = document.getElementById('halloween-effect-js');
                    if (effectJs) effectJs.remove();
                }
            }
            // 初始判斷
            setHalloweenTheme(isHalloweenPeriod());
            // 每分鐘重新判斷一次
            setInterval(() => {
                setHalloweenTheme(isHalloweenPeriod());
            }, 60000);

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
                }, 500) as NodeJS.Timeout;
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