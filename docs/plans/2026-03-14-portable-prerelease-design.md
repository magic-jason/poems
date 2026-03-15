# Windows 绿色版预发布自动更新设计

## 背景

当前 Windows 绿色版通过 GitHub Actions 构建后，只上传到单次运行的 artifact。这个方式适合最终交付，但不适合高频验证：需要在两台电脑之间反复切换、查找对应的 workflow run、下载 artifact、再手动解压测试。

## 目标

在 `codex/windows-portable-tauri` 分支的 Windows 构建成功后，自动更新同一个固定入口的 GitHub prerelease，供 Windows 测试机直接下载最新绿色版 zip。

## 非目标

- 不引入自动安装器
- 不改变现有 artifact 上传逻辑
- 不为每次构建保留独立的 release 历史

## 方案对比

### 方案 A（采用）

每次 `codex/windows-portable-tauri` 分支构建成功后，强制更新固定 tag 和固定 prerelease：

- Tag：`latest-portable`
- Release name：`Latest Portable Build`
- 附件：`poetry-painting-win-x64-portable.zip`

优点：下载入口固定，最适合跨电脑反复验证。缺点：不会保留完整的每次测试包历史。

### 方案 B

继续只保留 Actions artifact。

优点：最简单。缺点：反馈回路最慢。

### 方案 C

每次生成独立 prerelease，并额外维护一个 latest 别名。

优点：历史完整。缺点：workflow 和维护成本更高，当前阶段超配。

## 设计细节

### 触发条件

保留现有 workflow 触发方式：

- `push` 到 `codex/windows-portable-tauri`
- `pull_request` 到 `main`
- `workflow_dispatch`

但只有在以下条件下才发布 prerelease：

- 当前 ref 是 `refs/heads/codex/windows-portable-tauri`
- 构建步骤成功
- 非 PR 上下文

### 发布流程

在 `Build portable package` 和 `Upload portable artifacts` 之后新增发布步骤：

1. 生成构建时间元数据
2. 强制更新 tag `latest-portable` 到当前提交
3. 创建或更新同名 prerelease
4. 覆盖旧附件并上传新的 `poetry-painting-win-x64-portable.zip`
5. 在 release 描述中写入来源分支、提交 SHA、Actions run 链接、构建时间

### 权限

workflow job 需要把 `contents` 权限从 `read` 提升到 `write`，以便：

- 推送/更新 tag
- 创建或更新 release
- 上传 release asset

### 兼容性与回退

- 继续保留 artifact，作为 release 失败时的兜底下载渠道
- tag 推送不会触发额外 workflow，因为当前 workflow 只监听分支 push 和 PR
- 如果 release 更新失败，构建产物依然能在 artifact 中获取

## 文档更新

README 需要从“去 Actions 下载 artifact”调整为：

- 优先到 Releases 下载固定的 `Latest Portable Build`
- artifact 作为备用渠道

## 验收标准

1. `codex/windows-portable-tauri` 上一次成功构建后，仓库存在一个固定的 prerelease
2. 该 prerelease 始终包含最新的 `poetry-painting-win-x64-portable.zip`
3. Windows 测试机无需进入 Actions 页面即可下载最新测试包
4. 现有 artifact 上传继续保留
