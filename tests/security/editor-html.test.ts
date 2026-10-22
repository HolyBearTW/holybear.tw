// @vitest-environment jsdom
import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { escapeEditorHtml, sanitizeEditorHtml } from '../../.vitepress/edit/utils/sanitizeEditorHtml'

const md = new MarkdownIt({ html: true, breaks: true, linkify: true })
const render = (source: string) => {
  const container = document.createElement('div')
  container.innerHTML = sanitizeEditorHtml(md.render(source))
  return container
}

describe('editor HTML preview security', () => {
  it('preserves Markdown, tables, HTML layout, images and safe inline styles', () => {
    const preview = render(`**粗體**\n\n- 項目\n\n[一般連結](https://example.com/page)\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<div class="half custom-block" style="text-align:center;width:50%;margin:0 auto">
<img src="/image/example.jpg" alt="圖片" style="display:block;max-width:100%;height:auto">
<small style="color:#777">說明</small>
</div>`)

    expect(preview.querySelector('strong')?.textContent).toBe('粗體')
    expect(preview.querySelector('li')?.textContent).toBe('項目')
    expect(preview.querySelector('table td')?.textContent).toBe('1')
    expect(preview.querySelector('a')?.getAttribute('href')).toBe('https://example.com/page')
    const layout = preview.querySelector<HTMLElement>('.half.custom-block')!
    expect(layout.style.textAlign).toBe('center')
    expect(layout.style.width).toBe('50%')
    expect(preview.querySelector('img')?.getAttribute('src')).toBe('/image/example.jpg')
    expect(preview.querySelector<HTMLElement>('img')?.style.maxWidth).toBe('100%')
  })

  it('removes scripts, handlers, unsafe links, SVG and CSS that can load external content', () => {
    const preview = render(`<script>localStorage.getItem('geminiApiKey')</script>
<img src="/invalid.jpg" onerror="alert(document.domain)">
<a href="jav&#x61;script:alert(1)" onclick="alert(1)">bad</a>
<a href="data:text/html,<script>alert(1)</script>">data</a>
<svg onload="alert(1)"><a href="javascript:alert(1)">svg</a></svg>
<object data="https://evil.example"></object><form action="https://evil.example"><input type="password"></form>
<div style="background:url(https://evil.example/tracker);color:red;position:fixed;z-index:99999">layout</div>`)

    expect(preview.querySelector('script, svg, object, form, input')).toBeNull()
    for (const element of preview.querySelectorAll('*')) {
      expect([...element.attributes].some(attribute => /^on/i.test(attribute.name))).toBe(false)
    }
    for (const link of preview.querySelectorAll('a')) expect(link.hasAttribute('href')).toBe(false)
    const style = preview.querySelector<HTMLElement>('div')!.style
    expect(style.background).toBe('')
    expect(style.position).toBe('')
    expect(style.zIndex).toBe('')
    expect(style.color).toBe('red')
  })

  it('keeps tab buttons and encoded inactive content while sanitizing content on tab selection', () => {
    const tabsData = [{ tabId: 'tab-2', panelId: 'panel-2', content: '<img src="x" onerror="alert(1)">**第二頁**' }]
    const preview = render(`<div class="plugin-tabs box" data-tabs-data="${encodeURIComponent(JSON.stringify(tabsData))}">
<button id="tab-2" role="tab" aria-selected="false" aria-controls="panel-2" tabindex="-1">第二頁</button>
<div id="panel-1" class="plugin-tabs--content" role="tabpanel">第一頁</div>
</div>`)

    const tab = preview.querySelector('button')!
    expect(tab.getAttribute('role')).toBe('tab')
    expect(tab.getAttribute('aria-controls')).toBe('panel-2')
    expect(tab.getAttribute('type')).toBe('button')
    const stored = JSON.parse(decodeURIComponent(preview.querySelector('.plugin-tabs')!.getAttribute('data-tabs-data')!))
    expect(stored).toEqual(tabsData)
    const panel = preview.querySelector('.plugin-tabs--content')!
    panel.innerHTML = sanitizeEditorHtml(md.render(stored[0].content))
    expect(panel.querySelector('strong')?.textContent).toBe('第二頁')
    expect(panel.querySelector('img')?.hasAttribute('onerror')).toBe(false)
  })

  it.each([
    'https://www.youtube.com/embed/Qs68Fugalro',
    'https://www.youtube-nocookie.com/embed/Qs68Fugalro?start=5',
  ])('preserves the YouTube embed %s in a restricted frame', (src) => {
    const preview = render(`<iframe src="${src}" allowfullscreen srcdoc="<script>alert(1)</script>" onload="alert(1)"></iframe>`)
    const frame = preview.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe(src)
    expect(frame.hasAttribute('allowfullscreen')).toBe(true)
    expect(frame.hasAttribute('srcdoc')).toBe(false)
    expect(frame.hasAttribute('onload')).toBe(false)
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-presentation')
  })

  it.each([
    'https://evil.example/embed/Qs68Fugalro',
    'https://www.youtube.com.evil.example/embed/Qs68Fugalro',
    'https://www.youtube.com@evil.example/embed/Qs68Fugalro',
    'http://www.youtube.com/embed/Qs68Fugalro',
    'https://www.youtube.com/redirect?q=https://evil.example',
    '//www.youtube.com/embed/Qs68Fugalro',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ])('removes untrusted iframe source %s', (src) => {
    expect(render(`<iframe src="${src}"></iframe>`).querySelector('iframe')).toBeNull()
  })

  it('renders metadata, error messages and raw source as text after escaping', () => {
    const text = `標題 <img src=x onerror="alert(1)"> & 'quote'`
    const preview = document.createElement('div')
    preview.innerHTML = sanitizeEditorHtml(`<h1>${escapeEditorHtml(text)}</h1><p class="error-message">${escapeEditorHtml(text)}</p><pre>${escapeEditorHtml(text)}</pre>`)
    expect(preview.querySelector('img')).toBeNull()
    for (const element of preview.children) expect(element.textContent).toBe(text)
  })
})
