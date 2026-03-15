# Parity Web Service Design

**Date:** 2026-03-15

## Background

The Windows portable EXE now lives in the `codex/windows-portable-tauri` worktree and is the branch used by GitHub Actions packaging. The root `main` web app and the EXE source have already drifted, which caused repeated confusion during verification.

The goal is to establish a single local Web verification environment whose behavior matches the EXE source as closely as possible, so future feature work can be validated in the browser first and only then packaged as a Windows portable build.

## Approved Direction

Adopt **Option A**:

- Treat `.worktrees/windows-portable-tauri` as the single functional source of truth.
- Expose a dedicated local Web verification service for that worktree on a fixed port.
- Keep the root `main` app untouched as much as possible.
- Use the parity Web service for feature validation before every EXE packaging run.

## Scope

### In scope
- Add a fixed-port parity Web dev entrypoint (`127.0.0.1:3001`).
- Add root-level convenience commands that proxy to the worktree.
- Add parity validation commands for lint/tests/build.
- Document the workflow: verify in Web first, then build EXE.
- Keep Web `wanxiang` behavior aligned with EXE behavior.

### Out of scope
- Re-merging all worktree changes back into root `main`.
- Creating a third standalone project just for parity verification.
- Replacing EXE-only validation for native shell/runtime concerns.

## Architecture

### Source of truth
- Functional source: `.worktrees/windows-portable-tauri`
- Packaging source: `.worktrees/windows-portable-tauri`
- Local parity Web verification source: `.worktrees/windows-portable-tauri`

### Entry points
- Root convenience command: `npm run dev:parity`
- Worktree actual command: `npm run dev:parity` inside `.worktrees/windows-portable-tauri`
- Fixed URL: `http://127.0.0.1:3001`

### Validation flow
1. Modify code in `.worktrees/windows-portable-tauri`.
2. Run parity Web locally.
3. Verify first-run config, standard mode, wanxiang mode, and fallback behavior.
4. Run parity lint/tests/build checks.
5. Push branch and let GitHub Actions package the EXE.

## Why this design

### Benefits
- Minimizes drift between Web verification and packaged EXE.
- Avoids maintaining three separate sources.
- Keeps the user workflow simple and repeatable.
- Minimizes code changes: mostly scripts and documentation.

### Trade-offs
- The canonical development source is no longer the root `main` web app.
- Native Tauri shell behavior still needs final EXE verification.
- Developers must understand that `3001` is the parity environment, not the legacy root `3000` app.

## Success Criteria

- Running `npm run dev:parity` from the repo root starts the worktree-backed parity Web service.
- The parity Web service uses fixed port `3001`.
- The parity Web behavior matches the EXE branch behavior for the supported generation flows.
- The documented workflow is clear enough to follow without re-explaining the branch split.
