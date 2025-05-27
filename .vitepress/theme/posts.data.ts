import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

const DEFAULT_IMAGE = '/blog_no_image.svg'

function getGitCreatedDate(relativePath: string): string {
  try {
    const fullPath = `docs/${relativePath}`
    return execSync(`git log --diff-filter=A --follow --format=%cI -1 "${fullPath}"`).toString().trim()
  } catch {
    return ''
  }
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter, content, excerpt, relativePath }) => {
        // 日期
        let date: string = frontmatter.date || ''
        if (!date && relativePath) {
          date = getGitCreatedDate(relativePath)
        }

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
        let summary = excerpt || ''
        // 若沒有 excerpt 也沒有內容就給一個預設文字
        if (!summary) summary = '（本文無摘要）'

        return {
          title: frontmatter.title,
          url,
          date,
          image: imageUrl,
          excerpt: summary
        }
      })
      .sort((a, b) => {
        const aStr = typeof a.date === 'string' ? a.date : ''
        const bStr = typeof b.date === 'string' ? b.date : ''
        const aTime = new Date(aStr.replace(/-/g, '/')).getTime() || 0
        const bTime = new Date(bStr.replace(/-/g, '/')).getTime() || 0
        return bTime - aTime
      })
  }
})
