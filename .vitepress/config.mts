import { defineConfig } from 'vitepress'
import locales from './locales'

export default defineConfig( {
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
        ['link', { rel: 'stylesheet', href: 'https://font.sec.miui.com/font/css?family=MiSans:200,300,400,450,500,600,650,700:Chinese_Traditional,Latin&display=swap' }]
      ],
    themeConfig: {
        footer: {
            message: 'AGPL-3.0 Licensed',
            copyright: 'Copyright © 2025 聖小熊 & HolyBear'
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/HolyBearTW' }
        ]
    }
})
