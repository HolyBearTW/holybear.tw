import { createContentLoader } from 'vitepress';
const DEFAULT_IMAGE = '/blog_no_image.svg';

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    const filteredPosts = raw.filter(({ url }) => {
      const isBlogIndexPage =
        url === '/blog/' ||
        url === '/blog/index.html' ||
        url === '/en/blog/' ||
        url === '/en/blog/index.html';
      return !isBlogIndexPage;
    });

    // 產生每篇文章物件並加強防呆
    const mapped = filteredPosts
      .map(({ url, frontmatter, content, excerpt }) => {
        frontmatter = (frontmatter && typeof frontmatter === 'object') ? frontmatter : {};
        let title = '';
        if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
          title = frontmatter.title.trim();
        } else if (url) {
          title = url.replace(/\.html$/, '').split('/').pop() || '';
        }
        if (!title) title = '無標題文章';

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

        return {
          url,
          frontmatter,
          title,
          date,
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
          image: imageUrl,
          summary,
        };
      })
      // 過濾掉任何 undefined/null 或 title 為空的資料
      .filter(post => post && typeof post.title === 'string' && post.title);

    return mapped.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  },
});
