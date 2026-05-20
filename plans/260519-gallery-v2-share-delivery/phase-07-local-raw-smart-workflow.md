# Phase 07: Local RAW/JPG Smart Workflow & Export Pack

Status: ⬜ Pending  
Goal: Let admin automatically match and filter selected JPGs along with their source RAW/XMP files directly on the local machine for seamless retouching.

## Chosen Approach

Hybrid:

1. Browser Folder Picker for Chrome/Edge when available.
2. Export Pack fallback for all environments.

## Browser Folder Picker

Use File System Access API:

- Admin selects source folder.
- Admin selects destination folder.
- App reads **basenames** of selected JPGs from the current gallery (e.g., "IMG_1234").
- App performs a Smart Match scan in the local folder.
- If a file matches the basename (regardless of extension: .CR3, .ARW, .XMP, .JPG), it copies the file to the destination `Selected_RAW_JPG` folder.
- App reports copied/missing/duplicates (focusing on RAW availability).

Rules:

- **RAW Smart Matcher:** Match by filename base, ignoring extensions (e.g., `_IMG991.jpg` matches `_IMG991.CR3`).
- Case-insensitive matching.
- Exact filename base match first.
- Support recursive folder scan.
- Do not modify or move source files (Copy only).

## Export Pack

Generate a downloadable pack containing:

- `selected-files.txt`
- `selected-manifest.json`
- `copy-selected.ps1`
- `copy-selected.node.mjs`
- `README.txt`

Generated reports after running local filter:

- `missing-files.csv`
- `duplicates.csv`
- `copied-files.csv`

## Why Hybrid

- Browser picker is fastest for studio users on Chrome/Edge.
- Script pack covers Windows/macOS, large folders, and browser incompatibility.
- No native desktop app required in this phase.

## Acceptance

- Local copy works with a sample folder.
- Duplicate filename scenario is reported.
- Missing file scenario is reported.
- Browser unsupported state clearly offers export pack.
