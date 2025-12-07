
import BoxNodeView from './BoxNodeView.vue'

export const BoxNode = {} /* Node.create({
  name: 'box',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      color: {
        default: 'blue',
        parseHTML: element => {
          const classList = element.classList
          if (classList.contains('box-red')) return 'red'
          if (classList.contains('box-yellow')) return 'yellow'
          if (classList.contains('box-green')) return 'green'
          if (classList.contains('box-blue')) return 'blue'
          if (classList.contains('box-brand')) return 'brand'
          return 'blue'
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.custom-block',
        getAttrs: element => {
          const el = element as HTMLElement
          if (el.classList.contains('box-red') || 
              el.classList.contains('box-yellow') ||
              el.classList.contains('box-green') ||
              el.classList.contains('box-blue') ||
              el.classList.contains('box-brand')) {
            return {}
          }
          return false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes.color || 'blue'
    return ['div', mergeAttributes(HTMLAttributes, { class: `box custom-block-${color}` }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(BoxNodeView)
  },

  addCommands() {
    return {
      setBox: (color: string = 'blue') => ({ commands }: any) => {
        return commands.wrapIn(this.name, { color })
      },
    }
  },
}) */
