<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { THEME_CHANGE_EVENT } from './background/themes'

// 主題切換時自動插入聖誕歌並播放
onMounted(() => {
    window.addEventListener(THEME_CHANGE_EVENT, (e) => {
        if (e.detail?.theme === 'christmas') {
            if (!musicList.value.find(m => m.src === '/music/MapleStory_WhiteChristmas.mp3')) {
                musicList.value.unshift({
                    src: '/music/MapleStory_WhiteChristmas.mp3',
                    title: '楓之谷 - 幸福村（聖誕村莊）'
                })
            }
            currentIndex.value = 0
            playing.value = true
            playMusic()
        }
    })
})

/* --- 音樂清單 --- */
const musicList = ref([
    { src: '/music/LeagueofLegends_OmegaSquadTeemo.mp3', title: '英雄聯盟：戰爭機器 - 提摩' },
    { src: '/music/MapleStory_Reborngods.mp3', title: '楓之谷：塔拉哈特 - 遺跡廢墟' },
    { src: '/music/MapleStory_NightField.mp3', title: '楓之谷 - 不夜城徒步區' },
    { src: '/music/MapleStory_KerningSquareField.mp3', title: '楓之谷 - 101大道徒步區' },
    { src: '/music/MapleStory_AdventurersfromBeyond.mp3', title: '楓之谷 - 次元的戰場' },
    { src: '/music/MapleStory_2015gamaday_park.mp3', title: '楓之谷 - 橘子樂園' },
    { src: '/music/MapleStory_KerningSquare.mp3', title: '楓之谷 - 101大道' },
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
])
/* --- LocalStorage Keys --- */
const VOLUME_KEY = 'holybear-bgm-volume'
const PLAYING_KEY = 'holybear-bgm-playing'
const INDEX_KEY = 'holybear-bgm-index'
const PLAYER_OPEN_KEY = 'holybear-bgm-player-open'
const REPEAT_ONE_KEY = 'holybear-bgm-repeat-one'

/* --- Refs & 狀態 --- */
const audio = ref(null)
const playerContainer = ref(null)
const sidebarToggle = ref(null)
const playing = ref(false)
const volume = ref(0.6)
const volumeBeforeMute = ref(0.6)
const currentIndex = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const isSeeking = ref(false)
const playerOpen = ref(true) 
const isPlaylistVisible = ref(false)
const isVolumeVisible = ref(false)
const playerMinimized = ref(false)
const musicInfoHidden = ref(false)
const showSidebarButton = ref(false)
const showPlayerToggle = ref(false) // 播放器開關按鈕
const repeatOne = ref(false) // 重複播放同一首

// Toast 狀態
const showTitleToast = ref(false)
const toastText = ref('')
let toastTimer = null

function handleSongTitleMouseEnter(title, e) {
    // 判斷是否超長
    const el = e.target
    if (el.scrollWidth > el.clientWidth) {
        toastText.value = title
        showTitleToast.value = true
        // 自動隱藏
        if (toastTimer) clearTimeout(toastTimer)
        toastTimer = setTimeout(() => {
            showTitleToast.value = false
        }, 2200)
    }
}
function handleSongTitleMouseLeave() {
    showTitleToast.value = false
    if (toastTimer) clearTimeout(toastTimer)
}

function toggleRepeatOne() {
    repeatOne.value = !repeatOne.value
    localStorage.setItem(REPEAT_ONE_KEY, repeatOne.value ? 'true' : 'false')
    if (audio.value) {
        audio.value.loop = repeatOne.value
    }
}

/* --- 滑動手勢相關 --- */
const touchStartX = ref(0)
const touchStartY = ref(0)
const isDragging = ref(false)
const dragOffset = ref(0) // 拖動偏移量

/* --- 滑鼠懸停相關 --- */
let hoverTimer = null // 懸停計時器
let leaveTimer = null // 離開延遲計時器
const isHovering = ref(false) // 是否正在懸停
const isClicked = ref(false) // 是否已點擊顯示播放器

/* --- 自動播放監聽器 --- */
let autoPlayListener = null

/* --- Computed 屬性 --- */
const currentSong = computed(() => musicList.value[currentIndex.value])
const progressPercent = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
})

