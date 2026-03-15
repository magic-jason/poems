# 万相解析稳定化与 Gemini 3.1 入口收敛设计

## 背景

最新 Windows 验证结果表明：

- `Gemini 2.5 Flash` 已可正常出图
- `Gemini 3.1 Flash` 无法稳定出图，当前决定从配置入口隐藏
- `万象画卷` 仍然失败，高概率卡在前置的 DashScope 文本解析阶段

当前 DashScope 文本解析使用的是 OpenAI compatible `chat/completions` 接口，并配置 `response_format: { type: "json_object" }`。这种模式只能保证返回合法 JSON，但不保证字段结构严格符合 `PoemAnalysis`，容易在 Rust 侧反序列化时失败。

## 目标

1. 从前端配置入口移除 `Gemini 3.1 Flash`
2. 让 `万象画卷` 的前置解析改为严格结构化输出，降低解析失败概率
3. 在桌面端保留更真实的错误信息，便于 Windows 上直接排查

## 方案

### 入口收敛

前端只保留：

- `标准画卷`（Gemini 2.5 Flash）
- `万象画卷`

如果历史设置里记录的是 `paid`，加载时自动归一化到 `free`，避免用户落到一个已经隐藏的模型状态。

### DashScope 文本解析改造

将 DashScope 文本解析从宽松的 `json_object` 改为严格的 `json_schema`：

- 使用 DashScope 原生文本生成接口 `/api/v1/services/aigc/text-generation/generation`
- `parameters.result_format = "message"`
- `parameters.response_format.type = "json_schema"`
- 提供与 `PoemAnalysis` 对齐的 schema
- `strict = true`
- `additionalProperties = false`

这样可以让模型返回严格符合前端所需结构的 JSON，减少反序列化失败。

## 错误处理

前端新增统一错误提取函数：

- 若 Rust/Tauri 返回字符串错误，直接展示字符串
- 若返回 Error 对象，展示其 `message`
- 仅在完全拿不到错误时才回退到通用提示

## 测试策略

1. 前端测试：`normalizeModelType('paid')` 会归一化为 `free`
2. 前端测试：错误提取函数能保留原始错误文本
3. Rust 单测：DashScope 文本解析 payload 使用 `json_schema`、`strict: true`、并包含 `PoemAnalysis` 所需字段

## 验收标准

1. 设置弹窗不再显示 `Gemini 3.1 Flash`
2. 历史 `paid` 设置不会继续选中隐藏模型
3. DashScope 文本解析请求使用严格 schema
4. Windows 上万相失败时，界面能显示更接近真实原因的错误文本
