const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const BLOG_DIR = path.resolve(__dirname, '../../blog')
const SIDEBAR_FILE = path.resolve(__dirname, '../sidebar.generated.ts')

// 遍歷所有 md 檔
function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    let files = []
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files = files.concat(walk(full))
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(full)
        }
    }
    return files
}

function toSidebar(files) {
    let indexItem = null
    const postItems = []

    for (const file of files) {
        const rel = path.relative(BLOG_DIR, file)
        const link = '/blog/' + rel.replace(/\\/g, '/').replace(/\.md$/, '')
        const rawContent = fs.readFileSync(file, 'utf8')
        let title = null, listdate = null

        try {
            const fm = matter(rawContent)
            title = fm.data.title
            listdate = fm.data.listdate
        } catch { }

        // fallback: 檔名
        if (!title) title = decodeURIComponent(link.split('/').pop() || 'blog')

        // index.md 處理
        if (rel.toLowerCase() === 'index.md') {
            indexItem = {
                text: '文章列表',
                link
            }
        } else {
            // fallback: listdate 用 filename
            if (!listdate) {
                // 例如 fallback 成 2025-06-13
                const fname = path.basename(file, '.md')
                if (/^\d{4}-\d{2}-\d{2}/.test(fname)) {
                    listdate = fname.slice(0, 10)
                } else {
                    // fallback 用檔案 mtime
                    listdate = fs.statSync(file).mtime.toISOString().slice(0, 10)
                }
            }
            postItems.push({
                text: title,
                link,
                listdate
            })
        }
    }

    // 按 listdate desc 排序
    postItems.sort((a, b) => b.listdate.localeCompare(a.listdate))

    // 最終 sidebar：index、分隔線、文章
    const sidebar = []
    if (indexItem) sidebar.push(indexItem)
    sidebar.push({ text: '-', link: undefined }) // 分隔線
    sidebar.push(...postItems.map(({ text, link }) => ({ text, link })))
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