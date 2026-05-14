# 可观测性设计：Logging、Metrics、Tracing 与告警

## 一、核心概念

Agent 可观测性（Observability）是理解 Agent 系统内部状态和行为的能力，是 Agent 产品从"黑箱"走向"透明"的关键。与传统软件不同，Agent 系统的非确定性（LLM 输出不可预测）使可观测性成为**安全、调试、优化和信任的基础**。

### 1.1 Agent 可观测性的三大支柱

```
┌────────────────────────────────────────────────────────────┐
│                   Agent 可观测性                            │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Logging    │  │   Metrics    │  │   Tracing    │     │
│  │   (日志)     │  │   (指标)     │  │   (链路)     │     │
│  │              │  │              │  │              │     │
│  │ 执行日志     │  │ 延迟分布     │  │ 请求链路     │     │
│  │ 决策轨迹     │  │ 成功率       │  │ 依赖分析     │     │
│  │ 错误记录     │  │ Token 消耗   │  │ 跨服务追踪   │     │
│  │ LLM 调用     │  │ 成本统计     │  │ 性能瓶颈     │     │
│  │              │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          ▼                                 │
│                  ┌──────────────┐                          │
│                  │  告警 & 调试  │                          │
│                  │  (Alerting)  │                          │
│                  └──────────────┘                          │
└────────────────────────────────────────────────────────────┘
```

### 1.2 为什么 Agent 可观测性更困难？

| 传统软件 | AI Agent 系统 |
|----------|---------------|
| 确定性逻辑，可复现 | LLM 输出非确定性，难复现 |
| 错误可精确定位 | 错误可能是语义层面的"看似合理但错误" |
| 状态变更可追踪 | 推理链复杂，Token 级决策不可追踪 |
| 延迟可预测 | LLM 推理延迟差异大（秒级到分钟级） |
| 成本可预估 | Token 消耗随输入变化，难以精确预估 |

## 二、Logging（日志）

### 2.1 日志体系分层

```
日志分层架构：
┌──────────────────────────────────────┐
│  Layer 1: 执行日志                   │
│  (谁、何时、做了什么、结果如何)       │
├──────────────────────────────────────┤
│  Layer 2: 决策轨迹                   │
│  (Agent 为什么做出这个决定)          │
├──────────────────────────────────────┤
│  Layer 3: LLM 调用日志               │
│  (Prompt、Completion、Token 消耗)    │
├──────────────────────────────────────┤
│  Layer 4: 系统日志                   │
│  (基础设施、网络、错误栈)             │
└──────────────────────────────────────┘
```

### 2.2 执行日志

```python
# Agent 执行日志记录器
class AgentLogger:
    """结构化 Agent 执行日志"""
    
    def __init__(self, log_client):
        self.client = log_client
    
    async def log_execution(
        self,
        session_id: str,
        turn_number: int,
        phase: str,        # perceive | reason | act | feedback
        input_data: dict,
        output_data: dict,
        duration_ms: float,
        status: str         # success | error | timeout | interrupted
    ):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": session_id,
            "turn_number": turn_number,
            "phase": phase,
            "duration_ms": duration_ms,
            "status": status,
            
            # 输入
            "input": {
                "type": input_data.get("type"),
                "content_length": len(str(input_data.get("content", ""))),
                "tool_calls": input_data.get("tool_calls", []),
            },
            
            # 输出
            "output": {
                "type": output_data.get("type"),
                "content_length": len(str(output_data.get("content", ""))),
                "tool_results": output_data.get("tool_results", []),
            },
            
            # 元数据
            "metadata": {
                "model": input_data.get("model"),
                "temperature": input_data.get("temperature"),
                "tokens_used": output_data.get("token_count", 0),
                "error": output_data.get("error"),
            }
        }
        
        await self.client.emit("agent_execution", log_entry)
```

### 2.3 决策轨迹

决策轨迹记录了 Agent 每一步的思考过程，是调试和审计的关键。

