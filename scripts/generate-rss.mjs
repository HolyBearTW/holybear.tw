import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import frontMatter from 'front-matter'

const root = resolve(import.meta.dirname, '..')
const blogDirectory = resolve(root, 'blog')
const outputFile = resolve(root, 'public', 'rss.xml')
const siteUrl = 'https://holybear.tw'

const escapeXml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const files = (await readdir(blogDirectory))
  .filter((file) => file.endsWith('.md') && file !== 'index.md')

const posts = await Promise.all(files.map(async (file) => {
  const source = await readFile(resolve(blogDirectory, file), 'utf8')
  const { attributes } = frontMatter(source)
  if (attributes.blog === false) return null

  const slug = file.replace(/\.md$/, '')
  const filenameDate = slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  const dateValue = attributes.date || filenameDate
  const date = dateValue ? new Date(`${dateValue}T00:00:00+08:00`) : null

  return {
    title: attributes.title || slug,
    description: attributes.description || '',
    url: `${siteUrl}/blog/${slug}`,
    date: date && !Number.isNaN(date.valueOf()) ? date : null,
  }
}))

const items = posts
  .filter(Boolean)
  .sort((a, b) => (b.date?.valueOf() || 0) - (a.date?.valueOf() || 0))
  .map((post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${post.url}</link>
      <guid isPermaLink="true">${post.url}</guid>
      ${post.date ? `<pubDate>${post.date.toUTCString()}</pubDate>` : ''}
      <description>${escapeXml(post.description)}</description>
    </item>`)
  .join('\n')

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>聖小熊的秘密基地</title>
    <link>${siteUrl}/</link>
    <description>聖小熊的個人網站，展示 HyperOS 模組作品與楓之谷戰力分析工具，分享技術筆記、開發心得與開源創作。</description>
    <language>zh-TW</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

await writeFile(outputFile, rss, 'utf8')
console.log(`Generated RSS with ${posts.filter(Boolean).length} posts: ${outputFile}`)
