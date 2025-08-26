import { execSync } from 'child_process'
import fs from 'fs'

export default function gitMetaPlugin() {
  return {
    name: 'inject-git-meta-frontmatter',
    enforce: 'pre' as const,
    async transform(src: any, id: any) {
      if (!id.endsWith('.md')) return
      // 排除 /en/blog/ 目錄（處理 Windows 路徑）
      if (id.replaceAll('\\','/').includes('/en/blog/')) return src
      if (!fs.existsSync(id)) return

      // 只處理本來就有 frontmatter 的檔案
      const frontmatterMatch = src.match(/^---\n([\s\S]*?)\n---\n/)
      if (!frontmatterMatch) return src

      let author = ''
      let datetime = ''
      try {
        // 取得所有作者名稱，取最後一行
        const authorLog = execSync(`git log --diff-filter=A --follow --format=%aN -- "${id}"`).toString().trim();
        author = authorLog.split(/\r?\n/).pop() || '';
        // 取得所有日期，取最後一行
        const dateLog = execSync(`git log --diff-filter=A --follow --format=%aI -- "${id}"`).toString().trim();
        datetime = dateLog.split(/\r?\n/).pop() || '';
      } catch (e) {
        return src
      }

      // 轉換為台灣時區
      let dateTW = ''
      if (datetime) {
        const d = new Date(datetime)
        dateTW = new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')
      }

      let frontmatter = frontmatterMatch[1]
      let rest = src.slice(frontmatterMatch[0].length)

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
