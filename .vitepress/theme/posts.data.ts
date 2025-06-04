import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

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

function getFirstCommitInfo(filePath: string): [string, string] {
  try {
    const cmd = `git log --diff-filter=A --follow --format="%aN,%aI" -- "${filePath}"`
    const result = execSync(`${cmd} | tail -1`).toString().trim()
    const [name, isoDate] = result.split(',', 2)
    return [name || '', isoDate || '']
  } catch {
    // 出錯 fallback 給預設（避免 undefined）
    return ['未知作者', '1970-01-01T00:00:00Z']
  }
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => {
        return ![
          '/blog/',
          '/blog/index.html',
          '/en/blog/',
          '/en/blog/index.html'
        ].includes(url)
      })
      .map(({ url, frontmatter, content, excerpt, file }) => {
        frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {}
        const title = frontmatter.title || '無標題文章'
        const dateOnly = extractDate(frontmatter)

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

        // 以 git log 為主（即使有 frontmatter 也不採用）
        let author = ''
        let isoDateTime = ''
        if (typeof file === 'string' && file.endsWith('.md')) {
          const [name, ts] = getFirstCommitInfo(file)
          author = name
          isoDateTime = ts
        }

        return {
          url,
          frontmatter,
          title,
          date: isoDateTime ? isoDateTime.substring(0, 10) : dateOnly, // 只到日
          time: isoDateTime, // ISO 全字串
          tags: Array.isArray(frontmatter.tags)
            ? frontmatter.tags
            : Array.isArray(frontmatter.tag)
            ? frontmatter.tag
            : [],
          category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
          image: imageUrl,
          summary,
          excerpt: summary,
          author: author || '未知作者',
        }
      })
      .filter(post => !!post && typeof post.url === 'string')
      .sort((a, b) => {
        return new Date(b.time || b.date).getTime() - new Date(a.time || a.date).getTime()
      })
  }
})
