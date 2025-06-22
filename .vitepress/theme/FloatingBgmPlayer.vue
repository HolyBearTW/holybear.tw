<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'

/* --- 音樂清單 --- */
const musicList = [
    { src: '/music/MapleStoryM_TheGuardianOfTheStars.mp3', title: '楓之谷M - 星之守護者' },
    { src: '/music/MapleStory_MissingYou.mp3', title: '楓之谷 - 魔法森林樹洞' },
    { src: '/music/MapleStory_WhereStarsRest.mp3', title: '楓之谷 - 賽拉斯' },
    { src: '/music/MapleStory_Suu2phase.mp3', title: '楓之谷 - 決戰史烏' },
    { src: '/music/MapleStory_18th_Event.mp3', title: '楓之谷 - 綻放森林' },
    { src: '/music/MapleStory_AdventureIsland.mp3', title: '楓之谷 - 冒險島' },
    { src: '/music/MapleStory_Fantasia.mp3', title: '楓之谷：時空的裂縫 - 玩偶之家' },
    { src: '/music/MapleStory_ComeWithMe.mp3', title: '楓之谷 - 天空之塔' },
    { src: '/music/MapleStory_TowerOfGoddess.mp3', title: '楓之谷：雅典娜禁地 - 女神之塔' },
    { src: '/music/MapleStory_mapleLIVE.mp3', title: '楓之谷 -  LIVE On Air' },
    { src: '/music/MapleStory_NLCtown.mp3', title: '楓之谷 - 新葉城' },
    { src: '/music/MapleStory_VictoriaCupDay.mp3', title: '楓之谷 - 維多利亞盃' },
    { src: '/music/MapleStory_Kamuna.mp3', title: '楓之谷：未來東京 - 卡姆那' },
    { src: '/music/MapleStory_NeoTokyo_Office.mp3', title: '楓之谷：未來東京 - 秋葉原司令室 2012年' },
    { src: '/music/MapleStory_NeoTokyo_Park.mp3', title: '楓之谷：未來東京 - 東京公園 2095年' },
    { src: '/music/MapleStory_NeoTokyo_DunasRaid.mp3', title: '楓之谷：未來東京 - 台場 2100年' },
    { src: '/music/MapleStory_NeoTokyo_Bergamot.mp3', title: '楓之谷：未來東京 - 東京秋葉原 2102年' },
    { src: '/music/MapleStory_NeoTokyo_Tokyosky.mp3', title: '楓之谷：未來東京 - 東京上空 2102年' },
    { src: '/music/MapleStory_NeoTokyo_Rockbongi.mp3', title: '楓之谷：未來東京 - 澀谷 2102年' },
    { src: '/music/MapleStory_AnEternalBreath.mp3', title: '楓之谷：克拉奇亞 - 永恆的氣息' },
    { src: '/music/MapleStory_old_title.mp3', title: '楓之谷 - 懷舊登入音樂' }
]

/* --- LocalStorage Keys --- */
const VOLUME_KEY = 'holybear-bgm-volume'
const PLAYING_KEY = 'holybear-bgm-playing'
const MOBILE_OPEN_KEY = 'holybear-bgm-mobile-open'
const DESKTOP_OPEN_KEY = 'holybear-bgm-desktop-open'
const INDEX_KEY = 'holybear-bgm-index'

/* --- Refs & 狀態 --- */
const bgm = ref(null)
const playerContainer = ref(null)
const playing = ref(false)
const volume = ref(0.6)
const volumeBeforeMute = ref(0.6)
const currentIndex = ref(0) // 預設 0，會在 onMounted 時修正
const currentTime = ref(0)
const duration = ref(0)
const isSeeking = ref(false)
const isMobile = ref(false)
const mobilePlayerOpen = ref(false)
const desktopPlayerOpen = ref(true)
const isVolumeSliderVisible = ref(false)
const isPlaylistVisible = ref(false)
const isAdjustingVolume = ref(false)
let volumeAdjustTimeout = null

/* --- Computed 屬性 --- */
const currentSrc = computed(() => musicList[currentIndex.value].src)
const currentMusicTitle = computed(() => musicList[currentIndex.value].title)

