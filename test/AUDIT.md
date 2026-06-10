# BlissFramework Guideline Audit — 2026-06-10

Audit of `@keenmate/web-multiselect` against the three BlissFramework
guideline checklists at `C:\Git\BlissFramework\guidelines\web-components\`:

- `css-structure.checks.md` (C-CSS-*)
- `base-variables.checks.md` (C-BV-*)
- `color-scheme.checks.md` (C-CS-*)

Baseline state: shipped 1.11.0 (taxonomy swap, OS-aware dark mode).

**Status:** Quick wins #1-#3 applied 2026-06-10. Tables below show post-fix state. Item-by-item changes annotated `[fixed]`.

---

## CSS Structure

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| C-CSS-1  | Canonical file set | PASS [fixed] | All Tier 1+2 files present: `main.css`, `variables.css`, `base.css`, `dark-mode.css`, `controls.css`, `floating.css`, `states.css`, `animations.css`. Tier 3: `badges.css`, `count-display.css`, `debug.css`, `options.css`, `rtl.css`. |
| C-CSS-2  | No underscore prefix | PASS [fixed] | All 9 source files renamed via `git mv` to drop the underscore prefix. `main.css` imports updated. |
| C-CSS-3  | `@layer` declared & used | PASS [fixed] | `main.css:15` declares `@layer variables, component, overrides;`. Every `@import` bound to its layer with `layer(...)`. |
| C-CSS-4  | Empty file stub comment | N/A | No empty canonical files exist yet. |
| C-CSS-5  | Every file imported | PASS | All 9 imported by `main.css`. |
| C-CSS-6  | Section banners > 100 lines | PASS | All large files have `===` banners. |
| C-CSS-7  | BEM convention | PASS [fixed] | Renamed `.ms-wrapper` → `.ms__wrapper`, `.ms-debug-info` → `.ms__debug-info`, `.ms-debug-stats` → `.ms__debug-stats` across CSS + TS + e2e. |
| C-CSS-8  | No hardcoded colors in feature files | PASS [fixed] | `debug.css` colors now route through `--ms-debug-*` variables defined on `:host`. |
| C-CSS-9  | No mixed-bag files | PASS [fixed] | `input-dropdown.css` split into `controls.css` (input/toggle/counter/actions) + `floating.css` (dropdown, hint). `badges-display.css` split into `badges.css` + `count-display.css`. `tooltips-popover.css` absorbed into `floating.css`. Each file now owns one logical concern. |
| C-CSS-10 | Layer contract in README | PASS [fixed] | New "Cascade layers / override contract" section near the theming docs documents the three `@layer` names + override priority table. |
| C-CSS-11 | `main.css` has no rules | PASS | Only `@import` + comments. |
| C-CSS-12 | Bundle size sanity | N/A | Re-check after canonical files added. |

## Base Variables

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| C-BV-1  | Every visible color → variable | PASS [fixed] | `debug.css` now consumes `--ms-debug-*` vars instead of hex literals. |
| C-BV-2  | Every `var()` has a fallback | PARTIAL | Spirit: PASS. All `--base-*` reads have fallbacks (only hits in `variables.css` are inside comments). Letter: ~574 `var(--ms-*)` reads without fallback in feature files — but `:host` defines them, so no broken-render risk. |
| C-BV-3  | `:host` declares every local var | PASS (assumed) | Not exhaustively diffed; spot checks clean. |
| C-BV-4  | Prefix unique & reserved | PASS | `ms` listed in `base-variables.md` prefix table. |
| C-BV-5  | Manifest exists & exported | PASS [fixed] | Added `"./manifest"` short-import key to `package.json` exports. |
| C-BV-6  | Manifest matches code | PASS (assumed) | Updated as part of 1.11.0. Spot-check OK. |
| C-BV-7  | Fallback chains canonical | PASS | `--ms-dropdown-bg`, `--ms-tooltip-bg`, `--ms-primary-bg`, `--ms-primary-bg-hover` use the canonical patterns from `base-variables.md`. |
| C-BV-8  | README documents contract | PASS | Theming section + manifest reference exists. |
| C-BV-9  | No `--base-*` outside `:host` | PASS [fixed] | `debug.css` border-radius reads now go through `--ms-debug-border-radius` / `--ms-debug-summary-border-radius` / `--ms-debug-stats-border-radius`. |
| C-BV-10 | Standalone render works | PASS | Verified by 1.11.0 fallback-chain rewrite + e2e suite. |
| C-BV-11 | Theme override works e2e | PASS | `e2e/theming.spec.ts` covers this. |
| C-BV-12 | CHANGELOG entry | PASS | `## [1.11.0]` documents Added/Changed for the taxonomy work. |

