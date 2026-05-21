---
description: Prepare @keenmate/web-multiselect for npm publish — bump version, finalize CHANGELOG, build, test, commit
argument-hint: rc|release|patch|minor|major
---

# /publish — prepare an npm release of @keenmate/web-multiselect

You are preparing this package for `npm publish`. **Do not run `npm publish`** — the user logs in and publishes manually.

## Argument

The release type: **$ARGUMENTS**

Must be one of:

- `rc` — ship the WIP rc as-is. The topmost CHANGELOG heading (e.g. `## [1.10.0-rc02] - 2026-05-20`) gets the `PUBLISHED` tag inserted. Rare in this repo today — the last rc was `1.5.0-rc01` — but supported for future use.
- `release` — promote a WIP rc to a final release. `1.10.0-rcN` → `1.10.0`. CHANGELOG heading is renamed to match the new version.
- `patch` — SemVer patch bump. Drops any `-rc` suffix. `1.10.1-rcN` → `1.10.1`, `1.10.0` → `1.10.1`.
- `minor` — SemVer minor bump. Drops `-rc`. Resets patch.
- `major` — SemVer major bump. Drops `-rc`. Resets minor and patch.

If missing or invalid, stop and ask the user which one to use (don't guess).

## Repo layout

Single-package repo, everything at root:

- **`package.json`** — `version` field is the source of truth.
- **`CHANGELOG.md`** — at the root. Topmost `## [X.Y.Z] - YYYY-MM-DD` heading **without** the `PUBLISHED` marker is the WIP section.
- **`README.md`** — at the root. Does **not** carry a "What's New" section in this repo, so no per-release rename pass is required.
- **`dist/`** — gitignored. Produced by `npm run build` (Vite). Never staged.

## CHANGELOG convention in this repo

There is **no `## [Unreleased]` section**. The WIP section is the topmost `## [X.Y.Z] - YYYY-MM-DD` heading without `PUBLISHED`. Already-released sections insert ` - PUBLISHED ` between the version and the date:

```
## [1.10.0] - 2026-05-20                  ← WIP, the one you're shipping
### Added
- ...

## [1.9.0] - PUBLISHED - 2026-04-26
### Added
- ...
```

Publishing the WIP section means inserting ` - PUBLISHED` between the `[X.Y.Z]` bracket and the date — exact format: `## [X.Y.Z] - PUBLISHED - YYYY-MM-DD`. The next development cycle creates a fresh `## [next-version] - <date>` heading on its first CHANGELOG edit.

Older sections (1.8.5, 1.8.4, etc.) are inconsistent — some carry the `PUBLISHED` marker, some don't. Don't try to retro-fix them; only finalize the section you're shipping.

## Resolve versions

Read `./package.json` `version` as `CURRENT_VERSION`.
Read the topmost `## [X.Y.Z...]` heading from `./CHANGELOG.md` as `WIP_VERSION`.

Compute `NEW_VERSION`:

| Argument | Logic |
|---|---|
| `rc` | If `CURRENT_VERSION` matches `X.Y.Z-rcN`, `NEW_VERSION = CURRENT_VERSION` (no bump — we're shipping what's already in package.json). If `CURRENT_VERSION` is not an rc, stop and ask the user (they probably wanted `release`/`patch`/etc.). |
| `release` | If `CURRENT_VERSION` matches `X.Y.Z-rcN`, `NEW_VERSION = X.Y.Z`. Otherwise stop. |
| `patch` | Strip any `-rcN`, then bump patch. |
| `minor` | Strip any `-rcN`, then bump minor, reset patch. |
| `major` | Strip any `-rcN`, then bump major, reset minor and patch. |

If `WIP_VERSION` ≠ `NEW_VERSION` (e.g. the WIP is `1.10.0-rc01` but the user asked for `release`), the CHANGELOG heading rename in step 3 also re-tags the section to `NEW_VERSION` — call this out in the report so the user notices.

## Steps (in order)

### 1. Sanity checks

- Run `git status`. The repo intentionally keeps `.claude/`, `test-results/`, and `nul` untracked — those are fine. If there are **other** uncommitted changes that aren't `CHANGELOG.md` or `package.json`, list them and ask the user before continuing. (Typical case: substantive source changes belonging in this release that haven't been committed yet — confirm they're intended for this version before bumping.)
- Confirm the WIP CHANGELOG section has at least one bullet of substantive content under `### Added`, `### Changed`, `### Removed`, `### Fixed`, or `### Internal`. If empty, stop — there's nothing meaningful to release.

### 2. Bump version (if needed)

If `NEW_VERSION` ≠ `CURRENT_VERSION`, edit `./package.json` and change `"version": "CURRENT_VERSION"` to `"version": "NEW_VERSION"`.

For `rc` arg this is normally a no-op — version was bumped earlier in the development cycle.

### 3. Finalize CHANGELOG

In `./CHANGELOG.md`:

- If `WIP_VERSION` ≠ `NEW_VERSION` (e.g. promoting `1.10.0-rc01` → `1.10.0`), rename the WIP heading from `## [WIP_VERSION] - <date>` to `## [NEW_VERSION] - <today>` (today's date from system context).
- If `WIP_VERSION` == `NEW_VERSION`, leave the bracketed version alone but update the date to today **if** the existing date is stale (more than a few days old). The WIP date is usually whatever the day the section was opened; refresh it so the changelog reflects the actual ship date.
- In either case, insert ` - PUBLISHED` between the `[X.Y.Z]` bracket and the date, so the heading reads exactly: `## [NEW_VERSION] - PUBLISHED - YYYY-MM-DD`.
- Leave all bullet content untouched.
- **Do not** create an empty new WIP section — the next dev cycle's first CHANGELOG edit will create one.

### 4. Validate CHANGELOG entries match recent work

Find the previous `PUBLISHED` tag in CHANGELOG (the version just before NEW_VERSION) and locate the commit that bumped to it — usually a commit whose subject starts with `v<previous-version>` or `- v<previous-version>`. Run `git log --oneline <previous-publish-commit>..HEAD` to list commits since.

Also check `git diff` (or `git status`) for any uncommitted source/test work outside the files you're editing in this command.

For every substantive commit or uncommitted change, verify the WIP CHANGELOG section mentions it. If something significant is missing, **stop and ask the user** before finalizing — don't invent entries on their behalf. Pure example/doc tweaks and trivial typo fixes don't need entries.

### 5. Run e2e tests

Run `npm run test:e2e` (or equivalently `make test-e2e`). All specs must pass.

If anything fails, **stop and report**. Do not proceed to build/commit. The user fixes the regression (or decides to fixme the spec) before the publish flow can continue.

If Playwright complains that chromium isn't installed, suggest `make test-e2e-install` and stop.

### 6. Build the package

Run `npm run build` (or `make build`). This:
- Cleans `dist/` (`npm run clean:dist`).
- Runs Vite to emit `dist/multiselect.js`, `dist/multiselect.umd.js`, `dist/style.css`, and the type declarations.

If the build errors, stop and report.

After build, do a quick smoke check on the emitted artifacts:
- `dist/multiselect.js` and `dist/multiselect.umd.js` both exist and are non-empty.
- `dist/style.css` exists.
- `dist/index.d.ts` (or whatever the `types` field points to) exists.

### 7. Verify the package contents

Run `npm pack --dry-run` and confirm the file list includes `dist/`, `src/css/`, `component-variables.manifest.json`, `README.md`, `LICENSE`, and `package.json`. If anything user-facing is missing or anything private leaked in (e.g. `test/`, `e2e/`, `examples-*.html`), stop and report — the `files` field in `package.json` controls this and the leak needs fixing before publish.

### 8. Commit

Stage:
- `./CHANGELOG.md`
- `./package.json`

Do **not** stage `dist/` — it's gitignored.

Commit message format (matches the convention from `b6b6a19` "v1.9.0 - …"):

```
vNEW_VERSION - <one-line summary of the headline change>

<grouped bullets paraphrased from the CHANGELOG section — split into the same
groups the CHANGELOG used: Added, Fixed, Changed, Internal, etc. Keep bullets
terse; full prose lives in the CHANGELOG.>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

The `vX.Y.Z - …` subject style and the `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer both match recent release commits in this repo.

### 9. Report

Report back with:

- The new version number
- The commit SHA
- The exact commands to publish:
  ```
  npm login          # if not already logged in
  npm publish
  ```
  (Or `make publish` if the user prefers the prompt-wrapped Makefile target — note that this re-runs the build inside the Makefile, which is harmless but redundant.)
- A reminder that the CHANGELOG `PUBLISHED` tag is now in place — if `npm publish` fails, the user should revert both the tag (CHANGELOG heading) and the version bump (package.json) before retrying, since the registry will refuse to re-publish the same version.

## Things not to do

- **Do not run `npm publish`.** The user publishes manually after `npm login`.
- **Do not push to git remote.** The commit stays local until the user pushes.
- **Do not create an empty `[Unreleased]` or new WIP heading** in CHANGELOG after finalizing — the next dev cycle's first edit creates the next heading.
- **Do not retro-fix older CHANGELOG sections** that are missing the `PUBLISHED` tag — the convention isn't uniformly applied historically, and editing prior sections noises up the diff.
- **Do not skip `npm run build`** — without it `dist/` is stale and the publish would ship outdated artifacts (or fail entirely if `dist/` was wiped by `make clean`).
- **Do not skip the e2e run** — this repo's tests have caught real regressions during the 1.10.0 cycle, and the gate is explicit.
- **Do not invent CHANGELOG entries** to cover commits you find; ask the user if something's missing.
- **Do not bump if there's nothing meaningful in the WIP section** — stop and explain.
- **Do not stage `test/`, `e2e/`, `test-results/`, or `nul`** — they're either ignored or test artifacts.
