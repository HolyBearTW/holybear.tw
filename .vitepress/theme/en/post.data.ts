import { createContentLoader } from 'vitepress';
import authors from '../theme/authors.json'; // 根據你的實際路徑

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

// 跟中文 loader 一樣的 normalizeUrl
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
      .map(({ url, frontmatter, content, excerpt }) => {
        frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
        const title = frontmatter.title || 'No title post';
        const date = extractDate(frontmatter);
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

        // description 永遠優先
        let summary = (frontmatter.description || '').trim();
        if (!summary && excerpt) summary = excerpt.trim();
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim());
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
        }

        // 用正規化過的 url 查作者
        const normalizedUrl = normalizeUrl(url);
        const author = authors[normalizedUrl] || 'Unknown';

        return {
          url,
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