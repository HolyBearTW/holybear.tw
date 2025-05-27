const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')

const blogDir = path.resolve(__dirname, '../blog')
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'))

const result = []

for (const file of files) {
  const filePath = path.join(blogDir, file)
  const html = fs.readFileSync(filePath, 'utf-8')
  const $ = cheerio.load(html)
  const dateText = $('.post-date').text().replace('發布日期：', '').trim()
  result.push({
    url: `/blog/${file}`,
    date: dateText
  })
}

// 輸出到 .vitepress/theme/blog-dates.json
const outPath = path.resolve(__dirname, '../.vitepress/theme/blog-dates.json')
fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
console.log('Done! blog-dates.json generated at', outPath)
