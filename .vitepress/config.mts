import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta.js'
import { execSync } from 'child_process'
import sidebar from './sidebar.generated' // <<--- 自動產生 sidebar

function getCurrentBranch() {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    } catch (e) {
        return ''
    }
}

export default defineConfig({
    ignoreDeadLinks: true,
    title: '聖小熊的秘密基地',
    base: '/',
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
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: 'https://holybear.me' }],
        ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
    ],
    vite: {
        plugins: [gitMetaPlugin()]
    },
    themeConfig: {
        logo: '/logo.png',
        sidebar, // <<--- 這裡改為自動產生的 sidebar
        lastUpdated: {
            text: '最後更新',
            formatOptions: {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'Asia/Taipei'
            }
        },
        // 官方搜尋已移除，這裡沒有 search 欄位
        footer: {
            message: 'AGPL-3.0 Licensed',
            copyright: 'Copyright © 2025 聖小熊 & HolyBear'
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/HolyBearTW' }
        ]
    },
    extendsPage(page) {
        const branch = getCurrentBranch()
        if (
            (branch === 'main' || branch === 'master') &&
            page.filePath &&
            page.filePath.endsWith('.md') &&
            !page.filePath.replaceAll('\\', '/').includes('/en/blog/')
        ) {
            try {
                const log = execSync(
                    `git log --diff-filter=A --follow --format=%aN,%aI -- "${page.filePath}" | tail -1`
                ).toString().trim()
                const [author, date] = log.split(',')
                if (!page.frontmatter.author) page.frontmatter.author = author
                if (!page.frontmatter.date) page.frontmatter.date = date

                // 取得最後 commit 時間，供 sidebar 用
                const lastUpdated = execSync(
                    `git log -1 --format=%cI -- "${page.filePath}"`
                ).toString().trim()
                page.frontmatter.lastUpdated = lastUpdated
            } catch (e) {
                // 無 git 資訊略過
            }
        }

        // 判斷是否是英文頁面（en/開頭）
        const isEN = page.relativePath.startsWith('en/')

        if (!page.frontmatter.head) page.frontmatter.head = []

        if (isEN) {
            // 英文頁面
            page.frontmatter.head.push(['title', {}, "HolyBear's Secret Base"])
            page.frontmatter.head.push(['meta', { property: 'og:title', content: "HolyBear's Secret Base" }])
            page.frontmatter.head.push(['meta', { property: 'og:description', content: "HolyBear's personal site, featuring HyperOS modules, tech notes, and Android customization & open-source sharing." }])
            page.frontmatter.head.push(['meta', { property: 'og:image', content: page.frontmatter.image || 'https://holybear.me/logo.png' }])
        } else if (
            page.relativePath === 'index.md' ||
            page.relativePath === '/index.md' ||
            page.relativePath === 'index/index.md' ||
            page.relativePath === '/index/index.md'
        ) {
            // 中文首頁（根目錄或 /index 皆適用）
            page.frontmatter.head.push(['title', {}, '聖小熊的秘密基地'])
            page.frontmatter.head.push(['meta', { property: 'og:title', content: '聖小熊的秘密基地' }])
            page.frontmatter.head.push(['meta', { property: 'og:description', content: '聖小熊的 HyperOS 模組與技術筆記分享網站。' }])
            page.frontmatter.head.push(['meta', { property: 'og:image', content: page.frontmatter.image || 'https://holybear.me/logo.png' }])
        } else if (page.frontmatter.image) {
            // 其它有 image 的文章
            page.frontmatter.head.push(['meta', { property: 'og:image', content: page.frontmatter.image }])
        }
    }
})
