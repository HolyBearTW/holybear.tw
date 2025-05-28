import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'
import fs from 'fs'

const DEFAULT_IMAGE = '/blog_no_image.svg'

function getGitCreatedDate(relativePath: string): string {
  try {
    // 不要加 docs/ 路徑，relativePath 就是 blog/xxx.md
    return execSync(`git log --diff-filter=A --follow --format=%aI -1 "${relativePath}"`).toString().trim()
  } catch {
    return ''
  }
}

function getFsCreatedDate(relativePath: string): string {
  try {
    const stat = fs.statSync(relativePath)
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
        // 日期
        let date = typeof frontmatter.date === 'string' ? frontmatter.date : ''
        let gitDate = '', fsDate = ''
        if (!date && relativePath) {
          gitDate = getGitCreatedDate(relativePath)
          fsDate = getFsCreatedDate(relativePath)
          date = gitDate || fsDate || ''
        }
        // DEBUG 檢查用
        // console.log({ url, frontmatterDate: frontmatter.date, gitDate, fsDate, finalDate: date })

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
        const aDate = typeof a.date === 'string' ? a.date : ''
        const bDate = typeof b.date === 'string' ? b.date : ''
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return bDate.localeCompare(aDate)
      })
  }
})
