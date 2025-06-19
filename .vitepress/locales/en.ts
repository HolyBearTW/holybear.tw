import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en',
  title: "HolyBear's Secret Base",
  description: "This is HolyBear's personal website.",

  themeConfig: {
    nav: nav(),

    docFooter: {
      prev: 'Previous',
      next: 'Next'
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
        hour12: false
      }
    },

    darkModeSwitchLabel: 'Dark mode',
    returnToTopLabel: 'Return to top',

    outline: {
      label: 'Outline'
    },

    editLink: {
      pattern: 'https://github.com/HolyBearTW/holybear.me/edit/main/:path',
      text: 'Edit this page on GitHub'
    },

    // 新增英文 footer
    footer: {
      message: 'AGPL-3.0 Licensed',
      copyright: 'Copyright © 2025 HolyBear'
    },

    // 新增搜尋提示（如果有用 algolia）
    search: {
      provider: 'algolia',
      options: {
        appId: '5HHMMAZBPG',
        apiKey: 'f7fbf2c65da0d43f1540496b9ae6f3c6',
        indexName: 'holybear',
        placeholder: 'Search articles',
        translations: {
          button: {
            buttonText: 'Search',
            buttonAriaLabel: 'Search'
          },
          modal: {
            searchBox: {
              resetButtonTitle: 'Clear search',
              resetButtonAriaLabel: 'Clear search',
              cancelButtonText: 'Cancel',
              cancelButtonAriaLabel: 'Cancel'
            },
            startScreen: {
              recentSearchesTitle: 'Recent Searches',
              noRecentSearchesText: 'No recent searches',
              saveRecentSearchButtonTitle: 'Save to recent searches',
              removeRecentSearchButtonTitle: 'Remove from recent searches',
              favoriteSearchesTitle: 'Favorites',
              removeFavoriteSearchButtonTitle: 'Remove from favorites'
            },
            errorScreen: {
              titleText: 'No results',
              helpText: 'Check your network connection'
            },
            footer: {
              selectText: 'Select',
              navigateText: 'Navigate',
              closeText: 'Close',
              searchByText: 'Search by'
            },
            noResultsScreen: {
              noResultsText: 'No results found',
              suggestedQueryText: 'You can try searching for',
              reportMissingResultsText: 'Think results should exist?',
              reportMissingResultsLinkText: 'Let us know'
            }
          }
        }
      }
    }
  }
})

function nav() {
  return [
    { text: 'Blog', link: '/blog' },
    { text: 'Portfolio', link: '/Mod' },
    { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
    { text: 'Donate', link: 'https://paypal.me/holybear0610' },
  ]
}
