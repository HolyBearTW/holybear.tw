<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { defaultTheme, THEME_CHANGE_EVENT } from './background/themes'

/* --- 音樂清單 --- */
const originalMusicList = ref([
{ src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_Main_Theme.mp3', title: '薩爾達無雙：封印戰記 - 主題曲' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_Those_Bold_of_Heart.mp3', title: '薩爾達無雙：封印戰記 - 勇敢的心' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_The_Kingdom_of_Hyrule_-_Rise_of_the_Demon_King_Purah_Pad.mp3', title: '薩爾達無雙：封印戰記 - 海拉魯王國：魔王崛起' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_The_Unknown_Abyss.mp3', title: '薩爾達無雙：封印戰記 - 未知的深淵' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_Undaunted_Will.mp3', title: '薩爾達無雙：封印戰記 - 不屈的意志' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_The_Final_Confrontation_-_For_the_Future.mp3', title: '薩爾達無雙：封印戰記 - 最終決戰：為了未來' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_Reflecting_on_Battle.mp3', title: '薩爾達無雙：封印戰記 - 回顧戰仗' },
  { src: '/music/Zelda/Hyrule_Warriors_Age_of_Imprisonment_OST_-_Journeys_End.mp3', title: '薩爾達無雙：封印戰記 - 旅途的終點' },
  { src: '/music/Zelda/Tears_Of_The_Kingdom_OST_Last_Catch.mp3', title: '薩爾達傳說：王國之淚 - 最後的接住' },
  { src: '/music/MapleStory_Abyss_AbysmalRavine.mp3', title: '楓之谷：米納爾森林 - 黑洞深淵' },
  { src: '/music/MapleStory_Abyss_TheBottomEnd.mp3', title: '楓之谷：米納爾森林 - 深淵之底' },
  { src: '/music/MapleStory_Dancing_Sea_Otter.mp3', title: '楓之谷：伊甸提斯克 - 波浪海獺' },
  { src: '/music/MapleStory_Dancing_Sea_Otter_Festival.mp3', title: '楓之谷：伊甸提斯克 - 波浪海獺慶典' },
  { src: '/music/MapleStory_Mapril_Island.mp3', title: '楓之谷 - Maple19 回憶島' },
  { src: '/music/MapleStory_OriginOfRecords.mp3', title: '楓之谷 - 記憶中的一頁' },
  { src: '/music/MapleStory_mapleDanmak.mp3', title: '楓之谷 - 精靈的感情' },
  { src: '/music/MapleStory_sunset_over_the_horizon.mp3', title: '楓之谷 - 提爾諾格' },
  { src: '/music/MapleStroy_wonstaurant.mp3', title: '楓之谷 - 溫莉餐廳' },
  { src: '/music/MapleStory_WhereStarsRest(Original).mp3', title: '楓之谷 - 賽拉斯（經典）' },
  { src: '/music/MapleStory_VoiceofVerdict.mp3', title: '楓之谷：證明的戰場 - 重生為傳說的命運（最初的敵對者魔王戰）' },
  { src: '/music/MapleStory_WisdomBeyondAspirations.mp3', title: '楓之谷：證明的戰場 - 洞察真相的智慧（最初的敵對者魔王戰）' },
  { src: '/music/MapleStory_GateofProof.mp3', title: '楓之谷：證明的戰場 - 意志起源之處' },
  { src: '/music/MapleStory_SuccessionBloom.mp3', title: '楓之谷：證明的戰場 - 證明意志之處' },
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
  { src: '/music/MapleStory_mapleLIVE.mp3', title: '楓之谷 - LIVE On Air' },
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

const musicList = ref([...originalMusicList.value])

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
const playlistItemsRef = ref(null)
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
const showPlayerToggle = ref(false)
const repeatOne = ref(false)
const isPageLoaded = ref(false)

const showTitleToast = ref(false)
const toastText = ref('')
let toastTimer = null

let hoverTimer = null
let leaveTimer = null
const isHovering = ref(false)
const isClicked = ref(false)

let autoPlayListener = null
let internalAudioTransition = false
let pendingTrackAdvance = false
let trackAdvanceUnlockTimer = null
let playbackRecoveryTimer = null
let intendedToPlay = false
let resumeOnVisibilityReturn = false
let mediaSessionSeekEnabled = false
let initialPlaybackPending = false

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}

function handleLoadingComplete() {
  isPageLoaded.value = true

  if (isMobileViewport()) {
    playerMinimized.value = true
    musicInfoHidden.value = true
    showSidebarButton.value = true
  }

  startInitialPlaybackWhenReady()
}

function startInitialPlaybackWhenReady() {
  if (!isPageLoaded.value || !initialPlaybackPending) return

  initialPlaybackPending = false
  if (canAttemptPlaybackNow()) {
    selectAndPlaySong(currentIndex.value, { forceRestart: true })
  } else {
    // 尚未取得使用者互動，只更新畫面，不要把首次訪客誤記成「主動暫停」。
    playing.value = false
    syncMediaSessionPlaybackState()
    syncMediaSessionPositionState()
    armAutoplayOnInteraction()
  }
}

function canAttemptPlaybackNow() {
  if (typeof navigator === 'undefined' || !navigator.userActivation) return true
  return navigator.userActivation.hasBeenActive
}

function armAutoplayOnInteraction() {
  if (autoPlayListener) return

  autoPlayListener = () => {
    autoPlayListener = null
    playMusic()
  }

  document.body.addEventListener('click', autoPlayListener, { once: true, capture: true })
}

/* --- Computed 屬性 --- */
const currentSong = computed(() => {
  const list = Array.isArray(musicList.value) ? musicList.value : []
  const idx = Number(currentIndex.value || 0)
  if (list.length === 0) return { src: '', title: '' }
  const safeIdx = (idx >= 0 && idx < list.length) ? idx : 0
  return list[safeIdx] || { src: '', title: '' }
})

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

/* --- 生命週期 --- */
const themeHandler = (e) => {
  const isChristmasTheme = e.detail?.theme === 'christmas';
  const christmasSong = {
    src: '/music/MapleStory_WhiteChristmas.mp3',
    title: '楓之谷 - 幸福村（聖誕村莊）'
  };
  const isChristmasSongInList = musicList.value.some(m => m.src === christmasSong.src);
  const wasPlaying = playing.value; // 保存切換前是否正在播放

  if (isChristmasTheme) {
    if (!isChristmasSongInList) {
      // 確保聖誕歌曲只添加一次
      musicList.value.unshift(christmasSong);
    }
    // 無論是否在播放，切換到聖誕主題時都強制播放聖誕音樂
    selectAndPlaySong(0, { forceRestart: true });
  } else {
    // 從聖誕主題切換到其他主題
    if (isChristmasSongInList) {
      const currentSongSrc = currentSong.value.src;
      // 移除聖誕音樂
      musicList.value = [...originalMusicList.value]; // 恢復原始列表

      // 調整 currentIndex，確保其指向原始列表中的有效歌曲
      // 移除聖誕音樂後，currentIndex 應該回到原始歌曲的索引
      // 如果之前播放的是聖誕音樂 (索引為0)，則恢復後 currentIndex 仍為0 (原始列表的第一首)
      // 如果之前播放的是非聖誕音樂 (索引為 X > 0)，則恢復後其索引應該為 X - 1
      if (wasPlaying && currentSongSrc === christmasSong.src) { // 如果之前播放的是聖誕音樂
        currentIndex.value = 0; // 恢復為原始列表的第一首
      } else if (wasPlaying) { // 如果之前播放的是非聖誕音樂
        // 找到該歌曲在原始列表中的位置
        const originalIndex = originalMusicList.value.findIndex(m => m.src === currentSongSrc);
        currentIndex.value = (originalIndex !== -1) ? originalIndex : 0;
      } else { // 如果之前沒有播放
        // 保持當前索引，但確保在原始列表範圍內
        currentIndex.value = 0; // 可以簡化為總是設為0，或保持不變 (取決於設計)
      }

      if (wasPlaying) {
        selectAndPlaySong(currentIndex.value, { forceRestart: true });
      } else {
        // 保持選曲狀態即可；等使用者真正播放時才載入音訊。
        currentTime.value = 0;
        duration.value = 0;
      }
    }
  }
};

onMounted(async () => {
  window.addEventListener('holybear-loading-complete', handleLoadingComplete)
  // 頁面載入時檢查初始主題
  let currentTheme = localStorage.getItem('vitepress-background-theme');
  if (!currentTheme) { // 如果 localStorage 沒有主題設定，則使用 defaultTheme
    currentTheme = defaultTheme;
  }

  const savedTheme = currentTheme; // 使用修正後的主題值

  const christmasSong = {
    src: '/music/MapleStory_WhiteChristmas.mp3',
    title: '楓之谷 - 幸福村（聖誕村莊）'
  };

  let initialMusicIndex = 0; // 默認初始播放第一首

  if (savedTheme === 'christmas') {
    if (!musicList.value.find(m => m.src === christmasSong.src)) {
      musicList.value.unshift(christmasSong);
    }
    initialMusicIndex = 0; // 如果是聖誕主題，強制為聖誕音樂
  } else {
    // 如果初始不是聖誕主題，且 musicList 包含了聖誕音樂 (可能是上次切換後殘留)
    if (musicList.value.some(m => m.src === christmasSong.src)) {
      musicList.value = [...originalMusicList.value];
    }
    const savedIndex = localStorage.getItem(INDEX_KEY);
    if (savedIndex !== null && !isNaN(+savedIndex) && +savedIndex >= 0 && +savedIndex < musicList.value.length) {
      initialMusicIndex = +savedIndex;
    }
  }

  currentIndex.value = initialMusicIndex; // 統一設定 currentIndex

  // 主題事件
  window.addEventListener(THEME_CHANGE_EVENT, themeHandler)
  window.addEventListener('pointerdown', handlePointerOutside, true)
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('pageshow', handlePageShow)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('focus', handleWindowFocus)
  window.addEventListener('resume', handleRuntimeResume)
  document.addEventListener('freeze', handleDocumentFreeze)
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const savedVolume = localStorage.getItem(VOLUME_KEY)
  if (savedVolume !== null) {
    volume.value = parseFloat(savedVolume)
    if (volume.value > 0) volumeBeforeMute.value = volume.value
  }

  const savedRepeatOne = localStorage.getItem(REPEAT_ONE_KEY);
  if (savedRepeatOne !== null) {
    repeatOne.value = savedRepeatOne === 'true';
  }

  const savedPlayerOpen = localStorage.getItem(PLAYER_OPEN_KEY)
  if (savedPlayerOpen !== null) {
    playerOpen.value = savedPlayerOpen === 'true'
  }

  // 等 template 綁定完畢再初始化 audio
  await nextTick()
  if (audio.value) {
    audio.value.volume = volume.value;
    audio.value.loop = repeatOne.value;
    audio.value.addEventListener('timeupdate', updateProgress);
    audio.value.addEventListener('durationchange', handleDurationChange)
    audio.value.addEventListener('seeked', handleAudioSeeked)
    // loadedmetadata 綁在 template (@loadedmetadata)，這裡可以備援但不必要重複綁

    // 統一處理初始播放邏輯
    const savedPlayingState = localStorage.getItem(PLAYING_KEY)
    const shouldStartOnInteraction = savedTheme === 'christmas' || savedPlayingState !== 'false'
    intendedToPlay = shouldStartOnInteraction

    if (playerOpen.value && shouldStartOnInteraction) {
        initialPlaybackPending = true
    } else if (playerOpen.value) {
      intendedToPlay = false
      syncPlayingState(false)
    } else {
        // 播放器未開啟，確保播放狀態為 false
      intendedToPlay = false
        playing.value = false;
        localStorage.setItem(PLAYING_KEY, 'false');
    }

    syncMediaSessionMetadata()
    syncMediaSessionPlaybackState()
    setupMediaSessionHandlers()
    // 載入動畫可能比播放器初始化更早完成；若事件已發生，現在補上首次播放流程。
    startInitialPlaybackWhenReady()
  }
})

onUnmounted(() => {
  window.removeEventListener('holybear-loading-complete', handleLoadingComplete)
  window.removeEventListener(THEME_CHANGE_EVENT, themeHandler)
  window.removeEventListener('pointerdown', handlePointerOutside, true)
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('pageshow', handlePageShow)
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('resume', handleRuntimeResume)
  document.removeEventListener('freeze', handleDocumentFreeze)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('mousemove', handleMouseDragMove)
  document.removeEventListener('mouseup', handleMouseDragEnd)

  if (audio.value) {
    audio.value.removeEventListener('timeupdate', updateProgress)
    audio.value.removeEventListener('durationchange', handleDurationChange)
    audio.value.removeEventListener('seeked', handleAudioSeeked)
    // 由 template 綁定的 loadedmetadata 事件不需移除這裡，但 safe 做一次移除
    audio.value.removeEventListener('loadedmetadata', onLoadedMetadata)
  }

  if (autoPlayListener) {
    document.body.removeEventListener('click', autoPlayListener)
  }
  if (hoverTimer) clearTimeout(hoverTimer)
  if (leaveTimer) clearTimeout(leaveTimer)
  if (trackAdvanceUnlockTimer) clearTimeout(trackAdvanceUnlockTimer)
  if (playbackRecoveryTimer) clearTimeout(playbackRecoveryTimer)

  clearMediaSessionHandlers()
})

/* --- Watchers --- */
// 只同步 localStorage，避免跟 selectAndPlaySong 重複操作
watch(currentIndex, (val) => {
  localStorage.setItem(INDEX_KEY, String(val))

  if (isPlaylistVisible.value) {
    scrollActivePlaylistItem()
  }

  syncMediaSessionMetadata()
})

watch(playing, () => {
  syncMediaSessionPlaybackState()
  syncMediaSessionPositionState()

})

watch(isPlaylistVisible, async (visible) => {
  if (!visible) return
  await scrollActivePlaylistItem(false)
})

watch(volume, (newVolume) => {
  if (audio.value) audio.value.volume = newVolume
  localStorage.setItem(VOLUME_KEY, newVolume.toString())
  if (newVolume > 0) volumeBeforeMute.value = newVolume
})

watch(playerOpen, (val) => {
  localStorage.setItem(PLAYER_OPEN_KEY, val ? 'true' : 'false')
  if (!val) {
    intendedToPlay = false
    resumeOnVisibilityReturn = false
    cancelPlaybackRecovery()
    if (autoPlayListener) {
      document.body.removeEventListener('click', autoPlayListener)
      autoPlayListener = null
    }
    setTimeout(() => { showPlayerToggle.value = true }, 400)
  } else {
    showPlayerToggle.value = false
  }
})

watch(playerMinimized, (newVal) => {
  if (newVal === false) {
    showSidebarButton.value = false
  } else {
    isClicked.value = false
  }
})

watch(musicInfoHidden, (newVal) => {
  if (newVal === true && playerMinimized.value) {
    setTimeout(() => { showSidebarButton.value = true }, 400)
  } else {
    showSidebarButton.value = false
  }
})

/* --- 播放控制函數 --- */
function ensureCurrentAudioSource() {
  if (!audio.value) return false

  const targetSrc = currentSong.value?.src || ''
  if (!targetSrc) return false

  if (audio.value.getAttribute('src') !== targetSrc) {
    audio.value.src = targetSrc
    currentTime.value = 0
    duration.value = 0
  }

  return true
}

function playMusic() {
  if (!audio.value || !ensureCurrentAudioSource()) return
  intendedToPlay = true
  resumeOnVisibilityReturn = false
  cancelPlaybackRecovery()
  audio.value.volume = volume.value
  audio.value.loop = repeatOne.value

  if (autoPlayListener) { // 如果存在未觸發的自動播放監聽器，先移除
    document.body.removeEventListener('click', autoPlayListener);
    autoPlayListener = null;
  }

  audio.value.play().then(() => {
    syncPlayingState(true)
  }).catch(e => {
    intendedToPlay = false
    resumeOnVisibilityReturn = false
    syncPlayingState(false)

    // 如果播放失敗，且是瀏覽器阻止，重新設置監聽器
    if (e.name === 'NotAllowedError') {
      armAutoplayOnInteraction()
      return
    }

    console.error('音樂播放失敗', e);
  })
}

function pauseMusic() {
  if (!audio.value) return
  intendedToPlay = false
  resumeOnVisibilityReturn = false
  cancelPlaybackRecovery()
  internalAudioTransition = false
  audio.value.pause()
  syncPlayingState(false)
}

function togglePlay() {
  playing.value ? pauseMusic() : playMusic()
}

function prevSong() {
  if (!musicList.value || musicList.value.length === 0) return
  const len = musicList.value.length
  const newIndex = (currentIndex.value - 1 + len) % len
  return selectAndPlaySong(newIndex, { forceRestart: true })
}

function nextSong() {
  if (!musicList.value || musicList.value.length === 0) return
  const len = musicList.value.length
  const newIndex = (currentIndex.value + 1) % len
  // 如果 repeatOne 開著，audio.loop 會阻止 ended 事件 — 但我們仍呼叫 nextSong 時會在這裡執行切歌
  return selectAndPlaySong(newIndex, { forceRestart: true })
}

function syncPlayingState(isPlaying) {
  playing.value = isPlaying
  localStorage.setItem(PLAYING_KEY, isPlaying ? 'true' : 'false')
  syncMediaSessionPlaybackState()
  syncMediaSessionPositionState()
}

function cancelPlaybackRecovery() {
  if (playbackRecoveryTimer) {
    clearTimeout(playbackRecoveryTimer)
    playbackRecoveryTimer = null
  }
}

function lockTrackAdvance() {
  pendingTrackAdvance = true
  if (trackAdvanceUnlockTimer) clearTimeout(trackAdvanceUnlockTimer)
  trackAdvanceUnlockTimer = setTimeout(() => {
    pendingTrackAdvance = false
  }, 400)
}

async function handleTrackEnded(reason = 'ended') {
  if (repeatOne.value || pendingTrackAdvance) return

  lockTrackAdvance()
  await nextSong()
}

function handleAudioPlay() {
  cancelPlaybackRecovery()
  intendedToPlay = true
  resumeOnVisibilityReturn = false
  syncPlayingState(true)
}

function handleAudioPlaying() {
  cancelPlaybackRecovery()
  intendedToPlay = true
  resumeOnVisibilityReturn = false
  syncPlayingState(true)
}

function handleAudioPause() {
  if (internalAudioTransition) return

  const audioEl = audio.value
  const isNearTrackEnd = audioEl && duration.value > 0 && (duration.value - audioEl.currentTime) <= 0.35

  if (!repeatOne.value && isNearTrackEnd) {
    handleTrackEnded('pause-near-end')
    return
  }

  if (intendedToPlay) {
    syncPlayingState(false)
    if (document.hidden) {
      resumeOnVisibilityReturn = true
      return
    }

    intendedToPlay = false
    resumeOnVisibilityReturn = false
    cancelPlaybackRecovery()
    return
  }

  syncPlayingState(false)
}

function handleAudioError() {
  if (!audio.value || internalAudioTransition) return

  const isNearTrackEnd = duration.value > 0 && (duration.value - audio.value.currentTime) <= 0.35
  if (!repeatOne.value && isNearTrackEnd) {
    handleTrackEnded('error-near-end')
    return
  }

  if (intendedToPlay) {
    intendedToPlay = false
    resumeOnVisibilityReturn = false
    cancelPlaybackRecovery()
    syncPlayingState(false)
  }
}

function handleDocumentFreeze() {
  if (intendedToPlay) {
    resumeOnVisibilityReturn = true
  }
}

function handlePageHide() {
  if (intendedToPlay) {
    resumeOnVisibilityReturn = true
  }

  syncMediaSessionMetadata()
  syncMediaSessionPlaybackState()
  syncMediaSessionPositionState()
}

function requestPlaybackRecovery(reason, delay = 300) {
  if (!audio.value || internalAudioTransition || !intendedToPlay || pendingTrackAdvance) return

  if (document.hidden) {
    resumeOnVisibilityReturn = true
    return
  }

  cancelPlaybackRecovery()
  playbackRecoveryTimer = setTimeout(async () => {
    if (!audio.value || internalAudioTransition || !intendedToPlay || pendingTrackAdvance) return

    try {
      if (!ensureCurrentAudioSource()) return
      await audio.value.play()
      syncPlayingState(true)
      resumeOnVisibilityReturn = false
    } catch (error) {
      intendedToPlay = false
      resumeOnVisibilityReturn = false
      syncPlayingState(false)

      if (error.name === 'NotAllowedError') {
        armAutoplayOnInteraction()
      } else {
        console.warn(`音訊恢復失敗: ${reason}`, error)
      }
    }
  }, delay)
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (intendedToPlay) {
      resumeOnVisibilityReturn = true
    }
    return
  }

  syncMediaSessionMetadata()
  syncMediaSessionPlaybackState()
  setupMediaSessionHandlers()

  if (resumeOnVisibilityReturn || (intendedToPlay && audio.value?.paused)) {
    requestPlaybackRecovery('visibility-return', 120)
  }
}

function handlePageShow() {
  syncMediaSessionMetadata()
  syncMediaSessionPlaybackState()
  syncMediaSessionPositionState()
  setupMediaSessionHandlers()

  if (resumeOnVisibilityReturn || (intendedToPlay && audio.value?.paused)) {
    requestPlaybackRecovery('pageshow', 80)
  }
}

function handleWindowFocus() {
  if (resumeOnVisibilityReturn || (intendedToPlay && audio.value?.paused)) {
    requestPlaybackRecovery('window-focus', 80)
  }
}

function handleRuntimeResume() {
  syncMediaSessionMetadata()
  syncMediaSessionPlaybackState()
  syncMediaSessionPositionState()
  setupMediaSessionHandlers()

  if (resumeOnVisibilityReturn || (intendedToPlay && audio.value?.paused)) {
    requestPlaybackRecovery('runtime-resume', 80)
  }
}

function syncMediaSessionMetadata() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentSong.value.title || '未命名曲目',
    artist: '聖小熊的秘密基地',
    album: '網站背景音樂'
  })
}

