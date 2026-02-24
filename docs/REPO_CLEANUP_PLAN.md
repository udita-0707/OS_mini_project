# Repo Cleanup and Standardization Plan

## Objectives
- Keep only source-of-truth files in git.
- Make builds/tests reproducible without polluting the working tree.
- Standardize project layout for both the C tool and `cipherchat` frontend.
- Establish a predictable git workflow and review hygiene.

## Current Issues Found
- Generated artifacts are tracked:
  - `encrypt_tool`
  - `src/*.o`
  - mutable files in `test/test_files/*`
- Frontend app directory (`cipherchat/`) is not tracked, but contains:
  - source (`src`, `index.html`, `package.json`)
  - generated/cache output (`node_modules`, `dist`, `.parcel-cache`)
- No repo-level `.gitignore` existed before this cleanup.

## Phase 1: Baseline Hygiene (Applied)
- Added `.gitignore` to ignore:
  - macOS metadata (`.DS_Store`)
  - C build artifacts (`*.o`, `encrypt_tool`)
  - test outputs (`*.enc`, `*.dec`, mutable test files)
  - frontend generated files (`cipherchat/node_modules`, `cipherchat/dist`, `cipherchat/.parcel-cache`)
  - local env files (`.env*`, while allowing `.env.example`)

## Phase 2: Stop Tracking Generated Artifacts
Run once and commit:

```bash
git rm --cached encrypt_tool src/*.o
git rm --cached test/test_files/test_binary test/test_files/test_input.txt
git rm --cached test/test_files/*.enc test/test_files/*.dec
```

Expected result:
- Files remain on disk locally.
- They are removed from git tracking.
- Future changes to those files are ignored.

## Phase 3: Normalize Test Fixtures vs Test Artifacts
- Keep only immutable fixtures under `test/fixtures/`.
- Write all test outputs to `test/artifacts/` (ignored).
- Update `Makefile` test target paths accordingly.

Example target shape:
- input fixture: `test/fixtures/sample_input.txt`
- generated outputs: `test/artifacts/*.enc`, `test/artifacts/*.dec`, `test/artifacts/test_binary*`

## Phase 4: Bring `cipherchat` Under Version Control Cleanly
- Add only source and lockfile:
  - `cipherchat/src/**`
  - `cipherchat/index.html`
  - `cipherchat/package.json`
  - `cipherchat/package-lock.json`
  - `cipherchat/project_documentation.md`
- Keep `node_modules`, `dist`, `.parcel-cache` ignored.

Command:

```bash
git add cipherchat/src cipherchat/index.html cipherchat/package.json cipherchat/package-lock.json cipherchat/project_documentation.md
```

## Phase 5: Structure and Docs Standardization
- Keep root as multi-project workspace:
  - `src/`, `include/`, `test/` for C tool
  - `cipherchat/` for frontend
  - `docs/` for shared project docs
- Update root `README.md`:
  - add "Repository Layout"
  - add "C Tool Quick Start"
  - add "CipherChat Quick Start"
  - add "What is tracked vs generated"
- Add `cipherchat/README.md` for frontend-local setup and env vars.

## Phase 6: Git Workflow Hygiene
- Branching:
  - use feature branches (prefix `codex/` or `feat/`, `fix/`, etc.).
- Commit rules:
  - separate cleanup commits from feature commits.
  - keep generated files out of commits.
- Pre-PR checks:
  - `make test`
  - `npm run build` in `cipherchat`
  - `git status --short` should be clean except intended source/doc changes.

## Suggested Commit Sequence
1. `chore(repo): add gitignore and cleanup plan`
2. `chore(repo): untrack generated binaries and test outputs`
3. `chore(repo): track cipherchat source and lockfile only`
4. `chore(test): split fixtures from generated artifacts`
5. `docs(repo): standardize root and frontend readmes`
