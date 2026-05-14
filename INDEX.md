# 📋 AI PM Playbook — 总索引

> 所有文档一目了然。按模块、按主题、按场景快速定位。

---

## 🧭 按模块索引

### 01 — AI 产品框架

| 文件 | 核心内容 | 页数 | 适用场景 |
|------|---------|:----:|---------|
| [`ai-product-canvas.md`](./01-ai-product-framework/ai-product-canvas.md) | 9 大模块产品画布：问题→模型选型→数据策略→评估→落地 | 268 行 | 立项前的框架梳理 |
| [`agent-product-canvas.md`](./01-ai-product-framework/agent-product-canvas.md) | Agent 能力边界、工具定义、记忆设计、安全、成本 | 333 行 | Agent 产品规划 |
| [`rag-product-canvas.md`](./01-ai-product-framework/rag-product-canvas.md) | 检索策略、分块、上下文窗口、延迟优化 | 441 行 | RAG 系统设计 |
| [`human-in-the-loop-canvas.md`](./01-ai-product-framework/human-in-the-loop-canvas.md) | 决策点、置信度阈值、审核流程、回退机制 | 452 行 | 人机协作产品 |

### 02 — PRD 模板

| 文件 | 独特章节 | 适用产品类型 |
|------|---------|-------------|
| [`ai-saas-prd-template.md`](./02-prd-templates/ai-saas-prd-template.md) | 模型选型矩阵、推理成本预算、延迟 SLA | AI SaaS 产品 |
| [`agent-prd-template.md`](./02-prd-templates/agent-prd-template.md) | 能力边界声明、三层记忆策略、用户授权模型 | AI Agent 产品 |
| [`coding-agent-prd-template.md`](./02-prd-templates/coding-agent-prd-template.md) | 语言支持策略、上下文窗口分配、安全审查清单 | 代码生成 Agent |
| [`rag-prd-template.md`](./02-prd-templates/rag-prd-template.md) | 知识源管线、分块策略、Embedding 选型、引用溯源 | RAG 知识库产品 |
| [`data-platform-prd-template.md`](./02-prd-templates/data-platform-prd-template.md) | 数据采集管线、6 种标注类型、质量监控、隐私分级 | AI 数据平台 |

### 03 — 案例研究

| 文件 | 行业 | 产品类型 | 核心专题 |
|------|------|---------|---------|
| [`appsignal-case-study.md`](./03-case-studies/appsignal-case-study.md) | 隐私合规 | AI 内容平台 | AI 分析 + 人工审核、隐私政策结构化、风险评分 |
| [`openfooddata-case-study.md`](./03-case-studies/openfooddata-case-study.md) | 营养健康 | 数据平台 | 多源数据聚合、评分方法论、搜索范式、数据质量体系 |
| [`aurora-agentos-case-study.md`](./03-case-studies/aurora-agentos-case-study.md) | AI 基础设施 | Agent 操作系统 | Agent 编排、记忆架构、可观测性 |
| [`falcon-case-study.md`](./03-case-studies/falcon-case-study.md) | AI 基础设施 | 推理优化 | 量化策略、部署方案、成本优化 |
| [`autonomous-driving-data-platform-case-study.md`](./03-case-studies/autonomous-driving-data-platform-case-study.md) | 自动驾驶 | 数据平台 | 数据采集、AI 标注、仿真、版本管理 |

### 04 — AI 评估体系

| 文件 | 核心指标 | 评估工具/框架 |
|------|---------|--------------|
| [`agent-evaluation-metrics.md`](./04-ai-evaluation/agent-evaluation-metrics.md) | 任务完成率、回退率、用户干预率、延迟分布、成本/任务比 | AgentBench, GAIA |
| [`llm-output-quality.md`](./04-ai-evaluation/llm-output-quality.md) | 准确率、幻觉率、格式合规、一致性、安全性 | 自动化评估、人工评估 |
| [`tool-call-success-rate.md`](./04-ai-evaluation/tool-call-success-rate.md) | 工具选择准确率、参数填充率、执行成功率、错误恢复率 | 端到端成功率 |
| [`product-success-metrics.md`](./04-ai-evaluation/product-success-metrics.md) | 留存、DAU/MAU、NPS、完成任务时间、ROI | 产品级指标 |

