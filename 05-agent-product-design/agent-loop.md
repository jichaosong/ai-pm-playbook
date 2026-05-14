# Agent 循环设计：感知-推理-行动循环

## 一、核心概念

Agent 循环（Agent Loop）是 AI Agent 产品的基本执行单元，定义了 Agent 如何与环境交互、处理信息并采取行动的通用模式。其核心是 **感知（Perceive）→ 推理（Reason）→ 行动（Act）** 的三阶段循环：

```
┌─────────────────────────────────────────┐
│            Agent Loop                    │
│                                         │
│   ┌──────────┐    ┌──────────┐          │
│   │ 感知      │───→│ 推理      │          │
│   │ Perceive  │    │ Reason   │          │
│   └──────────┘    └──────────┘          │
│        ↑               │                │
│        │               ↓                │
│   ┌──────────┐    ┌──────────┐          │
│   │ 反馈      │←───│ 行动      │          │
│   │ Feedback │    │ Act      │          │
│   └──────────┘    └──────────┘          │
└─────────────────────────────────────────┘
```

| 阶段 | 说明 | 关键问题 |
|------|------|----------|
| **感知 (Perceive)** | 从环境/用户/工具中获取输入 | 感知什么？何时感知？感知粒度？ |
| **推理 (Reason)** | 利用 LLM/规则对信息进行分析决策 | 使用什么模型？需要多少上下文？ |
| **行动 (Act)** | 执行决策结果（调用工具、返回响应） | 执行什么？失败怎么处理？ |
| **反馈 (Feedback)** | 行动结果回传，驱动下一轮循环 | 如何评估结果？何时终止循环？ |

## 二、循环拓扑设计模式

### 2.1 单轮循环（Single-Turn）

最简单的模式：一次感知 → 推理 → 行动即结束。适用于一次性问答、简单指令执行。

**特点：**
- 无状态，每次请求独立
- 低延迟，适合实时场景
- 不适合复杂多步任务

```python
# 单轮循环示例
class SingleTurnAgent:
    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
    
    async def run(self, user_input: str) -> str:
        # 1. 感知：解析用户输入
        perceived = self._perceive(user_input)
        
        # 2. 推理：LLM 决策
        decision = await self.llm.decide(
            prompt=perceived,
            tools=list(self.tools.keys())
        )
        
        # 3. 行动：执行或返回
        if decision.tool_call:
            result = await self.tools[decision.tool_name].execute(**decision.args)
            return result
        return decision.response
```

**配置示例（YAML）：**
```yaml
agent:
  name: simple_chatbot
  loop_type: single_turn
  llm:
    model: gpt-4o-mini
    temperature: 0.3
  tools:
    - weather_lookup
    - calculator
  termination:
    max_turns: 1
```

### 2.2 多轮循环（Multi-Turn）

Agent 可以在同一个会话中执行多轮感知-推理-行动，每轮的结果影响下一轮。适用于复杂任务分解执行。

**特点：**
- 维持会话状态
- 支持任务分解与逐步执行
- 需要终止条件设计

```python
# 多轮循环示例
class MultiTurnAgent:
    def __init__(self, llm, tools, max_turns=10):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
        self.max_turns = max_turns
        self.history = []
    
    async def run(self, task: str) -> str:
        self.history = [{"role": "user", "content": task}]
        
        for turn in range(self.max_turns):
            # 感知：读取历史 + 当前状态
            context = self._build_context()
            
            # 推理：LLM 决策
            decision = await self.llm.decide(context)
            
            # 终止条件检查
            if decision.is_final:
                return decision.response
            
            # 行动：执行工具调用
            if decision.tool_call:
                result = await self.tools[decision.tool_name].execute(**decision.args)
                self.history.append({"role": "assistant", "content": f"调用 {decision.tool_name}: {result}"})
            
            # 反馈：检查是否达到终止条件
            if self._should_terminate(decision):
                break
        
        return "已达最大轮数，任务未完成"
    
    def _should_terminate(self, decision) -> bool:
        # 终止条件策略
        return (
            decision.is_final or
            decision.contains_answer or
            self._is_stuck()  # 检测是否循环重复
        )
```