/* --- Lifecycle --- */
onMounted(() => {
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('click', handleClickOutside)

    const savedVolume = localStorage.getItem(VOLUME_KEY)
    if (savedVolume !== null) {
        volume.value = parseFloat(savedVolume)
        if (volume.value > 0) volumeBeforeMute.value = volume.value
    }
    const savedPlaying = localStorage.getItem(PLAYING_KEY)
    if (savedPlaying === 'true') {
        document.body.addEventListener('click', () => { playMusic() }, { once: true })
    }

    // 讀取上次播放到第幾首
    const savedIndex = localStorage.getItem(INDEX_KEY)
    if (
        savedIndex !== null &&
        !isNaN(+savedIndex) &&
        +savedIndex >= 0 &&
        +savedIndex < musicList.length
    ) {
        currentIndex.value = +savedIndex
    } else {
        currentIndex.value = 0
    }

    const savedMobileOpen = localStorage.getItem(MOBILE_OPEN_KEY)
    if (savedMobileOpen !== null) {
        mobilePlayerOpen.value = savedMobileOpen === 'true'
    }
    const savedDesktopOpen = localStorage.getItem(DESKTOP_OPEN_KEY)
    if (savedDesktopOpen !== null) {
        desktopPlayerOpen.value = savedDesktopOpen === 'true'
    }
    if (bgm.value) {
        bgm.value.volume = volume.value
        bgm.value.addEventListener('timeupdate', updateProgress)
        bgm.value.addEventListener('loadedmetadata', onLoadedMetadata)
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', resize)
    window.removeEventListener('click', handleClickOutside)
    if (bgm.value) {
        bgm.value.removeEventListener('timeupdate', updateProgress)
        bgm.value.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
})

watch(volume, (newVolume) => {
    if (bgm.value) bgm.value.volume = newVolume
    localStorage.setItem(VOLUME_KEY, newVolume.toString())
    if (newVolume > 0) volumeBeforeMute.value = newVolume
})
watch(mobilePlayerOpen, (val) => {
    localStorage.setItem(MOBILE_OPEN_KEY, val ? 'true' : 'false')
})
watch(desktopPlayerOpen, (val) => {
    localStorage.setItem(DESKTOP_OPEN_KEY, val ? 'true' : 'false')
})
watch(currentIndex, (val) => {
    localStorage.setItem(INDEX_KEY, val.toString())
})

function playMusic() {
    if (!bgm.value) return
    bgm.value.volume = volume.value
    bgm.value.play().then(() => {
        playing.value = true
        localStorage.setItem(PLAYING_KEY, 'true')
    }).catch(e => console.error("音樂播放失敗", e))
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

function prevSong() {
    const newIndex = (currentIndex.value - 1 + musicList.length) % musicList.length
    selectAndPlaySong(newIndex, { forceRestart: true })
}

function nextSong() {
    const newIndex = (currentIndex.value + 1) % musicList.length
    selectAndPlaySong(newIndex, { forceRestart: true })
}

async function selectAndPlaySong(index, options = {}) {
    const { forceRestart = false } = options
    if (!forceRestart && index === currentIndex.value && playing.value) return
    currentIndex.value = index
    await nextTick()
    if (bgm.value) {
        currentTime.value = 0
        playMusic()
    }
}

function onLoadedMetadata(e) { duration.value = e.target.duration }
function updateProgress(e) { if (!isSeeking.value) currentTime.value = e.target.currentTime }
function startSeek() { isSeeking.value = true }
function endSeek() { if (bgm.value) bgm.value.currentTime = currentTime.value; isSeeking.value = false }
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === 0) return "00:00"
    const floorSeconds = Math.floor(seconds)
    const min = Math.floor(floorSeconds / 60)
    const sec = floorSeconds % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function resize() { isMobile.value = window.innerWidth <= 640 }
function togglePlaylist() { isPlaylistVisible.value = !isPlaylistVisible.value }
function toggleVolumeSlider() { isVolumeSliderVisible.value = !isVolumeSliderVisible.value }
function handleClickOutside(event) {
    if (playerContainer.value && !playerContainer.value.contains(event.target)) {
        isVolumeSliderVisible.value = false
    }
}
function toggleMute() {
    if (volume.value > 0) {
        volume.value = 0
    } else {
        volume.value = volumeBeforeMute.value > 0 ? volumeBeforeMute.value : 0.6
    }
    flashVolumePercentage()
}
function flashVolumePercentage() {
    isAdjustingVolume.value = true
    if (volumeAdjustTimeout) clearTimeout(volumeAdjustTimeout)
    volumeAdjustTimeout = setTimeout(() => {
        isAdjustingVolume.value = false
    }, 1200)
}
</script>

<template>
    <audio ref="bgm" :src="currentSrc" preload="auto" @ended="nextSong"></audio>

    <div
        v-if="(isMobile && !mobilePlayerOpen) || (!isMobile && !desktopPlayerOpen)"
        class="my-bgm-fab"
        @click.stop="isMobile ? (mobilePlayerOpen = true) : (desktopPlayerOpen = true)"
    >
        <span>🎵</span>
    </div>

    <div v-if="isPlaylistVisible" class="playlist-overlay" @click="togglePlaylist">
        <div class="playlist-modal" @click.stop>
            <div class="playlist-header">
                <h3>播放列表</h3>
                <button @click="togglePlaylist" class="my-bgm-close">✖️</button>
            </div>
            <ul class="playlist-items">
                <li
                    v-for="(song, index) in musicList"
                    :key="song.src"
                    :class="{ 'is-playing': index === currentIndex }"
                    @click="selectAndPlaySong(index)"
                >
                    <span class="song-title-in-list">{{ song.title }}</span>
                    <span v-if="index === currentIndex" class="playing-indicator">正在播放...</span>
                </li>
            </ul>
        </div>
    </div>

    <div v-if="isMobile && mobilePlayerOpen" class="my-bgm-player my-bgm-player-mobile" ref="playerContainer" @click.stop>
        <div v-if="isAdjustingVolume" class="volume-percentage-display-local">{{ Math.round(volume * 100) }}%</div>
        <div class="my-bgm-mobile-row title-row">
            <span class="music-icon">🎵</span>
            <div class="marquee-container"><span class="music-title-text">{{ currentMusicTitle }}</span></div>
            <button class="my-bgm-close" @click.stop="mobilePlayerOpen = false">✖️</button>
        </div>
        <div class="my-bgm-mobile-row progress-bar-row">
            <span class="time-display">{{ formatTime(currentTime) }}</span>
            <input
                type="range"
                class="progress-bar"
                :max="duration"
                v-model.number="currentTime"
                @mousedown="startSeek"
                @mouseup="endSeek"
                @touchstart="startSeek"
                @touchend="endSeek"
            >
            <span class="time-display">{{ formatTime(duration) }}</span>
        </div>
        <div v-if="isVolumeSliderVisible" class="volume-popup-shared volume-popup-mobile">
            <span class="volume-icon" @click.stop="toggleMute" title="靜音/取消靜音">
                <template v-if="volume === 0">🔇</template>
                <template v-else-if="volume < 0.33">🔈</template>
                <template v-else-if="volume < 0.7">🔉</template>
                <template v-else>🔊</template>
            </span>
            <input
                type="range"
                class="volume-slider-horizontal"
                min="0"
                max="1"
                step="0.01"
                v-model.number="volume"
                @mousedown="isAdjustingVolume = true"
                @mouseup="isAdjustingVolume = false"
                @touchstart="isAdjustingVolume = true"
                @touchend="isAdjustingVolume = false"
            >
        </div>
        <div class="my-bgm-mobile-row main-controls-row">
            <button class="control-btn" @click.stop="toggleVolumeSlider" title="音量">
                <span class="volume-icon">
                    <template v-if="volume === 0">🔇</template>
                    <template v-else-if="volume < 0.33">🔈</template>
                    <template v-else-if="volume < 0.7">🔉</template>
                    <template v-else>🔊</template>
                </span>
            </button>
            <div class="main-controls">
                <button @click.stop="prevSong" title="上一首" class="my-bgm-prev-next-btn">⏮</button>
                <button class="my-bgm-play-btn" @click.stop="toggleBgm" :title="playing ? '暫停' : '播放'">
                    {{ playing ? "⏸" : "▶️" }}
                </button>
                <button @click.stop="nextSong" title="下一首" class="my-bgm-prev-next-btn">⏭</button>
            </div>
            <button class="control-btn" @click.stop="togglePlaylist" title="播放列表">🎶</button>
        </div>
    </div>

    <div v-if="!isMobile && desktopPlayerOpen" class="my-bgm-player my-bgm-player-desktop" ref="playerContainer" @click.stop>
        <button @click.stop="prevSong" title="上一首" class="my-bgm-prev-next-btn">⏮</button>
        <button class="my-bgm-play-btn" @click.stop="toggleBgm" :title="playing ? '暫停' : '播放'">
            {{ playing ? "⏸" : "▶️" }}
        </button>
        <button @click.stop="nextSong" title="下一首" class="my-bgm-prev-next-btn">⏭</button>
        <div class="desktop-main-section">
            <div class="desktop-title-row" @click="togglePlaylist" title="點此打開播放列表">
                <span class="music-icon">🎵</span>
                <div class="marquee-container"><span class="music-title-text">{{ currentMusicTitle }}</span></div>
            </div>
            <div class="progress-bar-row">
                <span class="time-display">{{ formatTime(currentTime) }}</span>
                <input
                    type="range"
                    class="progress-bar"
                    :max="duration"
                    v-model.number="currentTime"
                    @mousedown="startSeek"
                    @mouseup="endSeek"
                >
                <span class="time-display">{{ formatTime(duration) }}</span>
            </div>
        </div>
        <div class="volume-control-container">
            <button class="control-btn" @click.stop="toggleVolumeSlider" title="音量">
                <span class="volume-icon">
                    <template v-if="volume === 0">🔇</template>
                    <template v-else-if="volume < 0.33">🔈</template>
                    <template v-else-if="volume < 0.7">🔉</template>
                    <template v-else>🔊</template>
                </span>
            </button>
            <div v-if="isVolumeSliderVisible" class="volume-popup-shared volume-popup-desktop">
                <div v-if="isAdjustingVolume" class="volume-percentage-display-local">{{ Math.round(volume * 100) }}%</div>
                <span class="volume-icon" @click.stop="toggleMute" title="靜音/取消靜音">
                    <template v-if="volume === 0">🔇</template>
                    <template v-else-if="volume < 0.33">🔈</template>
                    <template v-else-if="volume < 0.7">🔉</template>
                    <template v-else>🔊</template>
                </span>
                <input
                    type="range"
                    class="volume-slider-horizontal"
                    min="0"
                    max="1"
                    step="0.01"
                    v-model.number="volume"
                    @mousedown="isAdjustingVolume = true"
                    @mouseup="isAdjustingVolume = false"
                >
            </div>
        </div>
        <button class="my-bgm-close" @click.stop="desktopPlayerOpen = false" title="收合">✖️</button>
    </div>
</template>

<style scoped>

.music-icon {
    color: #9ad;
    font-size: 1.2em;
    vertical-align: middle;
    margin-right: 6px;
    flex-shrink: 0;
}
.volume-icon {
    font-size: 1.2em;
    cursor: pointer;
}
.volume-control-container {
    position: relative;
}
.volume-popup-shared {
    position: absolute;
    background: rgba(40, 40, 40, 0.75);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    border-radius: 8px;
    z-index: 11;
    transition: opacity 0.2s, transform 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
}
.volume-popup-shared .volume-icon {
    color: #fff;
}
.volume-slider-horizontal {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.3);
    border-radius: 2px;
}
.volume-slider-horizontal::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
}
.volume-percentage-display-local {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    background: rgba(0,0,0,0.75);
    color: white;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.9em;
    font-weight: bold;
    pointer-events: none;
    white-space: nowrap;
}
.volume-popup-desktop {
    top: 50%;
    right: calc(100% + 8px);
    transform: translateY(-50%);
    width: 200px;
}
.volume-popup-mobile {
    bottom: 58px;
    left: 10px;
    right: 10px;
}
.my-bgm-player-desktop {
    width: auto;
    min-width: 480px;
    max-width: 550px;
    gap: 12px;
}
.desktop-main-section {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 8px;
}
.desktop-title-row {
    cursor: pointer;
    display: flex;
    align-items: center;
}
.desktop-title-row .music-title-text {
    animation-duration: 12s;
}
.my-bgm-player-desktop .main-controls {
    gap: 4px;
}
.my-bgm-player-desktop .my-bgm-prev-next-btn {
    margin: 0;
}
.my-bgm-player-desktop .volume-control-container {
    margin-left: 8px;
}
.my-bgm-player-mobile {
    width: calc(100vw - 32px);
    max-width: 380px;
    flex-direction: column;
    gap: 0px;
    padding: 10px 12px;
    position: relative;
}
.my-bgm-mobile-row {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 2px 0;
}
.title-row {
    justify-content: space-between;
    margin-bottom: 2px;
}
.title-row .music-title-text {
    font-size: 0.9em;
}
.title-row .my-bgm-close {
    flex-shrink: 0;
    margin-left: 8px;
}
.progress-bar-row {
    padding-bottom: 6px;
}
.main-controls-row {
    justify-content: space-between;
    padding-top: 2px;
}
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
button, button:focus, button:focus-visible,
.my-bgm-play-btn:focus, .my-bgm-play-btn:focus-visible,
.my-bgm-prev-next-btn:focus, .my-bgm-prev-next-btn:focus-visible,
.control-btn:focus, .control-btn:focus-visible {
    outline: none !important;
    box-shadow: none !important;
    padding: 0;
}
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
    transition: box-shadow .2s, background .2s, color .2s;
    flex-shrink: 0;
}
.my-bgm-play-btn:hover,
.my-bgm-play-btn:focus {
    box-shadow: 0 4px 14px #64b5f6aa;
    background: linear-gradient(145deg, #bbdefb 60%, #90caf9 100%);
    color: #0d47a1;
}
.my-bgm-prev-next-btn {
    font-size: 1.3em;
    line-height: 1;
    background: transparent;
    color: #666;
    border-radius: 5px;
    padding: 4px 8px;
    transition: background .2s, color .2s;
}
.my-bgm-prev-next-btn:hover {
    background: #e3f2fd;
    color: #1976d2;
}
.my-bgm-close {
    font-size: 1.2em;
    color: var(--vp-c-text-2, #888);
    margin-left: 8px;
    transition: color .2s;
    background: transparent;
    border: none;
    cursor: pointer;
}
.my-bgm-close:hover {
    color: var(--vp-c-text-1, #222);
}
.main-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}
.control-btn {
    font-size: 1.2em;
    color: #666;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background .2s, color .2s;
}
.control-btn:hover {
    background: #e3f2fd;
    color: #1976d2;
}
.marquee-container {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}
.music-title-text {
    font-weight: bold;
    font-size: 1em;
    display: inline-block;
    padding-left: 100%;
    animation: marquee 10s linear infinite;
    animation-play-state: running;
}
@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
}
.playlist-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.6);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
}
.playlist-modal {
    background: var(--vp-c-bg, #fff);
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
}
.playlist-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vp-c-divider, #eee);
}
.song-title-in-list {
    font-weight: 500;
}
.playlist-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vp-c-divider, #eee);
    cursor: pointer;
    transition: background-color 0.2s;
}
.playlist-item:last-child {
    border-bottom: none;
}
.playlist-item:hover {
    background-color: var(--vp-c-bg-soft, #f5f5f5);
}
.playlist-item.is-playing {
    background-color: var(--vp-c-brand-light, #e3f2fd);
}
.playlist-item.is-playing .song-title-in-list {
    font-weight: bold;
    color: var(--vp-c-brand, #1976d2);
}
.playing-indicator {
    font-size: 0.8em;
    color: var(--vp-c-brand, #1976d2);
}
.progress-bar-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
}
.time-display {
    font-size: 0.8em;
    color: #888;
    flex-shrink: 0;
    font-family: 'Courier New', Courier, monospace;
}
.progress-bar {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: #e9e9e9;
    border-radius: 2px;
    outline: none;
}
.progress-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border: 2.5px solid #1976d2;
    border-radius: 50%;
    cursor: pointer;
    margin-top: -3px;
}
</style>
