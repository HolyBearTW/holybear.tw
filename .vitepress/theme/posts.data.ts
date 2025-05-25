// docs/.vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  url: string
  date: string
  image?: string // 第一張圖片的網址
  excerpt?: string // 文章摘要
}

const DEFAULT_IMAGE = '/blog_no_image.svg' // 或者您希望的預設圖片路徑

export default createContentLoader('blog/**/*.md', {
  excerpt: true, // 確保摘要提取功能開啟
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      // 這裡新增 excerpt
      .map(({ url, frontmatter, content, excerpt }) => { // <-- 在這裡新增 excerpt
        let imageUrl: string | undefined = undefined;

        if (frontmatter.image) {
          imageUrl = frontmatter.image;
        } else if (content) {
          const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
          let match = content.match(markdownImageRegex);
          if (match && match[1]) {
            imageUrl = match[1];
          } else {
            const htmlImageRegex = /<img.*?src=["'](.*?)["']/;
            match = content.match(htmlImageRegex);
            if (match && match[1]) {
              imageUrl = match[1];
            }
          }
        }

        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`;
        }

        return {
          title: frontmatter.title,
          url,
          date: frontmatter.date ? new Date(frontmatter.date).toISOString() : '2000-01-01',
          image: imageUrl || DEFAULT_IMAGE,
          excerpt: excerpt || '' // 現在 excerpt 已經被定義了
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
})