**配置示例（YAML）：**
```yaml
agent:
  name: research_assistant
  loop_type: multi_turn
  max_turns: 15
  termination:
    strategies:
      - type: explicit_complete  # Agent 主动声明完成
      - type: max_turns          # 达到最大轮数
        limit: 15
      - type: stagnation          # N 轮无进展
        n_rounds: 3
      - type: loop_detection      # 检测重复模式
        window: 5
      - type: cost_limit          # 成本上限
        max_cost: 0.5  # USD
  state:
    persistence: redis
    ttl: 3600  # 会话过期时间
```

### 2.3 分层循环（Hierarchical Loop）

高层 Agent 管理低层 Agent，形成嵌套循环。适用于大型复杂系统，每层关注不同抽象级别。

**特点：**
- 职责分离：高层负责规划，低层负责执行
- 可扩展：可动态增加子 Agent
- 复杂度高，需精心设计通信协议

```python
# 分层循环示例
class HierarchicalAgent:
    """分层 Agent：高层规划，低层执行"""
    
    def __init__(self, level=0, max_depth=3):
        self.level = level          # 当前层级
        self.max_depth = max_depth
        self.sub_agents = []        # 子 Agent 列表
        self.llm = get_llm_for_level(level)
        self.state = AgentState()
    
    async def run(self, objective: str):
        if self.level >= self.max_depth:
            return await self._execute_leaf(objective)
        
        # 高层：分解任务
        subtasks = await self._decompose(objective)
        
        results = []
        for subtask in subtasks:
            # 为每个子任务创建或分配子 Agent
            sub_agent = self._get_or_create_sub_agent(subtask.type)
            result = await sub_agent.run(subtask.description)
            results.append(result)
            
            # 高层监控：检查子任务进度
            if not self._validate_subtask_result(result):
                # 子任务失败，重新规划
                subtask = await self._replan(subtask, result)
                result = await sub_agent.run(subtask.description)
        
        # 汇总结果
        return await self._aggregate(results)
    
    async def _decompose(self, objective: str) -> list[SubTask]:
        """将目标分解为子任务"""
        response = await self.llm.complete(
            f"将以下目标分解为可执行的子任务：\n{objective}\n"
            f"每个子任务需包含：type, description, dependencies"
        )
        return parse_subtasks(response)
```

**配置示例（YAML）：**
```yaml
agent:
  name: enterprise_research_system
  loop_type: hierarchical
  max_depth: 3
  supervisor:
    model: gpt-4o       # 高层用强模型
    temperature: 0.2
    planning_strategy: top_down  # top_down | bottom_up | dynamic
  workers:
    - role: web_searcher
      model: gpt-4o-mini
      tools: [web_search, web_scrape]
      max_turns: 5
      count: 3  # 并行 worker 数量
    - role: data_analyst
      model: gpt-4o
      tools: [python_repl, file_operations]
      max_turns: 10
    - role: report_writer
      model: gpt-4o
      tools: [file_write, template_render]
      max_turns: 3
  delegation:
    strategy: capability_based  # capability_based | round_robin | load_balanced
    timeout: 60  # 子任务超时(秒)
```

## 三、状态管理

### 3.1 状态类型

| 状态类型 | 作用域 | 存储位置 | 示例 |
|----------|--------|----------|------|
| **会话状态** | 单次会话 | 内存/Redis | 对话历史、中间结果 |
| **用户状态** | 跨会话 | 数据库 | 用户偏好、历史记录 |
| **全局状态** | 全系统 | 数据库/分布式存储 | 系统配置、全局缓存 |

### 3.2 状态管理设计模式

