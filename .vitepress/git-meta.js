import fs from 'fs'
import { execSync } from 'child_process'

export default function injectGitMeta() {
  return {
    name: 'vitepress-plugin-git-meta',
    transform(src, id) {
      if (!id.endsWith('.md')) return src
      if (!fs.existsSync(id)) return src

      let author = ''
      let datetime = ''
      try {
        author = execSync(`git log --diff-filter=A --follow --format=%aN -- "${id}" | tail -1`).toString().trim()
        datetime = execSync(`git log --diff-filter=A --follow --format=%aI -- "${id}" | tail -1`).toString().trim()
      } catch (e) {
        return src
      }

      // 轉台灣時區
      let dateTW = ''
      if (datetime) {
        const d = new Date(datetime)
        dateTW = new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')
      }

      // 若有 frontmatter 就只補欄位，沒有就插入
      const frontmatterMatch = src.match(/^---\n([\s\S]*?)\n---\n/)
      if (frontmatterMatch) {
        let frontmatter = frontmatterMatch[1]
        let rest = src.slice(frontmatterMatch[0].length)

        // 僅補沒有的欄位
        if (!/^author:/m.test(frontmatter)) {
          frontmatter = `author: ${author}\n` + frontmatter
        }
        if (!/^date:/m.test(frontmatter)) {
          frontmatter = `date: ${dateTW}\n` + frontmatter
        }
        return `---\n${frontmatter}\n---\n${rest}`
      } else {
        // 沒 frontmatter 就整組插入
        return `---\ndate: ${dateTW}\nauthor: ${author}\n---\n${src}`
      }
    }
  }
}
