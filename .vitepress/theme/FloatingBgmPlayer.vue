<script setup>
    import { ref, watch, onMounted, onUnmounted } from 'vue'

    const musicList = [
        { src: '/music/MapleStory_VictoriaCupDay.mp3', title: '楓之谷 - 維多利亞盃' },
        // ...可再加歌曲
    ]
    const bgm = ref(null)
    const playing = ref(false)
    const currentIndex = ref(Math.floor(Math.random() * musicList.length))
    const currentSrc = ref(musicList[currentIndex.value].src)
    const currentMusicTitle = ref(musicList[currentIndex.value].title)

    const volume = ref(0.6)
    const VOLUME_KEY = 'holybear-bgm-volume'
    const PLAYING_KEY = 'holybear-bgm-playing'

    const isMobile = ref(false)
    const mobilePlayerOpen = ref(false)
    const desktopPlayerOpen = ref(true)

    function resize() {
        isMobile.value = window.innerWidth <= 640
    }

    onMounted(() => {
        resize()
        window.addEventListener('resize', resize)
        const savedVolume = localStorage.getItem(VOLUME_KEY)
        if (savedVolume !== null) volume.value = parseFloat(savedVolume)
        const savedPlaying = localStorage.getItem(PLAYING_KEY)
        if (savedPlaying === 'true') {
            document.body.addEventListener('click', () => { playMusic() }, { once: true })
        }
        if (bgm.value) bgm.value.volume = volume.value
    })

    onUnmounted(() => {
        window.removeEventListener('resize', resize)
    })

    watch(volume, (val) => {
        if (bgm.value) bgm.value.volume = val
        localStorage.setItem(VOLUME_KEY, val)
    })

    function playMusic() {
        if (!bgm.value) return
        bgm.value.volume = volume.value
        bgm.value.play().catch(e => console.error("音樂播放失敗，可能是因為使用者尚未與頁面互動。", e))
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
        playing.value ? pauseMusic() : playMusic()
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
</script>

<template>
    <audio ref="bgm" :src="currentSrc" @ended="nextRandom" preload="auto"></audio>

    <div v-if="isMobile && !mobilePlayerOpen"
         class="my-bgm-fab"
         @click.stop="mobilePlayerOpen = true"
         aria-label="展開音樂播放器">
        <span>🎵</span>
    </div>
    <div v-if="!isMobile && !desktopPlayerOpen"
         class="my-bgm-fab"
         @click.stop="desktopPlayerOpen = true"
         aria-label="展開音樂播放器">
        <span>🎵</span>
    </div>

    <!-- 手機版 -->
    <div v-if="isMobile && mobilePlayerOpen"
         class="my-bgm-player my-bgm-player-mobile"
         @click.stop>
        <div class="my-bgm-mobile-row">
            <button class="my-bgm-play-btn" @click.stop="toggleBgm" :title="playing ? '暫停' : '播放'">
                {{ playing ? "⏸" : "▶️" }}
            </button>
            <span class="music-title">
                <span class="music-icon">🎵</span>
                {{ currentMusicTitle }}
            </span>
            <button class="my-bgm-close"
                    @click.stop="mobilePlayerOpen = false"
                    aria-label="收合播放器">
                ✖️
            </button>
        </div>
        <div class="my-bgm-mobile-row">
            <button @click.stop="nextRandom" title="下一首" class="my-bgm-next-btn">⏭</button>
            <span class="volume-icon">
                <template v-if="volume === 0">
                    🔇
                </template>
                <template v-else-if="volume < 0.33">
                    🔈
                </template>
                <template v-else-if="volume < 0.7">
                    🔉
                </template>
                <template v-else>
                    🔊
                </template>
            </span>
            <input type="range" min="0" max="1" step="0.01" v-model.number="volume" class="volume-slider-mobile" :title="`音量：${Math.round(volume*100)}%`" @click.stop />
        </div>
    </div>

    <!-- 桌機版 -->
    <div v-if="!isMobile && desktopPlayerOpen"
         class="my-bgm-player my-bgm-player-desktop"
         @click.stop>
        <button class="my-bgm-play-btn" @click.stop="toggleBgm" :title="playing ? '暫停' : '播放'">
            {{ playing ? "⏸" : "▶️" }}
        </button>

        <span class="music-title">
            <span class="music-icon">🎵</span>
            {{ currentMusicTitle }}
        </span>

        <button @click.stop="nextRandom" title="下一首" class="my-bgm-next-btn">⏭</button>
        <span class="volume-icon">
            <template v-if="volume === 0">
                🔇
            </template>
            <template v-else-if="volume < 0.33">
                🔈
            </template>
            <template v-else-if="volume < 0.7">
                🔉
            </template>
            <template v-else>
                🔊
            </template>
        </span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="volume" class="volume-slider-desktop" :title="`音量：${Math.round(volume*100)}%`" @click.stop />

        <button class="my-bgm-close"
                @click.stop="desktopPlayerOpen = false"
                aria-label="收合播放器"
                title="收合">
            ✖️
        </button>
    </div>
</template>

<style scoped>
    /* FAB 按鈕 */
    .my-bgm-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        width: 48px;
        height: 48px;
        background: var(--vp-c-bg, #fff);
        color: var(--vp-c-text-1, #222);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2em;
        cursor: pointer;
        user-select: none;
        border: 1px solid var(--vp-c-divider, #eee);
        transition: box-shadow .2s, transform .2s;
    }

        .my-bgm-fab:active {
            box-shadow: 0 2px 16px rgba(0,0,0,0.24);
            transform: scale(0.97);
        }

    /* 播放器主體 */
    .my-bgm-player {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        z-index: 9999;
        background: var(--vp-c-bg, #fff);
        color: var(--vp-c-text-1, #222);
        border-radius: 8px;
        border: 1px solid var(--vp-c-divider, #eee);
        box-shadow: 0 2px 8px rgba(0,0,0,0.14);
        padding: 10px 14px;
        box-sizing: border-box;
    }

    /* 播放按鈕特效 */
    .my-bgm-play-btn {
        background: linear-gradient(145deg, #e3f2fd 60%, #b6c8e6 100%);
        color: #1565c0;
        border-radius: 50%;
        border: none;
        width: 40px;
        height: 40px;
        box-shadow: 0 2px 8px #b3c7e6bb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5em;
        font-weight: bold;
        outline: none;
        transition: box-shadow .2s, background .2s, color .2s;
    }

        .my-bgm-play-btn:hover,
        .my-bgm-play-btn:focus {
            box-shadow: 0 4px 14px #64b5f6aa;
            background: linear-gradient(145deg, #bbdefb 60%, #90caf9 100%);
            color: #0d47a1;
        }

    /* 下一首按鈕 */
    .my-bgm-next-btn {
        font-size: 1.3em;
        line-height: 1;
        margin-right: 8px;
        background: transparent;
        color: #666;
        border-radius: 5px;
        padding: 4px 8px;
        transition: background .2s, color .2s;
    }

        .my-bgm-next-btn:hover {
            background: #e3f2fd;
            color: #1976d2;
        }

    /* 關閉按鈕 */
    .my-bgm-close {
        font-size: 1.2em;
        color: var(--vp-c-text-2, #888);
        margin-left: 8px;
        transition: color .2s;
    }

        .my-bgm-close:hover {
            color: var(--vp-c-text-1, #222);
        }

    /* 曲名與音符靠近，並讓曲名可捲動顯示 */
    .music-title {
        flex: 1 1 0;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: bold;
        font-size: 1em;
        display: flex;
        align-items: center;
        margin: 0 8px;
    }

    .music-icon {
        color: #9ad;
        font-size: 1.2em;
        vertical-align: middle;
        margin-right: 6px;
    }

    /* 音量圖示與滑桿 */
    .volume-icon {
        margin-right: 4px;
        font-size: 1.1em;
    }

    .volume-slider-desktop {
        width: 80px;
        vertical-align: middle;
        margin-left: 6px;
    }

    .volume-slider-mobile {
        width: 70px;
        vertical-align: middle;
        margin-left: 6px;
    }

    /* 桌機專用 */
    .my-bgm-player-desktop {
        width: auto;
        max-width: 600px;
        gap: 8px;
    }

    /* 手機專用 */
    .my-bgm-player-mobile {
        left: auto;
        width: 320px;
        min-width: 220px;
        max-width: 98vw;
        flex-direction: column;
        justify-content: flex-start;
        gap: 0;
    }

    .my-bgm-mobile-row {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 0.5em;
        margin-bottom: 2px;
        width: 100%;
    }

        .my-bgm-mobile-row:last-child {
            margin-bottom: 0;
        }
</style>