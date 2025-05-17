import { defineConfig } from 'vitepress'

export default defineConfig({
    lang: 'zh-TW',
    description: '這是聖小熊的個人網站',

    themeConfig: {
        nav: nav(),

        lastUpdatedText: "最後更新",
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
        { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
        { text: '贊助', link: 'https://paypal.me/holybear0610' },
    ]
}