```yaml
decision_trail:
  session_id: "sess_abc123"
  task: "为用户撰写一份市场分析报告"
  turns:
    - turn: 1
      phase: perceive
      action: "解析用户需求"
      input: "撰写市场分析报告，关注AI芯片领域"
      output:
        parsed_intent: "市场分析"
        domain: "AI芯片"
        scope: "全球市场"
      
    - turn: 2
      phase: reason
      action: "制定搜索计划"
      reasoning_chain: |
        1. 用户需要 AI 芯片市场分析
        2. 需要覆盖：市场规模、主要玩家、技术趋势
        3. 计划先搜索行业报告，再搜索具体厂商
      alternatives_considered:
        - "先搜索具体厂商" (rejected: 缺少全局视角)
        - "直接生成报告" (rejected: 需要数据支持)
      
    - turn: 3
      phase: act
      action: "调用 web_search"
      tool: web_search
      parameters:
        query: "AI chip market size 2026"
        sources: [gartner, idc, mckinsey]
      result:
        success: true
        pages_found: 15
      
    - turn: 4
      phase: feedback
      action: "评估搜索结果"
      evaluation: "搜索结果充足，包含市场数据和竞争格局"
      decision: "继续搜索具体厂商数据"
```

**配置示例（YAML）：**
```yaml
logging:
  execution_log:
    enabled: true
    storage:
      type: elasticsearch
      index: agent-execution-logs
      retention: 90d  # 保留 90 天
    structured_fields:
      - session_id
      - turn_number
      - phase
      - agent_id
      - model
      - duration_ms
      - token_count
      - status
      - error_type
  
  decision_trail:
    enabled: true
    storage:
      type: postgresql
      table: decision_trails
      retention: 30d
    capture_level: full  # full | summary | minimal
    # full: 包含完整推理链和备选方案
    # summary: 仅包含决策结果
    # minimal: 仅包含关键转折点
    
    pii_redaction:
      enabled: true
      patterns:
        - email: [r'[\w\.-]+@[\w\.-]+']
        - phone: [r'\d{11,}']
        - api_key: [r'(?i)(api[_-]?key|secret).{0,5}["\']?([^"\'&\s]{8,})']
      redaction_token: "***"
```

## 三、Metrics（指标）

### 3.1 核心指标体系

```python
class AgentMetrics:
    """Agent 核心指标收集器"""
    
    def __init__(self, metrics_client):
        self.client = metrics_client
        self.counters = defaultdict(int)
        self.histograms = defaultdict(list)
    
    def record_execution(self, phase: str, duration_ms: float, status: str):
        # 延迟指标（直方图）
        self.client.histogram(
            "agent.phase.duration",
            duration_ms,
            tags={"phase": phase, "status": status}
        )
        
        # 计数指标
        self.client.increment(
            "agent.execution.count",
            tags={"phase": phase, "status": status}
        )
    
    def record_llm_call(self, model: str, tokens: int, cost: float, duration_ms: float):
        self.client.histogram("llm.call.duration", duration_ms, tags={"model": model})
        self.client.histogram("llm.token.total", tokens, tags={"model": model})
        self.client.increment("llm.cost", cost, tags={"model": model})
        self.client.increment("llm.call.count", tags={"model": model})
    
    def record_tool_call(self, tool: str, duration_ms: float, status: str):
        self.client.histogram("tool.duration", duration_ms, tags={"tool": tool})
        self.client.increment("tool.call.count", tags={"tool": tool, "status": status})
```

### 3.2 核心指标定义

