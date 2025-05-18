import { defineConfig } from 'vitepress'

export default defineConfig({
    lang: 'en-US',
    description: 'This is HolyBear personal website',

    themeConfig: {
        nav: nav(),

        lastUpdatedText: "Last updated",
        darkModeSwitchLabel: 'Dark mode',
        returnToTopLabel: 'Return to top',
        outline: {
            label: 'Label'
        },

        editLink: {
            pattern: 'https://github.com/HolyBearTW/holybear.me/edit/main/:path',
            text: 'Edit this page on GitHub'
        }
    }
})

function nav() {
    return [
        { text: 'Mod List', link: '/Mod.html' },
        { text: 'Telegram', link: 'https://t.me/HolyBearTW' },
        { text: 'Donate', link: 'https://paypal.me/holybear0610' },
    ]
}
