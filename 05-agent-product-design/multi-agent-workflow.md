# 多 Agent 工作流设计：编排、通信与协作

## 一、核心概念

多 Agent 工作流（Multi-Agent Workflow）是指多个 AI Agent 协同完成复杂任务的设计范式。随着单 Agent 能力增强，多 Agent 系统成为解决超大复杂度任务、模拟组织协作、提升系统鲁棒性的关键架构。

### 1.1 为什么需要多 Agent？

```
单 Agent 瓶颈                   多 Agent 优势
┌──────────────┐              ┌──────────────┐
│ 上下文窗口限制 │              │ 分治：各司其职 │
│ 单点故障风险  │     ─→      │ 冗余：高可用  │
│ 能力单一化   │              │ 专业：更优质量 │
│ 缺乏多视角  │              │ 辩论：减少偏见 │
│ 难以水平扩展 │              │ 扩展：按需增加 │
└──────────────┘              └──────────────┘
```

### 1.2 多 Agent 系统的核心挑战

| 挑战 | 说明 | 关键问题 |
|------|------|----------|
| **编排** | 如何组织 Agent 的协作结构 | 谁决策？谁执行？如何分工？ |
| **通信** | Agent 间如何交换信息 | 同步/异步？协议？消息格式？ |
| **任务分配** | 如何将任务分派给合适的 Agent | 动态/静态？能力匹配？负载均衡？ |
| **冲突解决** | 意见不一致时如何处理 | 投票？仲裁？层级决策？ |
| **状态一致** | 如何保持全局状态一致 | 共享状态 vs 事件驱动？ |

## 二、Agent 编排模式

### 2.1 层级式编排（Hierarchical）

一个"主管"Agent 管理多个"子"Agent，形成树状组织结构。

```
                     ┌─────────────┐
                     │  Supervisor   │
                     │   (主管)      │
                     └──────┬──────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
       │ Planner  │    │ Executor│    │ Reviewer│
       │ (规划)   │    │ (执行)  │    │ (审查)   │
       └─────────┘    └─────────┘    └─────────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
          ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
          │Coder A  │ │Coder B │ │Tester  │
          └─────────┘ └────────┘ └────────┘
```

```python
class HierarchicalOrchestrator:
    """层级式编排器"""
    
    def __init__(self, supervisor: Agent, workers: dict[str, list[Agent]]):
        self.supervisor = supervisor
        self.workers = workers  # {"planner": [...], "executor": [...], ...}
        self.task_queue = asyncio.Queue()
        self.results = {}
    
    async def run(self, objective: str) -> dict:
        # 1. 主管分解任务
        plan = await self.supervisor.plan(objective)
        
        # 2. 分配子任务
        for step in plan.steps:
            agent = self._select_worker(step.required_role)
            self.task_queue.put_nowait((step, agent))
        
        # 3. 并行执行（主管监控进度）
        workers = [
            self._execute_with_supervision(step, agent)
            for step, agent in self._drain_queue()
        ]
        results = await asyncio.gather(*workers)
        
        # 4. 主管汇总审查
        final = await self.supervisor.review(objective, results)
        return final
    
    async def _execute_with_supervision(self, step, agent):
        """在主管监督下执行子任务"""
        result = await agent.execute(step)
        # 主管可随时介入纠正
        if self.supervisor.should_intervene(result):
            correction = await self.supervisor.correct(step, result)
            result = await agent.execute(correction)
        return result
```

**配置示例（YAML）：**
```yaml
orchestration:
  mode: hierarchical
  supervisor:
    role: "首席架构师"
    model: gpt-4o
    responsibilities:
      - task_decomposition   # 任务分解
      - worker_assignment    # 任务分配
      - quality_review       # 质量审查
      - conflict_resolution  # 冲突解决
    max_children: 10
  
  worker_pools:
    - role: planner
      agents: 2
      model: gpt-4o-mini
      capabilities: [reasoning, planning]
    - role: executor
      agents: 5
      model: claude-3.5-sonnet
      capabilities: [coding, debugging]
    - role: reviewer
      agents: 2
      model: gpt-4o
      capabilities: [code_review, testing]
  
  escalation:
    strategy: auto
    max_retries: 3
    escalate_to: human  # 自动升级到人类
```

### 2.2 管道式编排（Pipeline）

任务在 Agent 之间顺序传递，每个 Agent 完成一个环节，类似工厂流水线。

```
输入 → [Agent A] → [Agent B] → [Agent C] → [Agent D] → 输出
        清洗       分析       生成       审校
```

