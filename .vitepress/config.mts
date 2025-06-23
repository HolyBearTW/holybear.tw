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
    locales: locales.locales,
    srcExclude: ['README.md'],
    head: [
        // 這些是網站的預設 <head> 標籤，會作為 OG 標籤的 fallback
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
        ['meta', { property: 'og:title', content: '聖小熊的秘密基地' }],
        ['meta', { property: 'og:image', content: 'https://holybear.me/logo.png' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: 'https://holybear.me' }],
        ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
    ],
    vite: {
        plugins: [gitMetaPlugin()]
    },

    // 處理 og:type
    transformHead(pageData) {
        const { relativePath } = pageData;
        if (
            relativePath && 
            (relativePath.startsWith('blog/') ||
             relativePath.startsWith('en/blog/') ||
             relativePath === 'Mod.md')
        ) {
            let head = pageData.head || [];
            head = head.filter(tag => !(tag[1] && tag[1].property === 'og:type'));
            head.push(['meta', { property: 'og:type', content: 'article' }]);
            return head;
        }
    },

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

    // ✨ START: 全新重寫的 extendsPage 函數 ✨
    extendsPage(page) {
        // --- 1. 處理 Git 相關的中繼資料 ---
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

        // --- 2. 統一處理 Open Graph (OG) 標籤 ---
        if (!page.frontmatter.head) page.frontmatter.head = [];

        // 定義網站預設值
        const siteUrl = 'https://holybear.me';
        const siteTitle = '聖小熊的秘密基地';
        const siteDescription = '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。';
        const defaultOgImage = `${siteUrl}/logo.png`;

        // 從 frontmatter 取得頁面專屬資訊，若無則使用網站預設值
        const pageTitle = page.frontmatter.title || siteTitle;
        const pageDescription = page.frontmatter.description || siteDescription;
        const pageImage = page.frontmatter.image ?
            (page.frontmatter.image.startsWith('http') ? page.frontmatter.image : `${siteUrl}${page.frontmatter.image}`) :
            defaultOgImage;
        
        // 移除重複的舊 OG 標籤，確保乾淨
        page.frontmatter.head = page.frontmatter.head.filter(tag => {
            if (tag[1] && tag[1].property) {
                return !['og:title', 'og:description', 'og:image'].includes(tag[1].property);
            }
            return true;
        });
        
        // 加入新的、正確的 OG 標籤
        page.frontmatter.head.push(
            ['meta', { property: 'og:title', content: pageTitle }],
            ['meta', { property: 'og:description', content: pageDescription }],
            ['meta', { property: 'og:image', content: pageImage }]
        );
    },
    // ✨ END: 全新重寫的 extendsPage 函數 ✨
})
