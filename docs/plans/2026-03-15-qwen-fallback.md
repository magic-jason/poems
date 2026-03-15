# Qwen Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 DashScope 诗词解析增加 `qwen-plus -> qwen3-max` 的自动兜底，避免万象模式因单模型不可用或额度不足而直接失败。

**Architecture:** 在 `src-tauri/src/dashscope.rs` 中抽出“按模型请求解析”的 helper，再通过错误分类决定是否从主模型切到备用模型。前端无需改动，仍然只感知一个 `wanxiang` 解析入口。

**Tech Stack:** Rust, reqwest, serde_json, Tauri, GitHub Actions

---

### Task 1: 文档与测试先行

**Files:**
- Create: `docs/plans/2026-03-15-qwen-fallback-design.md`
- Create: `docs/plans/2026-03-15-qwen-fallback.md`
- Modify: `src-tauri/src/dashscope.rs`

**Step 1: 写失败测试**
- 为 fallback 触发条件新增单元测试
- 覆盖“额度不足/模型不可用触发 fallback”与“普通错误不触发”

**Step 2: 运行测试确认当前失败**
Run: `cargo test dashscope::tests::detects_analysis_fallback_cases -- --exact`
Expected: FAIL，因为 helper 尚不存在

### Task 2: 实现 qwen3-max 兜底

**Files:**
- Modify: `src-tauri/src/dashscope.rs`

**Step 1: 抽出按模型请求解析 helper**
- 支持显式传入 `qwen-plus` 或 `qwen3-max`

**Step 2: 增加错误分类 helper**
- 识别 `429`、`quota`、`余额`、`available` 等可兜底特征

**Step 3: 在 `analyze_poem_with_api_key` 中串行降级**
- 首先请求 `qwen-plus`
- 仅在可兜底错误时切到 `qwen3-max`
- 两次都失败时返回合并错误

### Task 3: 本地验证与交付

**Files:**
- Modify: `src-tauri/src/bin/dashscope_probe.rs`（如需要打印解析模型信息）
- Modify: `.github/workflows/windows-portable.yml`（仅在触发方式需要调整时）

**Step 1: 运行 Rust 单测**
Run: `cargo test`
Expected: PASS

**Step 2: 运行本地 probe**
Run: `source ../../.env && export DASHSCOPE_API_KEY="$VITE_DASHSCOPE_API_KEY" && cargo run --bin dashscope_probe -- --mode analyze`
Expected: PASS，并输出解析成功

**Step 3: 提交并推送**
Run: `git add ... && git commit -m "feat: add qwen3-max fallback for wanxiang analysis" && git push`

**Step 4: 触发 Windows 打包**
- 推送到 `codex/windows-portable-tauri`
- 等待 `Windows Portable Build` workflow 完成