/* --- Lifecycle --- */
onMounted(() => {
    window.addEventListener('click', handleClickOutside)
    
    // 添加全域滑鼠移動監聽
    document.addEventListener('mousemove', handleGlobalMouseMove)

    const savedVolume = localStorage.getItem(VOLUME_KEY)
    if (savedVolume !== null) {
        volume.value = parseFloat(savedVolume)
        if (volume.value > 0) volumeBeforeMute.value = volume.value
    }

    const savedRepeatOne = localStorage.getItem(REPEAT_ONE_KEY)
    if (savedRepeatOne !== null) {
        repeatOne.value = savedRepeatOne === 'true'
        if (audio.value) audio.value.loop = repeatOne.value
    }

    const savedPlaying = localStorage.getItem(PLAYING_KEY)
    if (savedPlaying === 'true' && playerOpen.value) {
        // 只有在播放器開啟時才自動播放
        autoPlayListener = () => { playMusic() }
        document.body.addEventListener('click', autoPlayListener, { once: true })
    }

    const savedIndex = localStorage.getItem(INDEX_KEY)
    if (savedIndex !== null && !isNaN(+savedIndex) && +savedIndex >= 0 && +savedIndex < musicList.length) {
        currentIndex.value = +savedIndex
    }

    const savedPlayerOpen = localStorage.getItem(PLAYER_OPEN_KEY)
    if (savedPlayerOpen !== null) {
        playerOpen.value = savedPlayerOpen === 'true'
    }

    if (audio.value) {
        audio.value.volume = volume.value
        audio.value.loop = repeatOne.value
        audio.value.addEventListener('timeupdate', updateProgress)
        audio.value.addEventListener('loadedmetadata', onLoadedMetadata)
    }
})

onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside)
    document.removeEventListener('mousemove', handleGlobalMouseMove)
    document.removeEventListener('mousemove', handleMouseDragMove)
    document.removeEventListener('mouseup', handleMouseDragEnd)
    if (audio.value) {
        audio.value.removeEventListener('timeupdate', updateProgress)
        audio.value.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
    // 移除自動播放監聽器
    if (autoPlayListener) {
        document.body.removeEventListener('click', autoPlayListener)
    }
    // 清理懸停計時器
    if (hoverTimer) {
        clearTimeout(hoverTimer)
    }
    // 清理離開計時器
    if (leaveTimer) {
        clearTimeout(leaveTimer)
    }
})

/* --- Watchers --- */
watch(volume, (newVolume) => {
    if (audio.value) audio.value.volume = newVolume
    localStorage.setItem(VOLUME_KEY, newVolume.toString())
    if (newVolume > 0) volumeBeforeMute.value = newVolume
})

watch(playerOpen, (val) => {
    localStorage.setItem(PLAYER_OPEN_KEY, val ? 'true' : 'false')
    
    // 當播放器關閉時,移除自動播放監聽器並顯示開啟按鈕
    if (!val) {
        if (autoPlayListener) {
            document.body.removeEventListener('click', autoPlayListener)
            autoPlayListener = null
        }
        // 延遲顯示播放器開啟按鈕
        setTimeout(() => {
            showPlayerToggle.value = true
        }, 400)
    } else {
        // 播放器開啟時隱藏開啟按鈕
        showPlayerToggle.value = false
    }
})

watch(currentIndex, (val) => {
    localStorage.setItem(INDEX_KEY, val.toString())
})

watch(musicInfoHidden, (newVal) => {
    // 當 music-info 隱藏時，延遲顯示側邊欄按鈕
    if (newVal === true && playerMinimized.value) {
        setTimeout(() => {
            showSidebarButton.value = true
        }, 400) // 等待 music-info 隱藏動畫完成
    } else {
        // 當 music-info 顯示時，立即隱藏側邊欄按鈕
        showSidebarButton.value = false
    }
})

watch(playerMinimized, (newVal) => {
    // 如果取消最小化，隱藏側邊欄按鈕
    if (newVal === false) {
        showSidebarButton.value = false
    } else {
        // 最小化時重置點擊狀態
        isClicked.value = false
    }
})

/* --- 播放控制函數 --- */
function playMusic() {
    if (!audio.value) return
    audio.value.volume = volume.value
    audio.value.loop = repeatOne.value
    audio.value.play().then(() => {
        playing.value = true
        localStorage.setItem(PLAYING_KEY, 'true')
    }).catch(e => console.error("音樂播放失敗", e))
}

function pauseMusic() {
    if (!audio.value) return
    audio.value.pause()
    playing.value = false
    localStorage.setItem(PLAYING_KEY, 'false')
}

function togglePlay() {
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
    if (audio.value) {
        currentTime.value = 0
        playMusic()
    }
    isPlaylistVisible.value = false
}

/* --- 進度控制 --- */
function onLoadedMetadata(e) { 
    duration.value = e.target.duration 
}

function updateProgress(e) { 
    if (!isSeeking.value) currentTime.value = e.target.currentTime 
}

