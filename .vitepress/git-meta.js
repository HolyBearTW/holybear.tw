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
        author = execSync(`git log -1 --pretty=format:%an -- "${id}"`).toString().trim()
        // 取得 ISO 格式（後面再轉字串）
        datetime = execSync(`git log -1 --pretty=format:%cI -- "${id}"`).toString().trim()
      } catch (e) {
        // 檔案沒 commit 過會 error
        return src
      }

      // 只在 YAML frontmatter 最前面加 author/date（不覆蓋原有欄位）
      // 若已有 author/date，這邊會覆蓋
      const injected = `---\nauthor: ${author}\ngit_date: ${datetime}\n` + src.replace(/^---\n/, '')

      return injected
    }
  }
}
