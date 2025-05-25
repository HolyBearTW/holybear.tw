// docs/.vitepress/theme/posts.data.ts
import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  url: string
  date: string
}

export default createContentLoader('blog/**/*.md', {
  transform(raw) {
    return raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter }) => ({
        title: frontmatter.title,
        url,
        date: frontmatter.date ? new Date(frontmatter.date).toISOString() : '2000-01-01',
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
})
