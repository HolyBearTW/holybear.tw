import { execSync } from 'child_process'
import fs from 'fs'

export default function gitMetaPlugin() {
  return {
    name: 'inject-git-meta-frontmatter',
    enforce: 'pre',
    async transform(src, id) {
      if (!id.endsWith('.md')) return
      if (!fs.existsSync(id)) return

      let author = ''
      let datetime = ''
      try {
        author = execSync(`git log --diff-filter=A --follow --format=%aN -- "${id}" | tail -1`).toString().trim()
        datetime = execSync(`git log --diff-filter=A --follow --format=%aI -- "${id}" | tail -1`).toString().trim()
      } catch (e) {
        return src
      }

      // 轉換為台灣時區
      let dateTW = ''
      if (datetime) {
        const d = new Date(datetime)
        // 轉成台灣時區 ISO 字串（含 +08:00）
        dateTW = new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')
      }

      const frontmatterMatch = src.match(/^---\n([\s\S]*?)\n---\n/)
      let frontmatter = frontmatterMatch ? frontmatterMatch[1] : ''
      let rest = frontmatterMatch ? src.slice(frontmatterMatch[0].length) : src

      let hasAuthor = /^author:/m.test(frontmatter)
      let hasDate = /^date:/m.test(frontmatter)

      if (!hasAuthor) {
        frontmatter = `author: ${author}\n` + frontmatter
      }
      if (!hasDate) {
        frontmatter = `date: ${dateTW}\n` + frontmatter
      }

      const injected = `---\n${frontmatter}\n---\n${rest}`

      return injected
    }
  }
}