function setProgress(e) {
    if (!audio.value || duration.value === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const percent = clickX / width
    audio.value.currentTime = percent * duration.value
}

/* --- 音量控制 --- */
function toggleMute() {
    if (volume.value > 0) {
        volume.value = 0
    } else {
        volume.value = volumeBeforeMute.value > 0 ? volumeBeforeMute.value : 0.6
    }
}

/* --- UI 控制 --- */
function togglePlaylist() { 
    isPlaylistVisible.value = !isPlaylistVisible.value 
    if (isPlaylistVisible.value) isVolumeVisible.value = false
}

function toggleVolume() { 
    isVolumeVisible.value = !isVolumeVisible.value 
    if (isVolumeVisible.value) isPlaylistVisible.value = false
}

function handleClickOutside(event) {
    // 檢查點擊是否在播放器容器或側邊欄按鈕內
    const clickedInsidePlayer = playerContainer.value && playerContainer.value.contains(event.target)
    const clickedInsideSidebar = sidebarToggle.value && sidebarToggle.value.contains(event.target)
    
    if (!clickedInsidePlayer && !clickedInsideSidebar) {
        // 關閉面板（播放清單 / 音量面板）
        isPlaylistVisible.value = false
        isVolumeVisible.value = false

        // 如果 music-info 已經被手動隱藏，不做任何操作
        if (musicInfoHidden.value) {
            return
        }

        // 如果正在播放，將播放器最小化（主體淡出，只保留歌曲資訊）
        if (playing.value) {
            playerMinimized.value = true
        } else {
            // 未播放時才收起整個播放器
            playerOpen.value = false
        }
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === 0) return "0:00"
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
}

/* --- 滑動手勢處理（支援觸控和滑鼠） --- */
function handleDragStart(e) {
    // 只要 music-info 顯示就允許滑動（無論 music-container 是否展開）
    if (musicInfoHidden.value) return
    
    // 觸控事件
    if (e.type === 'touchstart') {
        touchStartX.value = e.touches[0].clientX
        touchStartY.value = e.touches[0].clientY
        isDragging.value = false
        dragOffset.value = 0
    } 
    // 滑鼠事件
    else if (e.type === 'mousedown') {
        touchStartX.value = e.clientX
        touchStartY.value = e.clientY
        isDragging.value = false
        dragOffset.value = 0
        e.preventDefault() // 防止文字選擇
        
        // 綁定全域滑鼠事件
        document.addEventListener('mousemove', handleMouseDragMove)
        document.addEventListener('mouseup', handleMouseDragEnd)
    }
}

function handleDragMove(e) {
    // 只處理觸控事件
    if (e.type !== 'touchmove') return
    
    // 只要 music-info 顯示就允許拖動
    if (!musicInfoHidden.value) {
        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        
        const deltaX = currentX - touchStartX.value
        const deltaY = currentY - touchStartY.value
        
        // 確保是水平向右滑動（而不是垂直滾動或其他方向）
        if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
            isDragging.value = true
            dragOffset.value = deltaX // 更新拖動偏移量
            e.preventDefault()  // 防止文字選擇等默認行為
        }
    }
}

function handleDragEnd(e) {
    // 只處理觸控事件
    if (e.type !== 'touchend') return
    if (!isDragging.value) return
    
    const endX = e.changedTouches[0].clientX
    const deltaX = endX - touchStartX.value
    
    // 向右滑動超過 50px 就隱藏 music-info
    if (deltaX > 50) {
        musicInfoHidden.value = true
        // 如果是在展開狀態下隱藏 music-info，也要最小化播放器
        if (!playerMinimized.value) {
            playerMinimized.value = true
        }
    }
    
    // 重置拖動偏移量
    isDragging.value = false
    dragOffset.value = 0
}

/* --- 滑鼠拖動處理（全域事件） --- */
function handleMouseDragMove(e) {
    if (musicInfoHidden.value) {
        // 如果 music-info 已隱藏，清理事件監聽
        document.removeEventListener('mousemove', handleMouseDragMove)
        document.removeEventListener('mouseup', handleMouseDragEnd)
        return
    }
    
    const currentX = e.clientX
    const currentY = e.clientY
    
    const deltaX = currentX - touchStartX.value
    const deltaY = currentY - touchStartY.value
    
    // 確保是水平向右滑動
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
        isDragging.value = true
        dragOffset.value = deltaX
        e.preventDefault()
        
        // 拖動時清除懸停計時器，防止展開 music-container
        if (hoverTimer) {
            clearTimeout(hoverTimer)
            hoverTimer = null
        }
        if (leaveTimer) {
            clearTimeout(leaveTimer)
            leaveTimer = null
        }
        isHovering.value = false
    }
}

function handleMouseDragEnd(e) {
    // 移除全域事件監聽
    document.removeEventListener('mousemove', handleMouseDragMove)
    document.removeEventListener('mouseup', handleMouseDragEnd)
    
    if (!isDragging.value) return
    
    const endX = e.clientX
    const deltaX = endX - touchStartX.value
    
    // 向右滑動超過 50px 就隱藏 music-info
    if (deltaX > 50) {
        musicInfoHidden.value = true
        // 如果是在展開狀態下隱藏 music-info，也要最小化播放器
        if (!playerMinimized.value) {
            playerMinimized.value = true
        }
    }
    
    // 重置拖動偏移量
    isDragging.value = false
    dragOffset.value = 0
}

