<script setup lang="ts">
import { Clock3, Droplets, Gauge, MapPin } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const en = computed(() => lang.value.toLowerCase().startsWith('en'))
const WEATHER_CACHE_KEY = 'fuwari-weather-cache-new-taipei'
const WEATHER_QUERY = 'New Taipei City'
const WEATHER_LOCATION = 'New Taipei City'

interface WeatherCache {
  timestamp: number
  location: string
  temperature: string
  description: string
  weatherCode?: string
  humidity: string
  rain: string
}

const weatherDescriptionsZh: Record<string, string> = {
  '113': '晴朗', '116': '局部多雲', '119': '多雲', '122': '陰天', '143': '薄霧',
  '176': '附近有零星降雨', '179': '附近有零星雨夾雪', '182': '附近有零星凍雨', '185': '附近有零星小雨', '200': '附近可能有雷雨',
  '227': '吹雪', '230': '暴風雪', '248': '有霧', '260': '霧氣', '263': '局部毛毛雨', '266': '毛毛雨',
  '281': '凍毛毛雨', '284': '強凍毛毛雨', '293': '局部小雨', '296': '小雨', '299': '局部中雨', '302': '中雨',
  '305': '局部大雨', '308': '大雨', '311': '小凍雨', '314': '中到大凍雨', '317': '小雨夾雪', '320': '中到大雨夾雪',
  '323': '局部小雪', '326': '小雪', '329': '局部中雪', '332': '中雪', '335': '局部大雪', '338': '大雪', '350': '冰粒',
  '353': '短暫小雨', '356': '中到大陣雨', '359': '豪雨', '362': '短暫雨夾雪', '365': '中到大雨夾雪',
  '368': '短暫小雪', '371': '中到大陣雪', '374': '短暫冰粒', '377': '中到大冰粒',
  '386': '局部雷陣雨', '389': '中到大雷雨', '392': '局部雷陣雪', '395': '中到大雷陣雪',
}

const weatherDescriptionFallbackZh: Record<string, string> = {
  'patchy rain nearby': '附近有零星降雨',
  'sunny': '晴朗',
  'clear': '晴朗',
  'partly cloudy': '局部多雲',
  'cloudy': '多雲',
  'overcast': '陰天',
  'mist': '薄霧',
  'fog': '有霧',
  'light rain shower': '短暫小雨',
  'light rain': '小雨',
  'moderate rain': '中雨',
  'heavy rain': '大雨',
  'thundery outbreaks possible': '可能有雷雨',
}

const time = ref('--:--:--')
const date = ref('')
const location = ref('')
const temperature = ref('--')
const description = ref('--')
const weatherCode = ref('')
const humidity = ref('--')
const rain = ref('--')
let clockTimer: ReturnType<typeof setInterval> | undefined
let weatherTimer: ReturnType<typeof setInterval> | undefined

const localizedDescription = computed(() => {
  if (en.value || description.value === '--') return description.value
  return weatherDescriptionsZh[weatherCode.value]
    || weatherDescriptionFallbackZh[description.value.trim().toLowerCase()]
    || description.value
})

const weatherKind = computed(() => {
  const value = description.value.toLowerCase()
  if (/thunder/.test(value)) return 'thunder'
  if (/rain|shower|drizzle|precipitation/.test(value)) return 'rain'
  if (/snow|ice|blizzard/.test(value)) return 'snow'
  if (/cloud|overcast/.test(value)) return 'cloud'
  if (/mist|fog/.test(value)) return 'fog'
  const hour = Number(time.value.slice(0, 2))
  return hour >= 6 && hour < 18 ? 'sun' : 'moon'
})

const weatherIcon = computed(() => ({
  thunder: '⛈️', rain: '🌧️', snow: '🌨️', cloud: '☁️', fog: '🌫️', sun: '☀️', moon: '🌙'
}[weatherKind.value] || '🌤️'))

function taipeiNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
}

function updateClock() {
  const now = taipeiNow()
  time.value = [now.getHours(), now.getMinutes(), now.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':')
  date.value = en.value
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(now)
    : `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} 週${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`
}

function applyWeather(cache: WeatherCache) {
  location.value = WEATHER_LOCATION
  temperature.value = cache.temperature
  description.value = cache.description
  weatherCode.value = cache.weatherCode || ''
  humidity.value = cache.humidity
  rain.value = cache.rain
}

async function fetchWeather(city: string, displayLocation: string) {
  const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`)
  const data = await response.json()
  const current = data.current_condition?.[0]
  if (!current) throw new Error('Weather response did not contain current conditions')
  const currentHour = taipeiNow().getHours()
  const hourly = data.weather?.[0]?.hourly || []
  const currentForecast = hourly.find((item: { time?: string }) => Number.parseInt(item.time || '0', 10) / 100 >= currentHour) || hourly.at(-1)
  const cache: WeatherCache = {
    timestamp: Date.now(),
    location: displayLocation,
    temperature: String(current.temp_C ?? '--'),
    description: String(current.weatherDesc?.[0]?.value || '--'),
    weatherCode: String(current.weatherCode ?? ''),
    humidity: String(current.humidity ?? '--'),
    rain: String(currentForecast?.chanceofrain ?? '0')
  }
  applyWeather(cache)
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache))
}

async function loadWeather() {
  try {
    const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null') as WeatherCache | null
    if (cached?.timestamp && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      applyWeather(cached)
      return
    }
  } catch { /* ignore invalid cache */ }

  try {
    await fetchWeather(WEATHER_QUERY, WEATHER_LOCATION)
  } catch {
    location.value = WEATHER_LOCATION
    description.value = en.value ? 'Weather is temporarily unavailable' : '天氣暫時無法取得'
  }
}

onMounted(() => {
  updateClock()
  loadWeather()
  clockTimer = setInterval(updateClock, 1000)
  weatherTimer = setInterval(loadWeather, 30 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (weatherTimer) clearInterval(weatherTimer)
})
</script>

<template>
  <section class="fuwari-side-card fuwari-card-base" :aria-label="en ? 'Time and weather' : '時間與天氣'">
    <h2><Clock3 :size="17" /><span>{{ en ? 'Time & Weather' : '時間與天氣' }}</span></h2>
    <div class="fuwari-clock">
      <strong>{{ time }}</strong>
      <span>{{ date }}</span>
    </div>
    <div class="fuwari-side-card__divider" />
    <div class="fuwari-weather">
      <p class="fuwari-weather__location"><MapPin :size="15" />{{ location }}</p>
      <div class="fuwari-weather__current">
        <div class="fuwari-weather__icon" :class="`is-${weatherKind}`"><span>{{ weatherIcon }}</span></div>
        <strong>{{ temperature }}<small>°C</small></strong>
      </div>
      <p>{{ localizedDescription }}</p>
      <div class="fuwari-weather__details">
        <span :title="en ? 'Chance of rain' : '降雨機率'" :aria-label="`${en ? 'Chance of rain' : '降雨機率'} ${rain}%`"><Droplets :size="15" />{{ rain }}%</span>
        <span :title="en ? 'Humidity' : '濕度'" :aria-label="`${en ? 'Humidity' : '濕度'} ${humidity}%`"><Gauge :size="15" />{{ humidity }}%</span>
      </div>
    </div>
  </section>
</template>
