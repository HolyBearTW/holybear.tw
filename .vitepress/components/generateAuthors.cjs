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

// 這個 function 控制「跳過」哪些文章
function shouldSkip(data) {
  return (
    (typeof data.title === 'string' && data.title.includes('Blog Not Supported in English')) ||
    (typeof data.description === 'string' && data.description.includes('Blog Not Supported in English'))
  );
}

for (const { dir, urlPrefix } of ROOTS) {
  getAllMarkdownFiles(dir).forEach((mdPath) => {
    try {
      const content = fs.readFileSync(mdPath, 'utf8');
      const { data } = matter(content);

      // 跳過 placeholder 文章
      if (shouldSkip(data)) return;

      let author = data.author;

      if (!author) {
        const relativePath = path.relative(process.cwd(), mdPath);
        try {
          const authors = execSync(
            `git log --diff-filter=A --format="%an" -- "${relativePath}"`
          ).toString().trim().split('\n');
          author = authors[authors.length - 1] || '';
        } catch {}
      }

      if (!author) {
        author = urlPrefix === '/en/blog/' ? 'System Administrator' : '系統管理員';
      }

      const url =
        urlPrefix +
        path
          .relative(dir, mdPath)
          .replace(/\\/g, '/')
          .replace(/\.md$/, '');

      authorMap[url] = author;
    } catch (e) {
      // 靜默失敗
    }
  });
}

// 只有有變動才寫入 authors.json
const targetFile = path.join(__dirname, '../theme/authors.json');
let needWrite = true;
if (fs.existsSync(targetFile)) {
  const prev = fs.readFileSync(targetFile, 'utf8');
  const prevObj = JSON.stringify(JSON.parse(prev));
  const nextObj = JSON.stringify(authorMap, null, 2);
  if (prevObj === nextObj) needWrite = false;
}
if (needWrite) {
  fs.writeFileSync(targetFile, JSON.stringify(authorMap, null, 2));
}
