# 权限与审批设计：Agent 操作权限模型

## 一、核心概念

Agent 权限与审批系统是 AI Agent 产品的**安全边界**，决定了 Agent 能做什么、不能做什么、以及在什么条件下可以执行敏感操作。随着 Agent 自主性增强（从"聊天机器人"进化为"执行代理"），权限设计成为产品安全的核心支柱。

### 1.1 权限设计的三个维度

```
┌─────────────────────────────────────────────┐
│          Agent 权限设计三维度                │
│                                             │
│  1. 权限模型                                │
│     谁能做什么？（RBAC, ABAC, ReBAC）       │
│                                             │
│  2. 审批流程                                │
│     敏感操作如何获得授权？                   │
│                                             │
│  3. 授权模式                                │
│     用户以何种方式赋予权限？                 │
└─────────────────────────────────────────────┘
```

### 1.2 关键概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **权限（Permission）** | 执行特定操作的授权 | `file:write`、`email:send` |
| **角色（Role）** | 一组权限的集合 | `editor`、`admin`、`viewer` |
| **策略（Policy）** | 基于条件的权限规则 | `允许在 9-18 点之间执行` |
| **审批（Approval）** | 人工审核操作的过程 | 发邮件前需要用户确认 |
| **授权（Authorization）** | 权限授予的方式和时机 | 每次请求时动态授权 |

## 二、Agent 操作权限模型

### 2.1 RBAC（基于角色的访问控制）

最经典、最广泛使用的权限模型。权限与角色绑定，用户/Agent 拥有角色即获得相应权限。

```python
class RBACPermissions:
    """基于角色的权限控制"""
    
    def __init__(self):
        self.roles = {
            "viewer": ["read:*"],
            "editor": ["read:*", "write:*", "comment:*"],
            "operator": ["read:*", "write:*", "execute:*"],
            "admin": ["*"],
        }
        self.user_roles: dict[str, list[str]] = {}
        self.role_hierarchy = {
            "viewer": [],
            "editor": ["viewer"],
            "operator": ["editor"],
            "admin": ["operator"],
        }
    
    def check_permission(self, user_id: str, action: str) -> bool:
        roles = self.user_roles.get(user_id, [])
        for role in roles:
            if self._role_has_permission(role, action):
                return True
            # 检查角色继承
            for parent_role in self.role_hierarchy.get(role, []):
                if self._role_has_permission(parent_role, action):
                    return True
        return False
    
    def _role_has_permission(self, role: str, action: str) -> bool:
        permissions = self.roles.get(role, [])
        return any(match_permission(p, action) for p in permissions)
```

**配置示例（YAML）：**
```yaml
permissions:
  model: rbac
  
  roles:
    - name: viewer
      description: 只读用户
      permissions:
        - agent:list
        - agent:get
        - conversation:read
    
    - name: editor
      description: 可编辑 Agent 配置
      inherits: [viewer]
      permissions:
        - agent:update
        - tool:configure
        - memory:read
    
    - name: operator
      description: 可执行 Agent 操作
      inherits: [editor]
      permissions:
        - agent:execute
        - tool:run
        - file:read
        - file:write
        - api:call
    
    - name: admin
      description: 完全控制
      inherits: [operator]
      permissions:
        - "*"
  
  assignments:
    - user: user_123
      roles: [editor]
    - user: user_456
      roles: [operator]
    - user: bot_service
      roles: [viewer]
```

### 2.2 ABAC（基于属性的访问控制）

更灵活的模型，根据用户属性、资源属性、环境条件动态决定权限。

```python
class ABACPermissions:
    """基于属性的访问控制"""
    
    async def check(
        self,
        subject: dict,      # 请求主体（用户/Agent 属性）
        resource: dict,     # 资源属性
        action: str,        # 操作
        context: dict       # 环境上下文
    ) -> bool:
        # 所有策略都需通过
        for policy in self.policies:
            if policy.applies_to(action, resource.type):
                allowed = await policy.evaluate(subject, resource, context)
                if not allowed:
                    await self.log_denial(subject, resource, action, context, policy)
                    return False
        return True


# 策略定义示例
class TimeBasedPolicy:
    """基于时间的访问策略"""
    
    async def evaluate(self, subject, resource, context) -> bool:
        current_hour = context.get("hour", 0)
        allowed_hours = resource.get("allowed_hours", [0, 24])
        return allowed_hours[0] <= current_hour <= allowed_hours[1]


class SensitiveDataPolicy:
    """敏感数据访问策略"""
    
    async def evaluate(self, subject, resource, context) -> bool:
        if resource.get("sensitivity") == "high":
            return subject.get("clearance_level") >= 3
        return True
```

