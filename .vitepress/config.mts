import { defineConfig } from 'vitepress'
import locales from './locales'
import gitMetaPlugin from './git-meta.js'
import { execSync } from 'child_process'

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
    ['link', { rel: 'stylesheet', href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Simplify,Latin&display=swap' }],
    ['link', { rel: 'stylesheet', href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Traditional,Latin&display=swap' }],
    ['script', { async: true, defer: true, crossorigin: 'anonymous', src: 'https://connect.facebook.net/zh_TW/sdk.js#xfbml=1&version=v22.0', nonce: 'z9c34u1R' }],
    ['meta', { property: 'fb:app_id', content: '705847265169451' }]
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
    if (page.filePath) {
      try {
        // 抓第一次 commit 的作者和時間
        const log = execSync(
          `git log --diff-filter=A --follow --format=%aN,%aI -- "${page.filePath}" | tail -1`
        ).toString().trim()
        const [author, date] = log.split(',')
        if (!page.frontmatter.author) page.frontmatter.author = author
        if (!page.frontmatter.date) page.frontmatter.date = date
      } catch (e) {
        // 沒有 git 資訊就略過
      }
    }
  }
})
