import { createContentLoader } from 'vitepress'
const DEFAULT_IMAGE = '/blog_no_image.svg'

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter, content, excerpt }) => {
        // 只用 listDate，不再 fallback git/fs
        let date = typeof frontmatter.listDate === 'string' ? frontmatter.listDate : ''

        // 圖片
        let imageUrl: string | undefined = frontmatter.image
        if (!imageUrl && content) {
          const markdownImageRegex = /!\[.*?\]\((.*?)\)/
          let match = content.match(markdownImageRegex)
          if (match && match[1]) imageUrl = match[1]
        }
        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`
        }
        if (!imageUrl) imageUrl = DEFAULT_IMAGE

        // 摘要
        let summary = excerpt?.trim()
        if (!summary) summary = (frontmatter.description || '').trim()
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim())
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>') && !line.startsWith('<!--') && !line.startsWith('---')) || ''
        }
        if (!summary) summary = ''

        return {
          title: frontmatter.title ?? '',
          url,
          date,
          image: imageUrl,
          excerpt: summary
        }
      })
      .sort((a, b) => {
        // 新到舊，date 必須是 ISO 格式
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return b.date.localeCompare(a.date)
      })
  }
})
