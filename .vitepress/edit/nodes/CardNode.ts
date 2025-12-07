
import CardNodeView from './CardNodeView.vue'

export const CardNode = {} /* Node.create({
  name: 'card',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Card Title',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) return {}
          return { 'data-title': attributes.title }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.custom-block.card',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'custom-block card' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(CardNodeView)
  },

  addCommands() {
    return {
      setCard: (title: string = 'Card Title') => ({ commands }: any) => {
        return commands.wrapIn(this.name, { title })
      },
    }
  },
}) */
