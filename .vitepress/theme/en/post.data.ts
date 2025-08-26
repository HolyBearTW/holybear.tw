import { createContentLoader } from 'vitepress';
// 已移除 authors.json 相關依賴
import { execSync } from 'child_process';
import path from 'path';
function getGitFirstCommitInfo(filePath) {
  try {
    const authorLog = execSync(
      `git log --diff-filter=A --follow --format="%an" -- "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    const author = authorLog.split(/\r?\n/)[0] || '';
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

const DEFAULT_IMAGE = '/blog_no_image.svg';

function extractDate(frontmatter) {
  return (
    frontmatter.listDate ||
    frontmatter.date ||
    frontmatter.created ||
    frontmatter.publishDate ||
    ''
  );
}

// 跟中文 loader 一樣，正規化 url
function normalizeUrl(url) {
  if (url.endsWith('/index.html')) return url.replace(/\/index\.html$/, '');
  if (url.endsWith('.html')) return url.replace(/\.html$/, '');
  if (url.endsWith('/')) return url.slice(0, -1);
  return url;
}

export default createContentLoader('en/blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .filter(({ url }) => {
        const isBlogIndexPage =
          url === '/blog/' ||
          url === '/blog/index.html' ||
          url === '/en/blog/' ||
          url === '/en/blog/index.html';
        return !isBlogIndexPage;
      })
      .map(({ url, frontmatter, src, excerpt }) => {
        frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
        const title = frontmatter.title || 'No title post';
        let date = extractDate(frontmatter);
        let imageUrl = frontmatter.image;
        if (!imageUrl && src) {
          const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
          let match = src.match(markdownImageRegex);
          if (match && match[1]) imageUrl = match[1];
        }
        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`;
        }
        if (!imageUrl) imageUrl = DEFAULT_IMAGE;

        // 讓 description 永遠優先
        let summary = (frontmatter.description || '').trim();
        if (!summary && excerpt) summary = excerpt.trim();
        if (!summary && src) {
          const lines = src.split('\n').map(line => line.trim());
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
        }

  // 用正規化 url 查找作者（已移除 authors.json，直接 fallback git log）
  const normalizedUrl = normalizeUrl(url);
  let author = '';

        // 自動補齊作者/日期（與中文版一致）
        // 推算 md 檔案路徑
        const rel = url.replace(/^\//, '').replace(/\/$/, '') + '.md';
        const mdFilePath = path.join(process.cwd(), rel);
        if (!author || !date) {
          const gitInfo = getGitFirstCommitInfo(mdFilePath);
          if (!author) author = gitInfo.author;
          if (!date) date = gitInfo.date;
        }

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
      .filter(post =>
        !!post &&
        typeof post.url === 'string' &&
        !!post.url &&
        !post.title.includes('Blog Not Supported in English')
      )
      .sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  },
});