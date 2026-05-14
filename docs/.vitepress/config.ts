import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AI PM Playbook',
  description: '从产品经理到 AI 产品架构师的实战指南',
  lang: 'zh-CN',
  base: '/ai-pm-playbook/',

  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: [
    /^\.\.\//,
    /^\.\//,
    /\/INDEX\.md$/,
    /README\.md/,
    /ai-pm-playbook/,
  ],

  head: [
    ['link', { rel: 'icon', href: '/ai-pm-playbook/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#8A2BE2' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '产品框架', link: '/guide/01-framework/ai-product-canvas' },
      { text: 'PRD 模板', link: '/guide/02-prd/ai-saas-prd-template' },
      { text: '案例研究', link: '/guide/03-cases/openharness-case-study' },
      { text: 'GitHub', link: 'https://github.com/prodthinkpm/ai-pm-playbook' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速导航', link: '/guide/' },
            { text: 'INDEX 总索引', link: '/guide/index' },
          ],
        },
        {
          text: '01 — AI 产品框架',
          items: [
            { text: 'AI 产品画布', link: '/guide/01-framework/ai-product-canvas' },
            { text: 'Agent 产品画布', link: '/guide/01-framework/agent-product-canvas' },
            { text: 'RAG 产品画布', link: '/guide/01-framework/rag-product-canvas' },
            { text: 'HITL 产品画布', link: '/guide/01-framework/human-in-the-loop-canvas' },
          ],
        },
        {
          text: '02 — PRD 模板',
          items: [
            { text: 'AI SaaS PRD', link: '/guide/02-prd/ai-saas-prd-template' },
            { text: 'Agent PRD', link: '/guide/02-prd/agent-prd-template' },
            { text: 'Coding Agent PRD', link: '/guide/02-prd/coding-agent-prd-template' },
            { text: 'RAG PRD', link: '/guide/02-prd/rag-prd-template' },
            { text: '数据平台 PRD', link: '/guide/02-prd/data-platform-prd-template' },
          ],
        },
        {
          text: '03 — 案例研究',
          items: [
            { text: 'AI 评估平台 (OpenHarness)', link: '/guide/03-cases/openharness-case-study' },
            { text: 'Agent 操作系统 (Aurora)', link: '/guide/03-cases/aurora-agentos-case-study' },
            { text: '推理优化 (Falcon)', link: '/guide/03-cases/falcon-case-study' },
            { text: '自动驾驶数据平台', link: '/guide/03-cases/autonomous-driving-data-platform-case-study' },
          ],
        },
        {
          text: '04 — AI 评估体系',
          items: [
            { text: 'Agent 评估指标', link: '/guide/04-evaluation/agent-evaluation-metrics' },
            { text: 'LLM 输出质量', link: '/guide/04-evaluation/llm-output-quality' },
            { text: '工具调用成功率', link: '/guide/04-evaluation/tool-call-success-rate' },
            { text: '产品成功指标', link: '/guide/04-evaluation/product-success-metrics' },
          ],
        },
        {
          text: '05 — Agent 产品设计',
          items: [
            { text: 'Agent 循环', link: '/guide/05-agent-design/agent-loop' },
            { text: '记忆设计', link: '/guide/05-agent-design/memory-design' },
            { text: '权限与审批', link: '/guide/05-agent-design/permission-and-approval' },
            { text: '多 Agent 工作流', link: '/guide/05-agent-design/multi-agent-workflow' },
            { text: '可观测性', link: '/guide/05-agent-design/observability' },
          ],
        },
        {
          text: '06 — AI PM 职业发展',
          items: [
            { text: '成长路线图', link: '/guide/06-career/ai-pm-roadmap' },
            { text: '技能图谱', link: '/guide/06-career/ai-pm-skill-map' },
            { text: '作品集指南', link: '/guide/06-career/portfolio-building-guide' },
          ],
        },
        {
          text: '07 — 提示词工程',
          items: [
            { text: 'PRD Prompts', link: '/guide/07-prompts/prd-prompts' },
            { text: '用户研究 Prompts', link: '/guide/07-prompts/user-research-prompts' },
            { text: '路线图 Prompts', link: '/guide/07-prompts/roadmap-prompts' },
            { text: '评估 Prompts', link: '/guide/07-prompts/evaluation-prompts' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/prodthinkpm/ai-pm-playbook' },
    ],

    footer: {
      message: 'MIT License',
      copyright: 'Copyright © 2026 prodthinkpm',
    },

    editLink: {
      pattern: 'https://github.com/prodthinkpm/ai-pm-playbook/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    search: { provider: 'local' },
  },
})