**配置示例（YAML）：**
```yaml
permissions:
  model: abac
  
  policies:
    - name: time_restriction
      description: 非工作时间限制高危操作
      effect: deny
      conditions:
        attribute: context.time.hour
        operator: not_between
        value: [9, 18]
      actions: [file:delete, email:send_bulk, db:drop]
    
    - name: ip_restriction
      description: 仅允许公司 IP 访问管理 API
      effect: deny
      conditions:
        attribute: subject.ip
        operator: not_in
        value: ["10.0.0.0/8", "172.16.0.0/12"]
      actions: [admin:*]
    
    - name: resource_ownership
      description: 只能操作自己的资源
      effect: allow
      conditions:
        - attribute: resource.owner_id
          operator: eq
          value: subject.user_id
      actions: [file:*, conversation:*]
    
    - name: approval_required
      description: 高风险操作需要审批
      effect: require_approval
      conditions:
        attribute: resource.sensitivity
        operator: gte
        value: 3
      actions: [execute:*]
```

### 2.3 模型对比

| 维度 | RBAC | ABAC | ReBAC（基于关系的） |
|------|------|------|---------------------|
| 复杂度 | 低 | 高 | 中 |
| 灵活性 | 低 | 高 | 中 |
| 管理成本 | 低 | 高 | 中 |
| 适用场景 | 中大型企业标准化权限 | 复杂环境、动态策略 | 社交/协作场景 |
| 性能 | 快 | 较慢（需评估多策略） | 中 |
| 推荐 | 大多数 Agent 产品 | 企业级、金融、医疗 | 多租户协作产品 |

## 三、关键操作审批流程

### 3.1 审批触发条件

```yaml
approval:
  triggers:
    - category: destructive
      actions:
        - file:delete
        - db:drop
        - email:send_bulk
      reason: "不可逆操作，需人工确认"
    
    - category: costly
      actions:
        - api:call_external
        - llm:batch_inference
      threshold:
        cost: 1.0  # USD
        tokens: 100000
      reason: "高成本操作，需权限确认"
    
    - category: private
      actions:
        - user:get_profile
        - user:list_emails
        - data:export
      reason: "访问敏感数据，需用户授权"
    
    - category: identity
      actions:
        - agent:act_as_user
        - email:send_on_behalf
      reason: "代表用户执行操作，需明确授权"
```

### 3.2 审批流程实现

```python
class ApprovalFlow:
    """审批流程引擎"""
    
    def __init__(self, notification_service):
        self.notifier = notification_service
        self.pending_approvals: dict[str, ApprovalRequest] = {}
    
    async def request_approval(
        self,
        action: str,
        agent_id: str,
        user_id: str,
        context: dict,
        timeout: int = 300
    ) -> ApprovalResult:
        """发起审批请求"""
        request = ApprovalRequest(
            id=generate_id(),
            action=action,
            agent_id=agent_id,
            user_id=user_id,
            context=context,
            status="pending",
            created_at=time.now()
        )
        
        self.pending_approvals[request.id] = request
        
        # 通知用户
        await self.notifier.send(user_id, {
            "type": "approval_required",
            "title": f"Agent 请求执行: {action}",
            "description": self._build_description(request),
            "request_id": request.id,
            "approve_url": f"/api/approvals/{request.id}/approve",
            "deny_url": f"/api/approvals/{request.id}/deny",
            "timeout": timeout
        })
        
        # 等待用户响应
        try:
            result = await self._wait_for_response(request.id, timeout)
            return result
        except TimeoutError:
            request.status = "timeout"
            return ApprovalResult(approved=False, reason="审批超时")
    
    def _build_description(self, request: ApprovalRequest) -> str:
        """构建人类可读的审批描述"""
        parts = [
            f"🔄 Agent **{request.agent_id}** 请求执行：",
            f"📌 操作：`{request.action}`",
        ]
        if params := request.context.get("parameters"):
            parts.append(f"📋 参数：```json\n{json.dumps(params, indent=2)}\n```")
        if reason := request.context.get("reason"):
            parts.append(f"💡 原因：{reason}")
        return "\n".join(parts)
```

### 3.3 审批 UI 交互设计

```
┌─────────────────────────────────┐
│  🔔 Agent 需要你的审批          │
│                                 │
│  Agent "研究助手" 想要：        │
│  📧 发送邮件                    │
│  收件人: user@example.com       │
│  标题: 市场分析报告             │
│  附件: report_v2.pdf           │
│                                 │
│  💡 因为: 用户要求发送报告      │
│                                 │
│  ┌────────────┐ ┌────────────┐ │
│  │   ❌ 拒绝   │ │   ✅ 批准   │ │
│  └────────────┘ └────────────┘ │
│                                 │
│  [✓] 记住此决定，下次自动处理   │
│  ⏱ 45 秒后自动拒绝             │
└─────────────────────────────────┘
```

## 四、用户授权模式

### 4.1 预先授权（Pre-Approval）

用户在会话开始前或 Agent 执行前，预先设定好权限范围。

