/* import { defineConfig } from 'vitepress' */
import { defineConfig } from '@lando/vitepress-theme-default-plus/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import locales from './locales'
import gitMetaPlugin from './git-meta'
import sidebar from './sidebars/blog.sidebar'
import TelegramRoseBotDocsSidebar from './sidebars/Telegram-Rose-Bot-docs.sidebar.ts'
import VitepressBlogDocsSidebar from './sidebars/Vitepress-Blog-docs-sidebar.ts'
import SpoilerComponentDocsSidebar from './sidebars/spoiler-component-docs-sidebar.ts'

export default defineConfig({
    ignoreDeadLinks: true,
    title: '聖小熊的秘密基地',
    base: '/',
    lang: 'zh-TW',
    locales: locales.locales,
    srcExclude: ['README.md'],
    // 啟用 cleanUrls，移除路由中的 .html 後綴
    cleanUrls: true,
    appearance: 'dark',
    head: [
        ['meta', { name: 'theme-color', content: '#00FFEE' }],
        // Favicon 完整配置 - 修正為絕對路徑以幫助 Google 識別
        ['link', { rel: 'icon', type: 'image/x-icon', href: 'https://holybear.tw/favicon.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: 'https://holybear.tw/favicon.png' }],
        ['link', { rel: 'icon', href: 'https://holybear.tw/favicon.png' }],
        ['link', { rel: 'shortcut icon', type: 'image/png', href: 'https://holybear.tw/favicon.png' }],
        ['link', { rel: 'apple-touch-icon', sizes: '64x64', href: 'https://holybear.tw/favicon.png' }],
        
        ['link', { rel: 'mask-icon', href: '/favicon.png', color: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileColor', content: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileImage', content: '/favicon.png' }],
        ['link', {
            rel: 'stylesheet',
            href: '/fonts/LINESeed.css'
        }],
        // 網站說明與標籤
        ['meta', { name: 'description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
        ['meta', { name: 'keywords', content: '聖小熊, HolyBear, HyperOS, 模組, Mod, MIUI, Android, GitHub, 技術部落格, Blog' }],
        
        // 靜態 OG 標籤 - 做為備用，動態邏輯會覆蓋它
        ['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }],
        
        // Twitter Card
        ['meta', { name: 'twitter:card', content: 'summary' }],
        ['meta', { name: 'twitter:image', content: '/logo.png' }],
        // Nexon Analytics
        ['script', { type: 'text/javascript', src: 'https://openapi.nexon.com/js/analytics.js?app_id=245469', async: '' }]
    ],
    vite: {
        plugins: [gitMetaPlugin(), react()],
        resolve: {
            alias: {
                react: fileURLToPath(new URL('../node_modules/react', import.meta.url)),
                'react-dom': fileURLToPath(new URL('../node_modules/react-dom', import.meta.url)),
            },
            dedupe: ['react', 'react-dom'],
        },
        optimizeDeps: {
            include: [
                'react', 
                'react-dom', 
                'react-dom/client',
                'lucide-react',
                'markdown-it',
                'recharts',
                '@google/genai'
            ],
        },
        server: {
            fs: {
                // 嚴格限制可訪問的目錄
                allow: ['.'],
                // 明確拒絕訪問敏感目錄
                deny: ['.env', '.env.*', '*.{pem,crt,key}', 'node_modules/**']
            },
            // 增加 CORS 限制
            cors: true,
        },
    },   
    // ✨ START: 整合所有 OG 標籤的最終邏輯 (SEO 修正版) ✨
    transformHead({ pageData, head }) {
            const { frontmatter, relativePath } = pageData;

            // 即使是首頁也要處理
            if (relativePath == null) return head;

            // --- 常數與路徑正規化 ---
            const siteUrl = 'https://holybear.tw'; // 修正：移除結尾斜槓，保持一致性
            const normalizedPath = ('/' + String(relativePath).replace(/\\/g, '/'))
                .replace(/\.md$/, '')
                .replace(/\/index$/, '/')
                .replace(/\.html$/, '');
            
            // 確保網址組合時不會出現雙斜槓 //
            const pageUrl = normalizedPath === '/' ? siteUrl + '/' : siteUrl + normalizedPath;

            // --- 1. 取得預設值 ---
            const defaultTitle = head.find(tag => tag[1]?.property === 'og:title')?.[1].content || '';
            const defaultDesc = head.find(tag => tag[1]?.name === 'description')?.[1].content || '';
            const defaultImage = head.find(tag => tag[1]?.property === 'og:image')?.[1].content || '';

            const pageTitle = frontmatter.title || defaultTitle;
            const pageDescription = frontmatter.description || defaultDesc;
            
            // 圖片路徑處理
            let pageImage = defaultImage;
            if (frontmatter.image) {
                if (frontmatter.image.startsWith('http')) {
                    pageImage = frontmatter.image;
                } else {
                    // 確保圖片路徑正確拼接
                    pageImage = `${siteUrl}${frontmatter.image.startsWith('/') ? '' : '/'}${frontmatter.image}`;
                }
            }

            // --- 2. 決定頁面類型 ---
            // 修正：將英文首頁也視為首頁，以防止 Google 誤判
            const isHomePage = normalizedPath === '/' || normalizedPath === '' || normalizedPath === '/en/';
            const isArticle = normalizedPath.startsWith('/blog/') || normalizedPath.startsWith('/en/blog/');
            const pageType = isArticle ? 'article' : 'website';

            // --- 3. 移除 head 中舊的 OG / canonical / JSON-LD，確保乾淨 ---
            const cleanHead = head.filter(tag =>
                !(tag[0] === 'link' && tag[1]?.rel === 'canonical') &&
                !(tag[1]?.property?.startsWith('og:')) &&
                !(tag[1]?.type === 'application/ld+json') && // 移除所有舊的 JSON-LD
                !(tag[1]?.name === 'x-page-image') &&
                !(tag[1]?.name === 'twitter:image')
            );

            // --- 4. 加入正確的 canonical 與 OG 標籤 ---
            cleanHead.push(['link', { rel: 'canonical', href: pageUrl }]);
            cleanHead.push(['meta', { property: 'og:title', content: pageTitle }]);
            cleanHead.push(['meta', { property: 'og:description', content: pageDescription }]);
            cleanHead.push(['meta', { property: 'og:image', content: pageImage }]);
            cleanHead.push(['meta', { property: 'og:type', content: pageType }]);
            cleanHead.push(['meta', { property: 'og:url', content: pageUrl }]);
            
            // 【關鍵修正】強制統一 Site Name，不論語系
            const globalSiteName = '聖小熊的秘密基地';
            cleanHead.push(['meta', { property: 'og:site_name', content: globalSiteName }]);
            
            cleanHead.push(['meta', { name: 'twitter:image', content: pageImage }]);
            cleanHead.push(['meta', { name: 'x-page-image', content: pageImage }]);

            // --- 5. 根據頁面類型添加正確的 JSON-LD 結構化資料 ---
            if (isArticle) {
                // 檢測當前語言
                const isEnglish = relativePath.startsWith('en/') || (frontmatter.lang && frontmatter.lang.startsWith('en'));

                // 載入作者資料
                let authorInfo = {
                     "@type": "Person",
                     "name": "聖小熊",
                     "url": siteUrl
                };
                
                try {
                    const authorsData = require('./authorsData.js').default;
                    const authorLogin = Object.keys(authorsData).find(login => {
                        const author = authorsData[login];
                        const authorIdentifier = frontmatter.author || '聖小熊';
                        return authorIdentifier === login ||
                            authorIdentifier === author.name ||
                            authorIdentifier === author.name_en ||
                            authorIdentifier === author.displayName;
                    });
                    if (authorLogin && authorsData[authorLogin]) {
                        const author = authorsData[authorLogin];
                         authorInfo = {
                            "@type": "Person",
                            "name": isEnglish && author.name_en ? author.name_en : author.name,
                            "url": author.url
                        };
                    }
                } catch (e) {
                    console.warn('Authors data not found, using default.');
                }

                // 文章頁面 Schema
                const articleSchema: any = {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": pageTitle,
                    "description": pageDescription,
                    "image": pageImage,
                    "url": pageUrl,
                    "author": authorInfo,
                    "publisher": {
                        "@type": "Organization",
                        "name": globalSiteName, // 強制使用統一名稱
                        "url": siteUrl,
                        "logo": {
                            "@type": "ImageObject",
                            "url": `${siteUrl}/logo.png`
                        }
                    }
                };

                if (frontmatter.date) {
                    articleSchema.datePublished = frontmatter.date;
                }

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(articleSchema)]);
            
            } else if (isHomePage) {
                // 【關鍵修正】首頁 Schema 極簡化，移除語系判斷與多餘作者資訊
                // 給 Google 最強烈的單一信號
                const websiteSchema = {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": globalSiteName, // 聖小熊的秘密基地
                    "url": siteUrl,
                    "description": "聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得。",
                    "publisher": {
                         "@type": "Person",
                         "name": "聖小熊",
                         "url": siteUrl
                    }
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(websiteSchema)]);
            } else {
                // 一般頁面 Schema
                const webpageSchema = {
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": pageTitle,
                    "url": pageUrl,
                    "description": pageDescription,
                    "isPartOf": {
                        "@type": "WebSite",
                        "name": globalSiteName, // 強制統一
                        "url": siteUrl
                    }
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(webpageSchema)]);
            }

            return cleanHead;
    },
    // ✨ END: SEO 修正完成 ✨

        themeConfig: {
        logo: '/logo.png',
        outline: {
            level: [2, 3], // 默認顯示 H2 和 H3 標題
        },
        sidebar: {
            '/blog/': sidebar,
            '/docs/Telegram-Rose-Bot.md': TelegramRoseBotDocsSidebar,
            '/docs/Vitepress-Blog.md': VitepressBlogDocsSidebar,
            '/docs/spoiler-component.md': SpoilerComponentDocsSidebar
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/HolyBearTW' },
            { icon: 'telegram', link: 'https://t.me/HolyBearTW' }
        ],
        search: {
            provider: 'algolia',
            options: {
                appId: 'DO73KQBN99',
                apiKey: '1696c6834514ebc31df7160f019742fe',
                indexName: 'holybear.tw',
                askAi: {
                    assistantId: 'ZsmQH2xLw8lV',
                }
            }
        }
    },

    // buildEnd 現在只專注於處理 Git 相關資訊，保持乾淨
    buildEnd(siteConfig) {
        // 這裡不需要處理 Git 資訊，因為我們已經在 git-meta 插件中處理了
    },

        // 自動讓 blog 文章預設顯示側邊欄和右側目錄，並自動加上 blog: true 標籤
transformPageData(pageData) {
    // 檢查路徑是否以 'blog/' 開頭
    if (pageData.relativePath?.startsWith('blog/')) {
        // 確保側邊欄和右側目錄顯示 (您原有的部分)
        pageData.frontmatter.aside = true;
        pageData.frontmatter.sidebar = true;
    }
    return pageData;
},

    transformHtml: (_, id, { pageData }) => {
        if (id.endsWith('.html')) {
            const canonicalUrl = pageData?.frontmatter?.canonicalUrl || '';
            if (canonicalUrl) {
                pageData.frontmatter.canonicalUrl = canonicalUrl.replace(/\.html$/, '');
            }
        }
    },
})
