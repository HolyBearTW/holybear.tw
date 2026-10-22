// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import MarkdownPreview from '../../.vitepress/edit/MarkdownPreview.vue'

vi.mock('vitepress', () => ({ useData: () => ({ isDark: ref(false) }) }))

let app
let host

const mountPreview = async (props) => {
  app = createApp({ render: () => h(MarkdownPreview, props) })
  app.mount(host)
  await vi.advanceTimersByTimeAsync(300)
  await nextTick()
  return host.querySelector('.markdown-preview')
}

beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  app?.unmount()
  app = undefined
  host.remove()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MarkdownPreview component', () => {
  it('renders front matter metadata as text and strips executable article HTML', async () => {
    const attack = '<img src=x onerror="localStorage.clear()">'
    const preview = await mountPreview({
      markdown: `**正常 Markdown**\n\n<img src="/missing.jpg" onerror="alert(1)"><script>alert(1)</script>`,
      title: attack,
      categories: [attack],
      tags: [attack],
      isBlogPost: true,
    })

    expect(preview.querySelector('h1')?.textContent).toBe(attack)
    expect(preview.querySelector('.category')?.textContent).toBe(attack)
    expect(preview.querySelector('.tags')?.textContent).toBe(attack)
    expect(preview.querySelector('strong')?.textContent).toBe('正常 Markdown')
    expect(preview.querySelectorAll('img')).toHaveLength(1)
    expect(preview.querySelector('img')?.hasAttribute('onerror')).toBe(false)
    expect(preview.querySelector('script')).toBeNull()
  })

  it('keeps Tabs interactive and sanitizes an inactive panel when the user selects it', async () => {
    const preview = await mountPreview({
      markdown: `:::tabs box-blue
== 第一頁
**第一頁內容**
== 第二頁
<img src="/missing.jpg" onerror="alert(1)">
<a href="javascript:alert(1)">危險連結</a>

**第二頁內容**
:::`,
    })

    const tabs = preview.querySelectorAll('.plugin-tabs--tab')
    expect(tabs).toHaveLength(2)
    expect(preview.querySelector('.plugin-tabs.box-blue')).not.toBeNull()
    expect(preview.querySelector('.plugin-tabs--content strong')?.textContent).toBe('第一頁內容')
    expect(preview.querySelector('img')).toBeNull()

    tabs[1].click()
    await nextTick()

    const panel = preview.querySelector('.plugin-tabs--content')
    expect(tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    expect(panel.id).toBe(tabs[1].getAttribute('aria-controls'))
    expect(panel.querySelector('strong')?.textContent).toBe('第二頁內容')
    expect(panel.querySelector('img')?.hasAttribute('onerror')).toBe(false)
    expect(panel.querySelector('a')?.hasAttribute('href')).toBe(false)

    tabs[0].click()
    expect(panel.querySelector('strong')?.textContent).toBe('第一頁內容')
  })

  it('keeps custom containers, HTML image layout and the YouTube component', async () => {
    const preview = await mountPreview({
      markdown: `:::card 卡片標題
**卡片內容**
:::

:::half
<div style="text-align:center"><img src="/image/example.jpg" style="max-width:100%;height:auto"></div>
:::

<YouTube id="Qs68Fugalro"/>`,
    })

    expect(preview.querySelector('.card.custom-block .card-header')?.textContent).toBe('卡片標題')
    expect(preview.querySelector('.card-body strong')?.textContent).toBe('卡片內容')
    expect(preview.querySelector('.half.custom-block')).not.toBeNull()
    expect(preview.querySelector('.half img')?.style.maxWidth).toBe('100%')
    const frame = preview.querySelector('iframe')
    expect(frame.getAttribute('src')).toBe('https://www.youtube.com/embed/Qs68Fugalro')
    expect(frame.hasAttribute('allowfullscreen')).toBe(true)
    expect(frame.getAttribute('sandbox')).toContain('allow-presentation')
  })

  it('shows renderer failures and the original Markdown as text', async () => {
    const attack = '<img src=x onerror="alert(1)">'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(MarkdownIt.prototype, 'render').mockImplementationOnce(() => { throw new Error(attack) })
    const preview = await mountPreview({ markdown: attack })

    expect(preview.querySelector('.error-message')?.textContent).toBe(attack)
    expect(preview.querySelector('.error-details pre')?.textContent).toBe(attack)
    expect(preview.querySelector('img')).toBeNull()
  })
})
