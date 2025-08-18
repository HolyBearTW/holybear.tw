import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta.ts'
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
    head: [
        ['meta', { name: 'theme-color', content: '#00FFEE' }],
        ['link', { rel: 'icon', href: '/logo.png' }],
        ['link', { rel: 'apple-touch-icon', href: '/favicon.ico' }],
        ['link', {
            rel: 'stylesheet',
            href: '/fonts/LINESeed.css'
        }],
        ['meta', { name: 'description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
        ['meta', { name: 'keywords', content: '聖小熊, HolyBear, HyperOS, 模組, Mod, MIUI, Android, GitHub, 技術部落格, Blog' }],
        // OG 標籤
        ['meta', { property: 'og:title', content: '聖小熊的秘密基地' }],
        ['meta', { property: 'og:description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
        ['meta', { property: 'og:image', content: 'https://holybear.tw/logo.png' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: 'https://holybear.tw' }],
        ['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }], // 新增 og:site_name
        ['meta', { name: 'twitter:card', content: 'summary' }],

        
    vite: {
        plugins: [gitMetaPlugin()]
    },

    // ✨ START: 整合所有 OG 標籤的最終邏輯 ✨
    transformHead({ pageData, head }) {
        const { frontmatter, relativePath } = pageData;

        if (!relativePath) return;

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

        // --- 2. 決定 OG Type ---
        const isArticle = relativePath.startsWith('blog/') || relativePath.startsWith('en/blog/') || relativePath === 'Mod.md';
        const pageType = isArticle ? 'article' : 'website';

        // --- 3. 移除 head 中所有舊的 OG 標籤，確保乾淨 ---
        const cleanHead = head.filter(tag => !(tag[1]?.property?.startsWith('og:')));

        // --- 4. 加入全新的、正確的 OG 標籤 ---
        cleanHead.push(['meta', { property: 'og:title', content: pageTitle }]);
        cleanHead.push(['meta', { property: 'og:description', content: pageDescription }]);
        cleanHead.push(['meta', { property: 'og:image', content: pageImage }]);
        cleanHead.push(['meta', { property: 'og:type', content: pageType }]);
        cleanHead.push(['meta', { property: 'og:url', content: siteUrl }]);
        cleanHead.push(['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }]); // 確保每頁都有 og:site_name

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
                indexName: 'holybear.tw'
            }
        }
    },

    // buildEnd 現在只專注於處理 Git 相關資訊，保持乾淨
    buildEnd(siteConfig) {
        // 這裡不需要處理 Git 資訊，因為我們已經在 git-meta 插件中處理了
    }
})