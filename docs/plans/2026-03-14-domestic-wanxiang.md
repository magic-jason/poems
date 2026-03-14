# 国内环境可用的万相完整链路实施计划

我在用 writing-plans skill 来创建实施计划。

## 任务 1：补文档并提交设计

1. 新建设计文档 `docs/plans/2026-03-14-domestic-wanxiang-design.md`
2. 新建实施计划 `docs/plans/2026-03-14-domestic-wanxiang.md`
3. 复查设计是否覆盖调用链、配置规则、测试策略
4. 提交文档变更

## 任务 2：先写失败测试

1. 为前端配置逻辑新增测试，覆盖“wanxiang 仅需 DashScope Key”
2. 为前端配置逻辑新增测试，覆盖“Gemini 模式仅需 Gemini Key”
3. 为 workflow 无关的既有测试保留原样
4. 运行新增测试，确认在实现前失败

## 任务 3：实现前端按模型校验与默认模型调整

1. 打开 `src/App.tsx`
2. 将默认模型改为 `wanxiang`
3. 提取“当前模型所需密钥”判断函数
4. 将首启校验改为按模型所需密钥判断
5. 将保存设置校验改为按模型所需密钥判断
6. 将生成前校验改为按模型所需密钥判断

## 任务 4：实现桌面端按模型选择解析器

1. 打开 `src/services/desktop.ts`
2. 为桌面端新增“带模型类型的诗词解析”调用入口
3. 打开 `src/services/gemini.ts`
4. 调整前端 `analyzePoem` 调用签名，使其能按模型分流
5. 保持 `generateImage` 调用方式不变或只做必要同步调整

## 任务 5：实现 Rust 侧 DashScope 文本解析

1. 打开 `src-tauri/src/dashscope.rs`
2. 新增构造 DashScope 文本解析请求体的方法
3. 新增 `analyze_poem` 实现，返回 `PoemAnalysis`
4. 复用现有 `AnalyzePoemRequest` 和 `PoemAnalysis` 结构，避免重复定义
5. 为请求体和关键返回解析补单测

## 任务 6：实现 Tauri 命令分发

1. 打开 `src-tauri/src/lib.rs`
2. 让诗词解析命令接收模型类型
3. 在命令层按模型分发到 `gemini` 或 `dashscope`
4. 对非法模型类型返回明确错误

## 任务 7：更新设置弹窗和文案

1. 打开 `src/components/SettingsModal.tsx`
2. 调整两个 API Key 的用途说明
3. 调整保存按钮禁用逻辑，使其按当前模型要求的 Key 工作
4. 确保首启时用户只填当前模型所需 Key 即可继续

## 任务 8：更新 README

1. 打开 `README.md`
2. 增加国内环境优先使用万相模式的说明
3. 写清 Gemini 与万相各自所需的 Key

## 任务 9：验证

1. 运行新增与现有前端测试
2. 运行 Rust 单测
3. 运行 `npm run lint`
4. 运行 `npm run build`
5. 查看 git diff，确认仅包含本次需求相关改动

## 任务 10：提交并推送

1. 提交实现改动
2. 推送到 `codex/windows-portable-tauri`
3. 等待 GitHub Actions 产出新的 Windows 绿色包
4. 在 Windows 上验证“仅 DashScope Key 的万相模式”