## Color Scheme

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| C-CS-1 | No `:host { color-scheme }` | PASS | Only mentioned in explanatory comments at `variables.css:18-37`. |
| C-CS-2 | `light-dark()` in fallbacks | PASS | Every color fallback uses `light-dark()` or is an intentional same-in-both-modes literal (`#3b82f6` accent, `#ffffff` text-on-accent — documented exception). |
| C-CS-3 | Framework class selectors | PASS [fixed] | New `dark-mode.css` declares `:host-context([data-theme="dark"])`, `:host-context([data-bs-theme="dark"])`, `:host-context(.dark)` and symmetric `light` selectors. Moved from position (1) to position (3) per `color-scheme.md` recommendation for components with existing adoption. |
| C-CS-4 | Per-instance override | PASS [fixed] | `:host([data-theme="dark"])` and `:host([data-theme="light"])` blocks added in `dark-mode.css`. Per-instance attribute wins over framework class on ancestor (specificity). |
| C-CS-5 | Contrast test fixture | PASS [fixed] | `test/dark-mode.html` covers signals #1-#3; new `test/dark-mode-signals.html` covers signals #4-#5 (framework class + per-instance). |
| C-CS-6 | Playwright contrast assertions | PASS [fixed] | `e2e/dark-mode.spec.ts` runs 11 specs (was 5) — adds 6 specs for the new signals, including a precedence test. All pass. |
| C-CS-7 | Visual smoke test | N/A | Manual gate. |
| C-CS-8 | README documents contract | PASS [fixed] | New "Dark mode — supported signals" section in README lists all five signals with examples, precedence rules, and the force-light-on-dark-page recipe. |
| C-CS-9 | CHANGELOG entry | PASS | 1.11.0 has dark-mode entries under Added. |

---

## Punch list — ordered by effort

### Quick wins (small, low-risk, can bundle into one patch release)

1. **`debug.css` cleanup** — convert 6 hex literals to `var()` declarations and stop reading `--base-border-radius-*` directly. Fixes C-CSS-8, C-BV-1, C-BV-9.
2. **Manifest short-import** — add `"./manifest": "./component-variables.manifest.json"` to `package.json` `exports`. Fixes C-BV-5.
3. **BEM renames** — `.ms-wrapper` → `.ms__wrapper`, `.ms-wrapper--inline` → `.ms__wrapper--inline`, `.ms-debug-info` → `.ms__debug-info`, `.ms-debug-stats` → `.ms__debug-stats` in CSS + TS. Fixes C-CSS-7.

### Medium effort (one focused refactor PR)

4. **Add `@layer`** — declare `@layer variables, component, overrides;` in `main.css`, wrap every `@import` in `layer(...)`. Document layer contract in README. Fixes C-CSS-3, C-CSS-10.
5. **Drop underscore prefix** — rename `_*.css` → `*.css`, update `main.css` imports. Fixes C-CSS-2.

### Bigger refactor (probably its own minor version)

6. **Canonical file structure** — split `input-dropdown.css`, `badges-display.css`, `tooltips-popover.css` into single-feature files. Move floating-anchored rules into `floating.css`. Move state modifiers into `states.css`. Add empty `controls.css` / `animations.css` stubs. Add `dark-mode.css` (even if just framework selectors). Fixes C-CSS-1, C-CSS-9.

### Policy call (guideline-vs-guideline tension)

7. **Position (1) vs position (3)** for dark-mode strategy.
   - **Stay at (1):** light-dark()-only. Document the deviation in README as an intentional choice. Acknowledge C-CS-3/C-CS-4 won't pass.
   - **Move to (3):** add `:host-context([data-bs-theme])`, `:host-context(.dark)`, `:host([data-theme])` selectors + corresponding `dark-mode.css`. Pairs naturally with #6.
