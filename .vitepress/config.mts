import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta'
import { execSync } from 'child_process'
import sidebar from './sidebar.generated'

function getCurrentBranch() {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    } catch (e) {
        return ''
    }
}

export default defineConfig({
    ignoreDeadLinks: true,
    appearance: 'dark',
    title: '聖小熊的秘密基地',
    base: '/',
    lang: 'zh-TW',
    locales: locales.locales,
    srcExclude: ['README.md'],
    // 禁用 cleanUrls 以確保路由穩定性
    cleanUrls: false,
    head: [
        ['meta', { name: 'theme-color', content: '#00FFEE' }],
        // Favicon 完整配置 - 支援各種設備和搜尋引擎
        ['link', { rel: 'icon', type: 'image/x-icon', href: '/logo.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/logo.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/logo.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/logo.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/logo.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '128x128', href: '/logo.png' }],
        ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/logo.png' }],
        ['link', { rel: 'apple-touch-icon', sizes: '152x152', href: '/logo.png' }],
        ['link', { rel: 'apple-touch-icon', sizes: '144x144', href: '/logo.png' }],
        ['link', { rel: 'apple-touch-icon', sizes: '120x120', href: '/logo.png' }],
        ['link', { rel: 'mask-icon', href: '/logo.png', color: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileColor', content: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileImage', content: '/logo.png' }],
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
        ['meta', { property: 'og:image', content: 'https://holybear.tw/logo.png' }],
        ['meta', { property: 'og:image:width', content: '1200' }],
        ['meta', { property: 'og:image:height', content: '630' }],
        ['meta', { property: 'og:image:alt', content: '聖小熊的秘密基地 Logo' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: 'https://holybear.tw' }],
        ['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }],
        ['meta', { property: 'og:locale', content: 'zh_TW' }],
        // Twitter Card
        ['meta', { name: 'twitter:card', content: 'summary' }]
    ],
    vite: {
        plugins: [gitMetaPlugin()]
    },    // ✨ START: 整合所有 OG 標籤的最終邏輯 ✨
    transformHead({ pageData, head }) {
        const { frontmatter, relativePath } = pageData;

        // 即使是首頁也要處理
        if (!relativePath) return head;

        // --- 1. 取得預設值和頁面專屬值 ---
        const siteUrl = 'https://holybear.tw';
        // 從全域 head (已傳入) 中找到預設值，而不是寫死
        const defaultTitle = head.find(tag => tag[1]?.property === 'og:title')?.[1].content || '';
        const defaultDesc = head.find(tag => tag[1]?.name === 'description')?.[1].content || '';
        const defaultImage = head.find(tag => tag[1]?.property === 'og:image')?.[1].content || '';

        const pageTitle = frontmatter.title || defaultTitle;
        const pageDescription = frontmatter.description || defaultDesc;
        const pageImage = frontmatter.image ?
            (frontmatter.image.startsWith('http') ? frontmatter.image : `${siteUrl}${frontmatter.image}`) :
            defaultImage;

        // --- 2. 決定 OG Type 和檢查是否為首頁 ---
        const isHomePage = relativePath === 'index.md' || relativePath === '';
        const isArticle = relativePath.startsWith('blog/') || relativePath.startsWith('en/blog/');
        const pageType = isArticle ? 'article' : 'website';

        // --- 3. 移除 head 中所有舊的 OG 標籤和 JSON-LD 腳本，確保乾淨 ---
        const cleanHead = head.filter(tag => 
            !(tag[1]?.property?.startsWith('og:')) && 
            !(tag[1]?.type === 'application/ld+json')
        );

        // --- 4. 加入全新的、正確的 OG 標籤 ---
        cleanHead.push(['meta', { property: 'og:title', content: pageTitle }]);
        cleanHead.push(['meta', { property: 'og:description', content: pageDescription }]);
        cleanHead.push(['meta', { property: 'og:image', content: pageImage }]);
        cleanHead.push(['meta', { property: 'og:type', content: pageType }]);
        cleanHead.push(['meta', { property: 'og:url', content: siteUrl }]);
        cleanHead.push(['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }]); // 確保每頁都有 og:site_name

        // --- 5. 根據頁面類型添加正確的 JSON-LD 結構化資料 ---
        if (isArticle) {
            // 檢測當前語言
            const isEnglish = relativePath.startsWith('en/') || 
                             (frontmatter.lang && frontmatter.lang.startsWith('en'));
            
            // 從 authorsData 查找作者資訊
            const authorsData = {
                'HolyBearTW': { name: '聖小熊', name_en: 'HolyBear', url: 'https://github.com/HolyBearTW' },
                'Tim0320': { name: '玄哥', name_en: 'Xuan', url: 'https://github.com/Tim0320' },
                'ying0930': { name: '酪梨', name_en: 'Avocado', url: 'https://github.com/ying0930' },
                'Jackboy001': { name: 'Jack', name_en: 'Jack', url: 'https://github.com/Jackboy001' },
                'leohsiehtw': { name: 'Leo', name_en: 'Leo', url: 'https://github.com/leohsiehtw' }
            };
            
            // 查找作者資訊
            const getAuthorInfo = (authorIdentifier: string) => {
                const authorLogin = Object.keys(authorsData).find(login => {
                    const author = authorsData[login];
                    return authorIdentifier === login || 
                           authorIdentifier === author.name || 
                           authorIdentifier === author.name_en;
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
                "url": `${siteUrl}/${relativePath.replace(/\.md$/, '.html')}`,
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
            
            // 從 authorsData 獲取所有作者資訊
            const authorsData = {
                'HolyBearTW': { name: '聖小熊', name_en: 'HolyBear', url: 'https://github.com/HolyBearTW' },
                'Tim0320': { name: '玄哥', name_en: 'Xuan', url: 'https://github.com/Tim0320' },
                'ying0930': { name: '酪梨', name_en: 'Avocado', url: 'https://github.com/ying0930' },
                'Jackboy001': { name: 'Jack', name_en: 'Jack', url: 'https://github.com/Jackboy001' },
                'leohsiehtw': { name: 'Leo', name_en: 'Leo', url: 'https://github.com/leohsiehtw' }
            };
            
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
                "url": `${siteUrl}/${relativePath.replace(/\.md$/, '.html')}`,
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
        ]
    },

    // buildEnd 現在只專注於處理 Git 相關資訊，保持乾淨
    buildEnd(siteConfig) {
        // 這裡不需要處理 Git 資訊，因為我們已經在 git-meta 插件中處理了
    }
})