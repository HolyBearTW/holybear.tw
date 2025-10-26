<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'

/* --- 音樂清單 --- */
const musicList = [
    { src: '/music/MapleStory_The_Lost_City_among_the_Clouds.mp3', title: '楓之谷 - 奧迪溫' },
    { src: '/music/MapleStory_Sunshine_blurring_the_Unknown.mp3', title: '楓之谷 - 陽光灑落的實驗室' },
    { src: '/music/MapleStory_CashShop.mp3', title: '楓之谷 - 新購物商城' },
    { src: '/music/MapleStoryM_TheGuardianOfTheStars.mp3', title: '楓之谷M - 星之守護者' },
    { src: '/music/MapleStory_MissingYou.mp3', title: '楓之谷 - 魔法森林樹洞' },
    { src: '/music/MapleStory_WhereStarsRest.mp3', title: '楓之谷 - 賽拉斯' },
    { src: '/music/MapleStory_WhaleBelly.mp3', title: '楓之谷 - 星星被吞噬的深海' },
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
const progressPercent = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
})

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
                <h3>播放清單</h3>
                <button @click="togglePlaylist" class="my-bgm-close">✖️</button>
            </div>
            <ul class="playlist-items">
                <li
    v-for="(song, index) in musicList"
    :key="song.src"
    :class="['playlist-item', { 'is-playing': index === currentIndex }]"
    @click="selectAndPlaySong(index)"
>
    <span class="song-title-in-list">{{ song.title }}</span>
    <span v-if="index === currentIndex" class="playing-indicator">正在播放...</span>
</li>
            </ul>
        </div>
    </div>

    <transition name="player-slide">
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
                :style="{ '--progress-percent': progressPercent + '%' }"
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
                <button @click.stop="prevSong" title="上一首" class="my-bgm-prev-next-btn">⏮️</button>
                <button class="my-bgm-play-btn" @click.stop="toggleBgm" :title="playing ? '暫停' : '播放'">
                    {{ playing ? "⏸️" : "▶️" }}
                </button>
                <button @click.stop="nextSong" title="下一首" class="my-bgm-prev-next-btn">⏭️</button>
            </div>
            <button class="control-btn" @click.stop="togglePlaylist" title="播放清單">🎶</button>
        </div>
    </div>
    </transition>

    <transition name="player-slide">
        <div v-if="!isMobile && desktopPlayerOpen" class="my-bgm-player my-bgm-player-desktop" ref="playerContainer" @click.stop>
        <!-- 第一行：標題 + 關閉按鈕 -->
        <div class="desktop-row title-row">
            <div class="marquee-container">
                <span class="music-title-text">{{ currentMusicTitle }}</span>
            </div>
            <button class="my-bgm-close" @click.stop="desktopPlayerOpen = false" title="收合">✖️</button>
        </div>
        
        <!-- 第二行：進度條 + 時間 -->
        <div class="desktop-row progress-row">
            <span class="time-display">{{ formatTime(currentTime) }}</span>
            <input
                type="range"
                class="progress-bar"
                :style="{ '--progress-percent': progressPercent + '%' }"
                :max="duration"
                v-model.number="currentTime"
                @mousedown="startSeek"
                @mouseup="endSeek"
            >
            <span class="time-display">{{ formatTime(duration) }}</span>
        </div>
        
        <!-- 第三行：播放清單 + 控制按鈕 + 音量 -->
        <div class="desktop-row controls-row">
            <!-- 播放清單按鈕（左側） -->
            <div class="playlist-control-container">
                <button class="control-btn playlist-btn" @click.stop="togglePlaylist" title="播放清單">
                    ≡
                </button>
            </div>
            
            <!-- 播放控制（中間） -->
            <div class="main-controls">
                <button @click.stop="prevSong" title="上一首" class="my-bgm-prev-next-btn">⏮️</button>
                <button class="my-bgm-play-btn" @click.stop="toggleBgm" :title="playing ? '暫停' : '播放'">
                    {{ playing ? "⏸️" : "▶️" }}
                </button>
                <button @click.stop="nextSong" title="下一首" class="my-bgm-prev-next-btn">⏭️</button>
            </div>
            
            <!-- 音量控制（右側） -->
            <div class="volume-control-container">
                <button class="control-btn volume-btn" @click.stop="toggleVolumeSlider" title="音量">
                    <template v-if="volume === 0">🔇</template>
                    <template v-else-if="volume < 0.33">🔈</template>
                    <template v-else-if="volume < 0.7">🔉</template>
                    <template v-else>🔊</template>
                </button>
                
                <!-- 音量滑桿浮動面板 -->
                <transition name="fade">
                    <div v-if="isVolumeSliderVisible" class="volume-popup-desktop" @click.stop>
                        <input
                            type="range"
                            class="volume-slider-vertical"
                            orient="vertical"
                            min="0"
                            max="1"
                            step="0.01"
                            v-model.number="volume"
                            @input="flashVolumePercentage"
                        >
                    </div>
                </transition>
            </div>
        </div>
    </div>
    </transition>
