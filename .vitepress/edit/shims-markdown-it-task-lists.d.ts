declare module 'markdown-it-task-lists' {
  import { PluginWithOptions } from 'markdown-it';
  const markdownItTaskLists: PluginWithOptions<{ enabled?: boolean; class?: string }>;
  export default markdownItTaskLists;
}
