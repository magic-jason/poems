# 国内环境可用的万相完整链路设计

## 背景

当前桌面版在点击“生成”后，会先执行诗词解析，再执行图片生成。虽然界面允许选择 Gemini 或万相，但桌面端的诗词解析始终固定走 Gemini。因此在无法访问 Google 的 Windows 环境中，即使用户选择了“万相画卷”，也会在前置解析阶段失败，表现为 Gemini 和万相都无法生成。

## 目标

为桌面版实现按模型拆分的完整调用链路，使“万相模式”在不翻墙的国内网络环境下也能独立可用。

## 非目标

- 不做自动模型切换
- 不做离线本地诗词解析
- 不引入代理配置 UI

## 方案

### 采用方案

按模型拆分为两条完整链路：

- Gemini 模式：Gemini 解析 + Gemini 出图
- 万相模式：DashScope 文本解析 + 万相出图

两条链路共享同一份 `PoemAnalysis` 前端结构，保证展示层尽量不变。

## 前端设计

### 生成流程

前端在点击“生成”时，根据当前选中的模型决定调用哪条解析链路：

- `free` / `paid` → Gemini 解析
- `wanxiang` → DashScope 解析

随后继续调用对应的图片生成接口。

### 配置规则

首启和设置保存时，按当前模型校验所需密钥：

- `wanxiang` 模式：仅要求 `DashScope API Key`
- `free` / `paid` 模式：仅要求 `Gemini API Key`

默认模型调整为 `wanxiang`，以适配国内常见网络环境。

### 文案

设置弹窗中的说明调整为：

- `Gemini API Key`：用于 Gemini 解析与 Gemini 出图
- `DashScope API Key`：用于万相解析与万相出图

## Rust 侧设计

### 新增 DashScope 文本解析

在 `dashscope.rs` 中新增 `analyze_poem`，输入参数与 `gemini::AnalyzePoemRequest` 对齐，输出仍为 `PoemAnalysis`。

实现方式：

- 调用 DashScope 文本模型
- 明确要求返回 JSON
- 将返回 JSON 反序列化为与前端兼容的 `PoemAnalysis`

### 命令分发

在 `lib.rs` 中新增桌面端命令，或统一在现有命令层根据模型类型分发到不同解析器。

## 测试策略

1. 前端配置测试：按模型校验所需 Key
2. 前端状态测试：默认模型为 `wanxiang`
3. Rust 单测：DashScope 解析请求体包含 JSON 输出约束
4. 回归测试：只有 `DashScope Key` 时，万相模式不会再被 Gemini 前置解析阻塞

## README 更新

补充国内网络环境的使用建议：

- 国内 Windows 环境优先使用“万相画卷”
- 万相模式只需填写 `DashScope API Key`

## 验收标准

1. 桌面端选择 `wanxiang` 且仅填写 `DashScope API Key` 时，可以通过首启和生成前校验
2. 桌面端选择 `free` / `paid` 且仅填写 `Gemini API Key` 时，可以通过对应校验
3. `wanxiang` 模式不再依赖 Gemini 解析
4. 设置文案与 README 能准确说明两条链路的差异
