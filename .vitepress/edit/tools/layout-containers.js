/* ===== 多欄布局容器配置 - 從 @lando/vitepress-theme-default-plus 移植 ===== */

export const layoutContainers = {
  // 多欄布局容器
  'half': {},      // 兩欄布局
  'third': {},     // 三欄布局

  // 其他布局容器
  'center': {},    // 居中布局
  'left': {},      // 左對齊
  'right': {},     // 右對齊
};

/*
使用方式：
在 Markdown 中使用：

::: half
左側內容
:::

::: half
右側內容
:::

::: third
第一欄
:::

::: third
第二欄
:::

::: third
第三欄
:::

::: center
居中內容
:::

::: left
左對齊內容
:::

::: right
右對齊內容
:::
*/