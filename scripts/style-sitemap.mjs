import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sitemapFile = resolve(import.meta.dirname, '..', '.vitepress', 'dist', 'sitemap.xml')
const stylesheet = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>'
const sitemap = await readFile(sitemapFile, 'utf8')

// Survey pages are intentionally private utility routes. They already emit
// noindex metadata, and must not be advertised through the site's sitemap.
const privateSurveyUrls = new Set([
  'https://holybear.tw/survey',
  'https://holybear.tw/admin/survey',
])
const filteredSitemap = sitemap.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
  const location = entry.match(/<loc>([^<]+)<\/loc>/)?.[1]
  return location && privateSurveyUrls.has(location) ? '' : entry
})

if (!filteredSitemap.includes('<?xml-stylesheet')) {
  const styledSitemap = filteredSitemap.replace(
    /(<\?xml[^?]*\?>)/,
    `$1${stylesheet}`,
  )
  await writeFile(sitemapFile, styledSitemap, 'utf8')
} else if (filteredSitemap !== sitemap) {
  await writeFile(sitemapFile, filteredSitemap, 'utf8')
}

console.log(`Attached the sitemap stylesheet: ${sitemapFile}`)