```python
class Pipeline:
    """管道式编排"""
    
    def __init__(self, stages: list[Stage]):
        self.stages = stages
    
    async def execute(self, input_data: Any) -> Any:
        current = input_data
        
        for stage in self.stages:
            # 每个阶段可能有多个并行 worker
            if stage.parallel:
                # 扇出（Fan-out）：并行处理
                tasks = [worker.execute(current) for worker in stage.workers]
                results = await asyncio.gather(*tasks)
                # 扇入（Fan-in）：合并结果
                current = stage.aggregator(results)
            else:
                # 串行处理
                for worker in stage.workers:
                    current = await worker.execute(current)
            
            # 阶段间可插入质量门禁
            if stage.gate and not await stage.gate.check(current):
                current = await stage.gate.fallback(current)
        
        return current
```

**配置示例（YAML）：**
```yaml
orchestration:
  mode: pipeline
  
  pipeline:
    - stage: data_collection
      workers:
        - role: web_scraper
          tools: [search, fetch]
      parallel: true
      aggregator: merge_deduplicate
      gate:
        check: non_empty
        fallback: retry_once
    
    - stage: analysis
      workers:
        - role: data_analyst
          model: gpt-4o
      parallel: false
      gate:
        check: has_insights
        fallback: re_analyze
    
    - stage: generation
      workers:
        - role: writer
          model: gpt-4o
          style: formal
      parallel: false
      gate:
        check: min_length_1000
        fallback: expand_content
    
    - stage: review
      workers:
        - role: quality_reviewer
          model: gpt-4o
          criteria: [accuracy, completeness, style]
      parallel: true  # 多个审查员
      aggregator: vote  # 投票决定是否通过
      gate:
        check: all_pass
        fallback: human_review
```

### 2.3 市场式编排（Market-based）

Agent 自由竞争/竞标任务，类似自由市场机制。最适合开放性任务和动态环境。

```
                    ┌─────────────────┐
                    │ Task Marketplace  │
                    │  (任务市场)      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │发布任务            │竞标               │ 完成
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ 任务发布者│        │  Agent 池│        │ 结算系统 │
    └─────────┘        └─────────┘        └─────────┘
                             │
            ┌────────────────┼────────────────┐
            │  Specialist A  │  Generalist B  │  Specialist C
            │  (出价 $0.50)  │  (出价 $0.30)  │  (出价 $0.80)
            └────────────────┴────────────────┴────────────────
```

```python
class MarketOrchestrator:
    """市场式编排器"""
    
    def __init__(self):
        self.agents: dict[str, Agent] = {}
        self.task_board: list[Task] = []
        self.completed: dict[str, Result] = {}
    
    async def publish_task(self, task: Task):
        """发布任务到市场"""
        self.task_board.append(task)
        
        # 通知所有 Agent 竞标
        bids = await asyncio.gather(*[
            agent.bid(task) for agent in self.agents.values()
        ])
        
        # 选择最优竞标
        winner = self._select_winner(bids, task.selection_criteria)
        
        if winner:
            task.assignee = winner.agent_id
            task.budget = winner.price
            
            # Agent 执行任务
            result = await self.agents[winner.agent_id].execute(task)
            
            # 验证结果
            if await self._verify_result(task, result):
                await self._settle_payment(task, winner)
                self.completed[task.id] = result
                return result
        
        return None
    
    def _select_winner(self, bids: list[Bid], criteria: dict) -> Bid | None:
        """根据多准则选择优胜者"""
        # 支持不同的选择策略：最低价、最高质量、最短时间、综合评分
        if criteria.get("strategy") == "cheapest":
            return min(bids, key=lambda b: b.price)
        elif criteria.get("strategy") == "best_quality":
            return max(bids, key=lambda b: b.quality_score)
        elif criteria.get("strategy") == "composite":
            # 综合评分：价格权重 + 质量权重 + 速度权重
            for bid in bids:
                bid.composite_score = (
                    criteria["weight_price"] * (1 / bid.price) +
                    criteria["weight_quality"] * bid.quality_score +
                    criteria["weight_speed"] * (1 / bid.estimated_time)
                )
            return max(bids, key=lambda b: b.composite_score)
        return None
```

