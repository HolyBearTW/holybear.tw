// .vitepress/components/useAuthors.js

import { computed } from 'vue'
import { useData } from 'vitepress'
import authorsData from '../../.vitepress/authorsData.js'

export function useAuthors() {
    const { lang } = useData()
    const isEnglish = computed(() => lang.value.startsWith('en'))

    const getAuthorMeta = (authorIdentifier) => {
        // 2. 【查找邏輯更新】現在查找時，要比對 name (中文)、name_en、displayName
        const authorLogin = Object.keys(authorsData).find(login => {
            const author = authorsData[login];
            return authorIdentifier === login || authorIdentifier === author.name || authorIdentifier === author.name_en || authorIdentifier === author.displayName;
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
        return {
            name: isEnglish.value ? 'Unknown author' : '未知作者',
            login: '',
            url: 'https://holybear.tw/'
        };
    }

    return {
        authorsData,
        isEnglish,
        getAuthorMeta
    }
}