# Web Wanxiang Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 `worktree` 的 Web 模式下，`wanxiang` 与桌面版保持一致：DashScope 解析 + DashScope 出图。

**Architecture:** 保持现有 `src/services/gemini.ts` 作为前端模型网关，但把 Web 端的 `wanxiang` 解析从 Gemini 分流到 DashScope 兼容接口，并在浏览器侧补上 `qwen-plus -> qwen3-max` 的解析 fallback。Gemini 模式保持不变，桌面端调用继续走 Tauri Rust 命令。

**Tech Stack:** TypeScript, Vite dev proxy, DashScope HTTP API, node:test, tsx

---

### Task 1: 先补失败测试

**Files:**
- Create: `src/services/gemini.test.ts`
- Modify: `src/services/gemini.ts`

**Step 1: 写失败测试**
- 断言 `wanxiang` Web 解析请求体使用 `qwen-plus`
- 断言存在 `qwen3-max` fallback payload
- 断言 fallback 识别额度/不可用错误

**Step 2: 运行测试确认失败**
Run: `npx tsx --test src/services/gemini.test.ts`
Expected: FAIL，因为 helper 尚未导出

### Task 2: 实现 Web 端万相解析

**Files:**
- Modify: `src/services/gemini.ts`

**Step 1: 抽出 DashScope 解析请求构造 helper**
- 增加按模型名构造 payload 的函数
- 增加 fallback 错误识别函数

**Step 2: 实现 Web 端 DashScope 解析链路**
- `wanxiang` Web 模式先调 `qwen-plus`
- 额度不足/不可用时自动切到 `qwen3-max`
- 两次都失败时返回组合错误

**Step 3: 调整 Web 分流**
- `wanxiang`：DashScope 解析 + DashScope 出图
- `free`：Gemini 解析 + Gemini 出图

### Task 3: 本地验证

**Files:**
- Modify: none unless validation reveals issues

**Step 1: 跑单测**
Run: `npx tsx --test src/services/gemini.test.ts src/services/desktop.test.ts src/components/SettingsModal.test.tsx`
Expected: PASS

**Step 2: 启动并验证 worktree Web**
Run: `npm run dev`
Expected: `localhost:3000` 可访问并且“万象画卷”走完整 DashScope 链路