function syncMediaSessionPlaybackState() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  navigator.mediaSession.playbackState = playing.value ? 'playing' : 'paused'
}

function syncMediaSessionPositionState() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return
  if (!audio.value) return

  const mediaDuration = Number.isFinite(audio.value.duration) && audio.value.duration > 0
    ? audio.value.duration
    : duration.value
  const currentRate = Number.isFinite(audio.value.playbackRate) && audio.value.playbackRate > 0
    ? audio.value.playbackRate
    : 1
  const position = Number.isFinite(audio.value.currentTime) ? audio.value.currentTime : 0
  const hasFiniteDuration = Number.isFinite(mediaDuration) && mediaDuration > 0

  try {
    if (!hasFiniteDuration) {
      mediaSessionSeekEnabled = false
      return
    }

    const jitter = Math.random() * 0.0001

    navigator.mediaSession.setPositionState({
      duration: mediaDuration,
      playbackRate: currentRate,
      position: Math.min(position + jitter, mediaDuration)
    })
    mediaSessionSeekEnabled = true
  } catch (error) {
    mediaSessionSeekEnabled = false
    console.warn('Media Session position state 同步失敗', error)
  }
}

function setupMediaSessionHandlers() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

  const handlers = {
    play: () => {
      playMusic()
      setTimeout(() => syncMediaSessionPositionState(), 200)
    },
    pause: () => {
      pauseMusic()
      setTimeout(() => syncMediaSessionPositionState(), 200)
    },
    previoustrack: () => prevSong(),
    nexttrack: () => nextSong(),
    stop: () => pauseMusic(),
    seekto: (details = {}) => {
      if (!audio.value || !audio.value.duration || typeof details.seekTime !== 'number') return
      const targetTime = Math.min(Math.max(details.seekTime, 0), audio.value.duration)

      if (details.fastSeek && typeof audio.value.fastSeek === 'function') {
        audio.value.fastSeek(targetTime)
      } else {
        audio.value.currentTime = targetTime
      }

      currentTime.value = targetTime
    }
  }

  Object.entries(handlers).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch (error) {
      console.warn(`Media Session action \"${action}\" 註冊失敗`, error)
    }
  })

  ;['seekbackward', 'seekforward'].forEach((action) => {
    try {
      navigator.mediaSession.setActionHandler(action, null)
    } catch (error) {
      console.warn(`Media Session action \"${action}\" 清除失敗`, error)
    }
  })
}