</template>

<style scoped>
/* ==================== 現代平面化設計 ==================== */

:root {
    --player-primary: #6366f1;
    --player-primary-hover: #4f46e5;
    --player-secondary: #8b5cf6;
    --player-accent: #ec4899;
    --player-bg: #ffffff;
    --player-bg-dark: #1f2937;
    --player-surface: #f9fafb;
    --player-border: #e5e7eb;
    --player-text: #111827;
    --player-text-secondary: #6b7280;
    --player-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --player-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.music-icon {
    color: var(--player-primary);
    font-size: 1.1em;
    flex-shrink: 0;
}

.volume-icon {
    font-size: 1.1em;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.volume-icon:hover {
    transform: scale(1.1);
}
/* ==================== 音量控制 ==================== */
.volume-control-container {
    position: relative;
    display: flex;
    align-items: center;
}

/* 桌面版垂直音量滑桿 */
.volume-popup-desktop {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    background: var(--vp-c-bg, var(--player-bg));
    border: 1px solid var(--vp-c-divider, var(--player-border));
    border-radius: 12px;
    box-shadow: var(--player-shadow-lg);
    padding: 16px 12px;
    z-index: 11;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: volumePopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes volumePopIn {
    0% {
        opacity: 0;
        transform: translateY(10px) scale(0.9);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.volume-slider-vertical {
    -webkit-appearance: slider-vertical;
    appearance: slider-vertical;
    writing-mode: bt-lr;
    width: 6px;
    height: 120px;
    background: var(--vp-c-divider, var(--player-border));
    border-radius: 3px;
    outline: none;
    cursor: pointer;
}

.volume-slider-vertical::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--player-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.volume-slider-vertical::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
}

.volume-slider-vertical::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--player-primary);
    border: none;
    border-radius: 50%;
    cursor: pointer;
}

.volume-percentage-display {
    font-size: 0.875em;
    font-weight: 600;
    color: var(--player-primary);
    min-width: 40px;
    text-align: center;
}

/* 手機版橫向音量滑桿 */
.volume-popup-shared {
    position: absolute;
    background: var(--vp-c-bg, var(--player-bg));
    border: 1px solid var(--vp-c-divider, var(--player-border));
    border-radius: 12px;
    box-shadow: var(--player-shadow-lg);
    z-index: 11;
    transition: opacity 0.2s, transform 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    animation: volumeSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes volumeSlideUp {
    0% {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.volume-popup-shared .volume-icon {
    color: var(--vp-c-text-1, var(--player-text));
}

.volume-slider-horizontal {
    -webkit-appearance: none;
    appearance: none;
    width: 120px;
    height: 6px;
    background: var(--vp-c-divider, var(--player-border));
    border-radius: 3px;
    outline: none;
    cursor: pointer;
}

.volume-slider-horizontal::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--player-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.volume-slider-horizontal::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
}

.volume-percentage-display-local {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--player-primary);
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.875em;
    font-weight: 600;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: var(--player-shadow);
}

.volume-popup-mobile {
    bottom: 60px;
    left: 12px;
    right: 12px;
}
/* ==================== 桌面版播放器 ==================== */
.my-bgm-player-desktop {
    width: 320px;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
}

.desktop-row {
    display: flex;
    align-items: center;
    width: 100%;
}

/* 標題行 */
.desktop-row.title-row {
    justify-content: space-between;
    gap: 8px;
}

.desktop-row.title-row .marquee-container {
    flex: 1;
}

.desktop-row.title-row .music-title-text {
    font-size: 0.9em;
    font-weight: 600;
    color: var(--vp-c-text-1, var(--player-text));
}

/* 進度行 */
.desktop-row.progress-row {
    gap: 10px;
}

/* 控制行 */
.desktop-row.controls-row {
    justify-content: space-between;
    gap: 8px;
}

.playlist-control-container {
    position: relative;
}

.playlist-btn {
    font-size: 1.5em !important;
    font-weight: bold;
}

.volume-btn {
    font-size: 1.2em;
}

.my-bgm-player-desktop .main-controls {
    gap: 8px;
    flex: 1;
    justify-content: center;
}

.my-bgm-player-desktop .my-bgm-prev-next-btn {
    margin: 0;
    width: 36px;
    height: 36px;
}

.my-bgm-player-desktop .my-bgm-play-btn {
    width: 44px;
    height: 44px;
}
/* ==================== 手機版播放器 ==================== */
.my-bgm-player-mobile {
    width: calc(100vw - 40px);
    max-width: 400px;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    position: relative;
}

.my-bgm-mobile-row {
    display: flex;
    align-items: center;
    width: 100%;
}

.title-row {
    justify-content: space-between;
    margin-bottom: 4px;
    gap: 8px;
}

.title-row .music-title-text {
    font-size: 0.9em;
    font-weight: 600;
    color: var(--vp-c-text-1, var(--player-text));
}

.title-row .my-bgm-close {
    flex-shrink: 0;
}

.progress-bar-row {
    gap: 10px;
}

.main-controls-row {
    justify-content: space-between;
    padding-top: 4px;
}
/* ==================== FAB 按鈕 ==================== */
.my-bgm-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, var(--player-primary) 0%, var(--player-secondary) 100%);
    color: white;
    border-radius: 16px;
    box-shadow: var(--player-shadow-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    cursor: pointer;
    user-select: none;
    border: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: fabBounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.my-bgm-fab:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.my-bgm-fab:active {
    transform: translateY(0) scale(0.95);
}

@keyframes fabBounceIn {
    0% {
        opacity: 0;
        transform: scale(0) rotate(-180deg);
    }
    50% {
        transform: scale(1.1) rotate(10deg);
    }
    100% {
        opacity: 1;
        transform: scale(1) rotate(0deg);
    }
}

/* ==================== 播放器主容器 ==================== */
.my-bgm-player {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    z-index: 9999;
    background: var(--vp-c-bg, var(--player-bg));
    color: var(--vp-c-text-1, var(--player-text));
    border-radius: 16px;
    border: 1px solid var(--vp-c-divider, var(--player-border));
    box-shadow: var(--player-shadow-lg);
    padding: 16px;
    box-sizing: border-box;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}

/* 播放器進入/離開動畫 */
.player-slide-enter-active {
    animation: playerSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.player-slide-leave-active {
    animation: playerSlideOut 0.3s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes playerSlideIn {
    0% {
        opacity: 0;
        transform: translate(40px, 40px) scale(0.8);
    }
    100% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
    }
}

@keyframes playerSlideOut {
    0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(40px, 40px) scale(0.8);
    }
}

/* ==================== 按鈕通用樣式 ==================== */
button, button:focus, button:focus-visible,
.my-bgm-play-btn:focus, .my-bgm-play-btn:focus-visible,
.my-bgm-prev-next-btn:focus, .my-bgm-prev-next-btn:focus-visible,
.control-btn:focus, .control-btn:focus-visible {
    outline: none !important;
    box-shadow: none !important;
}

/* ==================== 播放按鈕 ==================== */
.my-bgm-play-btn {
    background: linear-gradient(135deg, var(--player-primary) 0%, var(--player-secondary) 100%);
    color: white !important;
    border-radius: 50%;
    border: none;
    width: 48px;
    height: 48px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    font-weight: bold;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    flex-shrink: 0;
    cursor: pointer;
    filter: none !important;
    -webkit-text-fill-color: white !important;
    text-shadow: none !important;
}

/* 確保 emoji 顯示為彩色 */
.my-bgm-play-btn::before {
    content: attr(data-emoji);
}

.my-bgm-play-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
}

.my-bgm-play-btn:active {
    transform: scale(0.95);
    animation: buttonPulse 0.4s ease-out;
}

@keyframes buttonPulse {
    0% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
    }
    50% {
        box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
    }
    100% {
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
}

/* ==================== 上下首按鈕 ==================== */
.my-bgm-prev-next-btn {
    font-size: 1.25em;
    line-height: 1;
    background: transparent;
    color: var(--vp-c-text-2, var(--player-text-secondary));
    border-radius: 8px;
    padding: 8px;
    transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    border: none;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.my-bgm-prev-next-btn:hover {
    background: var(--vp-c-bg-soft, var(--player-surface));
    color: var(--player-primary);
    transform: scale(1.1);
}

.my-bgm-prev-next-btn:active {
    transform: scale(0.9);
}
/* ==================== 關閉按鈕 ==================== */
.my-bgm-close {
    font-size: 1.1em;
    color: var(--vp-c-text-2, var(--player-text-secondary));
    transition: color 0.2s ease, transform 0.2s ease, background 0.2s ease;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.my-bgm-close:hover {
    color: var(--player-accent);
    background: var(--vp-c-bg-soft, var(--player-surface));
    transform: rotate(90deg) scale(1.1);
}

.my-bgm-close:active {
    transform: rotate(90deg) scale(0.9);
}

/* ==================== 主控制區 ==================== */
.main-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* ==================== 控制按鈕 ==================== */
.control-btn {
    font-size: 1.1em;
    color: var(--vp-c-text-1, var(--player-text));
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    background: var(--vp-c-bg-soft, rgba(0, 0, 0, 0.05));
    border: 1px solid var(--vp-c-divider, var(--player-border));
}

.control-btn:hover {
    background: var(--player-primary);
    color: white;
    transform: scale(1.1);
    border-color: var(--player-primary);
}

.control-btn:active {
    transform: scale(0.95);
}
/* ==================== 跑馬燈 ==================== */
.marquee-container {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}

.music-title-text {
    font-weight: 600;
    font-size: 0.95em;
    display: inline-block;
    padding-left: 100%;
    animation: marquee 12s linear infinite;
    animation-play-state: running;
    color: var(--vp-c-text-1, var(--player-text));
}

@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
}

/* ==================== 播放清單遮罩 ==================== */
.playlist-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: transparent;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
}

/* 桌面版：播放清單在按鈕旁顯示 */
@media (min-width: 641px) {
    .playlist-overlay {
        background-color: transparent;
        align-items: flex-end;
        justify-content: flex-end;
        padding-bottom: 140px;
        padding-right: 24px;
    }
}

/* 手機版：播放清單居中顯示 */
@media (max-width: 640px) {
    .playlist-overlay {
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }
}

@keyframes fadeIn {
    0% { 
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
    }
    100% { 
        opacity: 1;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }
}
/* ==================== 播放清單模態框 ==================== */
.playlist-modal {
    margin-right: 1%;
    background: var(--vp-c-bg, var(--player-bg));
    border-radius: 16px;
    width: 320px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 1px solid var(--vp-c-divider, var(--player-border));
    animation: slideUp 0.3s ease;
}

/* 手機版播放清單 */
@media (max-width: 640px) {
    .playlist-modal {
        width: 90vw;
        max-width: 400px;
        max-height: 60vh;
    }
}

@keyframes slideUp {
    0% {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.playlist-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--vp-c-divider, var(--player-border));
    background: var(--vp-c-bg-soft, var(--player-surface));
}

.playlist-header h3 {
    margin: 0;
    font-size: 1.25em;
    font-weight: 700;
    color: var(--vp-c-text-1, var(--player-text));
}

.playlist-items {
    padding: 12px;
    margin: 00;
    list-style: none;
    overflow-y: auto;
    flex: 1;
}

/* ==================== 播放清單項目 ==================== */
.playlist-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 12px;
    margin: 4px 0;
    position: relative;
    overflow: hidden;
}

.playlist-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background: linear-gradient(135deg, var(--player-primary) 0%, var(--player-secondary) 100%);
    transform: scaleY(0);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.playlist-item:hover {
    background: var(--vp-c-bg-soft, var(--player-surface));
    transform: translateX(6px);
    box-shadow: -2px 0 8px rgba(99, 102, 241, 0.1);
}

.playlist-item:hover::before {
    transform: scaleY(1);
}

.playlist-item:active {
    transform: translateX(6px) scale(0.98);
}

.playlist-item.is-playing {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%);
    border-left: 3px solid var(--player-primary);
    font-weight: 600;
    animation: nowPlayingGlow 2s ease-in-out infinite;
}

