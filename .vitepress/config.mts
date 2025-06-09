import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta.js'
import { execSync } from 'child_process'

// 取得當前 git branch 名稱
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
    // 主題顏色與圖示
    ['meta', { name: 'theme-color', content: '#00FFEE' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon.ico' }],

    // 字體
    ['link', {
      rel: 'stylesheet',
      href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Simplify,Latin&display=swap'
    }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Traditional,Latin&display=swap'
    }],

    // SEO meta 標籤
    ['meta', { name: 'description', content: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。' }],
    ['meta', { name: 'keywords', content: '聖小熊, HolyBear, HyperOS, 模組, Mod, MIUI, Android, GitHub, 技術部落格, Blog' }],
    ['meta', { name: 'author', content: '聖小熊' }],

    // Open Graph for Facebook / LINE
    ['meta', { property: 'og:title', content: '聖小熊的秘密基地' }],
    ['meta', { property: 'og:description', content: '聖小熊的 HyperOS 模組與技術筆記分享網站。' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://holybear.me' }],
    ['meta', { property: 'og:image', content: 'https://holybear.me/logo.png' }],

    // Twitter card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  vite: {
    plugins: [gitMetaPlugin()]
  },
  themeConfig: {
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
      } catch (e) {
        // 無 git 資訊略過
      }
    }
  }
})