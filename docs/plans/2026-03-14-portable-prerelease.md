# Windows 绿色版预发布自动更新实施计划

我在用 writing-plans skill 来创建实施计划。

## 任务 1：补设计与实施文档

1. 创建设计文档 `docs/plans/2026-03-14-portable-prerelease-design.md`
2. 创建实施计划 `docs/plans/2026-03-14-portable-prerelease.md`
3. 复查命名、目标、验收标准是否与已确认方案一致
4. 提交文档变更

## 任务 2：先写回归检查，再改 workflow

1. 新建一个轻量测试，读取 `.github/workflows/windows-portable.yml`
2. 先断言 workflow 具备 prerelease 发布所需关键配置
3. 运行测试，确认在改动前失败
4. 只保留对本次需求有价值的断言，避免过度绑定实现细节

## 任务 3：实现 workflow 的 prerelease 发布

1. 打开 `.github/workflows/windows-portable.yml`
2. 将 job 的 `permissions.contents` 调整为 `write`
3. 保留现有 artifact 上传步骤
4. 在成功构建后新增“生成构建元数据”步骤
5. 新增“强制更新 `latest-portable` tag”步骤
6. 新增“发布/更新 `Latest Portable Build` prerelease”步骤
7. 仅在 `codex/windows-portable-tauri` 分支的非 PR 上下文执行发布步骤
8. 配置 release body，包含分支、提交、run 链接、构建时间
9. 确保 release asset 只上传 `dist-portable/poetry-painting-win-x64-portable.zip`

## 任务 4：更新 README 下载说明

1. 打开 `README.md`
2. 将默认下载路径改为 GitHub Releases 的固定 prerelease
3. 保留 artifact 作为备用下载渠道说明
4. 说明只有目标分支的成功构建才会更新 prerelease

## 任务 5：验证

1. 运行新增的 workflow 相关测试
2. 运行现有关键测试与类型检查
3. 运行前端构建，确保文档/配置改动未破坏构建
4. 查看 git diff，确认只包含本次需求相关改动

## 任务 6：提交并推送

1. 提交 workflow、README、测试、文档改动
2. 推送到 `codex/windows-portable-tauri`
3. 等待 GitHub Actions 新一轮运行
4. 验证仓库 Releases 中是否出现/更新固定 prerelease
