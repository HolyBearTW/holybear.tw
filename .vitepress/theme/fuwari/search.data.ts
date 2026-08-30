import { createContentLoader } from 'vitepress'
import { readFileSync } from 'fs'
import path from 'path'

function plainText(src = '') {
  return src
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`|\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toStrings(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return value == null || value === '' ? [] : [String(value)]
}

export default createContentLoader(
  ['*.md', 'blog/**/*.md', 'docs/**/*.md', 'en/**/*.md', 'zh_TW/**/*.md'],
  {
    transform(raw) {
      return raw.map(({ url, frontmatter, src }) => {
        const cleanUrl = url.replace(/\.html$/, '')
        const relativeFile = cleanUrl === '/'
          ? 'index.md'
          : `${cleanUrl.replace(/^\//, '').replace(/\/$/, '')}${cleanUrl.endsWith('/') ? '/index' : ''}.md`
        let markdownSource = typeof src === 'string' ? src : ''
        if (!markdownSource) {
          try {
            markdownSource = readFileSync(path.join(process.cwd(), relativeFile), 'utf8')
          } catch {
            markdownSource = ''
          }
        }
        const categories = toStrings(frontmatter?.category)
        const tags = toStrings(frontmatter?.tags ?? frontmatter?.tag)
        return {
          url: cleanUrl,
          title: String(frontmatter?.title || '無標題頁面'),
          description: String(frontmatter?.description || ''),
          text: plainText(markdownSource),
          categories,
          tags
        }
      })
    }
  }
)
