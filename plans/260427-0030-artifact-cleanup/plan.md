# Plan: Log / Build Artifact Cleanup
Created: 2026-04-27T00:30
Status: Done

## Why
Trong luc doi chieu print contract voi `C:\Users\Admin\Desktop\Ai\0Moodstudio`, search bi nhieu vi repo tham chieu co log/build artifact. Viec nay lam `rg` cham va de nhieu ket qua nhieu.

## Scope
- Current app: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`
- Reference app: `C:\Users\Admin\Desktop\Ai\0Moodstudio`
- Goal: giam noise khi search/build audit, khong xoa file co gia tri tham chieu khi chua xac nhan.

## Initial Findings
- `mood-studio` da ignore cac artifact chinh: `.next/`, dev logs, `node_modules/`, `tsconfig.tsbuildinfo`.
- `0Moodstudio` co nhieu log/build artifact trong repo tham chieu, nen grep tu root bi noise.
- `mood-studio`: root ignored artifacts were removed; `.next` and `node_modules` were intentionally kept.
- `mood-studio`: `tmp/dev-server.err.log` and `tmp/dev-server.out.log` were tracked log artifacts and are now deleted as cleanup.
- `mood-studio`: ignored logs/PWA generated files/tsbuildinfo were removed where file handles allowed.
- `mood-studio`: two `.next-dev*.log` files are still present because a running process holds the file handles.
- `0Moodstudio`: git audit done with one-shot `git -c safe.directory=...`; khong sua global git config.
- `0Moodstudio`: root khong co `.gitignore`; `webapp/.gitignore` co ignore logs/build/PWA generated files.
- `0Moodstudio`: root logs `deploy_*.log`, `full_deploy.log`, `webapp/build.log`, `webapp/public/*generated*`, `webapp/tsconfig.tsbuildinfo` were removed.
- `0Moodstudio`: added root `.gitignore` for root deployment/debug artifacts.
- `0Moodstudio/webapp`: tracked generated file `dist/check_roles.js` was deleted; `/dist` and `public/fallback-*.js.map` were added to `webapp/.gitignore`.

## Phases

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 00 | Audit artifact inventory | Done | Current app + reference repo checked |
| 01 | Check ignore rules | Done | Root `.gitignore` added for `0Moodstudio` |
| 02 | Remove tracked build outputs | Done | Removed `tmp/dev-server*.log` and `0Moodstudio/webapp/dist/check_roles.js` |
| 03 | Verify search/build | Done | Artifact file listing is clean except locked `.next-dev*.log` |

## Guardrails
- Khong xoa artifact trong `0Moodstudio` neu dang dung lam source tham chieu v1.
- Khong dung `git reset --hard` / checkout revert.
- Neu artifact dang tracked, dung `git rm --cached` chi khi da xac nhan no khong can version control.
- Neu chi can search nhanh, uu tien gioi han path thay vi cleanup ngay.

## Suggested Commands
```powershell
git status --short --ignored
git ls-files | rg -n "\.(log|map)$|(^|/)(\.next|dist|build|out|coverage|node_modules)/|tsconfig\.tsbuildinfo$"
rg --files -g "!*.log" -g "!*.map" -g "!deploy_*" -g "!.next/**"
```

## Remaining
- `mood-studio/.next-dev.err.log`
- `mood-studio/.next-dev.out.log`

Hai file nay dang bi process giu file handle. Don tiep sau khi stop dev server.
