# 记忆设计：短期、中期、长期记忆架构

## 一、核心概念

Agent 记忆系统是 AI Agent 产品的"持久化大脑"，决定了 Agent 能否记住过去的交互、学习用户偏好、并在长期使用中不断进化。合理的记忆设计直接影响用户体验和 Agent 能力边界。

### 1.1 三级记忆模型

受人类记忆系统启发，Agent 记忆也可分为三级：

```
┌──────────────────────────────────────────────────┐
│                   Agent Memory                   │
│                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌─────┐│
│  │ 短期记忆        │  │ 中期记忆        │  │ 长期 ││
│  │ Short-term      │→│ Work Memory    │→│ 记忆  ││
│  │ (会话级)        │  │ (工作级)        │  │ Long ││
│  │                │  │                │  │ Term ││
│  │ 对话历史        │  │ 正在进行的任务   │  │ 持久   ││
│  │ Token 上下文   │  │ 中间计算结果     │  │ 永久   ││
│  │ 当前状态        │  │ 检查点          │  │ 知识库 ││
│  └────────────────┘  └────────────────┘  └─────┘│
│        ↑                     │              │     │
│        │    遗忘/过期         │  固化/持久化  │     │
│        └─────────────────────┴──────────────┘     │
└──────────────────────────────────────────────────┘
```

| 记忆级别 | 别称 | 生命周期 | 容量 | 存储介质 | 典型数据 |
|----------|------|----------|------|----------|----------|
| **短期** | 会话记忆 | 会话内（分钟~小时） | 小（~128K tokens） | 内存 / LLM Context | 对话轮次、当前输入 |
| **中期** | 工作记忆 | 任务级（小时~天） | 中（~100MB） | Redis / Local DB | 任务状态、中间结果、检查点 |
| **长期** | 持久记忆 | 跨会话（天~永久） | 大（~GB 级） | 向量数据库 / 关系型 DB | 用户画像、知识图谱、历史总结 |

### 1.2 记忆系统的核心问题

```yaml
memory_system_questions:
  - question: "应该记住什么？"
    considerations: [相关性、重要性、时效性、隐私]
  - question: "如何存储？"
    considerations: [结构化 vs 非结构化、索引方式、压缩策略]
  - question: "如何检索？"
    considerations: [精确匹配、语义相似、时间衰减、优先级]
  - question: "什么应该遗忘？"
    considerations: [过期策略、容量限制、用户主动删除、隐私合规]
```

## 二、短期记忆（会话级）

### 2.1 设计要点

短期记忆本质上是 LLM 的上下文窗口管理。核心挑战是上下文窗口有限，需要有效的**压缩和裁剪策略**。

```python
# 短期记忆管理器
class ShortTermMemory:
    """会话级短期记忆，管理 LLM 上下文窗口"""
    
    def __init__(self, max_tokens: int = 128000):
        self.max_tokens = max_tokens
        self.messages: list[dict] = []
        self.token_counter = TokenCounter()
    
    async def add(self, message: dict):
        self.messages.append(message)
        await self._manage_window()
    
    async def _manage_window(self):
        """上下文窗口管理策略"""
        total = self.token_counter.count(self.messages)
        
        if total <= self.max_tokens:
            return
        
        # 策略1：滑动窗口（保留最近 N 轮）
        while self.token_counter.count(self.messages) > self.max_tokens:
            # 跳过 system prompt
            if self.messages[0]["role"] == "system":
                self.messages.pop(1)  # 删除最早的用户/助手消息
            else:
                self.messages.pop(0)
        
        # 策略2（推荐）：保留系统提示 + 最新消息 + 历史总结
        # await self._summarize_and_compress()
    
    async def _summarize_and_compress(self):
        """用 LLM 总结历史，替换早期消息"""
        system_msg = self.messages[0] if self.messages[0]["role"] == "system" else None
        
        # 分割：前 70% 的消息需要压缩
        split_idx = int(len(self.messages) * 0.7)
        old_messages = self.messages[1:split_idx] if system_msg else self.messages[:split_idx]
        recent_messages = self.messages[split_idx:]
        
        # 生成总结
        summary = await self.summarize(old_messages)
        
        # 重建消息列表
        new_messages = []
        if system_msg:
            new_messages.append(system_msg)
        new_messages.append({"role": "system", "content": f"[历史总结]: {summary}"})
        new_messages.extend(recent_messages)
        
        self.messages = new_messages
```

### 2.2 上下文压缩策略对比

```yaml
short_term_memory:
  compression_strategies:
    - name: sliding_window    # 滑动窗口
      description: 保留最近 N 轮对话，丢弃最早的
      pros: [简单、零成本、速度快]
      cons: [丢失早期关键信息]
      config:
        window_size: 20  # 保留最近 20 轮
    
    - name: summarization    # LLM 总结
      description: 定期用 LLM 压缩历史为摘要
      pros: [保留语义精华、信息密度高]
      cons: [有额外 LLM 成本、可能丢失细节]
      config:
        trigger: token_threshold  # token 达到 70% 限制时触发
        threshold_ratio: 0.7
        summary_model: gpt-4o-mini
    
    - name: hybrid           # 混合策略
      description: 总结旧消息 + 保留关键消息 + 滑动窗口
      pros: [兼顾完整性和效率]
      cons: [实现复杂度高]
      config:
        always_keep:
          - system_prompt
          - last_3_user_messages
          - last_tool_result
        summarize_every: 10  # 每 10 轮总结一次
        max_summary_tokens: 1000
```