### 05 — Agent 产品设计

| 文件 | 核心概念 | 关键框架/模式 |
|------|---------|--------------|
| [`agent-loop.md`](./05-agent-product-design/agent-loop.md) | 感知-推理-行动循环 | 单轮/多轮/分层拓扑、状态管理 |
| [`ai-tool-taxonomy-and-agent-loop.md`](./05-agent-product-design/ai-tool-taxonomy-and-agent-loop.md) | AI 工具形态分类与 Agent Loop 升级路径 | 三层结构、9 类工具、价值判断、Agent Loop 设计要点 |
| [`memory-design.md`](./05-agent-product-design/memory-design.md) | 短期/中期/长期记忆 | 检索策略、上下文压缩、存储选型 |
| [`permission-and-approval.md`](./05-agent-product-design/permission-and-approval.md) | RBAC/ABAC/ReBAC | 审批引擎、授权模式、交互设计 |
| [`multi-agent-workflow.md`](./05-agent-product-design/multi-agent-workflow.md) | 层级式/管道式/市场式 | 通信协议、任务分配、冲突解决 |
| [`observability.md`](./05-agent-product-design/observability.md) | Logging/Metrics/Tracing | 告警、调试、会话回放 |

### 06 — AI PM 职业发展

| 文件 | 核心内容 | 适合人群 |
|------|---------|---------|
| [`ai-pm-roadmap.md`](./06-ai-pm-career/ai-pm-roadmap.md) | L1-L4 四阶段成长路线图 | 入门/转行 PM |
| [`ai-pm-skill-map.md`](./06-ai-pm-career/ai-pm-skill-map.md) | 硬技能/软技能/工具技能图谱 | 所有 AI PM |
| [`portfolio-building-guide.md`](./06-ai-pm-career/portfolio-building-guide.md) | 作品集模板、STAR 升级版 | 求职/跳槽 PM |
| [`pm-toolkit.md`](./06-ai-pm-career/pm-toolkit.md) | 立项 Checklist、CEO 沟通框架、Demo 技巧 | 日常实操 |

### 07 — 提示词工程

| 文件 | 提示词数量 | 适用场景 |
|------|:---------:|---------|
| [`prd-prompts.md`](./07-prompts/prd-prompts.md) | 8 个 | 写各类 AI 产品的 PRD |
| [`user-research-prompts.md`](./07-prompts/user-research-prompts.md) | 8 个 | 用户访谈、问卷、竞品分析 |
| [`roadmap-prompts.md`](./07-prompts/roadmap-prompts.md) | 8 个 | 路线图规划、OKR 拆解、优先级排序 |
| [`evaluation-prompts.md`](./07-prompts/evaluation-prompts.md) | 10 个 | LLM 评估、Agent 评估、A/B 测试 |

### 08 — 用户研究

| 文件 | 核心内容 | 解决什么问题 |
|------|---------|-------------|
| [`user-research-methods.md`](./08-user-research/user-research-methods.md) | AI 产品用户研究方法论、可用性测试、Beta 设计 | 传统方法在 AI 产品中怎么改 |
| [`demand-validation.md`](./08-user-research/demand-validation.md) | Fake Door Test、Concierge MVP、需求评估矩阵 | 用户到底需不需要这个 AI 功能 |
| [`expectation-management.md`](./08-user-research/expectation-management.md) | 能力边界披露、置信度视觉化、失败兜底设计 | 怎么不让用户对 AI 期望过高 |

### 09 — 商业化

| 文件 | 核心内容 | 解决什么问题 |
|------|---------|-------------|
| [`pricing-strategies.md`](./09-monetization/pricing-strategies.md) | 4 种定价模式、免费层设计、企业定价 | AI 产品该怎么收费 |
| [`token-economics.md`](./09-monetization/token-economics.md) | 成本拆解、模型分级、缓存策略、限速设计 | 推理成本怎么控制不烧钱 |
| [`b2b-vs-consumer.md`](./09-monetization/b2b-vs-consumer.md) | B端 vs C端差异、私有部署、SLA 设计 | 怎么同时服务企业和个人用户 |

