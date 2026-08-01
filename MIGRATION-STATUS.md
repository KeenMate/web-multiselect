# web-multiselect → core migration — status

_Snapshot: 2026-08-01_

## Summary

The **v2.0.0-rc01 core adoption** is complete, green, and shippable as an rc.
Remaining work is polish/confidence: finish sweeping the demo pages, push the
trailing commits, and eventually promote rc01 → 2.0.0.

- Verification (current): **94 unit + 205 e2e (chromium) + typecheck + build** all pass.
- `dist/` rebuilt (gitignored; demos load `dist/`, so rebuild before eyeballing a demo).

## The migration itself — DONE ✅

`<web-multiselect>` is built on `@keenmate/web-components-core` (`BlissElement`),
consumed via `file:../web-components-core` → its built `dist/`. Replaced:

- plumbing → `static inputs`/`static events` on `BlissElement`
- positioning → core `/positioning` (`anchor`/`createTooltip`)
- logging → shim over core `createLoggers`
- global registration → `registerComponent()` (`window.components`)
- CEM → `blissAnalyzerConfig()`
- style injection → core `adoptStyles` + `createStyleSlot`

The dropdown engine (`multiselect.ts`), CSS, tree, and virtual scroll are unchanged.

## This session — demo-sweep bug hunt (6 issues fixed)

| Commit | Fix | Kind |
|---|---|---|
| `1b4f2cc` | Partial/compact "no options" crash — `el.options = data; el.setSelected(sel)` ran against pre-write picker | real regression from async model |
| `e0cf6bb` | e2e regression guard for the sync options→setSelected pattern | test |
| `3fc5272` | suite-wide `pageerror` fixture (the guard that would've caught the crash) | test infra |
| `78aed18` | priority-badge CSS var typo in templating demo (`--ms-badge-text-background` → `--ms-badge-text-bg`) | demo bug |
| `f980658` | option tooltips trailing the row on virtual-scroll | old bug |
| `45ee346` | dev-mode lint: warn on unknown `--ms-*` vars in `customStylesCallback` | new DX aid |
| `d318a6c` | reworked `examples-logging.html` around `window.components` | demo |

**Core:** `1452d64` added `BlissElement.flush()` (synchronous pending-write flush)
to support the first fix.

## What's NOT done

1. **Demo sweep incomplete** — swept 4 of ~15 pages (classic, templating,
   tooltips, logging). Untouched: action-buttons, base-variables,
   events-callbacks, new-api, performance, positioning, search-index, sizes,
   theming, tree, index. Each could hide bugs like those above.
2. **Unpushed commits:**
   - web-multiselect: `d318a6c` (logging demo rework) — 1 ahead of `origin/prod`.
     (The other 6 session fixes already show as on `origin/prod`.)
   - core: 3 ahead of `origin/prod` — `flush` (`1452d64`), plus earlier
     `positioning` (`9a5e4a8`) and `cem` (`301ea15`).
3. **Still an rc** — no final `2.0.0` tag; `docs/usage.md` etc. not yet
   re-checked against the v2 API.

## Recommended next steps

1. Finish the demo-page sweep (highest bug yield so far).
2. Push the trailing commits (web-multiselect `d318a6c`; core `1452d64`).
3. Re-check `docs/*` against the v2 API, then promote rc01 → `2.0.0`.

## Gotchas worth remembering

- **Demos run `dist/`, not `/src`.** Source fixes are invisible on `examples-*.html`
  until `npm run build`. e2e/unit run against `/src` (dev server) and are the
  source of truth; demos lag.
- **The dev-only lint is stripped from `dist`** (`import.meta.env.DEV` → false in
  a build) — helps authors in dev, never nags shipped consumers.
- **Imperative methods flush pending writes** (`getSelected`/`setSelected`/
  `getValue`/`selectedValue`/`selectedItem`) so `el.prop = x; el.method()` stays
  synchronous. Reading rendered **DOM** after a property write still needs
  `await el.whenSettled()`.
