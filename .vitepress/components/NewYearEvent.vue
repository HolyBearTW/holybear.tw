<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// --- Constants & Config ---
const COST_PER_DRAW = 27
const PROBABILITIES = {
  "馬": 0.0015, "羊": 0.0020, "猴": 0.0025,
  "雞": 0.0080, "狗": 0.0090, "豬": 0.0100,
  "鼠": 0.0250, "牛": 0.0300, "虎": 0.0350,
  "兔": 0.2920, "龍": 0.2925, "蛇": 0.2925
}

const ZODIAC_ICONS = {
  "馬": "🐴", "羊": "🐐", "猴": "🐵",
  "雞": "🐔", "狗": "🐶", "豬": "🐷",
  "鼠": "🐭", "牛": "🐂", "虎": "🐯",
  "兔": "🐰", "龍": "🐉", "蛇": "🐍"
}

const ZODIAC_GROUPS = [
  { name: 'Group 1', color: 'text-orange-400', items: ['馬', '羊', '猴'] },
  { name: 'Group 2', color: 'text-purple-400', items: ['雞', '狗', '豬'] },
  { name: 'Group 3', color: 'text-blue-400', items: ['鼠', '牛', '虎'] },
  { name: 'Group 4', color: 'text-teal-400', items: ['兔', '龍', '蛇'] }
]

const BOX_DEFINITIONS = {
  super: {
    name: '超越等級箱子',
    require: 12,
    color: 'border-red-500/50 bg-red-500/10',
    rewards: ['輪迴碑石', '燃燒之戒', '苦行的戒指']
  },
  great: {
    name: '大吉等級箱子',
    require: 9,
    color: 'border-yellow-500/50 bg-yellow-500/10',
    rewards: ['魔法賦予第3階段賦予卷軸', '時裝內襯1種選擇券', '魔法靈氣30個交換券']
  },
  medium: {
    name: '中吉等級箱子',
    require: 6,
    color: 'border-blue-500/50 bg-blue-500/10',
    rewards: ['高級自定義皮膚變更券交換券', '彩色稜鏡Pro交換券', '自由造型券 10個']
  },
  small: {
    name: '小吉等級箱子',
    require: 3,
    color: 'border-green-500/50 bg-green-500/10',
    rewards: ['閃炫方塊', '恢復附加方塊', '恢復方塊']
  }
}

const EXCHANGE_PRICES = {
  "馬": 1500, "羊": 1500, "猴": 1500,
  "雞": 200, "狗": 200, "豬": 200,
  "鼠": 50, "牛": 50, "虎": 50,
  "兔": 10, "龍": 10, "蛇": 10
}

// --- State ---
const totalCost = ref(0)
const counts = reactive({})
const rewardsCounts = reactive({})
const essence = ref(0)
const history = ref([])
const lastDrawMessage = ref('')
const activeTab = ref('draw') // 'draw', 'exchange', 'record', 'simulator'
const autoDrawInterval = ref(null)
const simInterval = ref(null)
const countdownText = ref('載入中...')
let timerInterval = null

const simResult = reactive({
  cost: 0,
  draws: 0,
  boxes: 0,
  success: false,
  loading: false
})
const simInventory = reactive({})
const simHistory = ref([])

// Initialize counts
Object.keys(PROBABILITIES).forEach(k => {
  counts[k] = 0
  simInventory[k] = 0
})
Object.values(BOX_DEFINITIONS).forEach(box => {
  box.rewards.forEach(r => rewardsCounts[r] = 0)
})

// --- Computed ---
const distinctOwnedCount = computed(() => {
  return Object.keys(counts).filter(k => counts[k] > 0).length
})

const distinctOwnedNames = computed(() => {
  return Object.keys(counts).filter(k => counts[k] > 0)
})

// --- Logic ---
const cumulative = []
let sum = 0
for (const [name, prob] of Object.entries(PROBABILITIES)) {
  sum += prob
  cumulative.push({ name, threshold: sum })
}
cumulative[cumulative.length - 1].threshold = 1

function weightedDrawName() {
  const r = Math.random()
  for (const item of cumulative) {
    if (r <= item.threshold) return item.name
  }
  return cumulative[cumulative.length - 1].name
}