@keyframes nowPlayingGlow {
    0%, 100% {
        box-shadow: 0 0 0 rgba(99, 102, 241, 0);
    }
    50% {
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
    }
}

.playlist-item.is-playing::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(135deg, var(--player-primary) 0%, var(--player-secondary) 100%);
    border-radius: 0 2px 2px 0;
    transform: scaleY(1);
}

.song-title-in-list {
    font-weight: 500;
    color: var(--vp-c-text-1, var(--player-text));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

.playlist-item.is-playing .song-title-in-list {
    color: var(--player-primary);
    font-weight: 600;
}

.playing-indicator {
    font-size: 0.75em;
    color: var(--player-accent);
    font-weight: 600;
    padding: 4px 8px;
    background: rgba(236, 72, 153, 0.1);
    border-radius: 6px;
    margin-left: 8px;
    flex-shrink: 0;
    animation: playingPulse 1.5s ease-in-out infinite;
}

@keyframes playingPulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(0.98);
    }
}
/* ==================== 進度條區域 ==================== */
.progress-bar-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 12px;
}

.time-display {
    font-size: 0.75em;
    color: var(--vp-c-text-2, var(--player-text-secondary));
    flex-shrink: 0;
    font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    font-weight: 500;
    min-width: 42px;
}

/* ==================== 進度條樣式 ==================== */
.progress-bar {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--vp-c-divider, #e5e7eb);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    position: relative;
}

