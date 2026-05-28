import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/agent-tech/',
  lang: 'zh-CN',
  title: 'Build An Agent',
  description: '从零开始，用代码构建一个真正的 AI Agent',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '开始阅读', link: '/guide/s01' },
    ],

    sidebar: [
      {
        text: 'Phase 1：最小 Agent',
        collapsed: false,
        items: [
          { text: 's01 - 调通 API', link: '/guide/s01' },
          { text: 's02 - 加入循环', link: '/guide/s02' },
          { text: 's03 - 第一个工具', link: '/guide/s03' },
          { text: 's04 - 工具路由', link: '/guide/s04' },
          { text: 's05 - 结果回流', link: '/guide/s05' },
        ],
      },
      {
        text: 'Phase 2：产品化',
        collapsed: false,
        items: [
          { text: 's06 - 对话界面', link: '/guide/s06' },
          { text: 's07 - 流式输出', link: '/guide/s07' },
          { text: 's08 - 内容渲染', link: '/guide/s08' },
          { text: 's09 - 状态管理', link: '/guide/s09' },
          { text: 's10 - 调用可视化', link: '/guide/s10' },
        ],
      },
      {
        text: 'Phase 3：工作流编排',
        collapsed: false,
        items: [
          { text: 's11 - 可视化画布', link: '/guide/s11' },
          { text: 's12 - 自定义节点', link: '/guide/s12' },
          { text: 's13 - 连线与执行', link: '/guide/s13' },
          { text: 's14 - 序列化', link: '/guide/s14' },
          { text: 's15 - 执行日志', link: '/guide/s15' },
        ],
      },
      {
        text: 'Phase 4：生产级加固',
        collapsed: false,
        items: [
          { text: 's16 - 权限与确认', link: '/guide/s16' },
          { text: 's17 - 错误恢复', link: '/guide/s17' },
          { text: 's18 - 部署上线', link: '/guide/s18' },
        ],
      },
    ],

    outline: {
      label: '本章目录',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一章',
      next: '下一章',
    },

    socialLinks: [
      { icon: 'x', link: 'https://x.com/grainrain_young' },
    ],
  },
})