### 10 — 安全合规

| 文件 | 核心内容 | 解决什么问题 |
|------|---------|-------------|
| [`content-safety-framework.md`](./10-compliance/content-safety-framework.md) | 三层安全架构、分级策略、幻觉管控 | 怎么保证 AI 内容安全 |
| [`privacy-compliance.md`](./10-compliance/privacy-compliance.md) | 个保法/GDPR 解读、数据脱敏、用户控制 | 数据隐私合规怎么做 |
| [`ai-audit-transparency.md`](./10-compliance/ai-audit-transparency.md) | 审计日志、可解释性、企业合规报告 | 用户问'为什么给这个回答'怎么办 |
| [`ai-governance-checklist.md`](./10-compliance/ai-governance-checklist.md) | 68 项上线检查清单、P0/P1/P2 分级 | AI 产品上线前必查清单 |

### 11 — 开发流程

| 文件 | 核心内容 | 解决什么问题 |
|------|---------|-------------|
| [`product-lifecycle-guide.md`](./11-dev-process/product-lifecycle-guide.md) | 12 周全流程、Go/No-Go 决策、时间线陷阱 | AI 产品怎么从 0 做到 1 |
| [`prompt-management.md`](./11-dev-process/prompt-management.md) | Prompt 版本控制、测试流程、发布策略 | Prompt 怎么像代码一样管理 |
| [`pm-mle-collaboration.md`](./11-dev-process/pm-mle-collaboration.md) | 角色职责矩阵、决策权归属、冲突处理 | PM 和工程师怎么分工 |
| [`model-iteration-playbook.md`](./11-dev-process/model-iteration-playbook.md) | 灰度策略、影响评估、回滚机制、A/B 测试 | 模型升级怎么不翻车 |

---

## 🔍 按场景搜索

| 你在做什么 | 推荐阅读 |
|-----------|---------|
| **接到一个新 AI 产品需求** | 需求验证 → 产品画布 → PRD 模板 → 评估指标 |
| **要设计一个 Agent** | Agent 画布 → Agent 循环 → 记忆设计 → 权限审批 |
| **要给模型做评测** | LLM 输出质量 → 工具调用评估 → 评估 Prompts |
| **要转型做 AI PM** | 成长路线图 → 技能图谱 → 作品集指南 |
| **要写一份 PRD** | 选对应 PRD 模板 → 看案例 → 用 Prompts |
| **要定价和算成本** | 定价策略 → Token 经济学 → B端 vs C端设计 |
| **要上线 AI 产品** | 安全合规清单 → 从 0 到 1 全流程 → 模型升级灰度 |
| **要管理用户期望** | 用户期望管理 → Demo 技巧 → 内容安全框架 |
| **要设计多 Agent 系统** | 多 Agent 工作流 → 可观测性 → 案例研究 |

---

## 📊 文档统计

| 模块 | 文件数 | 总行数 | 估算阅读时间 |
|------|:------:|:------:|:-----------:|
| 01 产品框架 | 4 | 1,494 | 60 min |
| 02 PRD 模板 | 5 | 1,230 | 50 min |
| 03 案例研究 | 5 | 2,612 | 110 min |
| 04 评估体系 | 4 | 1,249 | 50 min |
| 05 Agent 设计 | 6 | 3,599 | 140 min |
| 06 职业发展 | 4 | 1,297 | 50 min |
| 07 Prompts | 4 | 2,009 | 40 min |
| 08 用户研究 | 3 | 1,542 | 60 min |
| 09 商业化 | 3 | 2,060 | 80 min |
| 10 安全合规 | 4 | 1,482 | 60 min |
| 11 开发流程 | 4 | 1,524 | 60 min |
| **合计** | **46** | **20,098** | **~13 小时** |

---

> 📖 **在线文档**: https://prodthinkpm.github.io/ai-pm-playbook/
> 💡 **有问题或建议?** 提交 [Issue](https://github.com/prodthinkpm/ai-pm-playbook/issues)
