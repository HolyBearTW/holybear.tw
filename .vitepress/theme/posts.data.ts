import { createContentLoader } from 'vitepress';
const DEFAULT_IMAGE = '/blog_no_image.svg';

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
        return !isBlogIndexPage;
      })
      .map(({ url, frontmatter, content, excerpt }) => {
        frontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
        const title = frontmatter.title || '無標題文章';
        // 支援 listDate
        let date = typeof frontmatter.listDate === 'string' ? frontmatter.listDate : '';
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

        let summary = excerpt?.trim();
        if (!summary) summary = (frontmatter.description || '').trim();
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim());
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>')) || '';
        }

        return {
          url,
          frontmatter,
          title,
          date, // <--- 這裡是 listDate，給前端用 post.date
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          image: imageUrl,
          summary,
          excerpt: summary,
        };
      })
      .filter(post => !!post && typeof post.url === 'string' && !!post.url)
      .sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  },
});