/* --- 滑鼠懸停處理 --- */
function handleMouseEnter() {
    // 只在最小化且 music-info 顯示時才啟用懸停效果
    if (!playerMinimized.value || musicInfoHidden.value || isClicked.value) return
    
    isHovering.value = true
    
    // 清除離開計時器（如果正在等待隱藏）
    if (leaveTimer) {
        clearTimeout(leaveTimer)
        leaveTimer = null
    }
    
    // 清除之前的懸停計時器
    if (hoverTimer) {
        clearTimeout(hoverTimer)
    }
    
    // 設置 0.1 秒後顯示播放器
    hoverTimer = setTimeout(() => {
        if (isHovering.value && !isClicked.value) {
            playerMinimized.value = false
        }
    }, 200)
}

function handleMouseLeave() {
    isHovering.value = false
    
    // 清除懸停計時器
    if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
    }
    
    // 如果沒有被點擊過且播放器已展開，延遲 100ms 後再隱藏
    // 這給用戶時間從 music-info 移動到 music-container
    if (!isClicked.value && !playerMinimized.value && !isPlaylistVisible.value && !isVolumeVisible.value) {
        leaveTimer = setTimeout(() => {
            // 再次檢查是否還在懸停狀態（可能已經移動到 music-container）
            if (!isHovering.value && !isClicked.value) {
                playerMinimized.value = true
            }
        }, 100)
    }
}

function handleContainerMouseEnter() {
    // music-container 被懸停時，標記為懸停狀態並清除所有計時器
    isHovering.value = true
    
    if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
    }
    
    if (leaveTimer) {
        clearTimeout(leaveTimer)
        leaveTimer = null
    }
}

function handleContainerMouseLeave() {
    // 離開 music-container 時，如果沒有被點擊鎖定，則延遲後最小化
    isHovering.value = false
    
    if (!isClicked.value && !playerMinimized.value && !isPlaylistVisible.value && !isVolumeVisible.value) {
        leaveTimer = setTimeout(() => {
            if (!isHovering.value && !isClicked.value) {
                playerMinimized.value = true
            }
        }, 300)
    }
}

// 添加全域滑鼠移動監聽，以處理 minimized 狀態下的懸停檢測
function handleGlobalMouseMove(e) {
    // 只在非最小化且非點擊鎖定狀態下才處理
    if (playerMinimized.value || isClicked.value || !playerOpen.value) return
    
    const container = playerContainer.value
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
    )
    
    if (isInside) {
        // 滑鼠在 music-container 範圍內
        isHovering.value = true
        if (leaveTimer) {
            clearTimeout(leaveTimer)
            leaveTimer = null
        }
    }
}

function handleMusicInfoClick(e) {
    // 點擊時展開播放器並標記為已點擊（包含懸停狀態下的點擊）
    if (playerMinimized.value) {
        e.stopPropagation()
        playerMinimized.value = false
        isClicked.value = true // 標記為已點擊
    } else if (!isClicked.value) {
        // 如果已經是懸停展開狀態，點擊後鎖定
        e.stopPropagation()
        isClicked.value = true
    }
}

function handleContainerClick(e) {
    // 在懸停展開狀態下點擊 music-container，鎖定顯示
    if (!isClicked.value && !playerMinimized.value) {
        e.stopPropagation()
        isClicked.value = true
    }
}

function showMusicInfo() {
    // 先設置 musicInfoHidden 為 false
    musicInfoHidden.value = false
    // 確保播放器保持最小化狀態（不觸發外部點擊邏輯）
    playerMinimized.value = true
}

</script>

