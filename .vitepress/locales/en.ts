import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
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
        dateStyle: 'medium',    // You can change to 'long' or 'full', optional: short/medium/long/full
        timeStyle: 'short',     // Change to 'medium' or 'long' to show seconds
        hour12: false           // 24-hour format
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
