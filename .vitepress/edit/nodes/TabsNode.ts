
import TabsNodeView from './TabsNodeView.vue'

export interface TabItem {
  id: string
  label: string
  content: string
}

export const TabsNode = {} /* Node.create({
  name: 'tabs',

  group: 'block',

  content: 'block*',

  defining: true,

  addAttributes() {
    return {
      tabs: {
        default: [
          { id: 'tab1', label: 'Tab A', content: '' },
          { id: 'tab2', label: 'Tab B', content: '' },
        ],
        parseHTML: element => {
          const tabsData = element.getAttribute('data-tabs')
          return tabsData ? JSON.parse(tabsData) : []
        },
        renderHTML: attributes => {
          return { 'data-tabs': JSON.stringify(attributes.tabs) }
        },
      },
      style: {
        default: 'default', // 'default', 'box', 'box-red', 'box-yellow', 'box-green', 'box-blue', 'box-brand'
        parseHTML: element => {
          const classList = element.classList
          if (classList.contains('tabs-box-red')) return 'box-red'
          if (classList.contains('tabs-box-yellow')) return 'box-yellow'
          if (classList.contains('tabs-box-green')) return 'box-green'
          if (classList.contains('tabs-box-blue')) return 'box-blue'
          if (classList.contains('tabs-box-brand')) return 'box-brand'
          if (classList.contains('tabs-box')) return 'box'
          return 'default'
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.custom-block.tabs',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const style = HTMLAttributes.style || 'default'
    const className = style === 'default' 
      ? 'custom-block tabs' 
      : `custom-block tabs tabs-${style}`
    return ['div', mergeAttributes(HTMLAttributes, { class: className }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(TabsNodeView)
  },

  addCommands() {
    return {
      setTabs: (style: string = 'default', tabCount: number = 2) => ({ commands }: any) => {
        const tabs = []
        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        for (let i = 0; i < tabCount; i++) {
          tabs.push({
            id: `tab${i + 1}`,
            label: `Tab ${labels[i] || i + 1}`,
            content: `Content for tab ${labels[i] || i + 1}`,
          })
        }
        return commands.insertContent({
          type: this.name,
          attrs: { tabs, style },
        })
      },
    }
  },
}) */
