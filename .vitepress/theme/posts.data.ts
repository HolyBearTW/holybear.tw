// docs/.vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress' // 這是 VitePress 提供的工具

// 這裡定義了每篇文章會有什麼資料（例如：title, url, date）
export interface Post {
  title: string
  url: string
  date: string
}

// 這個程式碼會自動去掃描 'blog/**/*.md' 找到所有 Markdown 檔案
// 然後把每個檔案的標題、網址、日期整理出來
// 並且依照日期從新到舊排序
export default createContentLoader('blog/**/*.md', { // 告訴它去掃描 'blog/' 下所有的 .md 檔案
  transform(raw) {
    return raw
      .map(({ url, frontmatter }) => ({
        title: frontmatter.title, // 抓文章標題
        url, // 抓文章網址
        date: frontmatter.date ? new Date(frontmatter.date).toISOString() : '2000-01-01', // 抓文章日期
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // 日期新的排前面
  }
})
