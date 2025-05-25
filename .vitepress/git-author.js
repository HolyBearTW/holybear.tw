import { execSync } from 'child_process'
import path from 'path'

export default {
  name: 'vitepress-plugin-git-author',
  async transform(_, id) {
    // 只處理 Markdown 文件
    if (!id.endsWith('.md')) return

    try {
      // 取得最後一次 commit 的作者名稱
      const author = execSync(
        `git log -1 --pretty=format:%an -- "${id}"`,
        { cwd: process.cwd() }
      ).toString().trim()

      // 將作者資訊以 frontmatter 注入頁面
      // 用 YAML 格式插入作者（注意：只會在 build 階段生效）
      return `---\nauthor: ${author}\n---\n` + _
    } catch (e) {
      // 沒有 commit 過的檔案就跳過
      return
    }
  }
}
