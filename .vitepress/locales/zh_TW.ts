export default {
  lang: 'zh-TW',
  description: '聖小熊的個人網站，收錄 HyperOS 模組、技術筆記與開發心得，專注於 Android 客製化與開源創作分享。',
  themeConfig: {
    nav: [
      { text: '日誌', link: '/blog/' },
      { text: '作品集', link: '/Mod' },
      { text: '技術文件', link: '/docs/' },
      { text: '簡轉繁', link: '/converter' },
      { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
      { text: '贊助', link: 'https://paypal.me/holybear0610' }
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
      provider: 'algolia' as const,
      options: {
        placeholder: '搜尋文章',
        translations: {
          button: {
            buttonText: '搜尋',
            buttonAriaLabel: '搜尋'
          },
          modal: {
            searchBox: {
              clearButtonTitle: '清除搜尋條件',
              clearButtonAriaLabel: '清除搜尋條件',
              closeButtonText: '取消',
              closeButtonAriaLabel: '取消',
              placeholderText: '搜尋文章',
              placeholderTextAskAi: '向 AI 提問：',
              placeholderTextAskAiStreaming: '回答中...',
              searchInputLabel: '搜尋',
              backToKeywordSearchButtonText: '返回關鍵字搜尋',
              backToKeywordSearchButtonAriaLabel: '返回關鍵字搜尋'
            },
            startScreen: {
              recentSearchesTitle: '搜尋歷史',
              noRecentSearchesText: '沒有搜尋歷史',
              saveRecentSearchButtonTitle: '儲存至搜尋歷史',
              removeRecentSearchButtonTitle: '從搜尋歷史中移除',
              favoriteSearchesTitle: '收藏',
              removeFavoriteSearchButtonTitle: '從收藏中移除',
              recentConversationsTitle: '最近的對話',
              removeRecentConversationButtonTitle: '從歷史記錄中刪除對話'
            },
            errorScreen: {
              titleText: '無法取得結果',
              helpText: '你可能需要檢查你的網路連線'
            },
            noResultsScreen: {
              noResultsText: '無法找到相關結果',
              suggestedQueryText: '你可以嘗試查詢',
              reportMissingResultsText: '你認為該查詢應該有結果？',
              reportMissingResultsLinkText: '點擊回報'
            },
            resultsScreen: {
              askAiPlaceholder: '向 AI 提問：'
            },
            askAiScreen: {
              disclaimerText: '答案由 AI 生成，可能不準確，請自行驗證。',
              relatedSourcesText: '相關來源',
              thinkingText: '思考中...',
              copyButtonText: '複製',
              copyButtonCopiedText: '已複製！',
              copyButtonTitle: '複製',
              likeButtonTitle: '讚',
              dislikeButtonTitle: '踩',
              thanksForFeedbackText: '感謝你的回饋！',
              preToolCallText: '搜尋中...',
              duringToolCallText: '搜尋',
              afterToolCallText: '已搜尋'
            },
            footer: {
              selectText: '選擇',
              submitQuestionText: '提交問題',
              selectKeyAriaLabel: 'Enter 鍵',
              navigateText: '切換',
              navigateUpKeyAriaLabel: '向上箭頭',
              navigateDownKeyAriaLabel: '向下箭頭',
              closeText: '關閉',
              backToSearchText: '返回搜尋',
              closeKeyAriaLabel: 'Esc 鍵',
              poweredByText: '搜尋提供者'
            }
          }
        }
      }
    }
  }
}