```yaml
metrics:
  # 延迟指标
  latency:
    - name: agent.session.duration
      type: histogram
      description: "单次会话总耗时"
      unit: milliseconds
      tags: [agent_id, session_type]
      
    - name: agent.turn.duration
      type: histogram
      description: "单轮循环耗时（感知+推理+行动）"
      unit: milliseconds
      tags: [agent_id, turn_number]
      percentiles: [50, 90, 95, 99]
      
    - name: agent.phase.duration
      type: histogram
      description: "各阶段耗时分布"
      unit: milliseconds
      tags: [agent_id, phase]
      
    - name: llm.first_token_latency
      type: histogram
      description: "LLM 首 Token 延迟（TTFT）"
      unit: milliseconds
      tags: [model, provider]
  
  # 成功率指标
  success_rate:
    - name: agent.session.completion_rate
      type: gauge
      description: "会话完成率（成功/总数）"
      unit: percent
      tags: [agent_id]
      
    - name: agent.turn.success_rate
      type: gauge
      description: "单轮成功率"
      unit: percent
      tags: [agent_id, phase]
      
    - name: tool.call.success_rate
      type: gauge
      description: "工具调用成功率"
      unit: percent
      tags: [tool_name]
      
    - name: llm.call.success_rate
      type: gauge
      description: "LLM 调用成功率"
      unit: percent
      tags: [model]
  
  # 成本指标
  cost:
    - name: agent.session.cost
      type: histogram
      description: "每次会话的 LLM 成本"
      unit: usd
      tags: [agent_id]
      
    - name: agent.turn.cost
      type: histogram
      description: "单轮 LLM 成本"
      unit: usd
      tags: [agent_id]
      
    - name: llm.token.count
      type: histogram
      description: "Token 消耗量"
      unit: tokens
      tags: [model, type]  # type: prompt | completion | total
      
    - name: tool.call.cost
      type: histogram
      description: "工具调用成本（API 费用）"
      unit: usd
      tags: [tool_name]
  
  # 业务指标
  business:
    - name: agent.tasks_per_user
      type: gauge
      description: "每用户平均任务数"
      unit: count
      
    - name: agent.avg_turns_per_task
      type: histogram
      description: "每任务平均轮数"
      unit: turns
      
    - name: agent.user_satisfaction
      type: gauge
      description: "用户满意度评分"
      unit: score(1-5)
      tags: [agent_id]
```

### 3.3 指标可视化看板

```yaml
dashboard:
  name: "Agent 运维大盘"
  
  panels:
    - title: "实时延迟监控"
      type: time_series
      metrics:
        - agent.turn.duration.p99
        - agent.phase.duration.p95
      refresh: 10s
      
    - title: "成功率走势"
      type: time_series
      metrics:
        - agent.turn.success_rate
        - tool.call.success_rate
      refresh: 30s
      
    - title: "成本消耗"
      type: bar_chart
      metrics:
        - agent.session.cost.avg
        - agent.session.cost.p95
      group_by: agent_id
      refresh: 60s
      
    - title: "Token 使用分布"
      type: pie_chart
      metrics:
        - llm.token.count
      group_by: model
      refresh: 60s
      
    - title: "Top 失败原因"
      type: table
      metrics:
        - agent.turn.status
      group_by: error_type
      limit: 10
      refresh: 60s
```

## 四、Tracing（链路追踪）

### 4.1 请求追踪

