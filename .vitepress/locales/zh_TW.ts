import { generateNavThemes } from '../theme/background/themes.ts';

export default {
  lang: 'zh-TW',
  description: '聖小熊的個人網站，展示 HyperOS 模組作品與楓之谷戰力分析工具，分享技術筆記、開發心得與開源創作。',
  themeConfig: {
    nav: [
  { text: '慶祝500日', link: '/500days' },
  { text: '日誌', link: '/blog/' },
  { text: '作品集', link: '/mod' },
  { text: '關於我', link: '/about' },
  { text: '技術文件', link: '/docs/' },
  { text: '贊助', link: '/sponsor' },
  {
    text: '服務',
    items: [
      { text: '🍁 楓之谷分析', link: '/maplestory' },
      { text: '🐲 新年的氣息', link: '/MSnewyear2026' },
      { text: '📝 文章編輯器', link: '/editmd' },
      { text: '🔄 簡繁轉換器', link: '/converter' },
    ]
  },
  {
    text: '佈景主題',
    items: generateNavThemes('zh-TW')
  }
    ],
    sidebarMenuLabel: '日誌列表',
    returnToTopLabel: '回到頂部',
    darkModeSwitchLabel: '深色模式',
    lightModeSwitchTitle: '切換至淺色模式',
    darkModeSwitchTitle: '切換至深色模式',
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
        dateStyle: 'short' as const,
        timeStyle: 'short' as const,
        timeZone: 'Asia/Taipei'
      }
    },
    editLink: {
      pattern: 'https://github.com/HolyBearTW/holybear.tw/edit/main/:path',
      text: '在 GitHub 中編輯此頁'
    },
    notFound: {
      title: '找不到頁面',
      quote: '你是不是迷路了？',
      linkLabel: '回到首頁',
      linkText: '返回首頁'
    }
  }
}
