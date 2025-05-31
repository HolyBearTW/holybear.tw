const fs = require('fs')
const { execSync } = require('child_process')

module.exports = function injectGitMeta(src, id) {
  // 只處理 Markdown
  if (!id.endsWith('.md')) return src
  if (!fs.existsSync(id)) return src

  // 所有 .md 都補

  let author = ''
  let datetime = ''
  try {
    author = execSync(`git log --diff-filter=A --follow --format=%aN -- "${id}" | tail -1`).toString().trim()
    datetime = execSync(`git log --diff-filter=A --follow --format=%aI -- "${id}" | tail -1`).toString().trim()
  } catch (e) {
    return src
  }

  // 轉換為台灣時區 ISO 字串（含 +08:00）
  let dateTW = ''
  if (datetime) {
    const d = new Date(datetime)
    dateTW = new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')
  }

  // 補 frontmatter
  const frontmatterMatch = src.match(/^---\n([\s\S]*?)\n---\n/)
  let frontmatter = frontmatterMatch ? frontmatterMatch[1] : ''
  let rest = frontmatterMatch ? src.slice(frontmatterMatch[0].length) : src

  let hasAuthor = /^author:/m.test(frontmatter)
  let hasDate = /^date:/m.test(frontmatter)

  if (!hasAuthor) {
    frontmatter = `author: ${author}\n` + frontmatter
  }
  if (!hasDate) {
    frontmatter = `date: ${dateTW}\n` + frontmatter
  }

  const injected = `---\n${frontmatter}\n---\n${rest}`

  return injected
}
