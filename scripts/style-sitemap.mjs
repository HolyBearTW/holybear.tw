import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sitemapFile = resolve(import.meta.dirname, '..', '.vitepress', 'dist', 'sitemap.xml')
const stylesheet = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>'
const sitemap = await readFile(sitemapFile, 'utf8')

if (!sitemap.includes('<?xml-stylesheet')) {
  const styledSitemap = sitemap.replace(
    /(<\?xml[^?]*\?>)/,
    `$1${stylesheet}`,
  )
  await writeFile(sitemapFile, styledSitemap, 'utf8')
}

console.log(`Attached the sitemap stylesheet: ${sitemapFile}`)
