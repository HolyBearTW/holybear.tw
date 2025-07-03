// .vitepress/theme/posts.data.ts

import { createContentLoader } from 'vitepress';
import authors from './authors.json';
import fs from 'node:fs';

const DEFAULT_IMAGE = '/blog_no_image.svg';

function extractDate(frontmatter) {
    return (
        frontmatter.listDate ||
        frontmatter.date ||
        frontmatter.created ||
        ''
    );
}

function normalizeUrl(url) {
    if (!url) return '';
    if (url === '/blog/' || url === '/en/blog/') {
        return url;
    }
    if (url.endsWith('/index.html')) {
        return url.replace(/\/index\.html$/, '');
    }
    if (url.endsWith('.html')) {
        return url.replace(/\.html$/, '');
    }
    if (url.endsWith('.md')) {
        return url.replace(/\.md$/, '');
    }
    if (url.endsWith('/') && url !== '/') {
        return url.slice(0, -1);
    }
    return url;
}


export default createContentLoader('blog/**/*.md', {
    excerpt: true,
    transform(raw) {
        const transformedPosts = raw
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
                        articleDate = stats.birthtime.toISOString();
                    } catch (e) {
                        articleDate = '未知日期';
                    }
                }

                // ✨ 關鍵修正：確保 author 在 posts.data.ts 層次就已經被修剪並確定預設值 ✨
                let author = frontmatter.author;
                if (!author || typeof author !== 'string' || author.trim() === '') {
                    author = '未知作者'; // 確保 author 永遠是一個非空的標準字串
                } else {
                    author = author.trim(); // 移除任何前後空白字元
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
                const finalUrl = normalizedUrl || '/invalid-post-url';

                // ✨ 這裡的 authorFromLookup 將會使用已經被處理過的 `author` 值 ✨
                const authorFromLookup = authors[normalizedUrl] || author;


                return {
                    url: finalUrl,
                    frontmatter,
                    title,
                    date: articleDate,
                    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : (Array.isArray(frontmatter.tag) ? frontmatter.tag : []),
                    category: Array.isArray(frontmatter.category) ? frontmatter.category : [],
                    image: imageUrl,
                    summary,
                    excerpt: summary,
                    author: authorFromLookup, // `author` 已經是確定值
                };
            });

        const finalFilteredPosts = transformedPosts.filter(post => {
            return true;
        });

        const sortedPosts = finalFilteredPosts.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const timeA = isNaN(dateA.getTime()) ? -Infinity : dateA.getTime();
            const timeB = isNaN(dateB.getTime()) ? -Infinity : dateB.getTime();
            return timeB - timeA;
        });

        return sortedPosts;
    },
});