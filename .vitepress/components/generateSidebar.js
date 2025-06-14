const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const BLOG_DIR = path.resolve(__dirname, '../../blog')
const SIDEBAR_FILE = path.resolve(__dirname, '../sidebar.generated.ts')

// 取得所有 markdown 檔案
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files = files.concat(walk(full))
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.md')
    ) {
      files.push(full)
    }
  }
  return files
}

// 取得 sidebar 項目
function toSidebar(files) {
  // 先找 index.md
  let indexItem = null
  const postItems = []

  for (const file of files) {
    const rel = path.relative(BLOG_DIR, file)
    const link = '/blog/' + rel.replace(/\\/g, '/').replace(/\.md$/, '')
    const rawContent = fs.readFileSync(file, 'utf8')
    let title = null
    try {
      const fm = matter(rawContent)
      title = fm.data.title
    } catch {
      //
    }
    // fallback: 檔名
    if (!title) title = decodeURIComponent(link.split('/').pop() || 'blog')

    if (rel.toLowerCase() === 'index.md') {
      indexItem = {
        text: '文章列表',
        link
      }
    } else {
      postItems.push({
        text: title,
        link
      })
    }
  }

  // 排序（可依需求自訂）
  postItems.sort((a, b) => a.text.localeCompare(b.text, 'zh-Hant'))

  // 組合 sidebar：列表、分隔線、文章
  const sidebar = []
  if (indexItem) sidebar.push(indexItem)
  sidebar.push({ text: '-', link: undefined }) // 分隔線
  sidebar.push(...postItems)
  return sidebar
}

function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error('請確認 blog 目錄存在')
    process.exit(1)
  }
  const files = walk(BLOG_DIR)
  const sidebar = toSidebar(files)
  const code = `// 本檔案由 generateSidebar.js 自動產生
export default ${JSON.stringify(sidebar, null, 2)}
`
  fs.writeFileSync(SIDEBAR_FILE, code)
  console.log('sidebar 已產生:', SIDEBAR_FILE)
}

main()