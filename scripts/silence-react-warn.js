import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 我們攔截兩支有問題的檔案，強迫刪除惱人的 DevTools shim 警告

const filesToPatch = [
  path.resolve(__dirname, '../node_modules/@vitejs/plugin-react/dist/refresh-runtime.js'),
  path.resolve(__dirname, '../node_modules/react-refresh/cjs/react-refresh-runtime.development.js')
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      
      // 刪除 console.warn(...) 或是 console['warn'](...) 的區塊
      const originalLength = content.length;
      
      // 取代寫法一：適用於 @vitejs/plugin-react
      content = content.replace(/console\['warn'\]\([\s\S]*?disabled\.',\n?\s*\)/g, '// Warning permanently silenced by postinstall script');
      
      // 取代寫法二：適用於 react-refresh
      content = content.replace(/console\.warn\([\s\S]*?disabled\."\n?\s*\);?/g, '// Warning permanently silenced by postinstall script');

      // 某些瀏覽器工具會留下 isDisabled 的 hook shim，這會讓 Fast Refresh
      // 直接 return。解除這個旗標，讓 Vite 仍能掛接 refresh helpers。
      content = content.replace(
        /if \(hook\.isDisabled\) \{[\s\S]*?return\n\s*\}/g,
        'if (hook.isDisabled) {\n    hook.isDisabled = false\n  }'
      );

      if (content.length !== originalLength) {
        fs.writeFileSync(file, content);
        console.log(`✅ [Force Patch] 成功靜音: ${path.basename(file)} 的 React 警告`);
      }
    } catch (e) {
      console.log(`[Force Patch] 靜音腳本略過 ${path.basename(file)} (可能尚未載入)`);
    }
  }
}