```python
class AgentTracer:
    """Agent 分布式链路追踪"""
    
    def __init__(self, tracer):
        self.tracer = tracer
    
    async def trace_session(self, session_id: str, user_id: str):
        """追踪整个 Agent 会话"""
        with self.tracer.start_span("agent.session") as span:
            span.set_attribute("session_id", session_id)
            span.set_attribute("user_id", user_id)
            
            async for turn in self._session_turns(session_id):
                await self._trace_turn(turn, span.context)
    
    async def _trace_turn(self, turn: Turn, parent_context):
        """追踪单轮循环"""
        with self.tracer.start_span("agent.turn", context=parent_context) as span:
            span.set_attribute("turn_number", turn.number)
            
            # 子阶段追踪
            with self.tracer.start_span("agent.perceive") as perceive_span:
                perceive_span.set_attribute("input_type", turn.input_type)
                # ... 感知阶段
                perceive_span.end()
            
            with self.tracer.start_span("agent.reason") as reason_span:
                reason_span.set_attribute("model", turn.model)
                reason_span.set_attribute("tokens", turn.tokens_used)
                # ... 推理阶段
                
                # LLM 调用子追踪
                with self.tracer.start_span("llm.call") as llm_span:
                    llm_span.set_attribute("model", turn.model)
                    llm_span.set_attribute("prompt_tokens", turn.prompt_tokens)
                    llm_span.set_attribute("completion_tokens", turn.completion_tokens)
                    llm_span.set_attribute("cost", turn.cost)
                    # ... LLM 调用
                    llm_span.end()
                
                reason_span.end()
            
            with self.tracer.start_span("agent.act") as act_span:
                act_span.set_attribute("tool", turn.tool_name)
                act_span.set_attribute("tool_duration", turn.tool_duration)
                # ... 行动阶段
                
                with self.tracer.start_span("tool.call") as tool_span:
                    tool_span.set_attribute("tool_name", turn.tool_name)
                    tool_span.set_attribute("status", turn.tool_status)
                    tool_span.end()
                
                act_span.end()
```

### 4.2 依赖分析

```yaml
tracing:
  distributed_tracing:
    enabled: true
    exporter: otlp  # OpenTelemetry Protocol
    endpoint: http://otel-collector:4318
    service_name: agent-platform
    
  sampling:
    strategy: head_based
    # 头部采样：根据请求属性决定是否采样
    rules:
      - name: sample_all_errors
        condition: status == "error"
        sample_rate: 1.0   # 100% 采样错误请求
      - name: sample_high_value
        condition: user_tier == "premium"
        sample_rate: 1.0
      - name: sample_normal
        condition: always
        sample_rate: 0.1   # 10% 采样正常请求
  
  dependency_graph:
    enabled: true
    storage: neo4j
    captures:
      - agent → llm          # Agent 调用哪些 LLM
      - agent → tool         # Agent 调用哪些工具
      - agent → agent        # Agent 间调用关系
      - tool → external_api  # 工具调用哪些外部 API
    analysis:
      - critical_path        # 关键路径分析
      - bottleneck_detection  # 瓶颈检测
      - failure_propagation  # 故障传播分析
```

## 五、告警与调试

### 5.1 告警规则

```yaml
alerting:
  enabled: true
  notification_channels:
    - type: slack
      webhook: https://hooks.slack.com/...
      channel: "#agent-alerts"
    - type: email
      recipients: [ops-team@company.com]
    - type: pagerduty
      service_key: "..."
      urgency: critical
  
  rules:
    # 性能告警
    - name: high_latency
      description: "会话延迟过高"
      condition: agent.session.duration.p95 > 30000  # 30 秒
      duration: 5m
      severity: warning
      notification: slack
    
    - name: success_rate_drop
      description: "成功率急剧下降"
      condition: agent.turn.success_rate < 0.8  # 低于 80%
      duration: 10m
      severity: critical
      notification: [slack, pagerduty]
    
    - name: llm_error_spike
      description: "LLM 错误率飙升"
      condition: llm.call.success_rate < 0.9
      duration: 5m
      severity: critical
      notification: [slack, pagerduty]
    
    # 成本告警
    - name: cost_spike
      description: "成本异常激增"
      condition: agent.session.cost.p95 > 5.0  # $5
      duration: 1m
      severity: warning
      notification: slack
    
    - name: token_usage_anomaly
      description: "Token 消耗异常"
      condition: llm.token.count.p99 > 50000
      duration: 5m
      severity: warning
      notification: slack
    
    # 业务告警
    - name: stuck_agent
      description: "Agent 卡在循环中"
      condition: agent.turn.count_per_session > 20
      duration: 1m
      severity: warning
      notification: slack
    
    - name: tool_failure
      description: "关键工具持续失败"
      condition: tool.call.success_rate{critical_tools} < 0.95
      duration: 5m
      severity: critical
      notification: [slack, pagerduty]
```

