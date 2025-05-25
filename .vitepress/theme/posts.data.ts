// docs/.vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  url: string
  date: string
  image?: string // 第一張圖片的網址
  excerpt?: string // 文章摘要
}

// 設定一張預設圖片的網址，請確保這張圖放在 docs/public/ 目錄下
const DEFAULT_IMAGE = '/default-blog-image.jpg' // 或者您希望的預設圖片路徑

export default createContentLoader('blog/**/*.md', {
  excerpt: true, // 確保摘要提取功能開啟，這會提供 content
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/')) // 過濾掉 blog/index.md 自己
      .map(({ url, frontmatter, content }) => { // 這裡確保有 content
        let imageUrl: string | undefined = undefined;

        // 優先從 Front Matter 中獲取 'image' 欄位
        if (frontmatter.image) {
          imageUrl = frontmatter.image;
        } else if (content) { // <-- 新增：確保 content 存在才去處理
          // 如果 Front Matter 沒有圖片，則嘗試從 Markdown 內容中找第一張圖

          // 1. 找 Markdown 圖片語法: ![alt text](圖片網址)
          const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
          let match = content.match(markdownImageRegex);
          if (match && match[1]) {
            imageUrl = match[1];
          } else {
            // 2. 如果沒有 Markdown 圖片，找 HTML 圖片語法: <img src="圖片網址">
            const htmlImageRegex = /<img.*?src=["'](.*?)["']/;
            match = content.match(htmlImageRegex);
            if (match && match[1]) {
              imageUrl = match[1];
            }
          }
        }

        // 處理圖片路徑：如果不是絕對路徑 (http/https 開頭) 也不是根路徑 (/) 開頭，則假設它在 public 資料夾下
        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`;
        }

        return {
          title: frontmatter.title,
          url,
          date: frontmatter.date ? new Date(frontmatter.date).toISOString() : '2000-01-01',
          image: imageUrl || DEFAULT_IMAGE, // 如果沒找到圖片，則使用預設圖片
          excerpt: excerpt || '' // 包含文章摘要
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
})
