import createDOMPurify, { type DOMPurify } from 'dompurify'

// Keep the editor's layout HTML, but never treat imported Markdown as executable code.
const allowedTags = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'button', 'caption', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'input', 'kbd', 'li', 'mark',
  'ol', 'p', 'pre', 's', 'samp', 'small', 'span', 'strong', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'wbr',
]
const allowedAttributes = [
  'alt', 'allow', 'allowfullscreen', 'align', 'checked', 'class', 'colspan', 'datetime',
  'disabled', 'frameborder', 'height', 'href', 'id', 'loading', 'open', 'referrerpolicy',
  'rel', 'role', 'rowspan', 'sandbox', 'scope', 'src', 'start', 'style', 'tabindex',
  'target', 'title', 'type', 'width', 'data-tabs-data', 'data-v-47429141',
]
const allowedStyleProperties = new Set([
  'background', 'background-color', 'border', 'border-top', 'border-right', 'border-bottom',
  'border-left', 'border-color', 'border-style', 'border-width', 'border-radius',
  'border-collapse', 'border-spacing', 'box-sizing', 'color', 'display', 'float', 'clear',
  'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'height', 'line-height',
  'list-style-type', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'max-height', 'max-width', 'min-height', 'min-width', 'object-fit', 'opacity', 'overflow',
  'overflow-x', 'overflow-y', 'padding', 'padding-top', 'padding-right', 'padding-bottom',
  'padding-left', 'table-layout', 'text-align', 'text-decoration', 'text-indent',
  'vertical-align', 'white-space', 'width', 'word-break', 'word-wrap', 'align-items',
  'align-content', 'align-self', 'flex', 'flex-basis', 'flex-direction', 'flex-grow',
  'flex-shrink', 'flex-wrap', 'gap', 'row-gap', 'column-gap', 'justify-content',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
])

let purifier: DOMPurify | undefined

const sanitizeStyle = (value: string): string => {
  const parsed = document.createElement('span').style
  const clean = document.createElement('span').style
  parsed.cssText = value
  for (const property of Array.from(parsed)) {
    const cssValue = parsed.getPropertyValue(property)
    if (allowedStyleProperties.has(property)
      && !/[\\\u0000-\u001f]|(?:url|expression|image-set|image|paint|element)\s*\(|@import/i.test(cssValue)) {
      clean.setProperty(property, cssValue, parsed.getPropertyPriority(property))
    }
  }
  return clean.cssText
}

const isYouTubeEmbed = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && ['www.youtube.com', 'www.youtube-nocookie.com', 'youtube.com', 'youtube-nocookie.com'].includes(url.hostname)
      && !url.username && !url.password && !url.port
      && /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
  } catch {
    return false
  }
}

export const escapeEditorHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

export const sanitizeEditorHtml = (html: string): string => {
  // Preview and the visual editor are client-only. Fail closed during SSR.
  if (typeof window === 'undefined' || typeof document === 'undefined') return ''
  if (!purifier) {
    // A private instance avoids changing the AI renderer's sanitizer policy.
    purifier = createDOMPurify(window)
    purifier.addHook('uponSanitizeAttribute', (_node, attribute) => {
      if (attribute.attrName === 'style') {
        attribute.attrValue = sanitizeStyle(attribute.attrValue)
        attribute.keepAttr = Boolean(attribute.attrValue)
      }
    })
    purifier.addHook('afterSanitizeAttributes', (node) => {
      if (!(node instanceof window.Element)) return
      if (node.tagName === 'IFRAME') {
        if (!isYouTubeEmbed(node.getAttribute('src') || '')) {
          node.remove()
          return
        }
        node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation')
        node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
      }
      if (node.tagName === 'INPUT' && node.getAttribute('type') !== 'checkbox') node.remove()
      if (node.tagName === 'BUTTON') node.setAttribute('type', 'button')
      if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer')
      }
    })
  }
  return purifier.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    FORBID_ATTR: ['srcdoc'],
  })
}
