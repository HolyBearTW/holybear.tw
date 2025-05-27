import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

const DEFAULT_IMAGE = '/blog_no_image.svg'

function getGitCreatedDate(relativePath: string): string {
  try {
    const fullPath = `docs/${relativePath}`
    // 用 ISO 格式，跟 VitePress 內頁一致
    // 取首次 commit 的作者日期
    return execSync(`git log --diff-filter=A --follow --format=%aI -1 "${fullPath}"`).toString().trim()
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
        // 日期：優先 frontmatter.date，否則自動抓 git 建檔日期
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
        let summary = excerpt?.trim()
        if (!summary) summary = (frontmatter.description || '').trim()
        if (!summary && content) {
          // 抓第一個純文字段落
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
      .filter(post => !!post.date) // 沒有 date 的文章直接排除（極少見例外）
      .sort((a, b) => {
        // 直接用 ISO 字串排序，保證正確
        return (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)
      })
  }
})