function clearMediaSessionHandlers() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

  ;['play', 'pause', 'previoustrack', 'nexttrack', 'stop', 'seekbackward', 'seekforward', 'seekto'].forEach((action) => {
    try {
      navigator.mediaSession.setActionHandler(action, null)
    } catch (error) {
      console.warn(`Media Session action \"${action}\" 清除失敗`, error)
    }
  })
}

// 統一負責切歌：設定 src -> 移除 load() 避免斷檔 -> 同步 Metadata -> play()
async function selectAndPlaySong(index, options = {}) {
  const { forceRestart = false } = options
  if (!musicList.value || musicList.value.length === 0) return
  if (!forceRestart && index === currentIndex.value && playing.value) return

  if (index < 0 || index >= musicList.value.length) index = 0
  currentIndex.value = index
  await nextTick()
  if (!audio.value) return

  internalAudioTransition = true
  cancelPlaybackRecovery()

  try {
    // 【修改重點 1】：絕對不要在背景切歌時呼叫 pause() 或 load()
    // 直接替換 src，瀏覽器底層會自動接續處理
    audio.value.src = musicList.value[index].src
    currentTime.value = 0
    duration.value = 0

    // 【修改重點 2】：將 MediaSession 資訊更新移到 play() 之前
    // 讓系統在觸發背景播放前，先知道這是連續的播放清單，避免通知欄播放器被收回
    syncMediaSessionMetadata()
    syncMediaSessionPositionState()

    if (playing.value || options.forceRestart) {
      intendedToPlay = true
      // 等待 play() 執行，此時不應該被 NotAllowedError 阻擋了
      await audio.value.play()
      syncPlayingState(true)
    } else {
      syncPlayingState(false)
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      intendedToPlay = false
      resumeOnVisibilityReturn = false
      cancelPlaybackRecovery()
      syncPlayingState(false)
      // 如果播放失敗，且是瀏覽器阻止，重新設置監聽器
      if (e.name === 'NotAllowedError') {
        if (autoPlayListener) {
          document.body.removeEventListener('click', autoPlayListener);
          autoPlayListener = null
        }
        armAutoplayOnInteraction()
        return
      }
      console.error('切歌/播放失敗', e)
    }
  } finally {
    internalAudioTransition = false
    // 原本在這裡的 syncMediaSessionMetadata() 已經移到上面了
  }

  isPlaylistVisible.value = false
}

