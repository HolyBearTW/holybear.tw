<script setup>
import Theme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed, ref, onMounted, watch } from 'vue'
import GiscusComments from '../components/GiscusComments.vue'
import VotePanel from '../components/VotePanel.vue'
import ViewCounter from '../components/ViewCounter.vue'

const { frontmatter, page, locale, lang } = useData()

const isHomePage = computed(() =>
    page.value && (page.value.path === '/' || page.value.path === '/index.html')
)

const isEnglish = computed(() =>
    (lang?.value?.startsWith('en')) ||
    (locale?.value === 'en') ||
    (page?.value?.path?.startsWith('/en/'))
)

const authorPrefix = computed(() => isEnglish.value ? 'by ' : '作者：')

const currentTitle = computed(() =>
    frontmatter.value
        ? (frontmatter.value.title || (isEnglish.value ? 'Unknown post title' : '無標題文章'))
        : (isEnglish.value ? 'Unknown post data' : '文章元素未定義')
)

const currentSlug = computed(() =>
    frontmatter.value?.slug || page.value?.path || frontmatter.value?.title || 'unknown'
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
    return ''
})

// ====== 音樂播放器區塊 ======
const musicList = [
    { src: '/music/MapleStory_VictoriaCupDay.mp3', title: '楓之谷 - 維多利亞盃' },
    // ... 可再加更多歌曲
]
const bgm = ref(null)
const playing = ref(false)
const currentIndex = ref(Math.floor(Math.random() * musicList.length))
const currentSrc = ref(musicList[currentIndex.value].src)
const currentMusicTitle = ref(musicList[currentIndex.value].title)

const volume = ref(0.6)
const VOLUME_KEY = 'holybear-bgm-volume'
const PLAYING_KEY = 'holybear-bgm-playing'
const DESKTOP_OPEN_KEY = 'holybear-bgm-desktop-open'

const isMobile = ref(false)
const mobilePlayerOpen = ref(false)
const desktopPlayerOpen = ref(true)

function checkMobile() {
    isMobile.value = window.innerWidth <= 640
}
onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // 讀 localStorage 音量
    const savedVolume = localStorage.getItem(VOLUME_KEY)
    if (savedVolume !== null) {
        volume.value = parseFloat(savedVolume)
    }
    // 讀 localStorage 播放狀態
    const savedPlaying = localStorage.getItem(PLAYING_KEY)
    if (savedPlaying === 'true') {
        document.body.addEventListener(
            'click',
            () => { playMusic() },
            { once: true }
        )
    } else {
        playing.value = false
    }
    // 讀 localStorage 桌機收合狀態
    const savedDesktopOpen = localStorage.getItem(DESKTOP_OPEN_KEY)
    if (savedDesktopOpen !== null) {
        desktopPlayerOpen.value = savedDesktopOpen === 'true'
    }
    // 套用音量
    if (bgm.value) {
        bgm.value.volume = volume.value
    }
})

function onVolumeChange(val) {
    if (bgm.value) bgm.value.volume = val
    localStorage.setItem(VOLUME_KEY, val)
}
watch(volume, onVolumeChange)

function playMusic() {
    if (!bgm.value) return
    bgm.value.volume = volume.value
    bgm.value.play()
    playing.value = true
    localStorage.setItem(PLAYING_KEY, 'true')
}
function pauseMusic() {
    if (!bgm.value) return
    bgm.value.pause()
    playing.value = false
    localStorage.setItem(PLAYING_KEY, 'false')
}
function toggleBgm() {
    if (playing.value) pauseMusic()
    else playMusic()
}
function nextRandom() {
    let next
    do {
        next = Math.floor(Math.random() * musicList.length)
    } while (next === currentIndex.value && musicList.length > 1)
    currentIndex.value = next
    currentSrc.value = musicList[next].src
    currentMusicTitle.value = musicList[next].title
    setTimeout(playMusic, 150)
}
function toggleMobilePlayer() {
    mobilePlayerOpen.value = !mobilePlayerOpen.value
}
function toggleDesktopPlayer() {
    desktopPlayerOpen.value = !desktopPlayerOpen.value
    localStorage.setItem(DESKTOP_OPEN_KEY, desktopPlayerOpen.value)
}
</script>

