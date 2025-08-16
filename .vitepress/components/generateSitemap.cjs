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
      files = files.concat(getAllMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      files.push(fullPath);
    }
  });
  return files;
}

// 只針對 blog/ 產生 sitemap，可根據需求擴充
const blogFiles = getAllMarkdownFiles('blog');

const urls = blogFiles.map(file => {
  const slug = file.replace(/^blog[\\/]/, '').replace(/\.md$/, '');
  return `${BASE_URL}/blog/${slug}`;
});

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n') +
  `\n</urlset>\n`;

fs.writeFileSync('sitemap.xml', xml);
console.log('✅ sitemap.xml 已產生');