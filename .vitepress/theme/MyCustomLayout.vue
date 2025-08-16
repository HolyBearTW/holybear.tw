<script setup>
    import Theme from 'vitepress/theme'
    import { useData } from 'vitepress'
    import { computed, ref, onMounted } from 'vue'
    import { useAuthors } from '../components/useAuthors.js'
    import FloatingBgmPlayer from './FloatingBgmPlayer.vue'
    import GiscusComments from '../components/GiscusComments.vue'
    import VotePanel from '../components/VotePanel.vue'
    import ViewCounter from '../components/ViewCounter.vue'
    import MigrationNotice from '../components/MigrationNotice.vue'

    const { frontmatter, page, locale, lang } = useData()

    const isHomePage = computed(() =>
        page.value && (page.value.path === '/' || page.value.path === '/index.html')
    )

    const currentTitle = computed(() =>
        frontmatter.value
            ? (frontmatter.value.title || (isEnglish.value ? 'Unknown post title' : '無標題文章'))
            : (isEnglish.value ? 'Unknown post data' : '文章元素未定義')
    )
    const currentSlug = computed(() =>
        frontmatter.value?.slug || page.value?.path || frontmatter.value?.title || 'unknown'
    )

    // 作者資訊陣列
    const { getAuthorMeta, isEnglish } = useAuthors()

    // 本地預設作者
    const currentAuthor = computed(() =>
        frontmatter.value?.author || '未知作者'
    )
    const currentAuthorMeta = computed(() => getAuthorMeta(currentAuthor.value))

    const currentAuthorAvatar = computed(() =>
        currentAuthorMeta.value.login
            ? `https://github.com/${currentAuthorMeta.value.login}.png`
            : '/logo.png'
    )
    const currentAuthorUrl = computed(() =>
        currentAuthorMeta.value.url || 'https://holybear.tw/'
    )

    const currentDisplayDate = computed(() => {
        if (frontmatter.value?.date) {
            const date = new Date(frontmatter.value.date)
            const twDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
            const yyyy = twDate.getFullYear()
            const mm = String(twDate.getMonth() + 1).padStart(2, '0')
            const dd = String(twDate.getDate()).padStart(2, '0')
            const hh = String(twDate.getHours()).padStart(2, '0')
            const min = String(twDate.getMinutes()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`
        }
        return isEnglish.value ? 'Unknown date' : '未知日期'
    })

    /* === ENTRANCE ANIMATION START === */
    const showIntro = ref(false)
    const STORAGE_KEY = 'intro-video-last-played'
    const HOUR = 60 * 60 * 1000

    function hideIntro() {
        showIntro.value = false
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
    }

    onMounted(() => {
        const lastPlayed = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
        if (Date.now() - lastPlayed < HOUR) {
            showIntro.value = false
        } else {
            showIntro.value = true
        }
    })
    /* === ENTRANCE ANIMATION END === */
</script>

<template>
    <!-- 搬家通知彈窗 -->
    <MigrationNotice />
    
    <!-- === ENTRANCE ANIMATION START === -->
    <div v-if="showIntro" class="intro-video-mask">
        <video ref="introVideo"
               playsinline
               autoplay
               muted
               @ended="hideIntro"
               @error="hideIntro">
            <source src="https://tw.hicdn.beanfun.com/beanfun/GamaWWW/MapleStory/official/2020/videos/mKv.mp4?133956072189787870" type="video/mp4">
        </video>
        <button @click="hideIntro" class="skip-btn">Skip</button>
    </div>
    <!-- === ENTRANCE ANIMATION END === -->
    <FloatingBgmPlayer v-if="!showIntro" />

    <Theme.Layout v-show="!showIntro">
        <template #doc-before>
            <div v-if="!isHomePage" class="blog-post-header-injected">
                <h1 class="blog-post-title">{{ currentTitle }}</h1>
                <div v-if="(frontmatter.category && frontmatter.category.length) || (frontmatter.tag && frontmatter.tag.length)"
                     class="blog-post-meta-row">
                    <span v-for="c in frontmatter.category" :key="'cat-' + c" class="category">{{ c }}</span>
                    <span v-for="t in frontmatter.tag" :key="'tag-' + t" class="tag">{{ t }}</span>
                </div>
                <p class="blog-post-date-in-content">
                    <span class="blog-post-date-main">
                        <span class="author-inline">
                            <img class="post-author-avatar" :src="currentAuthorAvatar" :alt="currentAuthorMeta.name" />
                            <a :href="currentAuthorUrl" target="_blank" rel="noopener" class="author-link-name">{{ currentAuthorMeta.name }}</a><span v-if="currentDisplayDate">｜{{ currentDisplayDate }}</span>
                        </span>
                    </span>
                    <span class="blog-post-date-right">
                        <ClientOnly>
                            <ViewCounter :slug="currentSlug" />
                        </ClientOnly>
                    </span>
                </p>
                <div class="blog-post-date-divider"></div>
            </div>
        </template>
        <template #doc-after>
            <ClientOnly>
                <VotePanel />
                <GiscusComments />
            </ClientOnly>
        </template>
    </Theme.Layout>
</template>

<style scoped>
    /* === ENTRANCE ANIMATION START === */
    .intro-video-mask {
        position: fixed;
        z-index: 9999;
        inset: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.8s;
    }

        .intro-video-mask video {
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            display: block;
        }

    .skip-btn {
        position: absolute;
        top: 30px;
        right: 30px;
        z-index: 10000;
        padding: 8px 18px;
        font-size: 1rem;
        background: rgba(0,0,0,0.7);
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
    }

        .skip-btn:hover {
            background: rgba(0,0,0,0.9);
        }
    /* === ENTRANCE ANIMATION END === */

    :deep(.vp-doc h1:first-of-type) {
        display: none !important;
    }

    .blog-post-header-injected {
        position: relative;
        width: 100%;
        padding-left: var(--vp-content-padding);
        padding-right: var(--vp-content-padding);
        padding-top: 0;
        padding-bottom: 0;
        margin-bottom: 0;
        box-sizing: border-box;
        background-color: var(--vp-c-bg);
        z-index: 1;
    }

    :deep(.vp-doc) {
        padding-top: 0 !important;
        margin-top: 0 !important;
    }

    :deep(.vp-doc > p:first-of-type) {
        margin-top: 0;
    }

    @media (max-width: 768px) {
        .blog-post-header-injected {
            padding-left: var(--vp-content-padding);
            padding-right: var(--vp-content-padding);
            padding-top: 0;
            padding-bottom: 0;
            margin-bottom: 0;
        }

        :deep(.vp-doc) {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }

        :deep(.vp-doc > p:first-of-type) {
            margin-top: 0;
        }
    }

    .blog-post-title {
        font-size: 2rem;
        line-height: 1.2;
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: var(--vp-c-text-1);
    }

    .blog-post-meta-row {
        margin-bottom: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
    }

    .category {
        display: inline-block;
        background: #00FFEE;
        color: #000;
        border-radius: 3px;
        padding: 0 0.5em;
        font-size: 0.85em;
    }

    .tag {
        display: inline-block;
        background: #e3f2fd;
        color: #2077c7;
        border-radius: 3px;
        padding: 0 0.5em;
        font-size: 0.85em;
    }

    .blog-post-date-in-content {
        color: var(--vp-c-text-2);
        font-size: 0.85rem;
        margin-top: 0;
        margin-bottom: 0.2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5em;
    }

    .blog-post-date-main {
        display: inline-flex;
        align-items: center;
        gap: 0.3em;
    }

    .blog-post-date-right {
        display: inline-flex;
        align-items: center;
        margin-left: 1em;
    }

    .author-inline {
        display: flex;
        align-items: center;
        gap: 0;
    }

    .post-author-avatar {
        width: 22px;
        height: 22px;
        margin: 0 2px 0 0;
        border-radius: 50%;
        vertical-align: middle;
        box-shadow: 0 2px 8px #0001;
        border: 1px solid #ddd;
        background: #fff;
        object-fit: cover;
        display: inline-block;
    }

    .author-link-name {
        color: var(--vp-c-brand-1, #00b8b8);
        text-decoration: none;
        font-weight: normal;
        line-height: 1;
        display: inline-block;
        vertical-align: middle;
        margin-right: 0;
        padding-right: 0;
    }

        .author-link-name:hover {
            text-decoration: underline;
        }

    .blog-post-date-divider {
        border-bottom: 1px dashed var(--vp-c-divider);
        margin-bottom: 0.5rem;
    }

    :deep(.vp-doc p),
    :deep(.vp-doc ul),
    :deep(.vp-doc ol),
    :deep(.vp-doc img),
    :deep(.vp-doc table),
    :deep(.vp-doc blockquote),
    :deep(.vp-doc pre),
    :deep(.vp-doc .custom-block),
    :deep(.vp-doc h2),
    :deep(.vp-doc h3),
    :deep(.vp-doc h4),
    :deep(.vp-doc h5),
    :deep(.vp-doc h6) {
        margin-top: 1rem;
        margin-bottom: 1rem;
    }

    :deep(.vp-doc div[class*="language-"]) {
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
    }
</style>

<style>
    .group + .group[data-v-a84b7c21] {
        border-top: 1px solid var(--vp-c-divider) !important;
        padding-top: 8px !important;
        margin-top: 8px !important;
    }

    section.VPSidebarItem.level-0 {
        padding-bottom: 4px !important;
        padding-top: 0 !important;
    }
</style>