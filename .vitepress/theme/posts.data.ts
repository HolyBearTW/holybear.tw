// .vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress';
import authors from './authors.json'; // 確保這個路徑正確
import fs from 'node:fs'; // 引入 fs 模組來讀取檔案資訊

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
        '' // 移除 publishDate，確保一致性
    );
}

/**
 * 正規化 URL，移除常見的尾部字串和副檔名
 * 確保返回的 URL 始終是有效且非空的
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
    if (!url) return ''; // 如果傳入的 URL 本身就是空的，直接返回空字串

    // 如果是索引頁面 URL，直接返回其目錄形式
    if (url === '/blog/' || url === '/en/blog/') {
        return url;
    }
    if (url.endsWith('/index.html')) {
        return url.replace(/\/index\.html$/, '');
    }
    if (url.endsWith('.html')) {
        return url.replace(/\.html$/, '');
    }
    if (url.endsWith('.md')) { // 處理 .md 結尾的 URL
        return url.replace(/\.md$/, '');
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
        return raw
            .filter(({ url }) => {
                const isBlogIndexPage =
                    url === '/blog/' ||
                    url === '/blog/index.html' ||
                    url === '/en/blog/' ||
                    url === '/en/blog/index.html';
                const isUnexpectedMdUrl = url.endsWith('.md') && !url.startsWith('/blog/') && !url.startsWith('/en/blog/');

                return !isBlogIndexPage && !isUnexpectedMdUrl;
            })
            .map(({ url, frontmatter, content, excerpt, filePath }) => {
                frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
                const title = frontmatter.title || '無標題文章';

                let articleDate = extractDate(frontmatter);

                if (!articleDate && filePath) {
                    try {
                        const stats = fs.statSync(filePath);
                        articleDate = stats.birthtime.toISOString(); // 或 stats.mtime.toISOString()
                    } catch (e) {
                        console.warn(`[posts.data.ts] Failed to get file stats for ${filePath}:`, e.message);
                        articleDate = '未知日期'; // 將日期設定為 '未知日期'
                    }
                }

                let author = frontmatter.author;
                if (!author) {
                    author = '未知作者'; // 預設作者
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

                const normalizedUrl = normalizeUrl(url);
                const finalUrl = normalizedUrl || '/invalid-post-url'; // 提供安全 fallback URL

                const authorFromLookup = authors[normalizedUrl] || author;


                return {
                    url: finalUrl,
                    frontmatter,
                    title,
                    date: articleDate, // 使用處理後的日期
                    tags: Array.isArray(frontmatter.tags)
                        ? frontmatter.tags
                        : (Array.isArray(frontmatter.tag) ? frontmatter.tag : []),
                    category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
                    image: imageUrl,
                    summary,
                    excerpt: summary,
                    author: authorFromLookup,
                };
            })
            .filter(post => !!post && typeof post.url === 'string' && post.url.trim() !== '')
            .sort((a, b) => {
                // ✨ 關鍵修正：在排序前安全處理日期 ✨
                // 將 '未知日期' 的項目移到列表的最後面，或者給予一個極小的日期值
                const dateA = a.date === '未知日期' ? new Date('0001-01-01T00:00:00Z') : new Date(a.date);
                const dateB = b.date === '未知日期' ? new Date('0001-01-01T00:00:00Z') : new Date(b.date);

                // 確保解析後的日期是有效的
                const timeA = isNaN(dateA.getTime()) ? -Infinity : dateA.getTime();
                const timeB = isNaN(dateB.getTime()) ? -Infinity : dateB.getTime();

                return timeB - timeA;
            });
    },
});