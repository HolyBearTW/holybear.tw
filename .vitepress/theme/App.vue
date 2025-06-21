<template>
    <Layout>
        <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        background: #fff8;
        border: 1px solid #aaa;
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 1em;
        cursor: pointer;
        box-shadow: 0 2px 10px #0002;
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        gap: 10px;
      ">
            <button @click="toggleBgm">
                {{ playing ? "⏸ 暫停" : "▶️ 播放" }}
            </button>
            <span style="min-width: 110px; user-select: text;">
                🎵 {{ currentTitle }}
            </span>
            <button @click="nextRandom">⏭ 下一首</button>
        </div>
        <audio ref="bgm"
               :src="currentSrc"
               loop="false"
               @ended="nextRandom"
               preload="auto"></audio>
        <slot />
    </Layout>
</template>

<script setup>
    import DefaultTheme from 'vitepress/theme'
    import { ref, onMounted } from 'vue'

    const { Layout } = DefaultTheme

    // 你的音樂清單：檔名、顯示名稱
    const musicList = [
        { src: '/music/MapleStory_VictoriaCupDay.mp3', title: '楓之谷 - 維多利亞盃' },
        // ...可自行增加
    ]

    const bgm = ref(null)
    const playing = ref(false)
    const currentIndex = ref(Math.floor(Math.random() * musicList.length))
    const currentSrc = ref(musicList[currentIndex.value].src)
    const currentTitle = ref(musicList[currentIndex.value].title)

    function playMusic() {
        if (!bgm.value) return
        bgm.value.play()
        playing.value = true
    }
    function pauseMusic() {
        if (!bgm.value) return
        bgm.value.pause()
        playing.value = false
    }
    function toggleBgm() {
        if (playing.value) {
            pauseMusic()
        } else {
            playMusic()
        }
    }
    function nextRandom() {
        let next
        do {
            next = Math.floor(Math.random() * musicList.length)
        } while (next === currentIndex.value && musicList.length > 1)
        currentIndex.value = next
        currentSrc.value = musicList[next].src
        currentTitle.value = musicList[next].title
        // 自動播放
        setTimeout(() => {
            playMusic()
        }, 150)
    }

    // 首次互動才自動播，避免瀏覽器攔截
    onMounted(() => {
        document.body.addEventListener(
            'click',
            () => {
                if (!playing.value) {
                    playMusic()
                }
            },
            { once: true }
        )
    })
</script>