/* --- 進度與 metadata --- */
function onLoadedMetadata(e) {
  duration.value = Number.isFinite(e.target.duration) ? e.target.duration : 0
  syncMediaSessionPositionState()
}

function handleDurationChange(e) {
  duration.value = Number.isFinite(e.target.duration) ? e.target.duration : 0
  syncMediaSessionPositionState()
}

function updateProgress(e) {
  if (!isSeeking.value) currentTime.value = e.target.currentTime
}

function handleAudioSeeked(e) {
  isSeeking.value = false
  currentTime.value = Number.isFinite(e.target.currentTime) ? e.target.currentTime : currentTime.value
  setTimeout(() => {
    syncMediaSessionPositionState()
  }, 200)
}

function setProgress(e) {
  if (!audio.value || duration.value === 0) return
  const rect = e.currentTarget.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const width = rect.width
  const percent = clickX / width
  isSeeking.value = true
  audio.value.currentTime = percent * duration.value
}

function seekByOffset(offsetSeconds) {
  if (!audio.value || duration.value === 0 || !Number.isFinite(offsetSeconds)) return
  const nextTime = Math.min(Math.max(audio.value.currentTime + offsetSeconds, 0), duration.value)
  isSeeking.value = true
  audio.value.currentTime = nextTime
}

