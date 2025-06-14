const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const BLOG_DIR = path.resolve(__dirname, '../../blog')
const SIDEBAR_FILE = path.resolve(__dirname, '../sidebar.generated.ts')

// yyyy-MM-dd 格式
function toDateStr(input) {
    if (!input) return '1970-01-01'
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10)
    try {
        const d = new Date(input)
        if (!isNaN(d)) return d.toISOString().slice(0, 10)
    } catch { }
    return '1970-01-01'
}

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
        const rel = path.relative(BLOG_DIR, file).replace(/\\/g, '/')
        const link = '/blog/' + rel.replace(/\.md$/, '')
        const rawContent = fs.readFileSync(file, 'utf8')
        let title = null, listdate = null

        try {
            const fm = matter(rawContent)
            title = fm.data.title
            listdate = fm.data.listdate || fm.data.listDate
        } catch { }

        if (rel.toLowerCase() === 'index.md') {
            indexItem = { text: '回文章列表', link }
        } else {
            if (!title) title = decodeURIComponent(link.split('/').pop() || 'blog')
            if (!listdate) {
                const fname = path.basename(file, '.md')
                if (/^\d{4}-\d{2}-\d{2}/.test(fname)) {
                    listdate = fname.slice(0, 10)
                } else {
                    listdate = fs.statSync(file).mtime.toISOString().slice(0, 10)
                }
            }
            postItems.push({
                text: title,
                link,
                listdate: toDateStr(listdate)
            })
        }
    }

    // 新到舊排序，取前 10 篇
    postItems.sort((a, b) => b.listdate.localeCompare(a.listdate))
    const latest10 = postItems.slice(0, 10)

    // 用 section 分組，分組上層不加任何 text/link，只有 items
    const sidebar = [
        {
            items: latest10.map(({ text, link }) => ({ text, link }))
        },
        indexItem ? { items: [ indexItem ] } : null
    ].filter(Boolean)

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