```yaml
authorization_modes:
  pre_approval:
    description: "用户提前设定 Agent 可执行的操作范围"
    pros:
      - "零打扰体验"
      - "适合信任度高的场景"
      - "效率最高"
    cons:
      - "用户可能未充分理解风险"
      - "权限粒度较粗"
      - "难以覆盖所有边缘场景"
    
    config_example:
      agent_id: research_helper
      authorized_operations:
        - action: file:read
          scope: /Users/me/Projects/*
        - action: web:search
          scope: "*"
        - action: api:call
          scope:
            urls:
              - "https://api.github.com/*"
            methods: [GET]
      expires_at: 2026-12-31
      risk_assessment: low  # 低风险，无需二次确认
```

### 4.2 按需授权（Just-in-Time）

每次执行敏感操作时，动态请求用户授权。

```python
class JustInTimeAuth:
    """按需授权模式"""
    
    async def execute_with_jit(
        self, agent_id: str, user_id: str, action: str, params: dict
    ):
        # 1. 风险评估
        risk_level = self.risk_engine.assess(action, params, user_id)
        
        if risk_level == RiskLevel.LOW:
            # 低风险：直接执行，后台记录
            return await self.execute(action, params)
        
        elif risk_level == RiskLevel.MEDIUM:
            # 中风险：简单确认
            confirmed = await self._quick_confirm(user_id, action, params)
            if confirmed:
                return await self.execute(action, params)
            raise PermissionDenied("用户取消操作")
        
        elif risk_level == RiskLevel.HIGH:
            # 高风险：详细审批流程
            approval = await self.approval_flow.request_approval(
                action, agent_id, user_id, 
                {"parameters": params, "reason": self._explain_risk(action, params)}
            )
            if approval.approved:
                return await self.execute(action, params)
            raise PermissionDenied(f"审批被拒绝: {approval.reason}")
        
        elif risk_level == RiskLevel.CRITICAL:
            # 关键操作：需要 MFA 或多人审批
            raise PermissionDenied("关键操作需要多人审批，已通知管理员")
```

### 4.3 黑名单/白名单

```yaml
authorization_modes:
  whitelist:
    description: "仅允许名单中的操作，其余全部拒绝（默认拒绝）"
    pros: [安全性最高、最小权限原则、明确可控]
    cons: [维护成本高、灵活性低、容易遗漏合法操作]
    config:
      enabled: true
      default: deny
      entries:
        - pattern: "file:read:/Users/me/Projects/*"
          reason: "允许访问项目文件"
        - pattern: "web:search"
          reason: "允许网络搜索"
          rate_limit: 100/day
      exceptions:
        - user_id: admin_001
          override: allow_all
  
  blacklist:
    description: "拒绝名单中的操作，其余允许（默认允许）"
    pros: [灵活度高、适合探索场景、初始配置简单]
    cons: [安全性较低、可能遗漏危险操作、不适合严格合规场景]
    config:
      enabled: false
      default: allow
      entries:
        - pattern: "file:delete:*"
          reason: "禁止删除文件"
        - pattern: "email:send_bulk"
          reason: "禁止批量发送邮件"
        - pattern: "db:drop:*"
          reason: "禁止删除数据库"
```

## 五、最佳实践总结

1. **最小权限原则**：Agent 只获得完成任务所需的最小权限集
2. **分级审批**：根据操作风险等级使用不同审批流程（轻量确认 vs 完整审批）
3. **审计日志**：所有权限检查和审批记录必须可追溯
4. **默认拒绝**：未明确授权的一律拒绝（白名单模式更安全）
5. **用户透明**：明确告知 Agent 拥有什么权限、正在执行什么操作
6. **动态调整**：根据用户行为和风险变化动态调整权限级别
7. **上下文感知**：同一操作在不同上下文中可有不同权限（ABAC 核心优势）
8. **去权限化**：支持临时提权和自动降权，降低长期风险

## 六、实际产品案例

| 产品 | 权限模型 | 授权模式 | 亮点 |
|------|----------|----------|------|
| **ChatGPT Code Interpreter** | 白名单 | 自动 + 受限 | 严格沙箱隔离，仅能读写特定目录 |
| **Claude Code (Artifacts)** | RBAC + 白名单 | 按需授权 | 每次代码执行前需要用户确认 |
| **GitHub Copilot Chat** | ReBAC | 预先授权 | 基于仓库权限继承，无需额外配置 |
| **Microsoft Copilot (M365)** | ABAC + M365 RBAC | 按需 + 预先混合 | 继承 Azure AD 权限，敏感操作需要 Graph 审批 |
| **AutoGPT (安全模式)** | 黑名单 | 按需授权 | 用户可以配置高危操作黑名单 |
| **OpenAI Assistants API** | RBAC（API Key 级） | 预先授权 | Function calling 需在 API 定义时注册 |
| **Cline/VSCode Agent** | 白名单 + JIT | 按需授权 | 每一个文件操作都需要用户确认 |
