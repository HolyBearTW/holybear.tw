const fs = require('fs')
const path = require('path')

const blogDir = path.resolve(__dirname, '../blog')
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') && f !== 'index.md')

const result = files.map(file => {
  const filePath = path.join(blogDir, file)
  const content = fs.readFileSync(filePath, 'utf-8')
  // 改成抓 listDate 欄位
  const match = content.match(/listDate:\s*["']?([\d\-: ]+)["']?/)
  const date = match ? match[1].trim() : file.replace('.md', '')
  return {
    url: `/blog/${file.replace('.md', '')}/`,
    date
  }
})

const outPath = path.resolve(__dirname, './theme/blog-dates.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
console.log('Done! blog-dates.json generated at', outPath)
