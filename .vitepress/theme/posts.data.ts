import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

const DEFAULT_IMAGE = '/blog_no_image.svg'

/**
 * 從 frontmatter 中提取「主要日期欄位」（到日）。
 */
function extractDate(frontmatter: Record<string, any>): string {
  return (
    frontmatter.listDate ||
    frontmatter.date ||
    frontmatter.created ||
    frontmatter.publishDate ||
    ''
  )
}

/**
 * 輸入檔案絕對路徑，回傳 [作者名稱, ISO 時間字串]。
 * 會執行 `git log --diff-filter=A --follow --format="%aN,%aI" -- "<file>" | tail -1`
 * 取得最早一筆 commit 的作者 & ISO 時間。
 */
function getFirstCommitInfo(filePath: string): [string, string] {
  try {
    // --format="%aN,%aI" 會回傳「作者名稱, ISO 8601 時間」字串
    // 例如 "聖小熊,2025-02-14T16:30:45Z"（UTC 時區）或 "聖小熊,2025-02-15T08:30:45+08:00"
    const cmd = `git log --diff-filter=A --follow --format="%aN,%aI" -- "${filePath}"`
    const result = execSync(`${cmd} | tail -1`).toString().trim()
    const [name, isoDate] = result.split(',', 2)
    return [name || '', isoDate || '']
  } catch {
    return ['', '']
  }
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => {
        // 排除 /blog/index.html、/en/blog/index.html 這些目錄頁
        return ![
          '/blog/',
          '/blog/index.html',
          '/en/blog/',
          '/en/blog/index.html'
        ].includes(url)
      })
      .map(({ url, frontmatter, content, excerpt, file }) => {
        // 確保 frontmatter 為物件
        frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {}

        // 文章標題
        const title = frontmatter.title || '無標題文章'
        // 只到「日」級別的日期（YYYY-MM-DD）
        const dateOnly = extractDate(frontmatter)

        // 處理封面圖片：若 frontmatter.image 沒寫，再從 content 裡抓第一張 Markdown 圖片
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

        // 處理 summary／excerpt：優先 frontmatter.description，再 fallback excerpt，再從 content 自動抓
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

        // 取第一筆 commit 的作者 & 時間（ISO）
        let author = ''
        let isoDateTime = ''
        if (frontmatter.author) {
          // 若 frontmatter 裡已經有人手動寫 author，就優先用它
          author = frontmatter.author
        } else if (typeof file === 'string' && file.endsWith('.md')) {
          // 否則透過 git log 拿最早 commit 的作者 & ISO 時間
          const [name, ts] = getFirstCommitInfo(file)
          author = name
          isoDateTime = ts
        }

        return {
          url,               // 文章連結（one-to-one 對應到 Markdown 檔）
          frontmatter,       // 原始 frontmatter 物件
          title,             // 標題
          date: dateOnly,    // 只到「日」的日期 (YYYY-MM-DD)
          time: isoDateTime, // 最早 commit 的 ISO 時間字串 (e.g. "2025-02-14T16:30:45Z")
          tags: Array.isArray(frontmatter.tags)
            ? frontmatter.tags
            : Array.isArray(frontmatter.tag)
            ? frontmatter.tag
            : [],
          category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
          image: imageUrl,
          summary,
          excerpt: summary,
          author,            // 最早 commit 的作者名稱
        }
      })
      .filter(post => !!post && typeof post.url === 'string')
      .sort((a, b) => {
        // 這裡仍以「到日的 date」做排序（最新到舊），
        // 如果要以「精確到時分秒的 time」排序，可改成：
        // return new Date(b.time).getTime() - new Date(a.time).getTime()
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
  }
})
