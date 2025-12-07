
import RowNodeView from './RowNodeView.vue'

export const RowNode = {} /* Node.create({
  name: 'row',

  group: 'block',

  content: '(half | third)+',

  defining: true,

  addAttributes() {
    return {
      class: {
        default: 'custom-block row',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.custom-block.row',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'custom-block row' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(RowNodeView)
  },

  addCommands() {
    return {
      insertTwoColumns: () => ({ commands, state }) => {
        const { selection } = state
        const { $from } = selection
        
        return commands.insertContentAt($from.pos, {
          type: 'row',
          content: [
            {
              type: 'half',
              content: [{ type: 'paragraph' }],
            },
            {
              type: 'half',
              content: [{ type: 'paragraph' }],
            },
          ],
        })
      },
      insertThreeColumns: () => ({ commands, state }) => {
        const { selection } = state
        const { $from } = selection
        
        return commands.insertContentAt($from.pos, {
          type: 'row',
          content: [
            {
              type: 'third',
              content: [{ type: 'paragraph' }],
            },
            {
              type: 'third',
              content: [{ type: 'paragraph' }],
            },
            {
              type: 'third',
              content: [{ type: 'paragraph' }],
            },
          ],
        })
      },
    }
  },
}) */