### 5.2 调试工具

```python
class AgentDebugger:
    """Agent 调试器"""
    
    def __init__(self, logger, tracer):
        self.logger = logger
        self.tracer = tracer
    
    async def replay_session(self, session_id: str, step_by_step: bool = False):
        """重放会话，用于调试"""
        # 1. 加载会话日志
        logs = await self.logger.get_session_logs(session_id)
        
        # 2. 重建执行轨迹
        trace = await self.tracer.get_session_trace(session_id)
        
        if step_by_step:
            for turn in logs:
                print(f"\n=== Turn {turn.turn_number}: {turn.phase} ===")
                print(f"输入: {turn.input}")
                print(f"推理链: {turn.reasoning_chain}")
                print(f"输出: {turn.output}")
                
                # 等待用户按 Enter 继续
                input("按 Enter 继续...")
        else:
            # 生成完整报告
            return self._generate_debug_report(logs, trace)
    
    async def debug_llm_call(self, session_id: str, turn_number: int):
        """调试特定 LLM 调用"""
        call_log = await self.logger.get_llm_call(session_id, turn_number)
        
        return {
            "prompt": call_log.prompt,
            "completion": call_log.completion,
            "token_usage": call_log.token_usage,
            "model": call_log.model,
            "temperature": call_log.temperature,
            "latency_ms": call_log.latency_ms,
            "cost": call_log.cost,
            "alternatives": call_log.alternatives  # 如果配置了 n>1
        }
```

**配置文件：**
```yaml
debugging:
  session_replay:
    enabled: true
    step_by_step: true
    speed_control: [0.5x, 1x, 2x, 5x]
    pause_at: [error, approval, tool_call]  # 在这些节点暂停
  
  llm_debug:
    prompt_viewer: true
    diff_mode: true  # 对比不同 prompt 版本的输出差异
    alternative_sampling:
      enabled: true
      n: 3  # 对同一个 prompt 采样 3 次,观察输出分布
  
  tool_debug:
    mock_mode: true  # 模拟工具调用，不真的执行
    response_editing: true  # 允许手工修改工具返回值
```

### 5.3 可观测性配置总览

```yaml
observability:
  version: "1.0"
  
  logging:
    provider: elk  # elasticsearch + logstash + kibana
    level: info    # debug | info | warn | error
    structured: true
    retention: 90d
  
  metrics:
    provider: prometheus + grafana
    collection_interval: 15s
    retention: 30d
  
  tracing:
    provider: opentelemetry + jaeger
    sampling: 0.1  # 10% 采样
    storage: elasticsearch
  
  alerting:
    provider: alertmanager + pagerduty
    on_call_schedule: "US/Eastern business hours"
    
  dashboard:
    url: https://grafana.company.com/d/agent-observability
    refresh: auto  # 自动刷新
    
  debug:
    session_replay: true
    llm_prompt_viewer: true
    tool_mock: true
```

## 六、实际产品案例

| 产品 | 可观测性方案 | 亮点 |
|------|-------------|------|
| **LangSmith (LangChain)** | 全栈可观测性 | Agent 执行追踪、Prompt 版本管理、数据集标注、在线评估 |
| **LangFuse** | 开源可观测性 | LLM 调用追踪、成本分析、用户反馈收集、人机协作标注 |
| **OpenAI Dashboard** | Metrics + Logging | API 使用统计、延迟监控、成本看板、模型用量分析 |
| **Weights & Biases (W&B) Prompts** | LLM 调用追踪 | Prompt 实验管理、模型对比、可复现性追踪 |
| **Dify** | 内置可观测性 | 工作流执行日志、节点级追踪、Token 消耗统计 |
| **Datadog LLM Observability** | 企业级全栈 | APM 集成、LLM 调用 Tracing、Guardrails 监控、成本优化建议 |
| **Arize AI** | ML 可观测性 | LLM 幻觉检测、嵌入漂移监控、检索质量评估 |
