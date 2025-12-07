<template>
  <div v-if="editor" class="fixed-toolbar">
    <button
      @click="editor.chain().focus().toggleBold().run()"
      :class="{ 'is-active': editor.isActive('bold') }"
      title="粗體 (Ctrl+B)"
    >
      <i class="fas fa-bold"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleItalic().run()"
      :class="{ 'is-active': editor.isActive('italic') }"
      title="斜體 (Ctrl+I)"
    >
      <i class="fas fa-italic"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleStrike().run()"
      :class="{ 'is-active': editor.isActive('strike') }"
      title="刪除線 (Ctrl+Shift+X)"
    >
      <i class="fas fa-strikethrough"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleCode().run()"
      :class="{ 'is-active': editor.isActive('code') }"
      title="行內程式碼 (Ctrl+E)"
    >
      <i class="fas fa-code"></i>
    </button>

    <div class="divider"></div>

    <button
      @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
      title="標題 1 (Ctrl+Alt+1)"
    >
      <i class="fas fa-heading heading-one"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
      title="標題 2 (Ctrl+Alt+2)"
    >
      <i class="fas fa-heading heading-two"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
      title="標題 3 (Ctrl+Alt+3)"
    >
      <i class="fas fa-heading heading-three"></i>
    </button>

    <div class="divider"></div>

    <button
      @click="editor.chain().focus().toggleBulletList().run()"
      :class="{ 'is-active': editor.isActive('bulletList') }"
      title="無序列表 (Ctrl+Shift+8)"
    >
      <i class="fas fa-list-ul"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleOrderedList().run()"
      :class="{ 'is-active': editor.isActive('orderedList') }"
      title="有序列表 (Ctrl+Shift+7)"
    >
      <i class="fas fa-list-ol"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleTaskList().run()"
      :class="{ 'is-active': editor.isActive('taskList') }"
      title="待辦事項清單 (Ctrl+Shift+9)"
    >
      <i class="fas fa-tasks"></i>
    </button>

    <button
      @click="() => {
        if (editor?.isActive('bulletList') || editor?.isActive('orderedList') || editor?.isActive('taskList')) {
          // 如果在列表內，先清除當前節點的格式 (轉為段落)，然後應用引用
          editor?.chain().focus().clearNodes().toggleBlockquote().run();
        } else {
          // 否則，直接切換引用塊
          editor?.chain().focus().toggleBlockquote().run();
        }
      }"
      :class="{ 'is-active': editor?.isActive('blockquote') }"
      title="引用 (Ctrl+Shift+B)"
    >
      <i class="fas fa-quote-right"></i>
    </button>

    <button
      @click="editor.chain().focus().toggleCodeBlock().run()"
      :class="{ 'is-active': editor.isActive('codeBlock') }"
      title="程式碼區塊 (Ctrl+Shift+C)"
    >
      <i class="fas fa-file-code"></i>
    </button>

    <div class="divider"></div>

    <button
      @click="editor.chain().focus().setTextAlign('left').run()"
      :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
      title="靠左對齊 (Ctrl+Shift+L)"
    >
      <i class="fas fa-align-left"></i>
    </button>

    <button
      @click="editor.chain().focus().setTextAlign('center').run()"
      :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
      title="置中對齊 (Ctrl+Shift+E)"
    >
      <i class="fas fa-align-center"></i>
    </button>

    <button
      @click="editor.chain().focus().setTextAlign('right').run()"
      :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
      title="靠右對齊 (Ctrl+Shift+R)"
    >
      <i class="fas fa-align-right"></i>
    </button>

    <div class="divider"></div>

    <button
      @click="emit('insertImage')"
      title="插入圖片"
    >
      <i class="fas fa-image"></i>
    </button>

    <button
      @click="emit('insertYoutube')"
      title="插入 YouTube 影片"
    >
      <i class="fab fa-youtube"></i>
    </button>

    <button
      @click="emit('insertTable')"
      title="插入表格"
    >
      <i class="fas fa-table"></i>
    </button>

    <button
      @click="emit('insertTabs')"
      title="插入 Tabs 選單"
    >
      <i class="fas fa-folder-open"></i>
    </button>
  </div>
</template>

<script setup lang="ts">

defineProps<{
  editor: Editor | null | undefined;
}>();

// 定義新的 emit 事件
const emit = defineEmits<{
  (e: 'insertImage'): void;
  (e: 'insertYoutube'): void;
  (e: 'insertTable'): void;
  (e: 'insertTabs'): void;
}>();
</script>

<style scoped>
.fixed-toolbar {
  display: flex;
  flex-wrap: wrap; /* Allow buttons to wrap to the next line */
  align-items: center;
  gap: 0.25rem; /* Smaller gap between buttons */
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
  box-shadow: inset 0 -1px 0 var(--vp-c-divider); /* Subtle bottom border */
  z-index: 100; /* Ensure it's above editor content */
}

.fixed-toolbar button {
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  padding: 0.4rem 0.6rem; /* Slightly smaller padding */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.9rem; /* Slightly smaller font size */
}

.fixed-toolbar button i {
  font-size: 1rem; /* Adjust icon size */
}

.fixed-toolbar button:hover {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.fixed-toolbar button.is-active {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

html.dark .fixed-toolbar button.is-active {
  color: var(--vp-c-black);
}

.fixed-toolbar .divider {
  width: 1px;
  height: 1.5rem;
  background-color: var(--vp-c-divider);
  margin: 0 0.5rem;
}

/* Adjust heading icon sizes */
.fixed-toolbar .heading-one { font-size: 1.2rem; }
.fixed-toolbar .heading-two { font-size: 1.1rem; }
.fixed-toolbar .heading-three { font-size: 1rem; }

/* Responsive adjustments */
@media (max-width: 768px) {
  .fixed-toolbar {
    padding: 0.4rem 0.75rem;
    gap: 0.2rem;
  }
  .fixed-toolbar button {
    padding: 0.3rem 0.5rem;
    font-size: 0.85rem;
  }
  .fixed-toolbar button i {
    font-size: 0.9rem;
  }
  .fixed-toolbar .divider {
    height: 1.2rem;
    margin: 0 0.3rem;
  }
}
</style>
