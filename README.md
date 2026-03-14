<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 墨韵灵笔

一个以 `React + Vite + Tauri` 构建的古诗词诗画生成桌面应用。

## 本地开发

**Prerequisites:** Node.js、Rust（用于 Tauri）

1. 安装依赖：`npm install`
2. 本地网页模式调试：`npm run dev`
3. 类型检查：`npm run lint`
4. Tauri 桌面调试：`npx tauri dev`

## GitHub Actions 打 Windows 绿色包

如果你本地没有 Windows 开发环境，推荐直接使用 GitHub Actions 的 `windows-latest` runner 打包。

### 使用方式

1. 将当前代码推送到 GitHub 仓库
2. 打开 GitHub 仓库的 `Actions` 标签页
3. 等待 `Windows Portable Build` 在 `codex/windows-portable-tauri` 分支上成功
4. 打开 GitHub 仓库的 `Releases` 页面
5. 下载固定的 prerelease：`Latest Portable Build`
6. 如果 Release 暂时没更新，可回到对应 workflow run 页面下载备用 artifact：`poetry-painting-win-x64-portable`

### 工作流做了什么

工作流文件：`.github/workflows/windows-portable.yml`

它会在 GitHub 的 Windows runner 上自动执行：

1. `npm ci`
2. `npm run lint`
3. `cargo test --manifest-path src-tauri/Cargo.toml`
4. `npm run package:portable`
5. 上传以下构建产物：
   - `dist-portable/poetry-painting-win-x64-portable.zip`
   - `dist-portable/墨韵灵笔/` 目录
6. 仅在 `codex/windows-portable-tauri` 分支的非 PR 成功构建后：
   - 强制更新固定 tag：`latest-portable`
   - 自动更新固定 prerelease：`Latest Portable Build`

### 是否需要配置仓库 Secret

当前这条构建工作流 **不需要** 配置 API Key Secrets。

原因是：
- API Key 在应用运行时由最终用户在桌面端填写
- 构建过程本身不调用 Gemini 或 DashScope

## Windows 绿色版打包（本地方案）

目标交付物是一个免安装目录包：用户解压后，直接双击 `墨韵灵笔.exe` 即可运行。

### 国内网络环境建议

- 默认推荐先使用 `万象画卷`
- `万象画卷` 会走 `DashScope 文本解析 + 万相出图` 的完整链路
- 如果电脑无法访问 Google，`Gemini` 模式可能不可用，但不会影响 `万象画卷`

### 打包前提

- 在 Windows 10/11 机器上执行
- 已安装 Node.js
- 已安装 Rust MSVC toolchain
- 可正常执行 `npm run build`
- 可正常执行 Tauri release 构建

### 打包命令

```bash
npm run package:portable
```

脚本会：

1. 执行前端构建
2. 执行 `tauri build --no-bundle`
3. 将生成的可执行文件与运行依赖整理到 `dist-portable/墨韵灵笔/`
4. 输出 `dist-portable/poetry-painting-win-x64-portable.zip`

### 用户配置

运行时配置保存在：`%APPDATA%/poetry-painting/config.json`

- 国内 Windows 环境推荐默认使用“万象画卷”
- 选择“万象画卷”时，只需填写 `DashScope API Key`
- 选择 `Gemini` 模式时，需填写 `Gemini API Key`
- 升级绿色包时，直接覆盖程序目录即可，配置不会丢失

## Portable release checklist

- [ ] First-run settings gate works
- [ ] Gemini analysis works
- [ ] Gemini image generation works
- [ ] DashScope image generation works
- [ ] Export works
- [ ] Portable package launches on a clean Windows machine
