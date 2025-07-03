// .vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress';
import authors from './authors.json'; // 確保這個路徑正確
// import fs from 'node:fs'; // 暫時不引入 fs，因為您不想動其他地方，但如果日期需要自動讀取檔案系統，則必須引入

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
        // frontmatter.publishDate || // publishDate 可能是您的自訂屬性
        ''
    );
}

/**
 * 正規化 URL，移除常見的尾部字串和副檔名
 * 確保返回的 URL 始終是有效且非空的
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
    if (!url) return ''; // <-- 重要：如果傳入的 URL 本身就是空的，直接返回空字串

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
    if (url.endsWith('.md')) { // 處理 .md 結尾的 URL
        return url.replace(/\.md$/, ''); // 例如 /blog/post.md -> /blog/post
    }
    // 移除尾部斜線，除非是根目錄 "/"
    if (url.endsWith('/') && url !== '/') {
        return url.slice(0, -1);
    }

    // 最終檢查：如果經過處理後，URL 仍然不像是有效的路徑，可以考慮返回空字串或特定錯誤 URL
    // 這裡我們信任 VitePress 提供的原始 URL 基礎是相對有效的，主要處理後綴
    return url;
}


export default createContentLoader('blog/**/*.md', {
    excerpt: true,
    transform(raw) {
        return raw
            .filter(({ url }) => {
                // 排除部落格列表頁本身
                const isBlogIndexPage =
                    url === '/blog/' ||
                    url === '/blog/index.html' ||
                    url === '/en/blog/' ||
                    url === '/en/blog/index.html';

                // 排除任何以 .md 結尾的非預期 URL
                const isUnexpectedMdUrl = url.endsWith('.md') && !url.startsWith('/blog/') && !url.startsWith('/en/blog/');

                return !isBlogIndexPage && !isUnexpectedMdUrl;
            })
            .map(({ url, frontmatter, content, excerpt, filePath }) => { // 確保 filePath 被解構
                frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
                const title = frontmatter.title || '無標題文章';

                // 處理日期：優先從 frontmatter 讀取，否則給予一個確定性的預設值
                let date = extractDate(frontmatter);
                // 如果 frontmatter 沒給日期，使用一個統一的預設日期，以防 Invalid Date 錯誤
                if (!date) {
                    // 如果您不想手動或自動從文件系統讀取，這是一個確定性的 fallback
                    date = '2000-01-01'; // 使用一個絕對不會錯的日期字串
                }

                // 處理作者：優先從 frontmatter 讀取，否則給予一個確定性的預設值
                let author = frontmatter.author;
                if (!author) {
                    author = '聖小熊'; // 您的預設作者
                }

                let imageUrl = frontmatter.image;
                if (!imageUrl && content) {
                    const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
                    let match = content.match(markdownImageRegex);
                    if (match && match[1]) imageUrl = match[1];
                }

                if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                    imageUrl = `/${imageUrl}`;
                }
                if (!imageUrl) imageUrl = DEFAULT_IMAGE;

                let summary = (frontmatter.description || '').trim();
                if (!summary && excerpt) summary = excerpt.trim();
                if (!summary && content) {
                    const lines = content.split('\n').map(line => line.trim());
                    summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
                }

                const normalizedUrl = normalizeUrl(url); // 經過正規化的 URL

                // 如果 normalizedUrl 在此階段變成了空字串，給予一個安全值，防止後續錯誤
                // 這個值必須是一個能被 new URL() 解析的有效字串，即使它不是真實的頁面
                const finalUrl = normalizedUrl || '/invalid-post-url'; // <-- 關鍵修正：提供安全 fallback URL

                const authorFromLookup = authors[normalizedUrl] || author;


                return {
                    url: finalUrl, // <-- 確保這裡使用的 URL 永遠有效
                    frontmatter,
                    title,
                    date, // 使用處理後的日期
                    tags: Array.isArray(frontmatter.tags)
                        ? frontmatter.tags
                        : (Array.isArray(frontmatter.tag) ? frontmatter.tag : []),
                    category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
                    image: imageUrl,
                    summary,
                    excerpt: summary,
                    author: authorFromLookup, // 使用處理後的作者
                };
            })
            // 最終過濾：確保所有回傳的 post 都有一個有效且不是空字串的 url
            // 這裡由於我們在 map 階段已經提供了 fallback，所以這個過濾器應該會通過所有項目
            .filter(post => !!post && typeof post.url === 'string' && post.url.trim() !== '')
            .sort((a, b) => {
                // 確保日期是可比較的格式
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
    },
});