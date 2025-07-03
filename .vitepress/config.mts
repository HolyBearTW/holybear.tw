import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta.js'
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
        ['link', { rel: 'icon', href: '/favicon.ico' }],
        ['link', { rel: 'apple-touch-icon', href: '/favicon.ico' }],
        ['link', {
            rel: 'stylesheet',
            href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Simplify,Latin&display=swap'
        }],
        ['link', {
            rel: 'stylesheet',
            href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Traditional,Latin&display=swap'
        }],
        ['meta', { name: 'description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
        ['meta', { name: 'keywords', content: '聖小熊, HolyBear, HyperOS, 模組, Mod, MIUI, Android, GitHub, 技術部落格, Blog' }],
        ['meta', { name: 'author', content: '聖小熊' }],
        // 下方的 OG 標籤會作為預設值，在 transformHead 中被讀取和覆蓋
        ['meta', { property: 'og:title', content: '聖小熊的秘密基地' }],
        ['meta', { property: 'og:image', content: 'https://holybear.me/logo.png' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: 'https://holybear.me' }],
        ['meta', { name: 'twitter:card', content: 'summary' }]
    ],
    vite: {
        plugins: [gitMetaPlugin()]
    },

    // ✨ START: 整合所有 OG 標籤的最終邏輯 ✨
    transformHead({ pageData, head }) {
        const { frontmatter, relativePath } = pageData;

        if (!relativePath) return;

        // --- 1. 取得預設值和頁面專屬值 ---
        const siteUrl = 'https://holybear.me';
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
                appId: '5HHMMAZBPG',
                apiKey: 'f7fbf2c65da0d43f1540496b9ae6f3c6',
                indexName: 'holybear'
            }
        }
    },

    // extendsPage 現在只專注於處理 Git 相關資訊，保持乾淨
    extendsPage(page) {
        const branch = getCurrentBranch();
        if (
            (branch === 'main' || branch === 'master') &&
            page.filePath &&
            page.filePath.endsWith('.md') &&
            !page.filePath.replaceAll('\\', '/').includes('/en/blog/')
        ) {
            try {
                const log = execSync(`git log --diff-filter=A --follow --format=%aN,%aI -- "${page.filePath}" | tail -1`).toString().trim();
                const [author, date] = log.split(',');
                if (!page.frontmatter.author) page.frontmatter.author = author;
                if (!page.frontmatter.date) page.frontmatter.date = date;

                const lastUpdated = execSync(`git log -1 --format=%cI -- "${page.filePath}"`).toString().trim();
                page.frontmatter.lastUpdated = lastUpdated;
            } catch (e) {
                // 無 git 資訊則略過
            }
        }
    }
})