**配置示例（YAML）：**
```yaml
orchestration:
  mode: market
  
  marketplace:
    task_board: redis  # 分布式任务看板
    bid_timeout: 30    # 竞标超时 30s
    selection_strategy: composite  # cheapest | fastest | best_quality | composite
    criteria_weights:
      price: 0.3
      quality: 0.5
      speed: 0.2
  
  agents:
    - name: specialist_coder
      capabilities: [python, react, typescript]
      base_price: 0.05  # 每次调用成本
      quality_history:
        window: 100     # 统计最近 100 次任务
    - name: generalist_helper
      capabilities: [research, writing, analysis]
      base_price: 0.02
      quality_history:
        window: 50
  
  settlement:
    mechanism: pay_per_task
    reputation_system: true
    penalty_for_failure: 2x  # 失败惩罚：扣除双倍费用
```

### 2.4 编排模式对比

| 维度 | 层级式 | 管道式 | 市场式 |
|------|--------|--------|--------|
| **控制方式** | 集中控制 | 顺序控制 | 分散控制 |
| **灵活性** | 中 | 低 | 高 |
| **可预测性** | 高 | 高 | 低 |
| **扩展性** | 中（主管可能成为瓶颈） | 低（流水线固定） | 高（动态加入Agent） |
| **复杂度** | 中 | 低 | 高 |
| **适用场景** | 复杂项目、软件开发 | 数据处理、内容生产 | 开放性任务、自由协作 |
| **代表产品** | Microsoft AutoGen | LangGraph | CrewAI |

## 三、通信协议

### 3.1 Agent 间通信模式

```yaml
communication_protocols:
  - name: direct_message     # 直接消息
    description: "Agent 之间点对点通信"
    pros: [低延迟、隐私性好]
    cons: [紧耦合、难以追踪]
    protocol: 
      transport: websocket / grpc
      format: json / msgpack
      pattern: request-response / fire-and-forget
  
  - name: event_bus         # 事件总线
    description: "通过消息队列广播事件"
    pros: [松耦合、可观测、历史可追溯]
    cons: [额外延迟、运维复杂]
    protocol:
      transport: kafka / redis pubsub / rabbitmq
      format: cloud events / custom schema
      pattern: pub-sub
  
  - name: shared_memory     # 共享黑板
    description: "所有 Agent 读写共享工作区"
    pros: [状态一致、方便协作]
    cons: [争用冲突、扩展瓶颈]
    protocol:
      storage: redis / postgresql
      structure: 黑板分区 (tasks / results / state / meta)
      concurrency: optimistic locking
```

### 3.2 消息格式规范

```yaml
# 标准 Agent 通信消息格式
agent_message:
  version: "2.0"
  
  # 消息头部
  header:
    message_id: string          # UUID
    sender: string              # Agent ID
    receiver: string | array    # Agent ID(s) 或 "broadcast"
    timestamp: datetime
    correlation_id: string      # 用于追踪消息链
    ttl: number                 # 消息过期时间(s)
  
  # 消息体
  body:
    type: string                # request | response | event | command
    action: string              # ask | answer | report | delegate | error
    payload: object             # 具体数据
    context:
      session_id: string
      task_id: string
      parent_message_id: string | null
  
  # 元信息
  metadata:
    priority: number            # 0-100
    security_level: string      # public | internal | confidential
    signature: string           # 消息签名（可选）
```

## 四、任务分配策略

### 4.1 静态分配 vs 动态分配

```python
class TaskDispatcher:
    """任务分配器"""
    
    def __init__(self, agents: dict[str, Agent]):
        self.agents = agents
    
    async def dispatch(
        self, task: Task, strategy: str = "capability"
    ) -> str:  # 返回选择的 Agent ID
        
        if strategy == "round_robin":
            return self._round_robin(task)
        elif strategy == "capability":
            return await self._capability_match(task)
        elif strategy == "load_balanced":
            return await self._load_balanced(task)
        elif strategy == "composite":
            return await self._composite_score(task)
    
    async def _capability_match(self, task: Task) -> str:
        """基于能力匹配的分配"""
        best_agent = None
        best_score = -1
        
        for agent_id, agent in self.agents.items():
            score = self._match_score(task.required_capabilities, agent.capabilities)
            if score > best_score:
                best_score = score
                best_agent = agent_id
        
        return best_agent
    
    async def _load_balanced(self, task: Task) -> str:
        """最小负载优先"""
        return min(
            self.agents.keys(),
            key=lambda aid: self.agents[aid].current_load
        )
    
    async def _composite_score(self, task: Task) -> str:
        """综合评分"""
        for agent_id, agent in self.agents.items():
            score = (
                0.4 * self._match_score(task.required_capabilities, agent.capabilities) +
                0.3 * (1 - agent.current_load / agent.max_load) +
                0.2 * agent.quality_score +
                0.1 * agent.availability
            )
            agent.composite_score = score
        return max(self.agents, key=lambda aid: self.agents[aid].composite_score)
```

