const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { execSync } = require('child_process');

const ROOTS = [
  { dir: path.join(__dirname, '../../blog'), urlPrefix: '/blog/' },
  { dir: path.join(__dirname, '../../en/blog'), urlPrefix: '/en/blog/' }
];

const authorMap = {};
const logAddAuthors = []; // for logging

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

function shouldSkip({ title, description }, url) {
  // 跳過 placeholder、index 頁、blog_list
  return (
    (typeof title === 'string' && title.includes('Blog Not Supported in English')) ||
    (typeof description === 'string' && description.includes('Blog Not Supported in English')) ||
    url.endsWith('/index') ||
    url.includes('blog_list')
  );
}

for (const { dir, urlPrefix } of ROOTS) {
  getAllMarkdownFiles(dir).forEach((mdPath) => {
    try {
      const content = fs.readFileSync(mdPath, 'utf8');
      const { data } = matter(content);

      const url =
        urlPrefix +
        path
          .relative(dir, mdPath)
          .replace(/\\/g, '/')
          .replace(/\.md$/, '');

      // 跳過 placeholder 文章與 index
      if (shouldSkip(data, url)) return;

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

      authorMap[url] = author;
      logAddAuthors.push({ url, author, mdPath });
    } catch (e) {
      // 靜默失敗
    }
  });
}

// 只有有變動才寫入 authors.json
const targetFile = path.join(__dirname, '../theme/authors.json');
let needWrite = true;
let addedLogs = [];
if (fs.existsSync(targetFile)) {
  const prev = fs.readFileSync(targetFile, 'utf8');
  const prevObj = JSON.parse(prev);
  const nextObj = authorMap;

  // 收集新加的 key（不在舊檔中）
  const newKeys = Object.keys(nextObj).filter(url => !(url in prevObj));
  // 新增的文章才 log
  addedLogs = logAddAuthors.filter(item => newKeys.includes(item.url));

  // 比較內容
  const prevStr = JSON.stringify(prevObj, null, 2);
  const nextStr = JSON.stringify(nextObj, null, 2);
  if (prevStr === nextStr) needWrite = false;
} else {
  // 完全新產生，全部 log
  addedLogs = logAddAuthors;
}

if (needWrite) {
  fs.writeFileSync(targetFile, JSON.stringify(authorMap, null, 2));
  if (addedLogs.length > 0) {
    console.log(`本次成功提交 ${addedLogs.length} 筆：`);
    addedLogs.forEach(item => {
      console.log(`${item.mdPath.replace(process.cwd()+'/', '')} 文章作者：${item.author}`);
    });
  }
} else {
  console.log('沒有自動產生檔案變更，無需提交');
}