## 三、中期记忆（工作级）

### 3.1 设计要点

中期记忆存储正在进行的任务状态、中间结果和检查点，跨 LLM 调用但限定在单个或多个会话内。

```python
# 中期记忆管理器
class WorkMemory:
    """工作级记忆，存储任务上下文和中间状态"""
    
    def __init__(self, store: Redis | LocalDB):
        self.store = store
        self.default_ttl = 86400  # 24 小时过期
    
    async def save_context(self, task_id: str, context: dict):
        """保存任务上下文"""
        key = f"work:{task_id}:context"
        await self.store.set(key, context, ttl=self.default_ttl)
    
    async def get_context(self, task_id: str) -> dict | None:
        key = f"work:{task_id}:context"
        return await self.store.get(key)
    
    async def save_checkpoint(self, task_id: str, checkpoint: dict):
        """保存检查点"""
        key = f"work:{task_id}:checkpoint:{checkpoint['id']}"
        await self.store.set(key, checkpoint, ttl=604800)  # 7 天
    
    async def save_intermediate_result(
        self, task_id: str, key: str, value: Any, importance: float = 0.5
    ):
        """保存中间结果，附带重要性评分"""
        data = {
            "value": value,
            "importance": importance,
            "timestamp": time.now(),
            "ttl": self._calculate_ttl(importance)
        }
        await self.store.hset(f"work:{task_id}:results", key, data)
    
    def _calculate_ttl(self, importance: float) -> int:
        """根据重要性计算过期时间"""
        if importance > 0.8:
            return 604800  # 7 天
        elif importance > 0.5:
            return 86400   # 1 天
        else:
            return 3600    # 1 小时
```

### 3.2 配置示例

```yaml
work_memory:
  enabled: true
  storage:
    type: redis
    url: redis://localhost:6379/1
    ttl: 86400  # 默认24h
  checkpoint:
    strategy: on_action  # on_action | periodic | manual
    max_checkpoints: 50
    compression: true
    compress_after: 10  # 超过 10 个检查点时自动压缩
  intermediate_results:
    max_items: 1000
    importance_threshold: 0.3  # 低于此值的自动丢弃
    cleanup_cron: "0 */6 * * *"  # 每 6 小时清理一次
```

## 四、长期记忆（持久级）

### 4.1 设计要点

长期记忆是 Agent 的"知识库"和"人格"，存储用户画像、历史行为模式、领域知识等。

```python
# 长期记忆管理器（基于 RAG 架构）
class LongTermMemory:
    """持久级记忆，基于向量数据库的 RAG 架构"""
    
    def __init__(
        self,
        vector_store: VectorStore,
        embedding_model: str = "text-embedding-3-small"
    ):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.llm = get_llm()
    
    async def store(
        self,
        user_id: str,
        content: str,
        memory_type: str = "experience",  # experience | fact | preference | skill
        metadata: dict = None
    ):
        """存储一条长期记忆"""
        embedding = await self.get_embedding(content)
        
        memory = {
            "user_id": user_id,
            "content": content,
            "type": memory_type,
            "metadata": metadata or {},
            "timestamp": time.now(),
            "access_count": 0,
            "importance": self._calc_importance(content, memory_type)
        }
        
        await self.vector_store.upsert(
            collection=f"user_{user_id}_memory",
            vector=embedding,
            data=memory
        )
    
    async def retrieve(
        self,
        user_id: str,
        query: str,
        k: int = 5,
        strategy: str = "hybrid"
    ) -> list[dict]:
        """检索长期记忆"""
        query_embedding = await self.get_embedding(query)
        
        if strategy == "recent":
            return await self.vector_store.query(
                collection=f"user_{user_id}_memory",
                filter={"timestamp": {"$gt": time.now() - 86400 * 7}},
                limit=k
            )
        elif strategy == "relevant":
            return await self.vector_store.query(
                collection=f"user_{user_id}_memory",
                vector=query_embedding,
                limit=k
            )
        elif strategy == "hybrid":
            # 混合：语义相关 + 时间衰减 + 重要性
            results = await self.vector_store.query(
                collection=f"user_{user_id}_memory",
                vector=query_embedding,
                limit=k * 2
            )
            return self._rerank_with_importance(results, query)
    
    async def consolidate(self, user_id: str):
        """记忆整合：合并相似记忆，更新重要性"""
        memories = await self.vector_store.get_all(
            collection=f"user_{user_id}_memory"
        )
        clusters = self._cluster_similar(memories)
        
        for cluster in clusters:
            if len(cluster) > 3:
                summary = await self.llm.summarize([
                    m["content"] for m in cluster
                ])
                # 保留总结，删除冗余
                await self.vector_store.delete(cluster[1:])
                cluster[0]["content"] = summary
                cluster[0]["importance"] += 0.1
                await self.vector_store.update(cluster[0])
```

