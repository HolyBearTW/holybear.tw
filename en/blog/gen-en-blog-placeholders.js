import fs from 'fs';
import path from 'path';

const blogDir = path.resolve('blog');
const enBlogDir = path.resolve('en/blog');

if (!fs.existsSync(enBlogDir)) fs.mkdirSync(enBlogDir, { recursive: true });

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

const content = `---
title: Blog Not Supported in English
---

> ⚠️ Sorry, this blog post is not available in English.<br>
> [Click here to go back.](javascript:history.back()) or [Go to Home](/en/)
`;

for (const file of files) {
  const enFile = path.join(enBlogDir, file);
  if (!fs.existsSync(enFile)) {
    fs.writeFileSync(enFile, content, 'utf8');
    console.log('Created:', enFile);
  }
}