<template>
    <audio ref="audio" :src="currentSong.src" preload="auto" @ended="nextSong"></audio>

    <!-- 主播放器 -->
    <transition name="player-fade">
        <div 
            v-if="playerOpen" 
            ref="playerContainer"
            class="music-container" 
            :class="{ 
                'play': playing, 
                'minimized': playerMinimized,
                'panel-open': isPlaylistVisible || isVolumeVisible,
                'info-hidden': musicInfoHidden
            }"
            @click.stop="handleContainerClick"
            @mouseenter="handleContainerMouseEnter"
            @mouseleave="handleContainerMouseLeave"
        >
            <!-- 歌曲資訊（播放時從上方滑出） -->
            <div 
                class="music-info" 
                :class="{ 
                    'hidden': musicInfoHidden,
                    'dragging': isDragging
                }"
                :style="isDragging ? { transform: `translateX(${dragOffset}px) translateY(-107%)` } : {}"
                @click="handleMusicInfoClick"
                @mouseenter="handleMouseEnter"
                @mouseleave="handleMouseLeave"
                @touchstart="handleDragStart"
                @touchmove="handleDragMove"
                @touchend="handleDragEnd"
                @mousedown="handleDragStart"
            >
                <h2 class="title">
                    <span class="title-text">{{ currentSong.title }} &nbsp;&nbsp;&nbsp; {{ currentSong.title }} &nbsp;&nbsp;&nbsp; {{ currentSong.title }}</span>
                </h2>
                <div class="time-info">
                    <span>{{ formatTime(currentTime) }}</span>
                    <span>{{ formatTime(duration) }}</span>
                </div>
                <div class="progress-container" @click="setProgress">
                    <div class="progress" :style="{ width: progressPercent + '%' }"></div>
                </div>
            </div>

            <!-- 封面圖片（旋轉） -->

            <!-- 控制按鈕 -->
            <div class="navigation">
                <!-- 播放清單按鈕 -->
                <button class="action-btn" @click.stop="togglePlaylist" title="播放清單">
                    <i class="fas fa-list"></i>
                </button>

                <!-- 上一首 -->
                <button class="action-btn" @click.stop="prevSong" title="上一首">
                    <i class="fas fa-backward"></i>
                </button>

                <!-- 播放/暫停 -->
                <button class="action-btn action-btn-big" @click.stop="togglePlay" :title="playing ? '暫停' : '播放'">
                    <i class="fas" :class="playing ? 'fa-pause' : 'fa-play'"></i>
                </button>

                <!-- 下一首 -->
                <button class="action-btn" @click.stop="nextSong" title="下一首">
                    <i class="fas fa-forward"></i>
                </button>

                <!-- 音量按鈕 -->
                <button class="action-btn" @click.stop="toggleVolume" title="音量">
                    <i class="fas" :class="volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'"></i>
                </button>
            </div>

            <!-- 關閉按鈕（已移除：改為點擊外部在未播放時關閉） -->

            <!-- 音量控制面板 -->
            <transition name="slide-up">
                <div v-if="isVolumeVisible" class="volume-panel">
                    <!-- 音量百分比顯示 -->
                    <div class="volume-percentage-display">{{ Math.round(volume * 100) }}%</div>
                    <div class="volume-slider-vertical-container">
                        <input
                            type="range"
                            class="volume-slider-vertical"
                            min="0"
                            max="1"
                            step="0.01"
                            v-model.number="volume"
                            orient="vertical"
                        />
                    </div>
                </div>
            </transition>

            <!-- 播放清單面板 -->
            <transition name="slide-up">
                <div v-if="isPlaylistVisible" class="playlist-panel">
                    <h3 class="playlist-title">播放清單</h3>
                    <div class="playlist-items">
                        <div
                            v-for="(song, index) in musicList"
                            :key="song.src"
                            class="playlist-item"
                            :class="{ 'active': index === currentIndex }"
                            @click="selectAndPlaySong(index)"
                        >
                            <div class="song-info" style="display: flex; align-items: center;">
                                <span class="song-number">{{ index + 1 }}</span>
                                <span class="song-title"
                                    @mouseenter="handleSongTitleMouseEnter(song.title, $event)"
                                    @mouseleave="handleSongTitleMouseLeave"
                                >{{ song.title }}</span>
                                <!-- 只在目前播放的歌曲顯示 repeatOne 按鈕 -->
                                <button v-if="index === currentIndex" class="action-btn" @click.stop="toggleRepeatOne" :title="repeatOne ? '重複播放：開啟' : '重複播放：關閉'" style="margin-left:2px; padding:2px 4px; font-size:1em; height:22px; width:22px;">
                                    <i class="fas fa-repeat" :style="repeatOne ? 'color:#ff9800; filter:drop-shadow(0 0 2px #ff9800);' : 'color:#bbb;'" />
                                </button>
                            </div>
                            <i v-if="index === currentIndex && playing" class="fas fa-volume-up playing-icon" style="margin-left:2px;"></i>
                        </div>
                        <!-- 歌曲名稱 Toast -->
                        <transition name="toast-fade">
                            <div v-if="showTitleToast" class="title-toast">{{ toastText }}</div>
                        </transition>
                    </div>
                </div>
            </transition>
        </div>
    </transition>

    <!-- 側邊欄按鈕（當 music-info 隱藏時顯示） - 放在 music-container 外部 -->
    <transition name="sidebar-fade">
        <div 
            v-if="showSidebarButton && playerOpen"
            ref="sidebarToggle"
            class="sidebar-toggle"
            @click.stop.prevent="showMusicInfo"
            @touchend.stop.prevent="showMusicInfo"
        >
            <div class="sidebar-icon">&lt;</div>
        </div>
    </transition>

    <!-- 播放器開關按鈕（當播放器關閉時顯示） -->
    <transition name="sidebar-fade">
        <div 
            v-if="showPlayerToggle"
            class="sidebar-toggle player-toggle"
            @click.stop.prevent="playerOpen = true"
            @touchend.stop.prevent="playerOpen = true"
        >
            <i class="fa-solid fa-music"></i>        
