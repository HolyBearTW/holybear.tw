import { generateNavThemes } from '../theme/background/themes.ts';

export default {
  lang: 'en',
  description: "HolyBear's personal site, showcasing HyperOS module projects and a MapleStory combat power analysis tool, alongside technical notes and open-source work.",
  themeConfig: {
    nav: [
      { text: 'Celebrate 500 Days', link: '/500days' },
      { text: 'Blog', link: '/en/blog/' },
      { text: 'Portfolio', link: '/en/mod' },
      { text: 'About', link: '/en/about' },
      { text: 'Donate', link: '/en/sponsor' },
      { 
        text: 'Themes', 
        items: generateNavThemes('en')
      }
    ],
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
    notFound: {
      title: 'Page Not Found',
      quote: "Looks like you're lost?",
      linkLabel: 'Back to Home',
      linkText: 'Return Home'
    }
  }
}
