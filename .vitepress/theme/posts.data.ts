// 檔案路徑: .vitepress/theme/posts.data.ts
import { createContentLoader } from 'vitepress';
const DEFAULT_IMAGE = '/blog_no_image.svg'; // 預設圖片路徑

export default createContentLoader('blog/**/*.md', {
  excerpt: true, // 啟用摘要提取
  transform(raw) {
    // 調試日誌：打印初始載入的文章數量
    console.log(`[posts.data.ts] Initial raw posts count: ${raw.length}`);
    if (raw.length > 0) {
      console.log('[posts.data.ts] URLs of raw posts:', raw.map(p => p.url));
    }

    // 過濾掉作為部落格首頁的 index.md 檔案
    const filteredPosts = raw.filter(({ url }) => {
      // 判斷是否為部落格的根目錄頁面 (如 /blog/ 或 /blog/index.html)
      // 同時也考慮英文路徑 /en/blog/
      const isBlogIndexPage = url === '/blog/' || url === '/blog/index.html' || url === '/en/blog/' || url === '/en/blog/index.html';
      return !isBlogIndexPage; // 如果是部落格首頁，就過濾掉
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
    // 新增防呆：frontmatter 不存在時給預設空物件
    if (!frontmatter) {
      console.warn(`[posts.data.ts] WARNING: Missing frontmatter for post at URL: ${url}`);
      frontmatter = {};
    }

    // 其餘邏輯不變
    let date = typeof frontmatter.listDate === 'string' ? frontmatter.listDate : '';
    let imageUrl: string | undefined = frontmatter.image;
    if (!imageUrl && content) {
      const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
      let match = content.match(markdownImageRegex);
      if (match && match[1]) imageUrl = match[1];
    }
    if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
      imageUrl = `/${imageUrl}`;
    }
    if (!imageUrl) imageUrl = DEFAULT_IMAGE;

    let summary = excerpt?.trim();
    if (!summary) summary = (frontmatter.description || '').trim();
    if (!summary && content) {
      const lines = content.split('\n').map(line => line.trim());
      summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
    }

    const title = frontmatter.title || url.replace(/\.html$/, '').split('/').pop() || '無標題文章';

    return {
      url,
      frontmatter,
      title,
      date,
      tags: frontmatter.tags || [],
      image: imageUrl,
      summary,
    };
  })
  .sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
