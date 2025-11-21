/* ===== 多欄布局工具使用示例 ===== */

import createContainer from './create-container.js';
import { layoutContainers } from './layout-containers.js';

// 重新導出 layoutContainers 以便測試
export { layoutContainers };

/**
 * 在 Markdown 處理器中註冊多欄布局容器
 * @param {Object} md - MarkdownIt 實例
 */
export function registerLayoutContainers(md) {
  // 註冊所有布局容器
  Object.entries(layoutContainers).forEach(([name, opts]) => {
    md.use(...createContainer(name, opts, md));
  });
}

/**
 * 獲取支持的容器名稱列表
 * @returns {string[]} 容器名稱數組
 */
export function getSupportedContainers() {
  return Object.keys(layoutContainers);
}

/**
 * 檢查容器是否為布局容器
 * @param {string} containerName - 容器名稱
 * @returns {boolean} 是否為布局容器
 */
export function isLayoutContainer(containerName) {
  return containerName in layoutContainers;
}

/*
在您的組件中使用：

import { registerLayoutContainers } from './tools/layout-containers-example.js';

// 在 Markdown 處理器初始化時調用
const md = new MarkdownIt();
registerLayoutContainers(md);

// 或者手動註冊特定容器
md.use(...createContainer('half', {}, md));
md.use(...createContainer('third', {}, md));
*/