function seekToPosition(seekTime, fastSeek = false) {
  if (!audio.value || duration.value === 0 || !Number.isFinite(seekTime)) return
  const nextTime = Math.min(Math.max(seekTime, 0), duration.value)
  isSeeking.value = true

  if (fastSeek && typeof audio.value.fastSeek === 'function') {
    audio.value.fastSeek(nextTime)
  } else {
    audio.value.currentTime = nextTime
  }
}

/* --- 音量 --- */
function toggleMute() {
  if (volume.value > 0) {
    volume.value = 0
  } else {
    volume.value = volumeBeforeMute.value > 0 ? volumeBeforeMute.value : 0.6
  }
}

/* --- UI 邏輯（滑動、懸停、按鈕等） --- */
function togglePlaylist() {
  isPlaylistVisible.value = !isPlaylistVisible.value
  if (isPlaylistVisible.value) isVolumeVisible.value = false
}

async function scrollActivePlaylistItem(smooth = true) {
  await nextTick()

  const container = playlistItemsRef.value
  if (!container) return

  const activeItem = container.querySelector('.playlist-item.active')
  if (!activeItem) return

  const containerRect = container.getBoundingClientRect()
  const itemRect = activeItem.getBoundingClientRect()
  const targetScrollTop = container.scrollTop + (itemRect.top - containerRect.top) - (container.clientHeight / 2) + (activeItem.clientHeight / 2)

  container.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior: smooth ? 'smooth' : 'auto'
  })
}

function toggleVolume() {
  isVolumeVisible.value = !isVolumeVisible.value
  if (isVolumeVisible.value) isPlaylistVisible.value = false
}

function handleClickOutside(event) {
  closePlayerOnOutsideInteract(event)
}

function handlePointerOutside(event) {
  closePlayerOnOutsideInteract(event)
}

function collapsePlayerToSidebarButton() {
  isClicked.value = false
  musicInfoHidden.value = true
  playerMinimized.value = true
}

function closePlayerOnOutsideInteract(event) {
  const clickedInsidePlayer = playerContainer.value && playerContainer.value.contains(event.target)
  const clickedInsideSidebar = sidebarToggle.value && sidebarToggle.value.contains(event.target)

  if (!clickedInsidePlayer && !clickedInsideSidebar) {
    isPlaylistVisible.value = false
    isVolumeVisible.value = false

    if (musicInfoHidden.value) return

    collapsePlayerToSidebarButton()
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/* --- 拖曳/懸停相關（保留原邏輯） --- */
const touchStartX = ref(0)
const touchStartY = ref(0)
const isDragging = ref(false)
const dragOffset = ref(0)

function handleDragStart(e) {
  if (musicInfoHidden.value) return
  if (e.type === 'touchstart') {
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
    isDragging.value = false
    dragOffset.value = 0
  } else if (e.type === 'mousedown') {
    touchStartX.value = e.clientX
    touchStartY.value = e.clientY
    isDragging.value = false
    dragOffset.value = 0
    e.preventDefault()
    document.addEventListener('mousemove', handleMouseDragMove)
    document.addEventListener('mouseup', handleMouseDragEnd)
  }
}

function handleDragMove(e) {
  if (e.type !== 'touchmove') return
  if (!musicInfoHidden.value) {
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = currentX - touchStartX.value
    const deltaY = currentY - touchStartY.value
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
      isDragging.value = true
      dragOffset.value = deltaX
      e.preventDefault()
    }
  }
}

function handleDragEnd(e) {
  if (e.type !== 'touchend') return
  if (!isDragging.value) return
  const endX = e.changedTouches[0].clientX
  const deltaX = endX - touchStartX.value
  if (deltaX > 50) {
    musicInfoHidden.value = true
    if (!playerMinimized.value) playerMinimized.value = true
  }
  isDragging.value = false
  dragOffset.value = 0
}

function handleMouseDragMove(e) {
  if (musicInfoHidden.value) {
    document.removeEventListener('mousemove', handleMouseDragMove)
    document.removeEventListener('mouseup', handleMouseDragEnd)
    return
  }
  const currentX = e.clientX
  const currentY = e.clientY
  const deltaX = currentX - touchStartX.value
  const deltaY = currentY - touchStartY.value
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
    isDragging.value = true
    dragOffset.value = deltaX
    e.preventDefault()
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
    isHovering.value = false
  }
}