<template>
    <!-- audio 標籤永遠存在，這樣收合時音樂不會中斷！ -->
    <audio ref="bgm" :src="currentSrc" @ended="nextRandom" preload="auto"></audio>

    <!-- 手機浮動按鈕 -->
    <div
        v-if="!isHomePage && isMobile"
        class="my-bgm-mobile-fab"
        :class="{ open: mobilePlayerOpen }"
        @click="toggleMobilePlayer"
        aria-label="展開音樂播放器"
    >
        <template v-if="!mobilePlayerOpen">
            <span>
                <template v-if="volume === 0">🔇</template>
                <template v-else-if="volume < 0.33">🔈</template>
                <template v-else-if="volume < 0.7">🔉</template>
                <template v-else>🔊</template>
            </span>
        </template>
    </div>
    <!-- 手機展開播放器 -->
    <div
        v-if="!isHomePage && isMobile && mobilePlayerOpen"
        class="my-bgm-player my-bgm-player-mobile"
        @click.stop
    >
        <button @click.stop="toggleBgm">
            {{ playing ? "⏸ 暫停" : "▶️ 播放" }}
        </button>
        <span style="margin:0 6px;">🎵 {{ currentMusicTitle }}</span>
        <button @click.stop="nextRandom">⏭ 下一首</button>
        <span style="margin-left:8px;">
            <template v-if="volume === 0">🔇</template>
            <template v-else-if="volume < 0.33">🔈</template>
            <template v-else-if="volume < 0.7">🔉</template>
            <template v-else>🔊</template>
        </span>
        <input type="range"
               min="0" max="1" step="0.01"
               v-model.number="volume"
               style="width:70px;vertical-align:middle;margin:0 5px;"
               :title="`音量：${Math.round(volume*100)}%`"
               @click.stop
        />
        <button
            class="my-bgm-close"
            @click.stop="mobilePlayerOpen = false"
            aria-label="收合播放器"
            style="margin-left:6px;"
        >✖️</button>
    </div>
    <!-- 桌機版播放器（可記憶收合） -->
    <div v-if="!isHomePage && !isMobile">
        <div v-if="desktopPlayerOpen" class="my-bgm-player">
            <button @click="toggleBgm">
                {{ playing ? "⏸ 暫停" : "▶️ 播放" }}
            </button>
            <span style="margin:0 6px;">🎵 {{ currentMusicTitle }}</span>
            <button @click="nextRandom">⏭ 下一首</button>
            <span style="margin-left:8px;">
                <template v-if="volume === 0">🔇</template>
                <template v-else-if="volume < 0.33">🔈</template>
                <template v-else-if="volume < 0.7">🔉</template>
                <template v-else>🔊</template>
            </span>
            <input type="range"
                   min="0" max="1" step="0.01"
                   v-model.number="volume"
                   style="width:70px;vertical-align:middle;margin:0 5px;"
                   :title="`音量：${Math.round(volume*100)}%`"
            />
            <button
                class="my-bgm-close"
                @click="toggleDesktopPlayer"
                aria-label="收合播放器"
                style="margin-left:6px;"
            >➖</button>
        </div>
        <div
            v-else
            class="my-bgm-desktop-fab"
            @click="toggleDesktopPlayer"
            aria-label="展開播放器"
        >
            <span>🎵</span>
        </div>
    </div>
    <Theme.Layout>
        <!-- ===== 你的現有內容 ===== -->
        <template #doc-before>
            <div v-if="!isHomePage" class="blog-post-header-injected">
                <h1 class="blog-post-title">{{ currentTitle }}</h1>
                <div v-if="(frontmatter.category && frontmatter.category.length) || (frontmatter.tag && frontmatter.tag.length)"
                     class="blog-post-meta-row">
                    <span v-for="c in frontmatter.category"
                          :key="'cat-' + c"
                          class="category">{{ c }}</span>
                    <span v-for="t in frontmatter.tag"
                          :key="'tag-' + t"
                          class="tag">{{ t }}</span>
                </div>
                <p class="blog-post-date-in-content">
                    <span v-if="frontmatter.author">{{ authorPrefix }}{{ frontmatter.author }}</span>
                    <template v-if="frontmatter.author && currentDisplayDate">
                        ｜
                    </template>
                    <template v-if="currentDisplayDate">
                        {{ currentDisplayDate }}
                    </template>
                    <span style="float:right;">
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
.my-bgm-player,
.my-bgm-player-mobile {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-1);
    border-radius: 8px;
    padding: 8px;
    border: 1px solid var(--vp-c-divider);
    box-shadow: 0 2px 8px rgba(0,0,0,0.14);
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5em;
    transition: box-shadow .2s, transform .2s;
}
.my-bgm-player-mobile {
    width: 95vw;
    left: 2.5vw;
    right: 2.5vw;
    min-width: 0;
    max-width: 99vw;
    font-size: 1em;
    padding: 10px 8px 10px 8px;
    justify-content: flex-start;
}
.my-bgm-close {
    background: transparent;
    border: none;
    font-size: 1.2em;
    color: var(--vp-c-text-2);
    cursor: pointer;
    transition: color .2s;
}
.my-bgm-close:hover {
    color: var(--vp-c-text-1);
}
.my-bgm-player button,
.my-bgm-player-mobile button {
    color: var(--vp-c-text-1);
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1em;
    padding: 0 0.5em;
    border-radius: 4px;
    transition: background 0.2s;
}
.my-bgm-player button:hover,
.my-bgm-player-mobile button:hover {
    background: var(--vp-c-text-2, #eee);
}
.my-bgm-player span,
.my-bgm-player-mobile span {
    font-weight: bold;
}
.my-bgm-mobile-fab,
.my-bgm-desktop-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    width: 48px;
    height: 48px;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-1);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2em;
    cursor: pointer;
    user-select: none;
    border: 1px solid var(--vp-c-divider);
    transition: box-shadow .2s, transform .2s;
}
.my-bgm-mobile-fab:active,
.my-bgm-desktop-fab:active {
    box-shadow: 0 2px 16px rgba(0,0,0,0.24);
    transform: scale(0.97);
}
.my-bgm-mobile-fab.open {
    display: none;
}
@media (max-width: 640px) {
    .my-bgm-player {
        display: none !important;
    }
    .my-bgm-desktop-fab {
        display: none !important;
    }
}
</style>

<style scoped>
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