import fs from 'fs'
import { execSync } from 'child_process'

export default function gitMetaPlugin() {
  return {
    name: 'vitepress-plugin-git-meta',
    transform(src, id) {
      // 只處理 .md 檔案
      if (!id.endsWith('.md')) return src
      if (!fs.existsSync(id)) return src

      let author = ''
      let datetime = ''
      try {
        author = execSync(`git log --diff-filter=A --follow --format=%aN -- "${id}" | tail -1`).toString().trim()
        datetime = execSync(`git log --diff-filter=A --follow --format=%aI -- "${id}" | tail -1`).toString().trim()
      } catch {
        return src
      }

      // 轉台灣時區
      let dateTW = ''
      if (datetime) {
        const d = new Date(datetime)
        dateTW = new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')
      }

      // 檢查有無 frontmatter
      const fmMatch = src.match(/^---\n([\s\S]*?)\n---\n/)
      if (fmMatch) {
        let fm = fmMatch[1]
        let rest = src.slice(fmMatch[0].length)
        let changed = false
        // 只補沒有的欄位
        if (!/^author:/m.test(fm)) {
          fm += `\nauthor: ${author}`
          changed = true
        }
        if (!/^date:/m.test(fm)) {
          fm += `\ndate: ${dateTW}`
          changed = true
        }
        if (changed) {
          return `---\n${fm.trim()}\n---\n${rest}`
        }
        // 都有就什麼都不動
        return src
      } else {
        // 沒 frontmatter 才插入新的
        return `---\ndate: ${dateTW}\nauthor: ${author}\n---\n${src}`
      }
    }
  }
}