function handleMouseDragEnd(e) {
  document.removeEventListener('mousemove', handleMouseDragMove)
  document.removeEventListener('mouseup', handleMouseDragEnd)
  if (!isDragging.value) return
  const endX = e.clientX
  const deltaX = endX - touchStartX.value
  if (deltaX > 50) {
    musicInfoHidden.value = true
    if (!playerMinimized.value) playerMinimized.value = true
  }
  isDragging.value = false
  dragOffset.value = 0
}

function handleMouseEnter() {
  if (isMobileViewport()) return
  if (!playerMinimized.value || musicInfoHidden.value) return
  isHovering.value = true
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  if (hoverTimer) { clearTimeout(hoverTimer) }
  hoverTimer = setTimeout(() => {
    if (isHovering.value) playerMinimized.value = false
  }, 200)
}

function handleMouseLeave() {
  if (isMobileViewport()) return
  isHovering.value = false
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
  if (!playerMinimized.value && !isPlaylistVisible.value && !isVolumeVisible.value) {
    leaveTimer = setTimeout(() => {
      if (!isHovering.value) playerMinimized.value = true
    }, 100)
  }
}

function handleContainerMouseEnter() {
  if (isMobileViewport()) return
  isHovering.value = true
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
  if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
}

function handleContainerMouseLeave() {
  if (isMobileViewport()) return
  isHovering.value = false
  if (!playerMinimized.value && !isPlaylistVisible.value && !isVolumeVisible.value) {
    leaveTimer = setTimeout(() => {
      if (!isHovering.value) playerMinimized.value = true
    }, 300)
  }
}

function handleGlobalMouseMove(e) {
  if (isMobileViewport()) return
  if (playerMinimized.value || !playerOpen.value) return
  const container = playerContainer.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const isInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
  if (isInside) {
    isHovering.value = true
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null }
  }
}

function handleMusicInfoClick(e) {
  if (playerMinimized.value) {
    e.stopPropagation()
    playerMinimized.value = false
  }
}

function handleContainerClick(e) {
  if (playerMinimized.value) return
  e.stopPropagation()
}

function showMusicInfo() {
  musicInfoHidden.value = false
  isPlaylistVisible.value = false
  isVolumeVisible.value = false
  playerMinimized.value = false
  isClicked.value = false
}

/* --- 歌曲 title toast --- */
function handleSongTitleMouseEnter(title, e) {
  const el = e.target
  if (el.scrollWidth > el.clientWidth) {
    toastText.value = title
    showTitleToast.value = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { showTitleToast.value = false }, 2200)
  }
}
function handleSongTitleMouseLeave() {
  showTitleToast.value = false
  if (toastTimer) clearTimeout(toastTimer)
}

function toggleRepeatOne() {
  repeatOne.value = !repeatOne.value
  localStorage.setItem(REPEAT_ONE_KEY, repeatOne.value ? 'true' : 'false')
  if (audio.value) audio.value.loop = repeatOne.value
}
</script>

<template>
  <audio
  ref="audio"
  id="global-audio-player" 
  crossorigin="anonymous"
  preload="none"
  playsinline
  webkit-playsinline="true"
  @ended="handleTrackEnded"
  @loadedmetadata="onLoadedMetadata"
  @play="handleAudioPlay"
  @playing="handleAudioPlaying"
  @pause="handleAudioPause"
  @error="handleAudioError"
></audio>

  <transition name="player-fade">
    <div
      v-if="playerOpen && isPageLoaded"
      ref="playerContainer"
      class="music-container"
      :class="{
        play: playing,
        minimized: playerMinimized,
        'panel-open': isPlaylistVisible || isVolumeVisible,
        'info-hidden': musicInfoHidden
      }"
      @click.stop="handleContainerClick"
      @mouseenter="handleContainerMouseEnter"
      @mouseleave="handleContainerMouseLeave"
    >
      <div
        class="music-info"
        :class="{ hidden: musicInfoHidden, dragging: isDragging, visible: playing && !musicInfoHidden }"
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
          <div class="progress" :style="{ transform: `scaleX(${progressPercent / 100})` }"></div>
        </div>
      </div>

      <!-- 控制按鈕 -->
      <div class="navigation">
        <button class="action-btn" @click.stop="togglePlaylist" title="播放清單">
          <i class="fas fa-list"></i>
        </button>

        <button class="action-btn" @click.stop="prevSong" title="上一首">
          <i class="fas fa-backward"></i>
        </button>

        <button class="action-btn action-btn-big" @click.stop="togglePlay" :title="playing ? '暫停' : '播放'">
          <i class="fas" :class="playing ? 'fa-pause' : 'fa-play'"></i>
        </button>

        <button class="action-btn" @click.stop="nextSong" title="下一首">
          <i class="fas fa-forward"></i>
        </button>

        <button class="action-btn" @click.stop="toggleVolume" title="音量">
          <i class="fas" :class="volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'"></i>
        </button>
      </div>

      <transition name="slide-up">
        <div v-if="isVolumeVisible" class="volume-panel bg-slate-950/28 backdrop-blur-3xl backdrop-saturate-150 backdrop-contrast-125">
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

      <transition name="slide-up">
        <div v-if="isPlaylistVisible" class="playlist-panel bg-slate-950/22 backdrop-blur-3xl backdrop-saturate-150 backdrop-contrast-125">
          <h3 class="playlist-title">播放清單</h3>
          <div ref="playlistItemsRef" class="playlist-items">
            <div
              v-for="(song, index) in musicList"
              :key="song.src"
              class="playlist-item bg-slate-950/24 backdrop-blur-2xl backdrop-saturate-150"
              :class="{ active: index === currentIndex }"
              @click="selectAndPlaySong(index)"
            >
              <div class="song-info" style="display:flex;align-items:center;">
                <span class="song-number">{{ index + 1 }}</span>
                <span class="song-title" @mouseenter="handleSongTitleMouseEnter(song.title, $event)" @mouseleave="handleSongTitleMouseLeave">{{ song.title }}</span>
                <button v-if="index === currentIndex" class="action-btn" @click.stop="toggleRepeatOne" :title="repeatOne ? '重複播放：開啟' : '重複播放：關閉'" style="margin-left:2px; padding:2px 4px; font-size:1em; height:22px; width:22px;">
                  <i class="fas fa-repeat" :style="repeatOne ? 'color:#ff9800; filter:drop-shadow(0 0 2px #ff9800);' : 'color:#bbb;'" />
                </button>
              </div>
              <i v-if="index === currentIndex && playing" class="fas fa-volume-up playing-icon" style="margin-left:2px;"></i>
            </div>

            <transition name="toast-fade">
              <div v-if="showTitleToast" class="title-toast">{{ toastText }}</div>
            </transition>
          </div>
        </div>
      </transition>
    </div>
  </transition>

  <transition name="sidebar-fade">
    <div v-if="showSidebarButton && playerOpen" ref="sidebarToggle" class="sidebar-toggle" @click.stop.prevent="showMusicInfo" @touchend.stop.prevent="showMusicInfo">
      <i class="fa-solid fa-music sidebar-icon"></i>
    </div>
  </transition>

  <transition name="sidebar-fade">
    <div v-if="showPlayerToggle" class="sidebar-toggle player-toggle" @click.stop.prevent="playerOpen = true" @touchend.stop.prevent="playerOpen = true">
      <i class="fa-solid fa-music sidebar-icon"></i>
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
    border-radius: 24px;
    padding: 20px 30px;
    z-index: 9999;
    min-width: 350px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28),
        0 0 0 1px rgba(0, 255, 238, 0.08) inset;
  background: transparent;
}

