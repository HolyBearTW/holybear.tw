import fs from 'fs'
import { execSync } from 'child_process'

export default function gitMetaPlugin() {
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
      } catch {
        return src
      }

      // 轉台灣時區
      let dateTW = ''
      if (datetime) {
        const d = new Date(datetime)
        dateTW = new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')
      }

      // 只在沒有 frontmatter（---）時插入
      if (/^---\n/.test(src)) {
        // 已有 frontmatter，完全不碰
        return src
      } else {
        // 沒有 frontmatter 才插入
        return `---\ndate: ${dateTW}\nauthor: ${author}\n---\n${src}`
      }
    }
  }
}