</div>
    </transition>
</template>

<style>
/* ==================== 歌曲名稱 Toast ==================== */
.title-toast {
    position: fixed;
    left: 50%;
    bottom: 110px;
    transform: translateX(-50%);
    /* 使用深色品牌色作為背景，確保白色文字可讀 */
    background: var(--vp-c-brand-darker); 
    color: #fff;
    font-size: 1.08rem;
    font-weight: 600;
    padding: 10px 22px;
    border-radius: 16px;
    box-shadow: 0 4px 18px rgba(0, 204, 238, 0.3);
    z-index: 99999;
    pointer-events: none;
    user-select: none;
    white-space: pre-line;
    max-width: 80vw;
    text-align: center;
    opacity: 0.98;
}
.toast-fade-enter-active, .toast-fade-leave-active {
    transition: opacity 0.3s;
}
.toast-fade-enter-from, .toast-fade-leave-to {
    opacity: 0;
}
</style>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

/* ==================== 主播放器容器 ==================== */
.music-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 24px;
    padding: 20px 30px;
    z-index: 9999;
    min-width: 350px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    /* 邊框使用極淡的品牌色 */
    border: 1px solid var(--vp-c-brand-dimm);
}

/* 最小化狀態：主體完全消失 */
.music-container.minimized {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    transform: translateY(20px);
}

.music-container.minimized > *:not(.music-info) {
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
    transform: translateY(15px);
    transition: all 0.4s ease;
}

.music-container.minimized .music-info {
    opacity: 0.9 !important;
    transform: translateY(-50%) !important;
    pointer-events: auto;
    cursor: pointer;
    /* 陰影改為品牌色 */
    box-shadow: 0 8px 28px rgba(0, 204, 238, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.25) inset;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.music-container:not(.minimized) {
    transition-delay: 0.1s;
}

.music-container.info-hidden {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    pointer-events: none !important;
}

.music-container.info-hidden > *:not(.sidebar-toggle) {
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
}

/* ==================== 歌曲資訊 ==================== */
.music-info {
    /* 背景帶一點點品牌色調 */
    background: rgba(227, 253, 253, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--vp-c-brand-dimm);
    border-radius: 16px;
    position: absolute;
    width: calc(100% - 80px);
    padding: 18px 22px;
    top: 30px;
    left: 40px;
    opacity: 0;
    transform: translateY(0%);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: -1;
    box-shadow: 0 4px 16px rgba(0, 204, 238, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
}

.music-container.play .music-info {
    opacity: 1;
    transform: translateY(-107%);
}

.music-info.dragging {
    transition: none !important;
}

.music-container.panel-open .music-info {
    opacity: 0 !important;
    pointer-events: none;
}

.music-info.hidden {
    opacity: 0 !important;
    transform: translateX(120%) translateY(-50%) !important;
    pointer-events: none !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.music-container.minimized .music-info.hidden {
    transform: translateX(120%) translateY(-50%) !important;
}

/* ==================== 側邊欄按鈕 ==================== */
.sidebar-toggle {
    position: fixed;
    right: 0px;
    bottom: 24px;
    width: 20px;
    height: 108px;
    background: rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--vp-c-brand-dark); 
    box-shadow: 0 0 20px rgba(0, 204, 238, 0.2),
                0 0 40px rgba(0, 204, 238, 0.1),
                inset 0 0 20px rgba(0, 204, 238, 0.05);
    border-radius: 12px 0 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    pointer-events: auto;
    touch-action: manipulation;
}

.sidebar-toggle:hover {
    background: rgba(255, 255, 255, 0.55);
    border-color: var(--vp-c-brand-darker);
    box-shadow: 0 0 25px rgba(0, 204, 238, 0.4),
                0 0 50px rgba(0, 204, 238, 0.2),
                inset 0 0 25px rgba(0, 204, 238, 0.1);
    transform: translateX(-3px);
}

.sidebar-icon {
    font-size: 20px;
    font-weight: bold;
    color: var(--vp-c-brand-darker);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    pointer-events: none;
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
    transform: translateX(40px);
}

.sidebar-toggle.player-toggle .sidebar-icon {
    font-size: 24px;
}

.music-info .title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: #333;
    overflow: hidden;
    position: relative;
    height: 1.5em;
    width: 100%;
}

.title-text {
    display: inline-block;
    white-space: nowrap;
    animation: scrollText 12s linear infinite;
}

@keyframes scrollText {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
}

.music-container:not(.play) .title-text {
    animation-play-state: paused;
}

.time-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 8px;
}