```python
# 状态管理器
class AgentStateManager:
    """统一的状态管理"""
    
    def __init__(self):
        self.session_store = InMemoryStore()   # 会话级（短期）
        self.work_store = RedisStore(ttl=86400) # 工作级（中期）
        self.persist_store = PostgresStore()    # 持久级（长期）
    
    async def get_state(self, session_id: str, scope: str = "session"):
        if scope == "session":
            return await self.session_store.get(session_id)
        elif scope == "work":
            return await self.work_store.get(session_id)
        else:
            return await self.persist_store.get(session_id)
    
    async def checkpoint(self, session_id: str):
        """保存检查点，用于中断恢复"""
        state = await self.session_store.get(session_id)
        await self.work_store.set(
            f"checkpoint:{session_id}",
            state,
            ttl=604800  # 保存 7 天
        )
```

### 3.3 状态检查点配置

```yaml
state_management:
  checkpoint:
    strategy: periodic      # periodic | on_action | manual
    interval: 3             # 每 3 轮保存一次
    storage: 
      type: redis
      ttl: 604800           # 检查点保存 7 天
  recovery:
    auto_restore: true
    on_failure: rollback    # rollback | retry | abort
    max_retries: 3
```

## 四、中断与恢复

### 4.1 中断类型

| 中断类型 | 触发条件 | 处理方式 |
|----------|----------|----------|
| **用户中断** | 用户手动停止 | 保存状态，返回部分结果 |
| **超时中断** | 超过执行时限 | 强制终止，记录失败原因 |
| **错误中断** | 工具调用异常 | 重试/回退/通知用户 |
| **成本中断** | 超过成本预算 | 终止循环，返回已有结果 |

### 4.2 中断恢复设计

```python
class InterruptHandler:
    """中断与恢复处理器"""
    
    async def handle_interrupt(self, session_id: str, reason: InterruptReason):
        # 1. 保存检查点
        checkpoint = await self.save_checkpoint(session_id)
        
        # 2. 记录中断原因
        await self.log_interrupt(session_id, reason, checkpoint)
        
        # 3. 通知用户
        await self.notify_user(session_id, 
            f"任务因 {reason} 中断，已保存进度。可用 /resume {checkpoint.id} 恢复。")
        
        return checkpoint
    
    async def resume(self, checkpoint_id: str):
        checkpoint = await self.load_checkpoint(checkpoint_id)
        
        # 恢复所有状态
        await self.state_manager.restore(checkpoint.state)
        
        # 从断点继续执行
        return await self.agent.continue_from(checkpoint.last_action)
```

**配置示例（YAML）：**
```yaml
interrupt_handling:
  timeouts:
    per_turn: 30           # 单轮超时
    total: 300              # 总超时
  cost_limits:
    max_per_session: 1.0    # 单次会话最多 $1
    max_per_turn: 0.1       # 单轮最多 $0.1
  recovery:
    checkpoint_on_interrupt: true
    resume_endpoint: /api/agent/resume
    cleanup_orphaned: true
    orphaned_ttl: 3600       # 孤立会话 1 小时后清理
```

## 五、最佳实践总结

1. **选择合适循环拓扑**：简单任务用单轮，复杂多步用多轮，系统级用分层
2. **设计清晰的终止条件**：避免无限循环或空转浪费成本
3. **保存检查点**：关键步骤后保存状态，支持中断恢复
4. **监控循环健康度**：记录每轮耗时、LLM 调用次数、工具调用成功率
5. **限制单轮成本**：防止某个环节无限重试或大量消耗 Token
6. **用户可见性**：让用户了解 Agent 当前处于哪个阶段、下一步要做什么

## 六、实际产品案例

| 产品 | 循环类型 | 关键设计 |
|------|----------|----------|
| **AutoGPT** | 多轮循环 | 长目标分解、自我反思、Web 搜索循环 |
| **Claude Code (SWE-bench)** | 多轮循环 + 检查点 | 每步状态持久化、故障自动恢复 |
| **ChatGPT Code Interpreter** | 分层循环 | 高层规划→代码生成→执行→结果分析 |
| **Microsoft Copilot (Studio)** | 分层循环 | Adaptive Card 编排、Topic 级状态管理 |
| **LangGraph Agent** | 多轮循环 + 图拓扑 | 有向无环图定义循环、条件边控制流程 |
| **Devin** | 分层循环 + 全托管 | 规划器→编码器→执行器→调试器四层循环 |
