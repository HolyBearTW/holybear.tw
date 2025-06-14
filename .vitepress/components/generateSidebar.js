const fs = require('fs')
const path = require('path')

// 修正為你的 blog 目錄（專案根目錄下 blog）
const BLOG_DIR = path.resolve(__dirname, '../../blog')
// 輸出 .vitepress/sidebar.generated.ts（在專案根目錄下 .vitepress）
const SIDEBAR_FILE = path.resolve(__dirname, '../sidebar.generated.ts')

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files = files.concat(walk(full))
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      entry.name.toLowerCase() !== 'readme.md'
    ) {
      files.push(full)
    }
  }
  return files
}

function toSidebar(files) {
  // /blog/xxx/yyy.md → /blog/xxx/yyy
  return files
    .map(f => {
      const rel = path.relative(BLOG_DIR, f)
      return '/blog/' + rel.replace(/\\/g, '/').replace(/\.md$/, '')
    })
    .sort()
    .map(link => ({
      text: decodeURIComponent(link.split('/').pop() || 'blog'),
      link
    }))
}

function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error('請確認 blog 目錄存在')
    process.exit(1)
  }
  const files = walk(BLOG_DIR)
  const sidebar = toSidebar(files)
  const code = `// 本檔案由 generateSidebar.js 自動產生
export default [
  ${sidebar.map(item => JSON.stringify(item)).join(',\n  ')}
]
`
  fs.writeFileSync(SIDEBAR_FILE, code)
  console.log('sidebar 已產生:', SIDEBAR_FILE)
}

main()