function draw(times) {
  const drawn = []
  const currentDrawCounts = {}
  
  for (let i = 0; i < times; i++) {
    const name = weightedDrawName()
    counts[name]++
    drawn.push(name)
    currentDrawCounts[name] = (currentDrawCounts[name] || 0) + 1
  }
  totalCost.value += COST_PER_DRAW * times
  
  const rareItems = ['馬', '羊', '猴']
  const drawnRares = drawn.filter(d => rareItems.includes(d))
  const uniqueRares = [...new Set(drawnRares)]

  // Format log message
  if (times === 1) {
    lastDrawMessage.value = `抽到了 ${drawn[0]}！`
    pushHistory('抽取', `獲得氣息: ${drawn[0]}`)
  } else {
    const details = Object.entries(currentDrawCounts)
      .map(([name, count]) => `${name}x${count}`)
      .join(', ')
    
    if (uniqueRares.length > 0) {
      lastDrawMessage.value = `完成了 ${times} 連抽，包含稀有：${uniqueRares.join('、')}！`
    } else {
      lastDrawMessage.value = `完成了 ${times} 連抽`
    }
    pushHistory('抽取', `${times}連抽結果: ${details}`)
  }
}

function pushHistory(type, message) {
  history.value.unshift({
    type,
    message,
    time: new Date().toLocaleTimeString('zh-TW', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })
  if (history.value.length > 200) history.value.pop()
}

function clearHistory() {
  if (autoDrawInterval.value) toggleAutoDraw()
  history.value = []
  totalCost.value = 0
  essence.value = 0
  Object.keys(counts).forEach(k => counts[k] = 0)
  Object.keys(rewardsCounts).forEach(k => rewardsCounts[k] = 0)
  lastDrawMessage.value = '已清除紀錄與數量'
  pushHistory('系統', '數據已重置。')
}

function decompose(name, amount) {
  if (counts[name] < amount) return
  counts[name] -= amount
  const gained = amount * 1 // 1 Essence per item
  essence.value += gained
  pushHistory('分解', `分解 ${name} x${amount}，獲得 ${gained} 精華`)
}

function decomposeAllExtras() {
  let totalGained = 0
  let details = []
  const protectedItems = ['馬', '羊', '猴'] // Protect rare items
  
  Object.keys(counts).forEach(name => {
    if (protectedItems.includes(name)) return // Skip protected items

    if (counts[name] > 1) {
      const amount = counts[name] - 1
      counts[name] -= amount
      const gained = amount * 1
      totalGained += gained
      details.push(`${name}x${amount}`)
    }
  })
  
  if (totalGained > 0) {
    essence.value += totalGained
    pushHistory('分解', `一鍵分解: ${details.join(', ')}，共獲得 ${totalGained} 精華`)
    alert(`分解成功！共獲得 ${totalGained} 精華\n(已自動略過稀有生肖：馬、羊、猴)`)
  } else {
    alert('沒有多餘的普通生肖可分解（稀有生肖與每種保留 1 隻不分解）')
  }
}

function buyZodiac(name) {
  const price = EXCHANGE_PRICES[name]
  if (essence.value < price) {
    alert('精華不足！')
    return
  }
  essence.value -= price
  counts[name]++
  pushHistory('兌換', `消耗 ${price} 精華兌換了 ${name}`)
}

function toggleAutoDraw() {
  if (autoDrawInterval.value) {
    clearInterval(autoDrawInterval.value)
    autoDrawInterval.value = null
    pushHistory('系統', '已停止自動抽取。')
  } else {
    if (distinctOwnedCount.value === 12) {
      alert('您已經集齊所有生肖了！')
      return
    }
    pushHistory('系統', '開始一鍵水溝模式！')
    autoDrawInterval.value = setInterval(() => {
      draw(10)
      if (distinctOwnedCount.value === 12) {
        toggleAutoDraw()
        pushHistory('系統', '恭喜！已集齊所有 12 種氣息，自動停止。')
        alert('恭喜！您已集齊所有生肖！')
      }
    }, 100)
  }
}

function exchange(boxKey) {
  const box = BOX_DEFINITIONS[boxKey]
  if (distinctOwnedCount.value < box.require) {
    alert(`持有不同生肖不足：需要 ${box.require} 種，目前只有 ${distinctOwnedCount.value} 種。`)
    return
  }

  // Consume distinct zodiacs
  const owned = [...distinctOwnedNames.value]
  const shuffled = owned.sort(() => Math.random() - 0.5)
  const toConsume = shuffled.slice(0, box.require)
  
  toConsume.forEach(name => {
    counts[name]--
  })

  // Give reward
  const reward = box.rewards[Math.floor(Math.random() * box.rewards.length)]
  rewardsCounts[reward]++
  
  if (reward === '輪迴碑石') {
    setTimeout(() => alert('🎉🎉🎉 恭喜獲得輪迴碑石！！！ 🎉🎉🎉'), 50)
  }

  pushHistory('兌換', `${box.name} → ${reward}`)
  lastDrawMessage.value = `兌換成功！獲得：${reward} (消耗: ${toConsume.join(', ')})`
}

function pushSimHistory(message) {
  simHistory.value.unshift({
    time: new Date().toLocaleTimeString('zh-TW', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    message
  })
  if (simHistory.value.length > 50) simHistory.value.pop()
}

function toggleSimulateFrenzy() {
  if (simInterval.value) {
    clearInterval(simInterval.value)
    simInterval.value = null
    simResult.loading = false
    pushSimHistory('已停止水溝')
  } else {
    // Reset
    simResult.cost = 0
    simResult.draws = 0
    simResult.boxes = 0
    simResult.success = false
    simResult.loading = true
    simHistory.value = []
    Object.keys(PROBABILITIES).forEach(k => simInventory[k] = 0)
    
    let lastBoxCost = 0

    pushSimHistory('開始一鍵水溝模擬輪迴碑石抽取...')
    
    simInterval.value = setInterval(() => {
      // Batch draws for speed (50 draws per tick)
      const batchSize = 50
      for (let i = 0; i < batchSize; i++) {
        const name = weightedDrawName()
        simInventory[name]++
        simResult.draws++
        simResult.cost += COST_PER_DRAW
      }
      
      // Check Exchange
      const distinct = Object.values(simInventory).filter(c => c > 0).length
      if (distinct === 12) {
        const currentRoundCost = simResult.cost - lastBoxCost
        lastBoxCost = simResult.cost

        Object.keys(simInventory).forEach(k => simInventory[k]--)
        simResult.boxes++
        
        // 1/3 chance for Frenzy
        const rewards = BOX_DEFINITIONS.super.rewards
        const rewardIndex = Math.floor(Math.random() * rewards.length)
        const reward = rewards[rewardIndex]
        
        pushSimHistory(`集齊12生肖 (本輪花費 ${formatCurrency(currentRoundCost)})，開啟第 ${simResult.boxes} 個超越箱 → 獲得：${reward}`)

        if (reward === '輪迴碑石') {
          simResult.success = true
          clearInterval(simInterval.value)
          simInterval.value = null
          simResult.loading = false
          pushSimHistory('🎉 恭喜！獲得輪迴碑石！')
          alert('🎉 模擬成功！恭喜獲得輪迴碑石！')
        }
      }
      
      // Safety break
      if (simResult.draws > 10000000) {
        clearInterval(simInterval.value)
        simInterval.value = null
        simResult.loading = false
        pushSimHistory('水溝次數過多已停止')
        alert('水溝次數過多已停止')
      }
    }, 50)
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(val)
}

function updateTimer() {
  const end = new Date('2026-01-13T23:59:59').getTime()
  const now = new Date().getTime()
  const distance = end - now

  if (distance < 0) {
    countdownText.value = "活動已結束"
    return
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)

  countdownText.value = `剩餘時間：${days}天 ${hours}時 ${minutes}分 ${seconds}秒`
}

onMounted(() => {
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (autoDrawInterval.value) clearInterval(autoDrawInterval.value)
})
</script>

<template>
  <div class="newyear-event-container vp-doc">
    
    <!-- Title Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2 text-brand !border-0">新年的氣息</h1>
      <div class="text-sm text-muted mb-1">活動期間：2026/01/01 00:00 ～ 2026/01/13 23:59</div>
      <div class="text-xl font-bold text-red-500 mb-4">{{ countdownText }}</div>
      <button @click="clearHistory" class="mt-2 px-6 py-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white font-bold transition-all shadow hover:shadow-md text-sm">
        重置所有數據
      </button>
    </div>

    <!-- Header Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="stat-card bg-soft border border-divider rounded-xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-sm">
        <div class="label text-xs uppercase tracking-wider mb-1 text-muted">總花費</div>
        <div class="value text-xl font-bold text-brand">{{ formatCurrency(totalCost) }}</div>
      </div>
      <div class="stat-card bg-soft border border-divider rounded-xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-sm">
        <div class="label text-xs uppercase tracking-wider mb-1 text-muted">收集進度</div>
        <div class="value text-xl font-bold text-main">{{ distinctOwnedCount }} / 12 <span class="text-sm text-muted">種</span></div>
      </div>
      <div class="stat-card bg-soft border border-divider rounded-xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-sm md:col-span-2">
        <div class="label text-xs uppercase tracking-wider mb-1 text-muted">最新動態</div>
        <div class="value font-bold text-main text-sm w-full break-words" :title="lastDrawMessage">{{ lastDrawMessage || '尚未開始' }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex space-x-2 mb-6 border-b border-divider pb-2 overflow-x-auto">
      <button 
        v-for="tab in ['draw', 'exchange', 'recycle', 'record', 'simulator']" 
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-2 rounded-lg transition-all font-bold whitespace-nowrap"
        :class="activeTab === tab ? 'bg-brand-soft text-brand' : 'text-muted hover:text-main hover:bg-soft'"
      >
        {{ tab === 'draw' ? '🎋 抽取生肖' : tab === 'exchange' ? '🎁 兌換獎勵' : tab === 'recycle' ? '♻️ 分解與兌換' : tab === 'record' ? '📜 歷史紀錄' : '🔮 輪迴模擬器' }}
      </button>
    </div>

    <!-- Tab: Draw -->
    <div v-if="activeTab === 'draw'" class="animate-fade-in">
      <div class="flex flex-wrap gap-3 mb-8 justify-center">
        <button @click="draw(1)" class="action-btn px-6 py-3 rounded-full font-bold text-white transition-all transform hover:-translate-y-1 hover:shadow-lg active:scale-95 flex flex-col items-center min-w-[120px]">
          抽 1 次 <span class="text-xs opacity-70">($27)</span>
        </button>
        <button @click="draw(10)" class="action-btn px-6 py-3 rounded-full font-bold text-white transition-all transform hover:-translate-y-1 hover:shadow-lg active:scale-95 flex flex-col items-center min-w-[120px]">
          抽 10 次 <span class="text-xs opacity-70">($270)</span>
        </button>
        <button @click="draw(100)" class="action-btn px-6 py-3 rounded-full font-bold text-white transition-all transform hover:-translate-y-1 hover:shadow-lg active:scale-95 flex flex-col items-center min-w-[120px]">
          抽 100 次 <span class="text-xs opacity-70">($2,700)</span>
        </button>
        <button 
          @click="toggleAutoDraw" 
          class="action-btn px-6 py-3 rounded-full font-bold text-white transition-all transform hover:-translate-y-1 hover:shadow-lg active:scale-95 flex flex-col items-center min-w-[120px]"
          :style="autoDrawInterval ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : 'background: linear-gradient(135deg, #f59e0b, #d97706);'"
        >
          {{ autoDrawInterval ? '停止水溝' : '一鍵水溝' }}
          <span class="text-xs opacity-70">{{ autoDrawInterval ? '(點擊停止)' : '(自動連抽)' }}</span>
        </button>
      </div>

      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <template v-for="group in ZODIAC_GROUPS" :key="group.name">
          <div 
            v-for="zodiac in group.items" 
            :key="zodiac"
            class="zodiac-card relative group transition-all duration-300 rounded-xl p-3 flex flex-col items-center justify-center border backdrop-blur-sm"
            :class="[
              counts[zodiac] > 0 ? 'border-brand/40 bg-brand-soft' : 'border-divider bg-soft opacity-60'
            ]"
          >
            <div class="text-3xl mb-2 transform group-hover:scale-110 transition-transform">{{ ZODIAC_ICONS[zodiac] }}</div>
            <div class="font-bold" :class="group.color">{{ zodiac }}</div>
            <div class="text-xs mt-1 text-muted">持有: {{ counts[zodiac] }}</div>
            <div v-if="counts[zodiac] > 0" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_var(--vp-c-brand)]"></div>
          </div>
        </template>
      </div>
    </div>

    <!-- Tab: Exchange -->
    <div v-if="activeTab === 'exchange'" class="animate-fade-in">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(box, key) in BOX_DEFINITIONS" :key="key" class="box-card p-4 rounded-xl border" :class="box.color">
          <h3 class="text-lg font-bold mb-2 flex items-center justify-between">
            {{ box.name }}
            <span class="text-xs px-2 py-1 rounded bg-soft border border-divider">需 {{ box.require }} 種</span>
          </h3>
          <div class="text-sm text-muted mb-4">
            <div v-for="reward in box.rewards" :key="reward" class="flex justify-between py-1 border-b border-divider last:border-0">
              <span>{{ reward }}</span>
              <span v-if="rewardsCounts[reward] > 0" class="text-brand font-bold">x{{ rewardsCounts[reward] }}</span>
            </div>
          </div>
          <button 
            @click="exchange(key)"
            class="w-full py-2 rounded-lg font-bold transition-all"
            :class="distinctOwnedCount >= box.require 
              ? 'bg-brand text-black shadow-lg hover:brightness-110' 
              : 'bg-soft text-muted cursor-not-allowed'"
            :disabled="distinctOwnedCount < box.require"
          >
            {{ distinctOwnedCount >= box.require ? '立即兌換' : '收集不足' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: Recycle & Shop -->
    <div v-if="activeTab === 'recycle'" class="animate-fade-in">
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Left: Decompose -->
        <div class="flex-1">
          <div class="bg-soft border border-divider rounded-xl p-4 mb-4 sticky top-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold">♻️ 分解生肖</h3>
              <div class="text-sm font-bold text-brand">持有精華: {{ essence }}</div>
            </div>
            <button 
              @click="decomposeAllExtras" 
              class="w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold shadow mb-4 transition-all"
            >
              一鍵分解多餘生肖 (保留稀有)
            </button>
            <div class="text-xs text-muted text-center mb-4">分解任意生肖可獲得 1 點精華<br>(馬、羊、猴 不會被一鍵分解)</div>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div v-for="(count, name) in counts" :key="name" class="border border-divider rounded p-2 flex flex-col items-center bg-white dark:bg-gray-800">
                <div class="text-2xl mb-1">{{ ZODIAC_ICONS[name] }}</div>
                <div class="font-bold text-sm">{{ name }}</div>
                <div class="text-xs text-muted mb-2">持有: {{ count }}</div>
                <button 
                  @click="decompose(name, 1)" 
                  class="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  :disabled="count <= 0"
                  :class="count <= 0 ? 'opacity-50 cursor-not-allowed' : ''"
                >
                  分解 1 個
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Shop -->
        <div class="flex-1">
          <div class="bg-soft border border-divider rounded-xl p-4">
            <h3 class="text-lg font-bold mb-4">🛒 精華商店</h3>
            <div class="space-y-3">
              <div v-for="(price, name) in EXCHANGE_PRICES" :key="name" class="flex items-center justify-between p-3 border border-divider rounded-lg bg-white dark:bg-gray-800">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ ZODIAC_ICONS[name] }}</span>
                  <div>
                    <div class="font-bold">{{ name }}</div>
                    <div class="text-xs text-muted">價格: {{ price }} 精華</div>
                  </div>
                </div>
                <button 
                  @click="buyZodiac(name)"
                  class="px-4 py-2 rounded text-sm font-bold transition-all"
                  :class="essence >= price ? 'bg-brand text-black hover:brightness-110' : 'bg-gray-200 dark:bg-gray-700 text-muted cursor-not-allowed'"
                  :disabled="essence < price"
                >
                  兌換
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Record -->
    <div v-if="activeTab === 'record'" class="animate-fade-in">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">操作紀錄</h3>
        <button @click="clearHistory" class="text-xs text-red-400 hover:text-red-300 underline">清除所有資料</button>
      </div>
      
      <div class="bg-soft rounded-xl p-4 h-[400px] overflow-y-auto custom-scrollbar border border-divider font-mono text-sm">
        <div v-if="history.length === 0" class="text-center text-muted py-8">暫無紀錄</div>
        <div v-else class="space-y-1">
          <div v-for="(item, idx) in history" :key="idx" class="flex items-start border-b border-divider/50 pb-1 last:border-0">
            <span class="text-muted mr-2 whitespace-nowrap">[{{ item.time }}]</span>
            <span :class="{
              'text-green-500': item.type === '系統',
              'text-blue-500 dark:text-blue-300': item.type === '抽取',
              'text-yellow-600 dark:text-yellow-400': item.type === '兌換'
            }">
              {{ item.message }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <h3 class="text-lg font-bold mb-3">獎勵統計</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div v-for="(count, name) in rewardsCounts" :key="name" v-show="count > 0" class="flex justify-between bg-soft px-3 py-2 rounded border border-divider">
            <span>{{ name }}</span>
            <span class="font-bold text-brand">{{ count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Simulator -->
    <div v-if="activeTab === 'simulator'" class="animate-fade-in">
      <div class="text-center py-8">
        <h3 class="text-2xl font-bold mb-4">🔮 輪迴碑石模擬器</h3>
        <div class="text-muted mb-8 max-w-md mx-auto text-center">
          模擬直到抽中「輪迴碑石」為止的過程。此模擬不會消耗您的實際花費，也不會影響您的歷史紀錄。
        </div>
        
        <button 
          @click="toggleSimulateFrenzy" 
          class="action-btn px-8 py-4 rounded-full font-bold text-white text-lg shadow-xl hover:scale-105 transition-transform mb-8"
          :style="simInterval ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : ''"
        >
          <span v-if="simInterval">停止水溝 (運算中...)</span>
          <span v-else>開始一鍵水溝模式！</span>
        </button>

        <div v-if="simResult.draws > 0" class="max-w-md mx-auto space-y-6 animate-fade-in">
          <!-- Result Card -->
          <div class="bg-soft border border-divider rounded-xl p-6">
            <div class="text-lg font-bold mb-4" :class="simResult.success ? 'text-green-500' : 'text-red-500'">
              {{ simResult.success ? '🎉 恭喜獲得輪迴碑石！' : (simInterval ? '🚀 模擬進行中...' : '⚠️ 已停止模擬') }}
            </div>
            
            <div class="space-y-3">
              <div class="flex justify-between border-b border-divider pb-2">
                <span class="text-muted">總花費</span>
                <span class="font-bold text-brand text-xl">{{ formatCurrency(simResult.cost) }}</span>
              </div>
              <div class="flex justify-between border-b border-divider pb-2">
                <span class="text-muted">總抽數</span>
                <span class="font-bold">{{ simResult.draws.toLocaleString() }} 次</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">開啟超越箱</span>
                <span class="font-bold">{{ simResult.boxes }} 個</span>
              </div>
            </div>
          </div>

          <!-- Simulation History Log -->
          <div class="bg-black/90 text-green-400 rounded-xl p-4 h-[250px] overflow-y-auto custom-scrollbar font-mono text-xs text-left border border-green-900/50 shadow-inner">
            <div v-if="simHistory.length === 0" class="text-center text-gray-500 py-8">暫無模擬紀錄</div>
            <div v-else class="space-y-1">
              <div v-for="(item, idx) in simHistory" :key="idx" class="flex items-start border-b border-green-900/30 pb-1 last:border-0">
                <span class="text-gray-500 mr-2 whitespace-nowrap">[{{ item.time }}]</span>
                <span>{{ item.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.newyear-event-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Custom Utility Classes mapped to VitePress Variables */
.text-brand { color: var(--vp-c-brand); }
.bg-brand { background-color: var(--vp-c-brand); }
.bg-brand-soft { background-color: var(--vp-c-brand-soft); }
.text-muted { color: var(--vp-c-text-2); }
.text-main { color: var(--vp-c-text-1); }
.bg-soft { background-color: var(--vp-c-bg-soft); }
.border-divider { border-color: var(--vp-c-divider); }

/* Action Button Gradient */
.action-btn {
  background: linear-gradient(135deg, var(--vp-c-brand-dark), var(--vp-c-brand));
  color: var(--vp-button-brand-text);
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-text-2);
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
