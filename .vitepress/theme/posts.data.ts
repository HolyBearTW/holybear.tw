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
        // ✨ 新增：明確的偵錯日誌開頭 ✨
        console.log('--- START posts.data.ts Transform Debug ---');

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
                        console.warn(`[posts.data.ts] Failed to get file stats for ${filePath}:`, e.message);
                        articleDate = '未知日期';
                    }
                }

                let author = frontmatter.author;
                if (!author) {
                    author = '未知作者';
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

                // ✨ 關鍵除錯點：打印每一篇文章的 URL 和其他相關資訊 ✨
                console.log(`--- Processing Post: "${title}" ---`);
                console.log(`  Original filePath: ${filePath}`);
                console.log(`  Processed URL: "${url}"`); // 這是原始的 VitePress 生成的 URL
                console.log(`  Normalized URL (to be used): "${normalizedUrl}"`); // 這是經過 normalizeUrl 處理的 URL
                console.log(`  Final URL (after fallback): "${finalUrl}"`); // 這是最終用於 post.url 的值
                console.log(`  Final Date: "${articleDate}"`);
                console.log(`  Final Author: "${authorFromLookup}"`);
                console.log('------------------------------------');

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
                    author: authorFromLookup,
                };
            });

        // ✨ 關鍵偵錯點：檢查最終過濾後的 URL 有效性並打印錯誤 ✨
        const finalFilteredPosts = transformedPosts.filter(post => {
            if (!post || typeof post.url !== 'string' || post.url.trim() === '') {
                console.error(`ERROR: Post with title "${post?.title || 'Unknown Title'}" has an INVALID/EMPTY URL: "${post?.url}". This is a CRITICAL ERROR and might cause "Invalid URL" TypeError.`);
                return false;
            }
            return true;
        });

        // 排序邏輯 (保持不變)
        const sortedPosts = finalFilteredPosts.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const timeA = isNaN(dateA.getTime()) ? -Infinity : dateA.getTime();
            const timeB = isNaN(dateB.getTime()) ? -Infinity : dateB.getTime();
            return timeB - timeA;
        });

        console.log('--- END posts.data.ts Transform Debug ---');
        return sortedPosts;
    },
});