
import DraggableImageView from './DraggableImageView.vue'

export interface DraggableImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, any>
}

/* declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    draggableImage: {
      /**
       * 插入可拖曳的圖片
       */
      setImage: (options: {
        src: string
        alt?: string
        title?: string
        width?: number
        height?: number
        align?: 'left' | 'center' | 'right'
      }) => ReturnType
    }
  }
} */

export const DraggableImage = {} /* Node.create<DraggableImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    }
  },

  inline: false,

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = element.style.width || element.getAttribute('width')
          return width ? parseInt(width) : null
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px`,
          }
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.style.height || element.getAttribute('height')
          return height ? parseInt(height) : null
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {}
          }
          return {
            height: attributes.height,
            style: `height: ${attributes.height}px`,
          }
        },
      },
      align: {
        default: 'left',
        parseHTML: element => {
          const align = element.getAttribute('data-align')
          return align || 'left'
        },
        renderHTML: attributes => {
          return {
            'data-align': attributes.align,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      setImage:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(DraggableImageView)
  },
}) */