**配置示例（YAML）：**
```yaml
task_dispatch:
  strategy: composite
  weights:
    capability_match: 0.4
    current_load: 0.3
    quality_history: 0.2
    availability: 0.1
  
  load_monitoring:
    enabled: true
    metrics: [active_tasks, queue_depth, cpu_usage]
    max_load_per_agent: 5  # 最多同时执行 5 个任务
  
  quality_tracking:
    window: 50  # 最近 50 个任务
    metrics: [success_rate, avg_duration, user_satisfaction]
```

## 五、冲突解决

### 5.1 常见冲突类型

| 冲突类型 | 场景 | 解决策略 |
|----------|------|----------|
| **意见分歧** | 多个 Agent 给出不同结论 | 投票、辩论、引入仲裁者 |
| **资源争用** | 多个 Agent 争用同一工具/API | 加锁、队列、优先级调度 |
| **目标冲突** | Agent 目标相互矛盾 | 全局优化、优先级排序、人工介入 |
| **信息不一致** | 对同一事实认知不同 | 引用来源、置信度评分、共识协议 |

### 5.2 冲突解决策略

```python
class ConflictResolver:
    """冲突解决器"""
    
    def __init__(self, strategy: str = "voting"):
        self.strategy = strategy
    
    async def resolve(
        self, conflict: Conflict, agents: list[Agent]
    ) -> Resolution:
        if self.strategy == "voting":
            return await self._voting(conflict, agents)
        elif self.strategy == "arbitration":
            return await self._arbitration(conflict, agents)
        elif self.strategy == "debate":
            return await self._debate(conflict, agents)
        elif self.strategy == "consensus":
            return await self._consensus(conflict, agents)
    
    async def _voting(self, conflict, agents):
        """投票：多数决"""
        votes = {}
        for agent in agents:
            vote = await agent.vote(conflict)
            confidence = await agent.get_confidence(vote)
            votes[vote] = votes.get(vote, 0) + confidence
        
        winner = max(votes, key=votes.get)
        return Resolution(decision=winner, method="voting", 
                         confidence=votes[winner] / sum(votes.values()))
    
    async def _debate(self, conflict, agents):
        """辩论：多轮讨论后达成一致"""
        debate_history = []
        
        for round in range(3):  # 最多 3 轮辩论
            arguments = await asyncio.gather(*[
                agent.argue(conflict, debate_history)
                for agent in agents
            ])
            debate_history.append(arguments)
            
            # 检查是否达成一致
            if self._check_consensus(arguments):
                return Resolution(
                    decision=arguments[0].position,
                    method="debate",
                    rounds=round + 1
                )
        
        # 辩论后仍未一致，仲裁
        return await self._arbitration(conflict, agents)
```

**配置示例（YAML）：**
```yaml
conflict_resolution:
  default_strategy: voting_with_confidence
  
  strategies:
    voting:
      min_voters: 3
      threshold: 0.6  # 60% 以上通过
      weight_by: [competence, historical_accuracy]
    
    arbitration:
      arbiter_role: supervisor
      human_escalation: true
      escalation_threshold: 2  # 连续 2 次冲突升级到人
    
    debate:
      max_rounds: 3
      timeout_per_round: 30
      consensus_threshold: 0.8  # 80% 一致即通过
    
    consensus:
      algorithm: raft_like  # 类似 Raft 一致性算法
      require_quorum: true
```

## 六、实际产品案例

| 产品 | 编排模式 | 通信方式 | 亮点 |
|------|----------|----------|------|
| **AutoGen (Microsoft)** | 层级式 + 对话式 | 直接消息 | 灵活的对话代理模式、支持人类介入 |
| **CrewAI** | 层级式 + 市场式 | 任务队列 | 角色定义简洁、任务委派机制灵活 |
| **LangGraph** | 管道式（图） | 状态图边传递 | 有向无环图编排、状态持久化、条件边 |
| **MetaGPT** | 层级式（公司模拟） | 共享黑板 | 模拟软件公司角色、SOP 驱动 |
| **ChatDev** | 管道式（瀑布流） | 结构化对话 | 虚拟软件公司、分阶段协作 |
| **OpenAI Swarm** | 层级式（轻量） | 函数调用传递 | 极简实现、Agent 间交接（Handoff） |
| **Google Agent2Agent (A2A)** | 市场式 | 标准协议(Card) | 跨平台 Agent 互操作、能力发现 |
