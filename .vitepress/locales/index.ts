import zh_TW from './zh_TW'
import en from './en'

export default {
  locales: {
    root: {
      label: '繁體中文',
      lang: zh_TW.lang,
      title: '聖小熊的秘密基地',
      description: zh_TW.description,
      themeConfig: zh_TW.themeConfig,
      base: '/'
    },
    en: {
      label: 'English',
      lang: en.lang,
      title: "HolyBear's Secret Base",
      description: en.description,
      themeConfig: en.themeConfig,
      base: '/en/'
    }
  }
}
