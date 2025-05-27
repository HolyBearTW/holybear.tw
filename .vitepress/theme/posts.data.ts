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

// 取得文章第一個非空行段落（純文字，不含 markdown 標記）
function getFirstParagraph(content: string): string {
  // 切行、去頭尾空白，找到第一個非空行
  const lines = content.split('\n').map(line => line.trim())
  // 過濾掉 frontmatter、HTML註解、image/link 標記等
  for (const line of lines) {
    if (
      line &&
      !line.startsWith('<!--') &&
      !line.startsWith('---') &&
      !line.startsWith('#') &&
      !line.startsWith('![') &&
      !line.startsWith('>') &&
      !line.startsWith('<') &&
      !line.startsWith('```')
    ) {
      // 去掉 markdown link 語法
      return line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~`]/g, '')
    }
  }
  return ''
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
        let summary = excerpt?.trim()
        if (!summary) summary = (frontmatter.description || '').trim()
        if (!summary && content) summary = getFirstParagraph(content)
        if (!summary) summary = ''  // 如果真的什麼都沒有

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
