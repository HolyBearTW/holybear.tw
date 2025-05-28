import { createContentLoader } from 'vitepress'
import { execSync } from 'child_process'
import fs from 'fs'

const DEFAULT_IMAGE = '/blog_no_image.svg'

function getGitCreatedDate(relativePath: string): string {
  try { return execSync(`git log --diff-filter=A --follow --format=%aI -1 "${relativePath}"`).toString().trim() } catch { return '' }
}
function getFsCreatedDate(relativePath: string): string {
  try { return fs.statSync(relativePath).birthtime.toISOString() } catch { return '' }
}

export default createContentLoader('blog/**/*.md', {
  excerpt: true,
  transform(raw) {
    const posts = raw
      .filter(({ url }) => !url.endsWith('/blog/'))
      .map(({ url, frontmatter, content, excerpt, relativePath }) => {
        let date = typeof frontmatter.listDate === 'string' ? frontmatter.listDate : ''
        if (!date && relativePath) {
          date = getGitCreatedDate(relativePath) || getFsCreatedDate(relativePath) || ''
        }
        let imageUrl = frontmatter.image
        if (!imageUrl && content) {
          const match = content.match(/!\[.*?\]\((.*?)\)/)
          if (match && match[1]) imageUrl = match[1]
        }
        if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
          imageUrl = `/${imageUrl}`
        }
        if (!imageUrl) imageUrl = DEFAULT_IMAGE
        let summary = excerpt?.trim() || (frontmatter.description || '').trim()
        if (!summary && content) {
          const lines = content.split('\n').map(line => line.trim())
          summary = lines.find(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('>') && !line.startsWith('<!--') && !line.startsWith('---')) || ''
        }
        if (!summary) summary = ''
        return { title: frontmatter.title ?? '', url, date, image: imageUrl, excerpt: summary }
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    console.log('posts loader result:', posts)
    return posts
  }
})
