import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-TW',
  description: '這是聖小熊的個人網站',

  themeConfig: {
    nav: nav(),

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最後更新',
      formatOptions: {
        dateStyle: 'medium',    // 你可以調成 'long' 或 'full'，可選 short/medium/long/full
        timeStyle: 'short',     // 改成 'medium' 或 'long' 會顯示到秒
        hour12: false           // 24小時制
      }
    },

    darkModeSwitchLabel: '深色模式',
    returnToTopLabel: '回到頂部',

    outline: {
      label: '目錄'
    },

    editLink: {
      pattern: 'https://github.com/HolyBearTW/holybear.me/edit/main/:path',
      text: '在 GitHub 中編輯此頁'
    }
  }
})

function nav() {
  return [
    { text: '日誌', link: '/blog' },
    { text: '作品集', link: '/Mod' },
    { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
    { text: '贊助', link: 'https://paypal.me/holybear0610' },
  ]
}
