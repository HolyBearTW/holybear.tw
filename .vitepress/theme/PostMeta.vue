<script setup>
    import { ref, computed, onMounted } from 'vue'
    // 路徑假設為 .vitepress/theme/PostMeta.vue
    import { useAuthors } from '../components/useAuthors.js'

    const props = defineProps({
        post: {
            type: Object,
            required: true
        }
    })

    const { getAuthorMeta } = useAuthors()

    // 日期格式化函式
    function formatDateExactlyLikePostPage(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
        if (isNaN(date.getTime())) return dateString;
        const formatter = new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei'
        });
        const parts = formatter.formatToParts(date);
        // 【已修正】將 terrazzo 改為 yyyy
        const yyyy = parts.find(p => p.type === 'year').value;
        const mm = parts.find(p => p.type === 'month').value;
        const dd = parts.find(p => p.type === 'day').value;
        return `${yyyy}-${mm}-${dd}`;
    }

    const authorMeta = computed(() => getAuthorMeta(props.post.author));
    const isLoading = ref(true);

    onMounted(() => {
        setTimeout(() => {
            isLoading.value = false;
        }, 650);
    });
</script>

<template>
    <p class="post-meta" data-no-animation-replay>
        <span class="author-inline">
            <div class="meta-content-wrapper">
                <template v-if="isLoading">
                    <span class="post-author-avatar skeleton skeleton-avatar"></span>
                    <span class="skeleton skeleton-text"></span>
                    <span class="skeleton skeleton-date"></span>
                </template>
                <template v-else>
                    <img v-if="authorMeta?.login"
                         class="post-author-avatar"
                         :src="`https://github.com/${authorMeta.login}.png`"
                         :alt="authorMeta.name" />
                    <a v-if="authorMeta?.url"
                       :href="authorMeta.url"
                       target="_blank"
                       rel="noopener"
                       class="author-link-name">
                        {{ authorMeta.name }}
                    </a>
                    <span v-else>{{ post.author }}</span>
                    <span class="author-date">｜{{ formatDateExactlyLikePostPage(post.date) }}</span>
                </template>
            </div>
        </span>
    </p>
</template>

<style scoped>
    /* 佈局和最終樣式 */
    .post-meta, .author-inline, .meta-content-wrapper {
        display: flex;
        align-items: center;
    }

    .post-meta {
        color: var(--vp-c-text-2);
        font-size: 0.85rem;
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1 !important;
        height: 28px;
    }

    .post-author-avatar {
        width: 21px;
        height: 21px;
        border-radius: 50%;
        border: 1px solid #ddd;
        background: #fff;
        margin-right: 4px;
    }

    .author-link-name {
        color: var(--vp-c-brand-1, #00b8b8);
        text-decoration: none;
        font-weight: 600;
    }

        .author-link-name:hover {
            text-decoration: underline;
        }

    .author-date {
        font-size: 0.98em;
        color: var(--vp-c-text-2);
    }
    /* 骨架屏樣式 */
    .skeleton {
        background-color: var(--vp-c-bg-soft);
        border-radius: 4px;
    }

    .skeleton-avatar {
        width: 21px;
        height: 21px;
        border-radius: 50%;
        margin-right: 4px;
    }

    .skeleton-text {
        width: 60px;
        height: 14px;
    }

    .skeleton-date {
        width: 90px;
        height: 14px;
    }
</style>