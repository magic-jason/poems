# Parity Web Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated local Web verification entrypoint that runs from the Windows-portable worktree so the browser validation flow stays aligned with the EXE packaging source.

**Architecture:** Keep `.worktrees/windows-portable-tauri` as the only behavior source for both parity Web and EXE packaging. Add thin root-level proxy scripts that delegate to the worktree, then document the verify-Web-first workflow.

**Tech Stack:** Node.js, npm scripts, Vite, TypeScript, existing `tsx --test` test runner, Markdown docs.

---

### Task 1: Capture the approved design

**Files:**
- Create: `.worktrees/windows-portable-tauri/docs/plans/2026-03-15-parity-web-design.md`
- Create: `.worktrees/windows-portable-tauri/docs/plans/2026-03-15-parity-web-service.md`

**Step 1: Write the design document**
- Summarize the approved Option A architecture.
- Record the fixed port (`127.0.0.1:3001`) and worktree source-of-truth decision.

**Step 2: Save the implementation plan**
- List the files to modify and the exact verification commands.

**Step 3: Commit**
```bash
git -C .worktrees/windows-portable-tauri add docs/plans/2026-03-15-parity-web-design.md docs/plans/2026-03-15-parity-web-service.md
git -C .worktrees/windows-portable-tauri commit -m "docs: add parity web service design"
```

### Task 2: Add the parity Web script entrypoints

**Files:**
- Modify: `package.json`
- Modify: `.worktrees/windows-portable-tauri/package.json`
- Test: command-level verification via `npm run` and existing package script inspection

**Step 1: Define the expected scripts before implementation**
Expected new scripts:
- Root: `dev:parity`, `lint:parity`, `test:parity`, `build:parity`
- Worktree: `dev:parity`, `test:parity`, `build:parity`

**Step 2: Run a quick script inspection to confirm they do not yet exist**
Run:
```bash
node -e "const root=require('./package.json'); const wt=require('./.worktrees/windows-portable-tauri/package.json'); console.log(root.scripts['dev:parity']||'missing'); console.log(wt.scripts['dev:parity']||'missing');"
```
Expected: both print `missing`

**Step 3: Add the minimal script definitions**
- Root scripts proxy to the worktree with `npm --prefix ./.worktrees/windows-portable-tauri run ...`
- Worktree `dev:parity` runs Vite on `127.0.0.1:3001`
- Worktree `test:parity` runs the existing parity-related tests
- Worktree `build:parity` runs the normal Web build

**Step 4: Verify the new scripts exist**
Run:
```bash
node -e "const root=require('./package.json'); const wt=require('./.worktrees/windows-portable-tauri/package.json'); console.log(root.scripts['dev:parity']); console.log(wt.scripts['dev:parity']);"
```
Expected: script strings are printed, not `missing`

**Step 5: Commit**
```bash
git add package.json
git -C .worktrees/windows-portable-tauri add package.json
git -C .worktrees/windows-portable-tauri commit -m "feat: add parity web scripts"
```

### Task 3: Document the verify-Web-first workflow

**Files:**
- Modify: `README.md`
- Modify: `.worktrees/windows-portable-tauri/README.md`

**Step 1: Write the docs change**
- Explain that the EXE-aligned Web verification environment lives in the worktree.
- Document root commands and the fixed parity URL.
- Document the recommended daily flow: Web verify first, then GitHub Actions package.

**Step 2: Verify the docs mention the new commands**
Run:
```bash
rg -n "dev:parity|test:parity|lint:parity|3001|verify in Web first" README.md .worktrees/windows-portable-tauri/README.md
```
Expected: all key commands and port appear in the docs.

**Step 3: Commit**
```bash
git add README.md
git -C .worktrees/windows-portable-tauri add README.md
git -C .worktrees/windows-portable-tauri commit -m "docs: add parity web workflow"
```

### Task 4: Verify the parity flow end-to-end

**Files:**
- Existing tests: `.worktrees/windows-portable-tauri/src/services/gemini.test.ts`
- Existing tests: `.worktrees/windows-portable-tauri/src/services/desktop.test.ts`
- Existing tests: `.worktrees/windows-portable-tauri/src/components/SettingsModal.test.tsx`

**Step 1: Run parity tests**
Run:
```bash
npm run test:parity
```
Expected: all parity-related tests pass.

**Step 2: Run parity lint**
Run:
```bash
npm run lint:parity
```
Expected: type-check completes successfully.

**Step 3: Run parity build**
Run:
```bash
npm run build:parity
```
Expected: Vite production build succeeds from the worktree source.

**Step 4: Smoke-run the parity dev server**
Run:
```bash
npm run dev:parity
```
Expected: local server starts on `127.0.0.1:3001`

**Step 5: Commit**
```bash
git add package.json README.md
git -C .worktrees/windows-portable-tauri add package.json README.md src/services/gemini.ts src/services/gemini.test.ts docs/plans/2026-03-15-web-wanxiang-alignment.md
git -C .worktrees/windows-portable-tauri commit -m "feat: align parity web with desktop flow"
```
