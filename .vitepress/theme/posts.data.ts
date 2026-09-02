import { createContentLoader } from 'vitepress';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
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

// 取得 git 第一個 commit 的作者與日期
function getGitFirstCommitInfo(filePath) {
    try {
        // 取得第一個 commit 的作者名稱
        const authorLog = execSync(
            `git log --diff-filter=A --follow --format="%an" -- "${filePath}"`,
            { encoding: 'utf8' }
        ).trim();
        const author = authorLog.split(/\r?\n/)[0] || '';
        // 取得第一個 commit 的日期（ISO 格式）
        const dateLog = execSync(
            `git log --diff-filter=A --follow --format="%aI" -- "${filePath}"`,
            { encoding: 'utf8' }
        ).trim();
        const date = dateLog.split(/\r?\n/)[0] || '';
        return { author, date };
    } catch (e) {
        return { author: '', date: '' };
    }
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

function getReadingStats(src = '') {
    const plainText = src
        .replace(/^---[\s\S]*?---/m, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/[#>*_~`|\-]/g, ' ');
    const cjkCount = (plainText.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
    const latinCount = (plainText.match(/[A-Za-z0-9]+/g) || []).length;
    const words = Math.max(1, cjkCount + latinCount);
    // Match Fuwari's reading-time defaults: 200 words per minute, rounded.
    return { words, minutes: Math.max(1, Math.round(words / 200)) };
}


export default createContentLoader(['blog/**/*.md', 'en/blog/**/*.md', 'mod.md', 'en/mod.md', 'docs/*.md', 'halloween/index.md'], {
    excerpt: true,
    transform(raw) {
        return raw
            .filter(({ url }) => {
                const isBlogIndexPage =
                    url === '/blog/' ||
                    url === '/blog/index.html' ||
                    url === '/en/blog/' ||
                    url === '/en/blog/index.html' ||
                    url === '/docs/';
                const isUnexpectedMdUrl = url.endsWith('.md') && !url.startsWith('/blog/') && !url.startsWith('/en/blog/');
                return !isBlogIndexPage && !isUnexpectedMdUrl;
            })
            .map((item) => {
                const { url, frontmatter, src, excerpt } = item;
                const fm = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
                const title = fm.title || '無標題文章';
                // 推測檔案路徑
                // 直接用 url 推算 md 檔案路徑
                const normalizedUrl = normalizeUrl(url);
                const rel = normalizedUrl.replace(/^\//, '').replace(/\/$/, '') + '.md';
                const mdFilePath = path.join(process.cwd(), rel);
                let markdownSource = typeof src === 'string' ? src : '';
                if (!markdownSource) {
                    try {
                        markdownSource = readFileSync(mdFilePath, 'utf8');
                    } catch {
                        markdownSource = '';
                    }
                }
                // 自動補齊作者/日期
                let author = fm.author;
                let date = extractDate(fm);
                if (!author || !date) {
                    const gitInfo = getGitFirstCommitInfo(mdFilePath);
                    if (!author) author = gitInfo.author;
                    if (!date) date = gitInfo.date;
                }
                let imageUrl = fm.image;
                if (!imageUrl && src) {
                    const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
                    let match = src.match(markdownImageRegex);
                    if (match && match[1]) imageUrl = match[1];
                }
                if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                    imageUrl = `/${imageUrl}`;
                }
                if (!imageUrl) imageUrl = DEFAULT_IMAGE;
                let summary = (fm.description || '').trim();
                if (!summary && excerpt) summary = excerpt.trim();
                if (!summary && src) {
                    const lines = src.split('\n').map(line => line.trim());
                    summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
                }
                const readingStats = getReadingStats(markdownSource);
                return {
                    url: normalizedUrl,
                    frontmatter: fm,
                    title,
                    date,
                    tags: Array.isArray(fm.tags)
                        ? fm.tags
                        : (Array.isArray(fm.tag) ? fm.tag : []),
                    category: Array.isArray(fm.category) ? fm.category : [],
                    image: imageUrl,
                    summary,
                    excerpt: summary,
                    author,
                    words: readingStats.words,
                    minutes: readingStats.minutes,
                };
            })
            .filter(post => !!post && typeof post.url === 'string' && post.url.trim() !== '')
            .sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
    },
});
