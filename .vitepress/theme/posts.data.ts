import { createContentLoader } from 'vitepress';
import authors from './authors.json'; // 確保這個路徑正確

const DEFAULT_IMAGE = '/blog_no_image.svg';

/**
 * 從 frontmatter 提取日期
 * @param {object} frontmatter
 * @returns {string}
 */
function extractDate(frontmatter) {
    return (
        frontmatter.listDate ||
        frontmatter.date ||
        frontmatter.created ||
        frontmatter.publishDate ||
        ''
    );
}

/**
 * 正規化 URL，移除常見的尾部字串和副檔名
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
    // 如果是索引頁面 URL，直接返回其目錄形式
    if (url === '/blog/' || url === '/en/blog/') {
        return url;
    }
    if (url.endsWith('/index.html')) {
        return url.replace(/\/index\.html$/, ''); // 例如 /blog/index.html -> /blog
    }
    if (url.endsWith('.html')) {
        return url.replace(/\.html$/, ''); // 例如 /blog/post.html -> /blog/post
    }
    if (url.endsWith('.md')) { // <-- 新增：處理 .md 結尾的 URL
        return url.replace(/\.md$/, ''); // 例如 /blog/post.md -> /blog/post
    }
    // 移除尾部斜線，除非是根目錄 "/"
    if (url.endsWith('/') && url !== '/') {
        return url.slice(0, -1);
    }
    return url;
}


export default createContentLoader('blog/**/*.md', {
    excerpt: true,
    transform(raw) {
        // console.log('--- Raw Data URLs from createContentLoader ---'); // 除錯用，可視情況啟用
        // raw.forEach(item => {
        //   console.log('Raw Item URL:', item.url, 'Frontmatter:', item.frontmatter);
        // });
        // console.log('-------------------------------------------');

        return raw
            .filter(({ url }) => {
                // 排除部落格列表頁本身，確保不會將其視為單篇文章
                const isBlogIndexPage =
                    url === '/blog/' ||
                    url === '/blog/index.html' ||
                    url === '/en/blog/' ||
                    url === '/en/blog/index.html';

                // 新增：排除任何以 .md 結尾的非預期 URL，特別是 /blog.md
                const isUnexpectedMdUrl = url.endsWith('.md') && !url.startsWith('/blog/') && !url.startsWith('/en/blog/');

                // console.log(`Filtering: ${url}, isBlogIndexPage: ${isBlogIndexPage}, isUnexpectedMdUrl: ${isUnexpectedMdUrl}`); // 除錯用

                return !isBlogIndexPage && !isUnexpectedMdUrl;
            })

            .map(({ url, frontmatter, src, excerpt }) => {
                frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
                const title = frontmatter.title || '無標題文章';
                const date = extractDate(frontmatter);
                let imageUrl = frontmatter.image;

                // 嘗試從內容中提取第一張圖片
                if (!imageUrl && src) {
                    const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
                    let match = src.match(markdownImageRegex);
                    if (match && match[1]) imageUrl = match[1];
                }

                // 處理圖片路徑相對路徑
                if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                    imageUrl = `/${imageUrl}`;
                }
                if (!imageUrl) imageUrl = DEFAULT_IMAGE;

                // 讓 description 永遠優先，否則使用 excerpt 或內容第一行
                let summary = (frontmatter.description || '').trim();
                if (!summary && excerpt) summary = excerpt.trim();
                if (!summary && src) {
                    const lines = src.split('\n').map(line => line.trim());
                    summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
                }

                const normalizedUrl = normalizeUrl(url);
                // 完全比照內頁，author 只取 frontmatter.author，沒有就空字串
                const author = frontmatter.author || '';

                return {
                    url: normalizedUrl,
                    frontmatter,
                    title,
                    date,
                    tags: Array.isArray(frontmatter.tags)
                        ? frontmatter.tags
                        : (Array.isArray(frontmatter.tag) ? frontmatter.tag : []),
                    category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
                    image: imageUrl,
                    summary,
                    excerpt: summary,
                    author,
                };
            })
            // 最終過濾：確保所有回傳的 post 都有一個有效且不是空字串的 url
            .filter(post => !!post && typeof post.url === 'string' && post.url.trim() !== '')
            .sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
    },
});