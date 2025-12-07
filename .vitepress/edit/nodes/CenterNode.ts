import CenterNodeView from './CenterNodeView.vue'

export const CenterNode = {} /* Node.create({
  name: 'center',

  group: 'block',

  content: 'block+',

  defining: true, */

  addAttributes() {
    return {
      class: {
        default: 'custom-block center',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.custom-block.center',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'custom-block center' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(CenterNodeView)
  },

  addCommands() {
    return {
      setCenter: () => ({ commands }) => {
        return commands.wrapIn(this.name)
      },
      toggleCenter: () => ({ commands }) => {
        return commands.toggleWrap(this.name)
      },
    }
  },
}) */
