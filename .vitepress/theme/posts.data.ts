import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

export interface Post {
  title: string
  url: string
  date: string
  image?: string
  excerpt?: string
}

const DEFAULT_IMAGE = '/blog_no_image.svg'

function getGitCreatedDate(relativePath: string): string | undefined {
  try {
    const fullPath = `docs/${relativePath}`
    const dateStr = execSync(`git log --diff-filter=A --follow --format=%cI -1 "${fullPath}"`).toString().trim()
    return dateStr
  } catch {
    return undefined
  }
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter, content, excerpt, relativePath }) => {
        let imageUrl: string | undefined = undefined

        if (frontmatter.image) {
          imageUrl = frontmatter.image
        } else if (content) {
          const markdownImageRegex = /!\[.*?\]\((.*?)\)/
          let match = content.match(markdownImageRegex)
          if (match && match[1]) {
            imageUrl = match[1]
          } else {
            const htmlImageRegex = /<img.*?src=["'](.*?)["']/
            match = content.match(htmlImageRegex)
            if (match && match[1]) {
              imageUrl = match[1]
            }
          }
        }

        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`
        }

        // 處理 date 欄位，確保一定是字串
        let date: string = ''
        if (typeof frontmatter.date === 'string') {
          date = frontmatter.date
        } else if (frontmatter.date instanceof Date) {
          date = frontmatter.date.toISOString()
        } else if (!frontmatter.date && relativePath) {
          const gitDate = getGitCreatedDate(relativePath)
          if (gitDate) {
            date = gitDate
          }
        }
        if (!date) {
          date = '2000-01-01 00:00:00'
        }

        return {
          title: frontmatter.title,
          url,
          date: String(date), // 保證是字串
          image: imageUrl || DEFAULT_IMAGE,
          excerpt: excerpt || ''
        }
      })
      .sort((a, b) => {
        // 防呆：確保 date 一定是字串
        const aStr = typeof a.date === 'string' ? a.date : ''
        const bStr = typeof b.date === 'string' ? b.date : ''
        const aTime = new Date(aStr.replace(/-/g, '/')).getTime() || 0
        const bTime = new Date(bStr.replace(/-/g, '/')).getTime() || 0
        return bTime - aTime
      })
  }
})
