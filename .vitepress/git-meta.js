import { execSync } from 'child_process'
import fs from 'fs'

export default function gitMetaPlugin() {
  return {
    name: 'inject-git-meta-frontmatter',
    enforce: 'pre',
    async transform(src, id) {
      if (!id.endsWith('.md')) return

      // 檢查檔案是否存在於 git，否則跳過
      if (!fs.existsSync(id)) return

      let author = ''
      let datetime = ''
      try {
        // 抓第一次 commit 的作者與時間
        author = execSync(`git log --diff-filter=A --follow --format=%aN -- "${id}" | tail -1`).toString().trim()
        datetime = execSync(`git log --diff-filter=A --follow --format=%aI -- "${id}" | tail -1`).toString().trim()
      } catch (e) {
        // 檔案沒 commit 過會 error
        return src
      }

      // 只補 author/date，已有時不覆蓋
      // 解析現有 frontmatter
      const frontmatterMatch = src.match(/^---\n([\s\S]*?)\n---\n/)
      let frontmatter = frontmatterMatch ? frontmatterMatch[1] : ''
      let rest = frontmatterMatch ? src.slice(frontmatterMatch[0].length) : src

      let hasAuthor = /^author:/m.test(frontmatter)
      let hasDate = /^date:/m.test(frontmatter)

      if (!hasAuthor) {
        frontmatter = `author: ${author}\n` + frontmatter
      }
      if (!hasDate) {
        frontmatter = `date: ${datetime}\n` + frontmatter
      }

      const injected = `---\n${frontmatter}\n---\n${rest}`

      return injected
    }
  }
}
