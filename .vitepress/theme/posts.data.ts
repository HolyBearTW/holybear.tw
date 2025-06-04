import { createContentLoader } from 'vitepress'

const DEFAULT_IMAGE = '/blog_no_image.svg'

function extractDate(frontmatter: Record<string, any>): string {
  return (
    frontmatter.listDate ||
    frontmatter.date ||
    frontmatter.created ||
    frontmatter.publishDate ||
    ''
  )
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) =>
        !['/blog/', '/blog/index.html', '/en/blog/', '/en/blog/index.html'].includes(url)
      )
      .map(({ url, frontmatter, content, excerpt }) => {
        frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {}

        const title = frontmatter.title || '無標題文章'
        const dateRaw = extractDate(frontmatter)
        const dateStr = typeof dateRaw === 'string' ? dateRaw : (dateRaw ? String(dateRaw) : '')
        const date = dateStr ? dateStr.substring(0, 10) : ''
        const time = frontmatter.date
          ? String(frontmatter.date)
          : (dateStr.length > 0 ? dateStr : '')

        // 封面圖
        let imageUrl = frontmatter.image
        if (!imageUrl && content) {
          const match = content.match(/!\[.*?\]\((.*?)\)/)
          if (match && match[1]) {
            imageUrl = match[1]
          }
        }
        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`
        }
        if (!imageUrl) imageUrl = DEFAULT_IMAGE

        // 摘要
        let summary = (frontmatter.description || '').trim()
        if (!summary && excerpt) summary = excerpt.trim()
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim())
          summary =
            lines.find(
              line =>
                line &&
                !line.startsWith('#') &&
                !line.startsWith('![') &&
                !line.startsWith('>')
            ) || ''
        }

        return {
          url,
          frontmatter,
          title,
          date,
          time,
          tags: Array.isArray(frontmatter.tags)
            ? frontmatter.tags
            : Array.isArray(frontmatter.tag)
            ? frontmatter.tag
            : [],
          category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
          image: imageUrl,
          summary,
          excerpt: summary,
          author: frontmatter.author || '未知作者',
        }
      })
      .filter(post => !!post && typeof post.url === 'string')
      .sort((a, b) => {
        return new Date(b.time || b.date).getTime() - new Date(a.time || a.date).getTime()
      })
  }
})
