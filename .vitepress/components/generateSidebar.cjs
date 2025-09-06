const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

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

function toSidebar(files, baseDir) {
    const texts = {
        'en': {
            backToList: 'Back to blog list',
        },
        'zh': {
            backToList: '回文章列表',
        },
    };

    let indexItem = null;
    const postItems = [];

    for (const file of files) {
        const rel = path.relative(baseDir, file).replace(/\\/g, '/');

        // \u6c7a\u5b9a link prefix
        const isEnglish = baseDir.includes(path.join('en', 'blog'));
        const linkPrefix = isEnglish ? '/en/blog/' : '/blog/';

        const link = linkPrefix + rel.replace(/\.md$/, '');

        let rawContent;
        try {
            rawContent = fs.readFileSync(file, 'utf8');
        } catch (err) {
            console.error(`Error reading file ${file}:`, err);
            continue;
        }

        let title = null, listdate = null;

        try {
            const fm = matter(rawContent);
            title = fm.data.title;
            listdate = fm.data.listdate || fm.data.listDate;
        } catch (err) {
            console.error(`Error parsing front matter for file ${file}:`, err);
        }

        // \u904e\u6ffe\u6389 placeholder
        if (title && title.includes('Blog Not Supported in English')) continue;

        if (rel.toLowerCase() === 'index.md') {
            const isEnglish = linkPrefix === '/en/blog/';
            const backToListText = isEnglish ? texts.en.backToList : texts.zh.backToList;
            console.log(`Setting indexItem for ${isEnglish ? 'English' : 'Chinese'}: ${backToListText}`);
            indexItem = { text: backToListText, link: link.replace(/\/index$/, '/') };
        } else {
            if (!title) title = decodeURIComponent(link.split('/').pop() || 'blog');
            if (!listdate) {
                const fname = path.basename(file, '.md');
                if (/^\d{4}-\d{2}-\d{2}/.test(fname)) {
                    listdate = fname.slice(0, 10);
                } else {
                    listdate = fs.statSync(file).mtime.toISOString().slice(0, 10);
                }
            }
            postItems.push({
                text: title,
                link,
                listdate: toDateStr(listdate),
            });
        }
    }

    // \u65b0\u5230\u820a\u6392\u5e8f\uff0c\u53d6\u524d 10 \u7bc7
    postItems.sort((a, b) => b.listdate.localeCompare(a.listdate));
    const latest10 = postItems.slice(0, 10);

    // \u7528 section \u5206\u7d44\uff0c\u5206\u7d44\u4e0a\u5c64\u4e0d\u52a0\u4efb\u4f55 text/link\uff0c\u53ea\u6709 items
    const sidebar = [
        {
            items: latest10.map(({ text, link }) => ({ text, link })),
        },
        indexItem ? { items: [indexItem] } : null,
    ].filter(Boolean);

    return sidebar;
}

function generateSidebarForBlog(blogDir, sidebarFile) {
    if (!fs.existsSync(blogDir)) {
        console.error('請確認 blog 目錄存在:', blogDir)
        return
    }
    const files = walk(blogDir)
    const sidebar = toSidebar(files, blogDir)
    const code = `// 本檔案由 generateSidebar.cjs 自動產生
export default ${JSON.stringify(sidebar, null, 2)}
`
    fs.writeFileSync(sidebarFile, code)
    console.log('sidebar 已產生:', sidebarFile)
}

function main() {
    // 中文 blog
    const BLOG_DIR = path.resolve(__dirname, '../../blog')
    const SIDEBAR_FILE = path.resolve(__dirname, '../sidebars/blog.sidebar.ts')
    generateSidebarForBlog(BLOG_DIR, SIDEBAR_FILE)

    // 英文 blog
    const EN_BLOG_DIR = path.resolve(__dirname, '../../en/blog')
    const EN_SIDEBAR_FILE = path.resolve(__dirname, '../sidebars/blog.sidebar.en.ts')
    generateSidebarForBlog(EN_BLOG_DIR, EN_SIDEBAR_FILE)
}

main()
