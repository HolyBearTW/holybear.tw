import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'
import fs from 'fs'

const DEFAULT_IMAGE = '/blog_no_image.svg'

function getGitCreatedDate(relativePath: string): string {
  try {
    const fullPath = `docs/${relativePath}`
    return execSync(`git log --diff-filter=A --follow --format=%aI -1 "${fullPath}"`).toString().trim()
  } catch {
    return ''
  }
}

function getFsCreatedDate(relativePath: string): string {
  try {
    const fullPath = `docs/${relativePath}`
    const stat = fs.statSync(fullPath)
    return stat.birthtime.toISOString()
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
        // 日期：優先 frontmatter.date，否則 git 建檔日期，最後用 fs 建檔日期
        let date: string = frontmatter.date || ''
        if (!date && relativePath) {
          date = getGitCreatedDate(relativePath)
        }
        if (!date && relativePath) {
          date = getFsCreatedDate(relativePath)
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
        let summary = excerpt?.trim()
        if (!summary) summary = (frontmatter.description || '').trim()
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim())
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>') && !line.startsWith('<!--') && !line.startsWith('---')) || ''
        }
        if (!summary) summary = ''

        return {
          title: frontmatter.title,
          url,
          date,
          image: imageUrl,
          excerpt: summary
        }
      })
      // 不再 filter 掉沒 date 的文章
      .sort((a, b) => {
        // 沒有 date 的文章放最後
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)
      })
  }
})