/* Webkit (Chrome, Safari, Edge) */
.progress-bar::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    background: var(--vp-c-divider, #e5e7eb);
    border-radius: 3px;
}

.progress-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: var(--player-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    margin-top: -4px; /* 讓thumb居中 */
    box-shadow: -999px 0 0 990px var(--player-primary); /* 填充進度 */
}

.progress-bar::-webkit-slider-thumb:hover {
    transform: scale(1.3);
    box-shadow: -999px 0 0 990px var(--player-primary), 0 0 0 6px rgba(99, 102, 241, 0.2);
}

/* Firefox */
.progress-bar::-moz-range-track {
    width: 100%;
    height: 6px;
    background: var(--vp-c-divider, #e5e7eb);
    border-radius: 3px;
}

.progress-bar::-moz-range-progress {
    height: 6px;
    background: var(--player-primary);
    border-radius: 3px;
}

.progress-bar::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: var(--player-primary);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.progress-bar::-moz-range-thumb:hover {
    transform: scale(1.3);
    box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.2);
}

/* ==================== 響應式設計 ==================== */
@media (max-width: 640px) {
    .my-bgm-player-desktop {
        min-width: auto;
        max-width: calc(100vw - 40px);
    }
}

@media (prefers-color-scheme: dark) {
    :root {
        --player-bg: #1f2937;
        --player-surface: #374151;
        --player-border: #4b5563;
        --player-text: #f9fafb;
        --player-text-secondary: #9ca3af;
    }
    
    .control-btn {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--player-border);
    }
    
    .progress-bar {
        background: #4b5563;
    }
    
    .progress-bar::-webkit-slider-runnable-track {
        background: #4b5563;
    }
    
    .progress-bar::-moz-range-track {
        background: #4b5563;
    }
}
</style>
