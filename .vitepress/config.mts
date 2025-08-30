import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta'
import sidebar from './sidebar.generated'

export default defineConfig({
    ignoreDeadLinks: true,
    appearance: 'dark',
    title: '聖小熊的秘密基地',
    base: '/',
    lang: 'zh-TW',
    locales: locales.locales,
    srcExclude: ['README.md'],
    // 啟用 cleanUrls，移除路由中的 .html 後綴
    cleanUrls: true,
    head: [
        ['meta', { name: 'theme-color', content: '#00FFEE' }],
        // Favicon 完整配置 - 支援各種設備和搜尋引擎
        ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon_search.png' }],
        ['link', { rel: 'apple-touch-icon', sizes: '64x64', href: '/favicon.png' }],
        ['link', { rel: 'mask-icon', href: '/favicon.png', color: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileColor', content: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileImage', content: '/favicon.png' }],
        ['link', {
            rel: 'stylesheet',
            href: '/fonts/LINESeed.css'
        }],
        ['meta', { name: 'description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
        ['meta', { name: 'keywords', content: '聖小熊, HolyBear, HyperOS, 模組, Mod, MIUI, Android, GitHub, 技術部落格, Blog' }],
        ['meta', { name: 'algolia-site-verification', content: 'ED2DF0361198D428' }],
        // OG 標籤 - 加強搜尋引擎和社交媒體顯示
        ['meta', { property: 'og:title', content: '聖小熊的秘密基地' }],
        ['meta', { property: 'og:description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
        ['meta', { property: 'og:image', content: '/logo.png' }],
        ['meta', { property: 'og:image:width', content: '1200' }],
        ['meta', { property: 'og:image:height', content: '630' }],
        ['meta', { property: 'og:image:alt', content: '聖小熊的秘密基地 Logo' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: 'https://holybear.tw' }],
        ['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }],
        ['meta', { property: 'og:locale', content: 'zh_TW' }],
        // Twitter Card
        ['meta', { name: 'twitter:card', content: 'summary' }],
        ['meta', { name: 'twitter:image', content: '/logo.png' }]
    ],
    vite: {
        plugins: [gitMetaPlugin()]
    },   // ✨ START: 整合所有 OG 標籤的最終邏輯 ✨
    transformHead({ pageData, head }) {
            const { frontmatter, relativePath } = pageData;

            // 即使是首頁也要處理
            if (relativePath == null) return head;

            // --- 常數與路徑正規化 ---
            const siteUrl = 'https://holybear.tw';
            const normalizedPath = ('/' + String(relativePath).replace(/\\/g, '/'))
                .replace(/\.md$/, '')
                .replace(/\/index$/, '/')
                .replace(/\.html$/, '');
            const pageUrl = siteUrl + normalizedPath; // e.g. https://holybear.tw/blog/2025-07-06

            // --- 1. 取得預設值和頁面專屬值 ---
            const defaultTitle = head.find(tag => tag[1]?.property === 'og:title')?.[1].content || '';
            const defaultDesc = head.find(tag => tag[1]?.name === 'description')?.[1].content || '';
            const defaultImage = head.find(tag => tag[1]?.property === 'og:image')?.[1].content || '';

            const pageTitle = frontmatter.title || defaultTitle;
            const pageDescription = frontmatter.description || defaultDesc;
            const pageImage = frontmatter.image ?
                (frontmatter.image.startsWith('http') ? frontmatter.image : `${siteUrl}${frontmatter.image}`) :
                defaultImage;

            // --- 2. 決定 OG Type 和檢查是否為首頁 ---
            const isHomePage = normalizedPath === '/' || normalizedPath === '';
            const isArticle = normalizedPath.startsWith('/blog/') || normalizedPath.startsWith('/en/blog/');
            const pageType = isArticle ? 'article' : 'website';

            // --- 3. 移除 head 中舊的 OG / canonical / JSON-LD，確保乾淨 ---
            const cleanHead = head.filter(tag =>
                !(tag[0] === 'link' && tag[1]?.rel === 'canonical') &&
                !(tag[1]?.property?.startsWith('og:')) &&
                !(tag[1]?.type === 'application/ld+json') &&
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
            cleanHead.push(['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }]);
            // Twitter image 與前端同步使用的 x-page-image
            cleanHead.push(['meta', { name: 'twitter:image', content: pageImage }]);
            cleanHead.push(['meta', { name: 'x-page-image', content: pageImage }]);

            // --- 5. 根據頁面類型添加正確的 JSON-LD 結構化資料 ---
            if (isArticle) {
                // 檢測當前語言
                const isEnglish = relativePath.startsWith('en/') ||
                    (frontmatter.lang && frontmatter.lang.startsWith('en'));

                // 從 authorsData 查找作者資訊（共用）
                const authorsData = require('./authorsData.js').default;

                // 查找作者資訊
                const getAuthorInfo = (authorIdentifier: string) => {
                    const authorLogin = Object.keys(authorsData).find(login => {
                        const author = authorsData[login];
                        return authorIdentifier === login ||
                            authorIdentifier === author.name ||
                            authorIdentifier === author.name_en ||
                            authorIdentifier === author.displayName;
                    });

                    if (authorLogin && authorsData[authorLogin]) {
                        const author = authorsData[authorLogin];
                        return {
                            "@type": "Person",
                            "name": isEnglish && author.name_en ? author.name_en : author.name,
                            "url": author.url
                        };
                    }

                    // 預設作者
                    return {
                        "@type": "Person",
                        "name": isEnglish ? "holybear.tw" : "聖小熊的秘密基地",
                        "url": "https://holybear.tw"
                    };
                };

                const authorInfo = getAuthorInfo(frontmatter.author || '聖小熊');
                const siteName = isEnglish ? "HolyBear's Secret Base" : "聖小熊的秘密基地";

                // 文章頁面使用 Article schema
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
                        "name": siteName,
                        "url": siteUrl
                    }
                };

                if (frontmatter.date) {
                    articleSchema.datePublished = frontmatter.date;
                }

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(articleSchema)]);
            } else if (isHomePage) {
                // 檢測當前語言並設定對應的作者名稱
                const isEnglish = relativePath.startsWith('en/') ||
                    (frontmatter.lang && frontmatter.lang.startsWith('en'));

                // 從 authorsData 獲取所有作者資訊（共用）
                const authorsData = require('./authorsData.js').default;

                // 建立作者陣列，支援多作者
                const authorsArray = Object.keys(authorsData).map(login => {
                    const author = authorsData[login];
                    return {
                        "@type": "Person",
                        "name": isEnglish && author.name_en ? author.name_en : author.name,
                        "url": author.url
                    };
                });

                const siteName = isEnglish ? "HolyBear's Secret Base" : "聖小熊的秘密基地";

                // 首頁使用完整的 WebSite schema
                const websiteSchema = {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": siteName,
                    "url": siteUrl,
                    "description": pageDescription,
                    "author": authorsArray.length === 1 ? authorsArray[0] : authorsArray
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(websiteSchema)]);
            } else {
                // 一般頁面使用簡單的 WebPage schema
                const webpageSchema = {
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": pageTitle,
                    "url": pageUrl,
                    "description": pageDescription,
                    "isPartOf": {
                        "@type": "WebSite",
                        "name": "聖小熊的秘密基地",
                        "url": siteUrl
                    }
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(webpageSchema)]);
            }

            return cleanHead;
    },
    // ✨ END: 整合所有 OG 標籤的最終邏輯 ✨

    themeConfig: {
        logo: '/logo.png',
        sidebar,
        socialLinks: [
            { icon: 'github', link: 'https://github.com/HolyBearTW' }
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

    transformHtml: (_, id, { pageData }) => {
        if (id.endsWith('.html')) {
            const canonicalUrl = pageData?.frontmatter?.canonicalUrl || '';
            if (canonicalUrl) {
                pageData.frontmatter.canonicalUrl = canonicalUrl.replace(/\.html$/, '');
            }
        }
    },
})