import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter, content, excerpt, relativePath }) => {
        // 取得日期：有 frontmatter.date 就用，否則用 git 建檔日期
        let date: string | undefined = frontmatter.date
        if (!date && relativePath) {
          try {
            // 用 git log 取得檔案的首次 commit 日期
            const fullPath = `docs/${relativePath}`
            date = execSync(`git log --diff-filter=A --follow --format=%cI -1 "${fullPath}"`).toString().trim()
          } catch {
            date = ''
          }
        }
        // 其他欄位照舊
        let imageUrl: string | undefined = undefined
        // ...你的 image/excerpt 處理照舊

        return {
          title: frontmatter.title,
          url,
          date: date || '', // 沒有就空字串
          image: imageUrl,
          excerpt: excerpt || ''
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
