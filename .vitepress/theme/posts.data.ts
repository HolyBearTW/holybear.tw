// docs/.vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress'

// 定義文章資料的型別，多了一個 image 屬性
export interface Post {
  title: string
  url: string
  date: string
  image?: string // 第一張圖片的網址
  excerpt?: string // 文章摘要
}

// 設定一張預設圖片的網址，請確保這張圖放在 docs/public/ 目錄下
const DEFAULT_IMAGE = '/default-blog-image.jpg'

export default createContentLoader('blog/**/*.md', {
  // 設置 excerpt: true 才能在 transform 中獲取到文章內容 (content)
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/')) // 過濾掉 blog/index.md 自己
      .map(({ url, frontmatter, content }) => { // 這裡多了 content
        let imageUrl: string | undefined = undefined;

        // 嘗試從 Front Matter 中獲取 'image' 欄位（如果有的話，優先使用）
        if (frontmatter.image) {
          imageUrl = frontmatter.image;
        } else {
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
          imageUrl = `/${imageUrl}`; // 假設圖片放在 public/ 根目錄
        }

        return {
          title: frontmatter.title,
          url,
          date: frontmatter.date ? new Date(frontmatter.date).toISOString() : '2000-01-01',
          image: imageUrl || DEFAULT_IMAGE, // 如果沒找到圖片，則使用預設圖片
          excerpt: excerpt || '' // 包含文章摘要，如果需要顯示
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
})
