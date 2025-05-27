const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')

const blogDir = path.resolve(__dirname, '../dist/blog')
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'))

const result = []

for (const file of files) {
  const filePath = path.join(blogDir, file)
  const html = fs.readFileSync(filePath, 'utf-8')
  const $ = cheerio.load(html)
  // 假設單篇內容那裡 class="post-date"
  const dateText = $('.post-date').text().replace('發布日期：', '').trim()
  result.push({
    url: `/blog/${file}`,
    date: dateText
  })
}

fs.writeFileSync(path.resolve(__dirname, '../dist/blog-dates.json'), JSON.stringify(result, null, 2))
console.log('Done!')
