import fs from 'fs';
import path from 'path';

const blogDir = path.resolve('blog');
const enBlogDir = path.resolve('en/blog');

if (!fs.existsSync(enBlogDir)) fs.mkdirSync(enBlogDir, { recursive: true });

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

function extractFieldFromFrontmatter(content, field) {
  const match = content.match(/---([\s\S]*?)---/);
  if (!match) return '';
  const frontmatter = match[1];
  const line = frontmatter.split('\n').find(line => line.trim().startsWith(`${field}:`));
  if (!line) return '';
  return line.replace(new RegExp(`^${field}:\\s*`), '').replace(/^["']|["']$/g, '').trim();
}

for (const file of files) {
  const rawMd = fs.readFileSync(path.join(blogDir, file), 'utf8');
  const author = extractFieldFromFrontmatter(rawMd, 'author');

  const content = `---
title: Blog Not Supported in English
${author ? `author: ${author}` : ''}
---
::: danger tip
> ⚠️ Sorry, this blog post is not available in English.<br>
> [Go to Home](/en/)
:::
`;

  const enFile = path.join(enBlogDir, file);
  fs.writeFileSync(enFile, content, 'utf8');
  console.log('Generated/Overwritten:', enFile);
}
