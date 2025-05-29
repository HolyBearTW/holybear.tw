// --- 程式碼開始 ---
// 檔案路徑: .vitepress/theme/posts.data.ts
import { createContentLoader } from 'vitepress';
const DEFAULT_IMAGE = '/blog_no_image.svg';

export default createContentLoader('**/blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    // 調試日誌：打印初始載入的文章數量
    console.log(`[posts.data.ts] Initial raw posts count: ${raw.length}`);
    if (raw.length > 0) {
      console.log('[posts.data.ts] URLs of raw posts:', raw.map(p => p.url));
    }

const filteredPosts = raw.filter(({ url }) => {
  // 只排除掉作為部落格根目錄的 index.md 頁面
  // 例如，你的部落格文章應該是 /blog/YYYY-MM-DD-title.md 或 /blog/some-post.md
  // 而不是 /blog/ 或 /blog/index.html
  const isBlogIndexPage = url === '/blog/' || url === '/blog/index.html';
  return !isBlogIndexPage;
});

    // 調試日誌：打印過濾後的文章數量
    console.log(`[posts.data.ts] Filtered posts count: ${filteredPosts.length}`);

    // 警告日誌，幫助判斷問題
    if (filteredPosts.length === 0 && raw.length > 0) {
        console.warn('[posts.data.ts] WARNING: All posts were filtered out by the url.endsWith(\'/blog/\') condition. Please check your post URLs and filter logic.');
        raw.forEach(p => console.log(`[posts.data.ts] Original post URL that was filtered out: ${p.url}`));
    } else if (raw.length === 0) {
        console.warn('[posts.data.ts] WARNING: No posts found by createContentLoader("blog/**/*.md"). Please check your glob pattern and that markdown files exist in the "blog" directory.');
    }

    return filteredPosts
      .map(({ url, frontmatter, content, excerpt }) => {
        // 只用 listDate
        let date = typeof frontmatter.listDate === 'string' ? frontmatter.listDate : '';

        // 圖片
        let imageUrl: string | undefined = frontmatter.image; // TypeScript 類型提示
        if (!imageUrl && content) {
          const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
          let match = content.match(markdownImageRegex);
          if (match && match[1]) imageUrl = match[1];
        }
        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`;
        }
        if (!imageUrl) imageUrl = DEFAULT_IMAGE;

        // 摘要
        let summary = excerpt?.trim(); // 使用可選鏈 ?. 安全地調用 trim
        if (!summary) summary = (frontmatter.description || '').trim();
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim()); // '\n' 是正確的換行符
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || ''; // 找到第一個不以 #, !, > 開頭的非空行
        }
        if (!summary) summary = frontmatter.title || ''; // 如果還是沒有摘要，就用標題

        return {
          url,
          frontmatter,
          title: frontmatter.title,
          date,
          tags: frontmatter.tags || [],
          image: imageUrl,
          summary,
        };
      })
      .sort((a, b) => {
        // 按照日期降序排列
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  },
});
