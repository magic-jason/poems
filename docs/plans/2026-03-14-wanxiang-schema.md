# 万相解析稳定化与 Gemini 3.1 入口收敛实施计划

我在用 writing-plans skill 来创建实施计划。

## 任务 1：补设计文档

1. 新建设计文档 `docs/plans/2026-03-14-wanxiang-schema-design.md`
2. 新建实施计划 `docs/plans/2026-03-14-wanxiang-schema.md`
3. 复查设计是否覆盖隐藏入口、严格 schema、错误展示
4. 提交文档变更

## 任务 2：先写失败测试

1. 为前端 helper 增加 `paid -> free` 归一化测试
2. 为前端 helper 增加错误提取函数测试
3. 为 Rust 单测增加 DashScope `json_schema` 断言
4. 运行测试，确认在实现前失败

## 任务 3：隐藏 Gemini 3.1 入口

1. 打开 `src/components/SettingsModal.tsx`
2. 移除 `Gemini 3.1 Flash` 的可见配置按钮
3. 保留 `free` 与 `wanxiang` 两个入口
4. 更新文案，避免再提 3.1

## 任务 4：归一化历史模型状态

1. 打开 `src/services/desktop.ts`
2. 将 `normalizeModelType('paid')` 映射到 `free`
3. 更新相关测试

## 任务 5：强化 DashScope 文本解析

1. 打开 `src-tauri/src/dashscope.rs`
2. 将文本解析请求切换到 DashScope 原生文本生成接口
3. 将 `response_format` 从 `json_object` 升级为 `json_schema`
4. 为 `PoemAnalysis` 手写 JSON Schema
5. 使用严格模式与 `additionalProperties: false`
6. 更新响应解析路径
7. 在解析失败时返回更具体的错误信息

## 任务 6：暴露真实桌面端错误

1. 打开 `src/services/desktop.ts` 或合适的前端 helper 文件
2. 新增统一错误提取函数
3. 在 `src/App.tsx` 的生成失败分支中使用该函数
4. 保持其他交互不变

## 任务 7：验证

1. 运行前端测试
2. 运行 Rust 单测
3. 运行 `npm run lint`
4. 运行 `npm run build`
5. 查看 diff，确认改动聚焦本次需求

## 任务 8：提交并推送

1. 提交实现改动
2. 推送到 `codex/windows-portable-tauri`
3. 等待 GitHub Actions 产出新绿色包
4. 在 Windows 上复测万相流程并观察真实错误文本