.music-container::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: rgba(18, 20, 26, 0.54);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
}

/* 最小化狀態：主體完全消失 */
.music-container.minimized {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
    transform: translateY(20px);
}

.music-container.minimized::before {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.music-container.minimized > *:not(.music-info) {
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
    transform: translateY(15px);
    transition: all 0.4s ease;
}

.music-container.minimized .music-info {
  opacity: 1 !important;
  transform: translateY(-50%) !important;
  pointer-events: auto;
  cursor: pointer;
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
    pointer-events: none !important;
}

.music-container.info-hidden::before {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.music-container.info-hidden > *:not(.sidebar-toggle) {
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
}

/* ==================== 歌曲資訊 ==================== */
.music-info {
  background: rgba(10, 16, 24, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    position: absolute;
    width: calc(100% - 80px);
    padding: 18px 22px;
    top: 30px;
    left: 40px;
    opacity: 0;
    transform: translateY(0%);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
    pointer-events: none;
    box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28),
          0 0 0 1px rgba(255, 255, 255, 0.08) inset,
          0 0 24px rgba(255, 255, 255, 0.06) inset;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    overflow: hidden;
    isolation: isolate;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    contain: paint;
    backdrop-filter: blur(84px) saturate(170%) contrast(116%) brightness(108%);
    -webkit-backdrop-filter: blur(84px) saturate(170%) contrast(116%) brightness(108%);
  }

  .music-info::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(8, 14, 22, 0.22) 28%, rgba(8, 14, 22, 0.3));
    backdrop-filter: blur(84px) saturate(170%) contrast(116%) brightness(108%);
    -webkit-backdrop-filter: blur(84px) saturate(170%) contrast(116%) brightness(108%);
    pointer-events: none;
  }

  .music-info::after {
    content: '';
    position: absolute;
    inset: 1px;
    z-index: 0;
    border-radius: 15px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02) 34%, rgba(255, 255, 255, 0));
    pointer-events: none;
  }

  .music-info > * {
    position: relative;
    z-index: 1;
}

.music-container.play .music-info {
    opacity: 1;
    z-index: 1;
    pointer-events: auto;
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
  right: 8px;
    bottom: 24px;
    width: 30px;
    height: 108px;
    background: rgba(22, 24, 31, 0.84);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24),
          inset 0 0 0 1px rgba(0, 255, 238, 0.05);
    border-radius: 14px;
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

.sidebar-toggle::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    background:
      radial-gradient(circle at 50% 50%, rgba(0, 255, 238, 0.12) 0, rgba(0, 255, 238, 0.06) 38%, rgba(143, 112, 255, 0.04) 62%, transparent 78%);
    opacity: 0.75;
    pointer-events: none;
    z-index: -1;
}

.sidebar-toggle:hover {
  background: rgba(26, 29, 37, 0.92);
  border-color: rgba(0, 255, 238, 0.18);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.32),
        inset 0 0 0 1px rgba(0, 255, 238, 0.08);
    transform: translateX(-3px);
}

.sidebar-icon {
  font-size: 17px;
  font-weight: 600;
    color: var(--vp-c-brand);
    text-shadow: 0 2px 10px rgba(0, 255, 238, 0.18);
    pointer-events: none;
    line-height: 1;
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
    transform: translateX(40px);
}

.music-info .title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: rgba(244, 248, 255, 0.96);
    overflow: hidden;
    position: relative;
    height: 1.5em;
    width: 100%;
}

.title-text {
    display: inline-block;
    white-space: nowrap;
    animation: scrollText 24s linear infinite;
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
    color: rgba(182, 190, 205, 0.88);
    margin-bottom: 8px;
}

/* ==================== 進度條 ==================== */
.progress-container {
  background-color: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
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
  width: 100%;
  transform-origin: left center;
  will-change: transform;
  transition: transform 0.25s linear;
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
  color: var(--vp-c-brand);
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
  color: var(--vp-c-brand-light);
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 255, 238, 0.16);
  transform: scale(1.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
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
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28),
          0 0 0 1px rgba(0, 255, 238, 0.06) inset;
    min-width: 10px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    overflow: hidden;
}

.volume-percentage-display {
    font-size: 18px;
    font-weight: 600;
    color: rgba(244, 248, 255, 0.92);
    text-shadow: none;
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
    background: rgba(255, 255, 255, 0.08);
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
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 25px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(0, 255, 238, 0.06) inset;
    max-width: 350px;
    max-height: 400px;
    z-index: 10;
  overflow: hidden;
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28),
        0 0 0 1px rgba(255, 255, 255, 0.08) inset,
        0 0 24px rgba(255, 255, 255, 0.06) inset;
}

.playlist-title {
    margin: 0 0 18px 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: rgba(244, 248, 255, 0.94);
    text-align: center;
    text-shadow: none;
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
    border: 1px solid rgba(0, 204, 238, 0.1);
    box-shadow: 0 2px 8px rgba(0, 204, 238, 0.05);
}

.playlist-item:hover {
  background: rgba(9, 22, 30, 0.34);
    border-color: var(--vp-c-brand-light);
    box-shadow: 0 4px 12px rgba(0, 204, 238, 0.15);
}

.playlist-item.active {
  background: rgba(7, 20, 28, 0.38);
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
  color: rgba(117, 239, 234, 0.96);
    min-width: 28px;
  text-shadow: none;
}

