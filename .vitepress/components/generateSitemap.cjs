#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://holybear.tw';

function getAllMarkdownFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // 排除 node_modules 和其他不必要的資料夾
      if (fullPath.includes('node_modules') || fullPath.includes('public')) return;
      files = files.concat(getAllMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      files.push(fullPath);
    }
  });
  return files;
}

function isDirectory(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

// 全站產生 sitemap
const allFiles = getAllMarkdownFiles('.');

const urls = allFiles.map(file => {

  const relativePath = path.relative('.', file).replace(/\\/g, '/');
  let slug = relativePath.replace(/\.md$/, '');

  // 過濾 blog_list
  if (slug.includes('blog_list')) return null;

  // 如果是 index，改為根目錄
  if (slug.endsWith('/index')) {
    slug = slug.replace(/\/index$/, '/');
  }

  // 如果是資料夾，避免被索引成 .html
  const isDir = isDirectory(path.join('.', slug));
  if (isDir) {
    slug += '/';
  }

  // 排除重複或無效的條目
  if (slug === '' || slug === '/' || slug.endsWith('//') || slug.startsWith('zh_TW') || slug === 'index' || slug.startsWith('README')) {
    return null;
  }

  // 過濾掉英文版中標記為 "Blog Not Supported in English" 的文章
  if (slug.startsWith('en/blog') && fs.readFileSync(path.join('.', relativePath), 'utf-8').includes('Blog Not Supported in English')) {
    return null;
  }

  return `${BASE_URL}/${slug}`;
}).filter(Boolean); // 過濾掉 null 條目

// 確保首頁和英文版首頁被包含
urls.push(`${BASE_URL}/`);
urls.push(`${BASE_URL}/en/`);

// 添加子網域 jackboy.holybear.tw
urls.push(`https://jackboy.holybear.tw/`);

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n') +
  `\n</urlset>\n`;

fs.writeFileSync('public/sitemap.xml', xml);
console.log('✅ public/sitemap.xml 已產生');