/* ==================== 進度條 ==================== */
.progress-container {
    background-color: rgba(179, 252, 247, 0.3);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    cursor: pointer;
    height: 6px;
    width: 100%;
    overflow: hidden;
    position: relative;
    box-shadow: 0 0 0 1px var(--vp-c-brand-dimm) inset;
}

.progress {
    /* 使用品牌色漸層 */
    background: linear-gradient(90deg, var(--vp-c-brand-darker) 0%, var(--vp-c-brand) 100%);
    border-radius: 8px;
    height: 100%;
    width: 0%;
    transition: width 0.1s linear;
    position: relative;
    box-shadow: 0 0 8px var(--vp-c-brand-dimm);
}

.progress::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: rgba(255, 255, 255, 0.95);
    border: 0px solid var(--vp-c-brand-dark);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--vp-c-brand),
                0 2px 4px rgba(0, 0, 0, 0.1);
}

/* ==================== 控制按鈕 ==================== */
.navigation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    margin-top: 10px;
}

.action-btn {
    /* 亮色模式下使用深品牌色以增加對比 */
    color: var(--vp-c-brand-darker);
    font-size: 20px;
    cursor: pointer;
    padding: 10px;
    transition: all 0.3s ease;
    border-radius: 25%;
    width: 45px;
    height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn:hover {
    color: var(--vp-c-brand-dark);
    background-color: var(--vp-c-brand-dimm);
    border-color: var(--vp-c-brand-light);
    transform: scale(1.1);
    backdrop-filter: blur(8px);
    border: 1px solid var(--vp-c-brand-dimm);
    box-shadow: 0 4px 12px rgba(0, 204, 238, 0.15);
}

.action-btn:active {
    transform: scale(0.95);
}

.action-btn-big {
    color: #fff;
    /* 大按鈕漸層：深青色 -> 青色 */
    background: linear-gradient(135deg, var(--vp-c-brand-darker) 0%, var(--vp-c-brand-dark) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid var(--vp-c-brand-dimm);
    font-size: 24px;
    width: 55px;
    height: 55px;
    box-shadow: 0 6px 20px rgba(0, 204, 238, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.action-btn-big:hover {
    color: #fff;
    background: linear-gradient(135deg, var(--vp-c-brand-dark) 0%, var(--vp-c-brand-darker) 100%);
    box-shadow: 0 8px 24px rgba(0, 204, 238, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

/* ==================== 音量面板 ==================== */
.volume-panel {
    position: absolute;
    bottom: calc(75%);
    left: 84.7%;
    transform: translateX(-50%);
    background: rgba(240, 255, 255, 0.9);
    border: 1px solid var(--vp-c-brand-dimm);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 204, 238, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    min-width: 10px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.volume-percentage-display {
    font-size: 18px;
    font-weight: 600;
    color: var(--vp-c-brand-darker);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    margin-bottom: 8px;
    user-select: none;
}

.volume-slider-vertical-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 120px;
}

.volume-slider-vertical {
    -webkit-appearance: none;
    appearance: none;
    writing-mode: vertical-lr;
    direction: rtl;
    width: 6px;
    height: 120px;
    background: rgba(179, 252, 247, 0.4);
    backdrop-filter: blur(8px);
    border-radius: 3px;
    outline: none;
    box-shadow: 0 0 0 1px var(--vp-c-brand-dimm) inset;
    cursor: pointer;
}

.volume-slider-vertical::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
    backdrop-filter: blur(8px);
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(0, 204, 238, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    transition: all 0.3s ease;
}

.volume-slider-vertical::-webkit-slider-thumb:hover {
    transform: scale(1.3);
    box-shadow: 0 4px 16px rgba(0, 204, 238, 0.6),
                0 0 0 2px rgba(255, 255, 255, 0.3) inset;
}

.volume-slider-vertical::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(0, 204, 238, 0.4);
}

/* ==================== 播放清單面板 ==================== */
.playlist-panel {
    position: absolute;
    bottom: calc(75%);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(240, 255, 255, 0.35);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--vp-c-brand-dimm);
    border-radius: 18px;
    padding: 25px;
    box-shadow: 0 8px 32px rgba(0, 204, 238, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    max-width: 350px;
    max-height: 400px;
    z-index: 10;
}

.playlist-title {
    margin: 0 0 18px 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: rgb(46, 46, 46);
    text-align: center;
    text-shadow: 0 2px 4px rgba(255, 255, 255, 0.1);
}

.playlist-items {
    max-height: 300px;
    overflow-y: auto;
    padding-right: 15px;
    padding-left: 15px;
    margin-left: -15px;
    box-sizing: border-box;
}

.playlist-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    margin-bottom: 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba(240, 255, 255, 0.3);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 204, 238, 0.1);
    box-shadow: 0 2px 8px rgba(0, 204, 238, 0.05);
}

.playlist-item:hover {
    background: var(--vp-c-brand-dimm);
    border-color: var(--vp-c-brand-light);
    box-shadow: 0 4px 12px rgba(0, 204, 238, 0.15);
}

.playlist-item.active {
    /* 激活狀態使用品牌漸層背景 */
    background: linear-gradient(135deg, rgba(0, 255, 238, 0.15) 0%, rgba(0, 204, 238, 0.15) 100%);
    border-left: 3px solid var(--vp-c-brand-dark);
    border-color: var(--vp-c-brand-light);
    box-shadow: 0 4px 16px rgba(0, 204, 238, 0.2),
                0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

.song-info {
    display: flex;
    align-items: center;
    flex: 1;
    overflow: hidden;
}

.song-number {
    font-weight: 700;
    color: var(--vp-c-brand-darker);
    min-width: 28px;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.song-title {
    color: rgba(51, 51, 51, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.95rem;
    font-weight: 500;
}

.playing-icon {
    color: var(--vp-c-brand-dark);
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* ==================== 捲軸樣式 ==================== */
.playlist-items::-webkit-scrollbar {
    width: 4px;
}

.playlist-items::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    border-radius: 2px;
}

.playlist-items::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(8px);
    border-radius: 2px;
}

.playlist-items::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.7);
}

/* ==================== 動畫效果 ==================== */
.player-fade-enter-active,
.player-fade-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-fade-enter-from,
.player-fade-leave-to {
    transform: translateX(120%);
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
}

.slide-up-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
}

.volume-panel, .playlist-panel {
    background: rgba(255, 255, 255, 0.75);
    border-color: var(--vp-c-brand-dark);
}

/* ==================== 響應式設計 ==================== */
@media (max-width: 480px) {
    .music-container {
        right: 12px;
        bottom: 12px;
        min-width: 300px;
        padding: 20px 25px;
    }
}

/* ==================== 深色模式 (Dark Mode) ==================== */
@media (prefers-color-scheme: dark) {
    .dark .music-container {
        background: rgba(30, 30, 30, 0.5);
        border: 0px solid transparent;
    }
    
    .dark .action-btn {
        /* 深色模式下使用最亮的品牌色 */
        color: var(--vp-c-brand);
        text-shadow: 0 0 5px var(--vp-c-brand-darker);
    }
    
    .dark .music-info {
        background: linear-gradient(to top, rgba(30, 30, 30, 0.9), rgba(30, 30, 30, 0.5));
        border-color: var(--vp-c-brand-dimm);
    }

    .dark .music-info .title {
        color: rgba(255, 255, 255, 0.95);
    }

    .dark .time-info {
        color: rgba(170, 170, 170, 0.9);
    }

    .dark .volume-panel,
    .dark .playlist-panel {
        background: rgba(30, 30, 30, 0.75);
        border-color: var(--vp-c-brand-dark);
    }

    .dark .volume-percentage-display {
        color: var(--vp-c-brand);
    }

    .dark .playlist-item {
        background: rgba(0, 255, 238, 0.05);
        border-color: rgba(0, 255, 238, 0.05);
    }
    
    .dark .playlist-item:hover {
        background: var(--vp-c-brand-dimm);
        border-color: var(--vp-c-brand);
        box-shadow: 0 0 10px var(--vp-c-brand-dimm);
    }

    .dark .playlist-title {
        margin: 0 0 18px 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: rgb(255, 255, 255);
        text-align: center;
        text-shadow: 0 2px 4px rgba(255, 255, 255, 0.1);
    }
    
    .dark .song-title {
        color: rgba(221, 221, 221, 0.9);
    }

    .dark .song-number {
        color: var(--vp-c-brand-light);
    }

    /* 深色模式下的側邊欄按鈕 */
    .dark .sidebar-toggle {
        background: rgba(0, 0, 0, 0.35);
        border-color: var(--vp-c-brand-dark);
        box-shadow: 0 0 20px rgba(0, 204, 238, 0.2),
                    0 0 40px rgba(0, 204, 238, 0.1),
                    inset 0 0 20px rgba(0, 204, 238, 0.05);
    }

    .dark .sidebar-toggle:hover {
        background: rgba(0, 0, 0, 0.75);
        border-color: var(--vp-c-brand);
        box-shadow: 0 0 25px rgba(0, 204, 238, 0.4),
                    0 0 50px rgba(0, 204, 238, 0.2),
                    inset 0 0 25px rgba(0, 204, 238, 0.15);
    }

    .dark .sidebar-icon {
        color: var(--vp-c-brand);
        text-shadow: 0 0 8px var(--vp-c-brand-dark);
    }
}
</style>