.song-title {
  color: rgba(234, 240, 250, 0.94);
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
  border-color: rgba(255, 255, 255, 0.08);
}

/* ==================== 響應式設計 ==================== */
@media (max-width: 768px) {
  .music-info,
  .music-info::before {
    backdrop-filter: blur(24px) saturate(140%) contrast(108%) brightness(104%);
    -webkit-backdrop-filter: blur(24px) saturate(140%) contrast(108%) brightness(104%);
  }
}

@media (max-width: 480px) {
    .music-container {
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: auto;
        min-width: 0;
        padding: 18px 16px;
        box-sizing: border-box;
    }

  .music-info {
    top: 27px;
  }

  .playlist-panel {
    width: min(350px, calc(100vw - 40px));
    max-width: none;
    padding: 22px 16px;
    box-sizing: border-box;
  }

  .volume-panel {
    right: 8px;
    left: auto;
    transform: none;
  }
}

/* ==================== 淺色模式 (Light Mode) ==================== */
:global(html:not(.dark) .music-container) {
  border-color: rgba(7, 108, 133, 0.22);
  box-shadow: 0 18px 44px rgba(35, 76, 94, 0.18),
              0 0 0 1px rgba(0, 184, 212, 0.08) inset;
}

:global(html:not(.dark) .music-container::before) {
  background: rgba(246, 252, 255, 0.82);
  backdrop-filter: blur(28px) saturate(145%);
  -webkit-backdrop-filter: blur(28px) saturate(145%);
}

:global(html:not(.dark) .music-info) {
  background: rgba(249, 253, 255, 0.76);
  border-color: rgba(7, 108, 133, 0.2);
  box-shadow: 0 22px 48px rgba(35, 76, 94, 0.18),
              0 0 0 1px rgba(255, 255, 255, 0.72) inset,
              0 0 24px rgba(0, 184, 212, 0.06) inset;
}

:global(html:not(.dark) .music-info::before) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(232, 249, 252, 0.7) 42%, rgba(238, 241, 255, 0.76));
}

:global(html:not(.dark) .music-info::after) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.18) 40%, transparent);
}

:global(html:not(.dark) .music-info .title),
:global(html:not(.dark) .playlist-title) {
  color: #082936;
}

:global(html:not(.dark) .time-info) {
  color: rgba(17, 54, 69, 0.72);
}

:global(html:not(.dark) .progress-container),
:global(html:not(.dark) .volume-slider-vertical) {
  background-color: rgba(7, 108, 133, 0.14);
}

:global(html:not(.dark) .action-btn:hover) {
  background-color: rgba(0, 184, 212, 0.1);
  border-color: rgba(7, 108, 133, 0.2);
  box-shadow: 0 8px 20px rgba(35, 76, 94, 0.16);
}

:global(html:not(.dark) .volume-panel),
:global(html:not(.dark) .playlist-panel) {
  background: rgba(246, 252, 255, 0.9);
  border-color: rgba(7, 108, 133, 0.22);
  box-shadow: 0 20px 44px rgba(35, 76, 94, 0.2),
              0 0 0 1px rgba(255, 255, 255, 0.72) inset;
}

:global(html:not(.dark) .volume-percentage-display),
:global(html:not(.dark) .song-title) {
  color: #153846;
}

:global(html:not(.dark) .song-number) {
  color: #007f98;
}

:global(html:not(.dark) .playlist-item) {
  background: rgba(255, 255, 255, 0.54);
  border-color: rgba(7, 108, 133, 0.14);
  box-shadow: 0 2px 8px rgba(35, 76, 94, 0.08);
}

:global(html:not(.dark) .playlist-item:hover) {
  background: rgba(222, 248, 252, 0.84);
  border-color: rgba(0, 150, 180, 0.42);
  box-shadow: 0 4px 12px rgba(0, 150, 180, 0.14);
}

:global(html:not(.dark) .playlist-item.active) {
  background: rgba(213, 245, 250, 0.92);
  border-color: rgba(0, 150, 180, 0.5);
  border-left-color: var(--vp-c-brand-dark);
  box-shadow: 0 4px 16px rgba(0, 150, 180, 0.16),
              0 0 0 1px rgba(255, 255, 255, 0.72) inset;
}

:global(html:not(.dark) .playlist-items::-webkit-scrollbar-track) {
  background: rgba(7, 108, 133, 0.1);
}

:global(html:not(.dark) .playlist-items::-webkit-scrollbar-thumb) {
  background: rgba(0, 150, 180, 0.42);
}

:global(html:not(.dark) .playlist-items::-webkit-scrollbar-thumb:hover) {
  background: rgba(0, 127, 152, 0.62);
}

:global(html:not(.dark) .sidebar-toggle) {
  background: rgba(249, 253, 255, 0.86);
  border-color: rgba(7, 108, 133, 0.22);
  box-shadow: 0 10px 28px rgba(35, 76, 94, 0.18),
              inset 0 0 0 1px rgba(0, 184, 212, 0.06);
}

:global(html:not(.dark) .sidebar-toggle:hover) {
  background: rgba(241, 252, 254, 0.96);
  border-color: rgba(0, 150, 180, 0.38);
  box-shadow: 0 14px 32px rgba(35, 76, 94, 0.22),
              inset 0 0 0 1px rgba(0, 184, 212, 0.1);
}

:global(html:not(.dark) .title-toast) {
  color: #082936;
  background: rgba(246, 252, 255, 0.94);
  border: 1px solid rgba(7, 108, 133, 0.2);
  box-shadow: 0 8px 24px rgba(35, 76, 94, 0.2);
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
}

/* ==================== 深色模式 (Dark Mode) ==================== */
@media (prefers-color-scheme: dark) {
  .dark .music-container {
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dark .music-container::before {
    background: rgba(18, 20, 26, 0.82);
  }
    
    .dark .action-btn {
        /* 深色模式下使用最亮的品牌色 */
        color: var(--vp-c-brand);
        text-shadow: 0 0 5px var(--vp-c-brand-darker);
    }
    
    .dark .music-info {
      border-color: rgba(255, 255, 255, 0.08);
    }

    .dark .music-info .title {
        color: rgba(255, 255, 255, 0.95);
    }

    .dark .time-info {
        color: rgba(170, 170, 170, 0.9);
    }

    .dark .volume-panel,
    .dark .playlist-panel {
        border-color: var(--vp-c-brand-dark);
    }

    .dark .volume-percentage-display {
        color: var(--vp-c-brand);
    }

    .dark .playlist-item {
      border-color: rgba(0, 255, 238, 0.12);
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
