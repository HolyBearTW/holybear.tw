import { createContentLoader } from 'vitepress';
const DEFAULT_IMAGE = '/blog_no_image.svg';

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    console.log(`[posts.data.ts] Initial raw posts count: ${raw.length}`);
    if (raw.length > 0) {
      console.log('[posts.data.ts] URLs of raw posts:', raw.map(p => p.url));
    }

    const filteredPosts = raw.filter(({ url }) => {
      const isBlogIndexPage =
        url === '/blog/' ||
        url === '/blog/index.html' ||
        url === '/en/blog/' ||
        url === '/en/blog/index.html';
      return !isBlogIndexPage;
    });

    console.log(`[posts.data.ts] Filtered posts count: ${filteredPosts.length}`);
    if (filteredPosts.length === 0 && raw.length > 0) {
      console.warn("[posts.data.ts] WARNING: All posts were filtered out by the url.endsWith('/blog/') condition. Please check your post URLs and filter logic.");
      raw.forEach(p => console.log(`[posts.data.ts] Original post URL that was filtered out: ${p.url}`));
    } else if (raw.length === 0) {
      console.warn('[posts.data.ts] WARNING: No posts found by createContentLoader("blog/**/*.md"). Please check your glob pattern and that markdown files exist in the "blog" directory.');
    }

    return filteredPosts
      .map(({ url, frontmatter, content, excerpt }) => {
        // 確保 frontmatter 一定是物件
        frontmatter = (frontmatter && typeof frontmatter === 'object') ? frontmatter : {};

        // 強化 title fallback
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
      .sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  },
});
