// 戰力數值字級自適應。
// 取所有可見 .combat-power-summary .result-value 能塞進框內的最小字級統一套用，
// 倍率值先由 3 位小數逐步減到 1 位，仍塞不下才縮字級。
import { onBeforeUnmount, onMounted } from 'vue'
import { formatPercentDecimals } from '@maplecombat/core/format'

const FIT_BUFFER = 6
let measureCanvas: HTMLCanvasElement | null = null

function textContentWidth(element: HTMLElement): number {
  const text = element.textContent || ''
  if (!text) return 0

  measureCanvas ||= document.createElement('canvas')
  const context = measureCanvas.getContext('2d')
  if (!context) return Math.ceil(element.scrollWidth)

  const style = window.getComputedStyle(element)
  context.font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ]
    .filter(Boolean)
    .join(' ')
  const letterSpacing = parseFloat(style.letterSpacing)
  const spacingWidth = Number.isFinite(letterSpacing)
    ? Math.max(0, text.length - 1) * letterSpacing
    : 0
  return Math.ceil(context.measureText(text).width + spacingWidth)
}

function fitCombatPowerValues(): void {
  const valueElements = Array.from(
    document.querySelectorAll<HTMLElement>('.combat-power-summary .result-value'),
  ).filter((el) => el.offsetParent !== null)
  if (!valueElements.length) return

  const items = valueElements
    .map((valueEl) => valueEl.closest<HTMLElement>('.result-item'))
    .filter((el): el is HTMLElement => !!el)
  const summaries = [
    ...new Set(
      valueElements
        .map((valueEl) => valueEl.closest<HTMLElement>('.combat-power-summary'))
        .filter((el): el is HTMLElement => !!el),
    ),
  ]
  summaries.forEach((summary) => summary.classList.remove('is-value-wrapped'))
  items.forEach((item) => item.classList.remove('is-value-wrapped'))

  let groupSize = Infinity
  const wrappedItems = new Set<HTMLElement>()
  valueElements.forEach((valueEl) => {
    const item = valueEl.closest<HTMLElement>('.result-item')
    if (!item) return

    const computed = window.getComputedStyle(valueEl)
    const maxSize =
      parseFloat(computed.getPropertyValue('--combat-power-value-max-size')) ||
      parseFloat(computed.fontSize) ||
      48
    const minSize = parseFloat(computed.getPropertyValue('--combat-power-value-min-size')) || 26
    valueEl.style.setProperty('--combat-power-value-size', `${maxSize}px`)

    const label = item.querySelector<HTMLElement>('.result-label')
    const labelWidth = label ? Math.ceil(label.getBoundingClientRect().width) : 0
    const itemStyle = window.getComputedStyle(item)
    const gap = parseFloat(itemStyle.columnGap || itemStyle.gap) || 0
    const availableWidth = Math.floor(item.clientWidth - labelWidth - gap - FIT_BUFFER)

    const rawPercent = valueEl.dataset.rawPercent
    if (rawPercent !== undefined && rawPercent !== '' && isFinite(parseFloat(rawPercent))) {
      const raw = parseFloat(rawPercent)
      for (let dec = 3; dec >= 1; dec--) {
        valueEl.textContent = formatPercentDecimals(raw, dec)
        if (dec === 1 || availableWidth <= 0 || textContentWidth(valueEl) <= availableWidth) break
      }
    }

    const requiredAtMinSize = (textContentWidth(valueEl) * minSize) / maxSize
    if (availableWidth > 0 && requiredAtMinSize > availableWidth) {
      wrappedItems.add(item)
    }
  })

  wrappedItems.forEach((item) => {
    item.classList.add('is-value-wrapped')
    item.closest<HTMLElement>('.combat-power-summary')?.classList.add('is-value-wrapped')
  })

  valueElements.forEach((valueEl) => {
    const item = valueEl.closest<HTMLElement>('.result-item')
    if (!item) return
    const computed = window.getComputedStyle(valueEl)
    const maxSize =
      parseFloat(computed.getPropertyValue('--combat-power-value-max-size')) ||
      parseFloat(computed.fontSize) ||
      48
    const minSize = parseFloat(computed.getPropertyValue('--combat-power-value-min-size')) || 26
    valueEl.style.setProperty('--combat-power-value-size', `${maxSize}px`)
    const label = item.querySelector<HTMLElement>('.result-label')
    const itemStyle = window.getComputedStyle(item)
    const availableWidth = wrappedItems.has(item)
      ? Math.floor(item.clientWidth - FIT_BUFFER)
      : Math.floor(
          item.clientWidth -
            (label ? Math.ceil(label.getBoundingClientRect().width) : 0) -
            (parseFloat(itemStyle.columnGap || itemStyle.gap) || 0) -
            FIT_BUFFER,
        )

    let fitted = maxSize
    if (availableWidth > 0) {
      const requiredWidth = textContentWidth(valueEl)
      if (requiredWidth > availableWidth) {
        fitted = Math.max(minSize, Math.floor((maxSize * availableWidth) / requiredWidth))
      }
    }
    groupSize = Math.min(groupSize, fitted)
  })

  if (isFinite(groupSize)) {
    valueElements.forEach((valueEl) => {
      valueEl.style.setProperty('--combat-power-value-size', `${groupSize}px`)
    })
  }
}

let queued = false
export function queueCombatPowerFit(): void {
  if (queued) return
  queued = true
  // rAF 在背景視窗會被節流甚至凍結（queued 卡死、字級永不重排），
  // 以 setTimeout 雙保險：先到先執行
  let done = false
  const run = () => {
    if (done) return
    done = true
    queued = false
    fitCombatPowerValues()
  }
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run)
  window.setTimeout(run, 120)
}

/** 掛載於含 .combat-power-summary 的元件：監看尺寸/字型變化自動重排 */
export function useCombatPowerFit(): void {
  let observer: ResizeObserver | null = null

  onMounted(() => {
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(queueCombatPowerFit)
      document
        .querySelectorAll('.combat-power-summary')
        .forEach((summary) => observer!.observe(summary))
    }
    window.addEventListener('resize', queueCombatPowerFit, { passive: true })
    if (document.fonts?.ready) {
      document.fonts.ready.then(queueCombatPowerFit).catch(() => {})
    }
    queueCombatPowerFit()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    window.removeEventListener('resize', queueCombatPowerFit)
  })
}