### 4.2 长期记忆检索策略

```yaml
long_term_memory:
  retrieval_strategies:
    - name: recent           # 最近优先
      description: 检索最近 N 天的记忆
      use_case: 聊天上下文延续、近期偏好
      config:
        time_window: 7d
        max_results: 10
    
    - name: relevant         # 语义相关
      description: 通过向量相似度检索
      use_case: 知识问答、问题解答
      config:
        similarity_threshold: 0.75
        max_results: 5
        embedding_model: text-embedding-3-small
    
    - name: summary          # 总结式
      description: 先检索再 LLM 总结
      use_case: 长历史回顾、周报生成
      config:
        top_k: 20
        summary_model: gpt-4o-mini
        max_summary_tokens: 2000
    
    - name: hybrid           # 混合
      description: 语义检索 + 时间衰减 + 重要性加权
      use_case: 通用场景
      config:
        weights:
          similarity: 0.5
          recency: 0.3
          importance: 0.2
        decay_factor: 0.9  # 每天衰减 10%
        max_results: 10
```

### 4.3 记忆存储选型

```yaml
memory_storage_comparison:
  - type: in_memory
    pros: [超低延迟、适合会话级、零配置]
    cons: [数据易失、容量有限、无法共享]
    use_for: [短期记忆、缓存]
    example: Python dict, lru_cache
    
  - type: redis
    pros: [低延迟、支持 TTL、数据结构丰富]
    cons: [内存昂贵、持久化需配置、不支持复杂查询]
    use_for: [中期记忆、会话状态、检查点]
    example: Redis, Valkey, Dragonfly
    
  - type: postgresql
    pros: [ACID 事务、复杂查询、持久可靠]
    cons: [向量查询慢（需插件）、JSON 查询效率一般]
    use_for: [用户配置、记忆元数据、关系数据]
    example: PostgreSQL + pgvector
    
  - type: vector_db
    pros: [语义搜索、高性能 ANN、支持百万级向量]
    cons: [运营成本高、不支持 ACID、冷启动问题]
    use_for: [长期记忆、知识库、RAG 检索]
    example: Pinecone, Weaviate, Qdrant, Milvus, Chroma
    
  - type: sqlite
    pros: [轻量、零依赖、嵌入式、便携]
    cons: [不适合分布式、并发性能差]
    use_for: [本地 Agent、单用户桌面应用]
    example: sqlite3 + sqlite-vec

  - type: filesystem
    pros: [简单直观、人类可读、版本控制]
    cons: [查询慢、不适合大规模、无索引]
    use_for: [记忆导出、人工审核、备份]
    example: JSON files, Markdown files
```

## 五、综合架构示例

```yaml
memory_system:
  version: "2.0"
  
  short_term:
    type: sliding_window_with_summary
    config:
      max_tokens: 128000
      window_size: 30
      summarize_every: 10
      summary_model: gpt-4o-mini
      always_keep: [system_prompt, user_profile, recent_3_turns]
  
  work_memory:
    type: redis
    config:
      url: redis://localhost:6379/2
      ttl: 86400
      checkpoint_enabled: true
      max_checkpoints: 20
  
  long_term:
    type: vector_db + postgresql
    config:
      vector_store:
        provider: qdrant
        url: http://localhost:6333
        collection_prefix: user_
        embedding_model: text-embedding-3-small
        dimension: 1536
      metadata_store:
        provider: postgresql
        url: postgresql://localhost:5432/agent_memory
      retrieval:
        default_strategy: hybrid
        weights:
          similarity: 0.4
          recency: 0.3
          importance: 0.2
          frequency: 0.1
  
  consolidation:
    schedule: "0 3 * * *"  # 每天凌晨 3 点
    strategies:
      - dedup_similar     # 去重相似记忆
      - summarize_cluster  # 合并同类记忆为总结
      - decay_importance   # 未访问记忆重要性衰减
      - forget_low_importance  # 遗忘极低重要性记忆
```

## 六、实际产品案例

| 产品 | 记忆架构 | 亮点 |
|------|----------|------|
| **ChatGPT** | 短期（128K 上下文）+ 长期（向量检索+知识库） | 用户可编辑长期记忆、不同会话间记忆共享 |
| **Claude** | 短期（200K 上下文窗口）+ 项目知识库 | 超大上下文窗口减少压缩需求 |
| **MemGPT** | 三级记忆 + 虚拟上下文管理 | 通过"自我编辑"管理记忆、先于 LLM 调用处理记忆 |
| **Rewind** | 全量本地记录 + 本地向量检索 | 隐私优先、MAC 本地运行、时间线浏览 |
| **Google NotebookLM** | 源文档级记忆 + 笔记生成 | 以用户上传资料为核心、自动生成摘要 |
| **Microsoft Copilot** | Graph + Memory + Context 三层 | 基于 Microsoft Graph 的用户画像、企业级记忆隔离 |
| **AutoGPT** | 短期（对话窗口）+ 长期（JSON 文件/向量库） | 记忆插件生态、支持多种后端、可扩展 |
