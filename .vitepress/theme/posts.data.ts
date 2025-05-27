import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'

export interface Post {
  title: string
  url: string
  date: string
  image?: string // 第一張圖片的網址
  excerpt?: string // 文章摘要
}

const DEFAULT_IMAGE = '/blog_no_image.svg' // 或者您希望的預設圖片路徑

// 新增：取得 git 建立日期（第一次 commit 時間）
function getGitCreatedDate(filePath: string): string | undefined {
  try {
    // 取得第一次 commit 的日期（%cI 是 ISO 格式）
    const dateStr = execSync(`git log --diff-filter=A --follow --format=%cI -1 ${filePath}`).toString().trim()
    return dateStr
  } catch (e) {
    return undefined
  }
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true, // 確保摘要提取功能開啟
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter, content, excerpt, filePath }) => {
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

        // 這裡是重點：沒 frontmatter.date 就自動抓 git 建立日期
        let date: string | undefined = frontmatter.date
        if (!date && filePath) {
          date = getGitCreatedDate(filePath)
        }
        if (!date) {
          date = '2000-01-01'
        }

        return {
          title: frontmatter.title,
          url,
          date: new Date(date).toISOString(),
          image: imageUrl || DEFAULT_IMAGE,
          excerpt: excerpt || ''
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
})
