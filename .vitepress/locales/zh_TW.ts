import sidebar from '../sidebar.generated'

export default {
  lang: 'zh-TW',
  description: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。',
  themeConfig: {
    nav: [
      { text: '日誌', link: '/blog/' },
      { text: '作品集', link: '/Mod' },
      { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
      { text: '贊助', link: 'https://paypal.me/holybear0610' }
    ],
    sidebar: {
      '/blog/': sidebar
    },
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
      message: 'AGPL-3.0 Licensed',
      copyright: 'Copyright © 2025 聖小熊'
    },
    notFound: {
      title: '找不到頁面',
      quote: '你是不是迷路了？',
      linkLabel: '回到首頁',
      linkText: '返回首頁'
    },
    search: {
      provider: 'algolia',
      options: {
        placeholder: '搜尋文章',
        translations: {
          button: {
            buttonText: '搜尋',
            buttonAriaLabel: '搜尋'
          },
          modal: {
            searchBox: {
              resetButtonTitle: '清除搜尋條件',
              resetButtonAriaLabel: '清除搜尋條件',
              cancelButtonText: '取消',
              cancelButtonAriaLabel: '取消'
            },
            startScreen: {
              recentSearchesTitle: '最近搜尋',
              noRecentSearchesText: '沒有最近搜尋',
              saveRecentSearchButtonTitle: '儲存到最近搜尋',
              removeRecentSearchButtonTitle: '從最近搜尋中移除',
              favoriteSearchesTitle: '收藏',
              removeFavoriteSearchButtonTitle: '從收藏中移除'
            },
            errorScreen: {
              titleText: '無法取得結果',
              helpText: '請檢查你的網路連線'
            },
            footer: {
              selectText: '選擇',
              navigateText: '切換',
              closeText: '關閉',
              searchByText: '搜尋服務提供者：'
            },
            noResultsScreen: {
              noResultsText: '找不到結果',
              suggestedQueryText: '你可以嘗試查詢',
              reportMissingResultsText: '認為應該有結果？',
              reportMissingResultsLinkText: '點此回報'
            }
          }
        }
      }
    }
  }
}
