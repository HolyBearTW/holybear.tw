// .vitepress/components/useAuthors.js

import { computed } from 'vue'
import { useData } from 'vitepress'

// 1. 【資料結構更新】採納您的建議，'name' 代表預設中文名，'name_en' 為英文名。
const authorsData = {
    'HolyBearTW': { name: '聖小熊', name_en: 'HolyBear', url: 'https://github.com/HolyBearTW' },
    'Tim0320': { name: '玄哥', name_en: 'Xuan', url: 'https://github.com/Tim0320' },
    'ying0930': { name: '酪梨', name_en: 'Avocado', url: 'https://github.com/ying0930' },
    'Jackboy001': { name: 'Jack', name_en: 'Jack', url: 'https://github.com/Jackboy001' },
    'leohsiehtw': { name: 'Leo', name_en: 'Leo', url: 'https://github.com/leohsiehtw' }
}

export function useAuthors() {
    const { lang } = useData()
    const isEnglish = computed(() => lang.value.startsWith('en'))

    const getAuthorMeta = (authorIdentifier) => {
        // 2. 【查找邏輯更新】現在查找時，要比對 name (中文) 和 name_en
        const authorLogin = Object.keys(authorsData).find(login => {
            const author = authorsData[login];
            return authorIdentifier === login || authorIdentifier === author.name || authorIdentifier === author.name_en;
        });

        if (authorLogin && authorsData[authorLogin]) {
            const author = authorsData[authorLogin];
            return {
                login: authorLogin,
                url: author.url,
                // 3. 【回傳邏輯更新】如果是英文版，且有 name_en，就用 name_en，否則一律使用預設的 name。
                name: isEnglish.value && author.name_en ? author.name_en : author.name
            };
        }
        return { name: authorIdentifier, login: '', url: '' };
    }

    return {
        authorsData,
        isEnglish,
        getAuthorMeta
    }
}