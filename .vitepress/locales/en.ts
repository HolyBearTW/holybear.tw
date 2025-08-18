import sidebarEn from '../sidebar.generated.en'

export default {
  lang: 'en',
  description: "HolyBear's personal site, featuring HyperOS modules, tech notes, and Android customization & open-source sharing.",
  themeConfig: {
    nav: [
      { text: 'Blog', link: '/en/blog/' },
      { text: 'Portfolio', link: '/en/Mod' },
      { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
      { text: 'Donate', link: 'https://paypal.me/holybear0610' }
    ],
    sidebar: {
      '/en/blog/': sidebarEn
    },
    sidebarMenuLabel: 'Blog List',
    returnToTopLabel: 'Return to top',
    darkModeSwitchLabel: 'Dark mode',
    outline: {
      label: 'Outline'
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next'
    },
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium' as const,
        timeStyle: 'short' as const,
        hour12: false
      }
    },
    editLink: {
      pattern: 'https://github.com/HolyBearTW/holybear.tw/edit/main/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: 'AGPL-3.0 Licensed',
      copyright: 'Copyright © 2025 HolyBear'
    },
    notFound: {
      title: 'Page Not Found',
      quote: "Looks like you're lost?",
      linkLabel: 'Back to Home',
      linkText: 'Return Home'
    },
    search: {
      provider: 'algolia' as const,
        options: {
        appId: 'DO73KQBN99',
        apiKey: '1696c6834514ebc31df7160f019742fe',
        indexName: 'holybear.tw',
        placeholder: 'Search articles',
        translations: {
          button: {
            buttonText: 'Search',
            buttonAriaLabel: 'Search'
          },
          modal: {
            searchBox: {
              clearButtonTitle: 'Clear search',
              clearButtonAriaLabel: 'Clear search',
              closeButtonText: 'Cancel',
              closeButtonAriaLabel: 'Cancel',
              placeholderText: 'Search articles'
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
}
