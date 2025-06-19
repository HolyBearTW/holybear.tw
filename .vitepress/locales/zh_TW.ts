import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-TW',
  description: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。',

  themeConfig: {
    nav: [
      { text: '日誌', link: '/blog' },
      { text: '作品集', link: '/Mod' },
      { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
      { text: '贊助', link: 'https://paypal.me/holybear0610' }
    ],

    sidebarMenuLabel: '側邊欄選單',
    returnToTopLabel: '回到頂部',
    darkModeSwitchLabel: '深色模式',

    outline: {
      label: '目錄'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最後更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Taipei'
      }
    },

    editLink: {
      pattern: 'https://github.com/HolyBearTW/holybear.me/edit/main/:path',
      text: '在 GitHub 中編輯此頁'
    },

    footer: {
      message: '以 AGPL-3.0 授權',
      copyright: 'Copyright © 2025 聖小熊'
    },

    notFound: {
      title: '404 - 找不到頁面',
      quote: '你是不是迷路了？',
      linkLabel: '回到首頁',
      linkText: '返回首頁'
    }

    // 如需其它自訂 key，也可加在這裡
  }
})
