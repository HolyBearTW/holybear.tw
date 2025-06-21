const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { execSync } = require('child_process');

const ROOTS = [
  { dir: path.join(__dirname, '../../blog'), urlPrefix: '/blog/' },
  { dir: path.join(__dirname, '../../en/blog'), urlPrefix: '/en/blog/' }
];

const authorMap = {};

function getAllMarkdownFiles(dir, arr = []) {
  if (!fs.existsSync(dir)) return arr;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllMarkdownFiles(fullPath, arr);
    } else if (file.endsWith('.md')) {
      arr.push(fullPath);
    }
  });
  return arr;
}

for (const { dir, urlPrefix } of ROOTS) {
  getAllMarkdownFiles(dir).forEach((mdPath) => {
    try {
      // 1. 讀 frontmatter author
      const content = fs.readFileSync(mdPath, 'utf8');
      const { data } = matter(content);
      let author = data.author;

      // 2. 沒有 frontmatter author，就用 git log 作者
      if (!author) {
        const relativePath = path.relative(process.cwd(), mdPath);
        const authors = execSync(
          `git log --diff-filter=A --format="%an" -- "${relativePath}"`
        ).toString().trim().split('\n');
        author = authors[authors.length - 1] || '';
      }

      // 3. 都沒有，就根據語言給預設值
      if (!author) {
        author = urlPrefix === '/en/blog/' ? 'System Administrator' : '系統管理員';
      }

      // 4. 對應 VitePress URL（不含.md）
      const url =
        urlPrefix +
        path
          .relative(dir, mdPath)
          .replace(/\\/g, '/')
          .replace(/\.md$/, '');

      // === 這裡加 log: ===
      console.log(`產生作者對應：url=${url}，author=${author}，md檔=${mdPath}`);

      authorMap[url] = author;
    } catch (e) {
      // 你也可以印出錯誤
      // console.error(`處理 ${mdPath} 時發生錯誤:`, e);
    }
  });
}

fs.writeFileSync(
  path.join(__dirname, '../theme/authors.json'),
  JSON.stringify(authorMap, null, 2)
);
console.log('authors.json generated');