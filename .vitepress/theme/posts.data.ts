import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

export interface Post {
  title: string
  url: string
  date: string
  image?: string // 第一張圖片的網址
  excerpt?: string // 文章摘要
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

        let date: string | undefined = frontmatter.date
        if (!date && relativePath) {
          date = getGitCreatedDate(relativePath)
        }
        if (!date) {
          date = '2000-01-01'
        }

        return {
          title: frontmatter.title,
          url,
          date, // 保留原始 date 字串
          image: imageUrl || DEFAULT_IMAGE,
          excerpt: excerpt || ''
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
})
