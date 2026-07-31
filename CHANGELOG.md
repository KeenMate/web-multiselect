# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-rc01] - 2026-07-31

The **core adoption** major: `<web-multiselect>` is now built on
[`@keenmate/web-components-core`](../web-components-core) (`BlissElement`). The
dropdown engine (`multiselect.ts`), CSS, tree, and virtual scroll are unchanged;
the custom-element plumbing that wrapped them is replaced by the shared core.

### Changed

- **Element built on `BlissElement`.** The hand-coded custom-element plumbing —
  `ATTRIBUTE_TABLE`, `observedAttributes`, `attributeChangedCallback`,
  `parseAttrValue`, and the ~40 property/callback getters/setters — is replaced by
  a single core input table (`static inputs`) + event table (`static events`).
  Core owns attribute parsing, validation, reactivity coalescing, reflection, and
  the managed `on<Name>` handler properties. Reactivity is now declared per input
  (`on: 'reinit' | 'update'`) instead of discovered at runtime.
- **Logging runs on the core logging module.** `logger.ts` is now a thin shim over
  core's `createLoggers('MULTISELECT', …)`; the vendored `loglevel` +
  `loglevel-plugin-prefix` copies under `src/vendor/` are gone. The category
  loggers (`MULTISELECT:INIT/DATA/UI/INTERACTION`) and the control functions
  (`enableLogging` / `disableLogging` / `setLogLevel` / `setCategoryLevel`) keep
  their names.
- **Global registration via `registerComponent()`.** The hand-rolled
  `window.components['web-multiselect'] = { … }` block collapses to one core call;
  `getInstances()` is now wired to the live-instance registry `BlissElement`
  maintains automatically (add on connect / remove on disconnect).
- **CEM manifest from the input table.** `custom-elements-manifest.config.mjs` now
  extends core's `blissAnalyzerConfig()` (its `blissInputsPlugin()` reads the
  `static inputs`/`static events` tables); the homegrown
  `cem/attribute-table-plugin.mjs` (which read the old `ATTRIBUTE_TABLE`) is
  removed. The VS Code / JetBrains editor-integration generators still run.
- **Positioning runs on the core positioning module.** The dropdown, search hint,
  selected-items popover, and all tooltips are positioned via core `anchor()` /
  `createTooltip()` instead of a private `@floating-ui/dom` wrapper + the local
  `tooltip.ts` (removed). The bespoke behaviours are preserved through core's
  hooks: the narrowed shadow-DOM fixed-position containing-block heuristic + drift
  diagnostics via `anchor`'s `platform` escape hatch, the themeable
  `--ms-dropdown-width` (published before measuring) via `beforeCompute`, the
  flip-once-then-pin dropdown via `lockPlacement: 'freeze'`, the no-flip hint via
  `flip: false`, and the badge-remove-dismisses-parent tooltip via `onBeforeShow`.
  Tooltips stay inside the shadow root (scoped styling) via `createTooltip`'s
  `ShadowRoot` container. (Core grew these capabilities to absorb the picker
  without regressing — see the core CHANGELOG.)

### Breaking

- **`onSelect` / `onDeselect` / `onChange` are now event-handler properties.**
  They install real listeners (like `el.onclick`) and receive the `CustomEvent`,
  so read `e.detail.option` / `e.detail.selectedOptions` / `e.detail.selectedValues`
  — not a bare argument. Equivalent to `addEventListener('select', …)`. The
  bubbling/composed `select` / `deselect` / `change` events are unchanged.
- **`setAttributes()` takes typed property values by `configKey`, not attribute
  strings.** `el.setAttributes({ searchPlaceholder: 'Search…' })` (a batched
  property assignment, coalesced into one update). To batch attribute **strings**,
  use `el.batch(() => { el.setAttribute('search-placeholder', 'Search…'); … })`.
- **Property writes are asynchronous (coalesced).** Setting a property (e.g.
  `el.options = […]`) applies on a microtask, not synchronously. Await
  `el.whenSettled()` before reading back rendered state. `setAttributes()` and
  `batch()` still flush synchronously.
- **Tooltips mount on show.** Core tooltips are added to the DOM when shown and
  removed when hidden (the old ones were always present, toggled by a class) —
  query a tooltip element after triggering hover/focus.

### Fixed

- **Live `checkbox-mode` / `cascade-select-policy` switch keeps re-projecting the
  current selection** (the rc08 behaviour): these inputs are `on: 'update'`, so a
  live change patches the picker in place rather than rebuilding it.

## [1.12.0-rc08] - 2026-07-19 [PUBLISHED]

### Added

- **Tree metadata in the option render callback.** `renderOptionContentCallback(item, ctx)` now carries tree context when rendering a tree row: `isTreeNode`, `isBranch`, `isLeaf`, `childCount` (direct children), `level` (1-based), `depth` (0-based, matches `--ms-tree-depth`), `path`, `isSelectable`, and `isIndeterminate` (cascade tristate). Flat options get `isTreeNode: false`; all fields are optional, so existing callbacks are untouched. Makes it a one-liner to render a child-count badge on branches or branch/leaf-specific markup without re-deriving the hierarchy. Demoed as section 12 ("Custom Node Rendering") on `examples-tree.html`; browser coverage in `e2e/tree-cascade.spec.ts` with fixtures in `test/tree.html`.
- **Independently sizable panels via CSS variables.** The options dropdown and the selected-items popover each have their own width, decoupled from the input: `--ms-dropdown-width` (defaults to the live input width) and `--ms-selected-popover-width` (intrinsic `32rem`), alongside the existing `--ms-options-max-height` / `--ms-selected-popover-max-height`. The CSS variables are the source of truth — set them at app/theme level (`web-multiselect { --ms-dropdown-width: 60rem }`) — and the new `dropdown-width` / `selected-popover-width` attributes are sugar that write those variables inline on the element (local override). No inline width is force-synced anymore; JS only publishes the live input width as `--ms-input-current-width` for the dropdown default. Demoed as section 14 ("Independent Panel Widths"); browser coverage in `e2e/positioning.spec.ts` (attribute, theme-level var, default-fallback, and both panel max-heights).
- **Counter chip tooltip.** The `[N]` counter (`show-counter`) now has a native `title` listing the picked items (capped, newline-separated), so hovering it previews the selection.
- **Richer tree demo data** on `examples-tree.html` — a 4-root, up-to-4-level catalogue (Fruit / Vegetables / Dairy / Grains, ~51 nodes) so cascade rollup, partial branches, and deep collapse are all exercisable.
- **`make kill-port`** — frees the Vite dev-server ports (12200–12205); mirrors the `svelte-fluentui` netstat/taskkill mechanism.

### Changed

- **The counter counts the rolled-up cover, not the emit policy.** In cascade mode the `[N]` counter previously showed the emitted value count, which balloons under `cascade-select-policy="leaves"` / `"all"` (one branch click can emit five-plus values) — confusing next to a couple of rolled-up badges. It now always counts the rolled-up minimal cover (the branches a person actually picked), regardless of the active policy; under the default `rolled-up` policy this is unchanged. Backed by a `counterSelection()` helper; coverage across all three policies in `e2e/tree-cascade.spec.ts`.
- **Selected-items popover honours `--ms-selected-popover-width`.** The popover width variable (`32rem`) was previously overridden by an inline width-sync to the input, leaving it dead. The popover now renders at its intended `32rem` default (override via the variable or the `selected-popover-width` attribute; set it to `var(--ms-input-current-width)` to track the input as before).
- **Input size-variant classes commented out.** The unused `.ms__input--xs/sm/lg/xl` preset classes and their `--ms-input-size-*` variable chain are commented out (kept, not deleted, for a possible future `size` attribute). Nothing toggled them, so this only drops dead CSS (compiled `style.css` shrank ~2.3 kB). Size via `--ms-rem` (global) or the individual `--ms-input-*` vars (targeted), as before.

### Fixed

- **Badge hover no longer washes to white.** `--ms-badge-bg-hover` fell back to the white input background, so a light-blue badge went white on hover (reading as "background lost"). It now deepens the accent tint (dark-mode aware) via `--ms-accent-color-light-hover`.
- **Live `checkbox-mode` / `cascade-select-policy` switch re-projects the selection.** Changing either after init goes through `updateOptions` (not `buildTree`); it now rebuilds the cascade index and silently re-projects the current selection so badges, form value, and checkboxes reflect the new mode/policy. Coverage in `e2e/tree-cascade.spec.ts`.

## [1.12.0-rc07] - 2026-07-07 [PUBLISHED]

### Added

- **`setSelected(values, { notify: true })` — programmatic selection can now announce itself.** `setSelected()` stays **silent by default** (restoring saved state, cascade/dependent resets, and server-authoritative corrections must not fire events — otherwise they trip "the user changed it" handlers or bounce in a feedback loop). The new `{ notify: true }` option fires a **single aggregate `change`** (no per-item `select`/`deselect` flood) for the case where a programmatic change *is* a deliberate user gesture — e.g. a custom action button that sets the selection and should reach the same listeners a manual pick does. Threaded through the web component's `setSelected` too.
- **Action buttons now demonstrated with tree mode** — new section 11 ("Action Buttons") on `examples-tree.html`: the built-in `select-all` / `clear-all` plus a custom `onClick(ms) => ms.setSelected(['fruit'], { notify: true })` action on a cascade tree (so the custom action emits a `change`). No code change to the buttons themselves — they already rendered independently of the tree — but the Select All behaviour was fixed for cascade (see below).

### Fixed

- **Option rows no longer text-select on click-drag.** Clicking a row — or dragging the mouse across the dropdown — highlighted the option labels as if they were selectable text, which reads as broken for what is a pure selection gesture (most visible on tree rows). Added `user-select: none` (+ `-webkit-user-select`) to `.ms__option`, so flat and tree options can't be text-selected. Purely presentational; no API change.
- **Cascade Select All now honours the value policy.** The built-in `select-all` action added every selectable node's value directly, bypassing the cascade projection — so with `checkbox-mode="cascade"` + `cascade-select-policy="rolled-up"` it emitted *every* node instead of the rolled-up roots (unlike clicking a node, which rolls up). `selectAll()` is now cascade-aware: it fills the checked-atom set from the visible nodes and projects through the active policy, so Select All emits the same shape a click would (a shared `commitCascadeAtoms` helper backs both paths). Clear All was already correct. New `e2e/tree-cascade.spec.ts` case + `test/unit/cascade.test.ts` coverage.

## [1.12.0-rc06] - 2026-07-06 [PUBLISHED]

_First unreleased RC after the published `rc05`; bundles all of the following._

### Added

- **Adjustable option row height and long-title handling** (CSS variables — applies to every `.ms__option`, flat *and* tree). No new attributes; mirrors how `@keenmate/web-treeview` / `svelte-treeview` expose a label hook + spacing tokens rather than a bespoke subsystem.
  - `--ms-option-min-height` (default `auto`) — set a length for a consistent minimum row height (non-virtual rows). Rows still grow if content is taller. Virtual-scroll rows keep using the fixed `--ms-option-height`.
  - `--ms-option-title-white-space` / `--ms-option-title-overflow` / `--ms-option-title-text-overflow` (defaults `normal` / `visible` / `clip` → **wrap**, unchanged). Flip all three to `nowrap` / `hidden` / `ellipsis` to truncate long titles to one line. `.ms__option-title` is the label hook (the analog of `.wtv__node-label` / `.stv__node-label`); its flex ancestors already set `min-width: 0`, so ellipsis works with no extra CSS. Pairs with `enable-option-tooltips` to reveal the full text on hover.
  - New fixtures in `test/tree.html`; browser spec `e2e/tree-layout.spec.ts`.
- **Real-data tree demo — full ISCO-08 occupation classification** on `examples-tree.html` (section 9). All 619 groups (10 major → 43 sub-major → 130 minor → 436 unit) fetched from `examples-data/isco08.json`; the ISCO code doubles as the materialized path (`2211` → `2.22.221.2211`), only unit groups (leaves) are selectable, long titles truncate with a tooltip, and virtual scroll carries the 600+ rows. A custom `getBadgeDisplayCallback` renders just the leaf title on the badge — prefixed `.. /` when the node has ancestors — while `getBadgeTooltipCallback` puts the full breadcrumb in the badge tooltip. A `getSearchValueCallback` widens the built-in filter beyond the title to also match the **ISCO code and full breadcrumb** (so `2211` or `health` both resolve, matches keeping their ancestors). Exercises tree mode + selectability + custom badge/tooltip/search + row-height/truncation together at scale. Browser spec `e2e/tree-isco.spec.ts`. (Source: ISCO-08 © International Labour Organization, demo data.)

- **External search (`searchCallback`) now composes with tree mode.** Previously the async-search path set the flat `filteredOptions` but not the parallel `treeNodes`, so an externalized search over a tree rendered blank/mis-indexed. It now rebuilds the hierarchy from the returned matches, **keeping their ancestors** — the async analogue of the built-in matches-plus-ancestors behaviour (`rebuildTreeVisibleFromMatches`). Also made the below-min-length / error fallbacks tree-aware. Unit spec `test/unit/tree-async-search.test.ts`.
- **New example — externalized search with FlexSearch** (`examples-search-index.html`, linked from the hub). Shows delegating the *whole* search to your own engine via `searchCallback`: fuzzy / partial-token / **accent-insensitive** / ranked matching over a flat list, and over the full ISCO-08 **tree** (fuzzy text over title/breadcrumb, plus an **exact/prefix code** lookup so `2211` resolves to its node and `72` to the whole subtree; matches keep ancestors). Backed by a small batched `FlexIndexer` (`examples-flex-indexer.js`, a trimmed port of web-treeview's `requestIdleCallback` indexer). **FlexSearch is a dev/consumer dependency only — never in the shipped library bundle.** Browser spec `e2e/search-index.spec.ts`.
- **Per-node selectability in tree mode** (`is-selectable-member` / `getIsSelectableCallback`), mirroring `@keenmate/web-treeview`. Mark a tree node non-selectable via a data flag (`is-selectable-member`, also `el.isSelectableMember`) or a predicate (`el.getIsSelectableCallback`). The predicate receives the **built** `LTreeNode`, so it can read the derived `node.hasChildren` — making the common "leaves only" rule a one-liner: `el.getIsSelectableCallback = (node) => !node.hasChildren`.
  - A non-selectable node is **distinct from a disabled one**: it renders *normally* (no grey/`--disabled` styling) but drops its checkbox, is **skipped by keyboard focus** (Arrow/Home/End/PageUp/PageDown scan past it), and cannot be toggled by click/Enter or picked by **Select All**. Use it for structural branch rows, not for "unavailable" options (that's still `disabled-member`).
  - New theming hook `.ms__option--tree-unselectable` (plus `data-selectable="false"` on the row); ships with only `cursor: default` + no hover highlight so branches read as structure while staying visually normal.
  - Selectability is computed after the whole tree is built (so `hasChildren` is accurate) and stored on the node (`LTreeNode.isSelectable`, default `true`). New config keys `isSelectableMember` / `getIsSelectableCallback`; new attribute `is-selectable-member`.
  - New unit spec `test/unit/tree-selectable.test.ts`; `test/unit/ltree.test.ts` extended; new browser spec `e2e/tree-selectable.spec.ts` (fixtures added to `test/tree.html`). Demoed as section 6 ("Selectable Leaves Only") on `examples-tree.html`.

- **Tree of options.** Options can now render as a hierarchy. Give each option a materialized dot-path (e.g. `"1"`, `"1.1"`, `"1.1.1"`) and set `path-member` (or `el.getPathCallback`); the component derives parent/level from the path and renders the options depth-first, indented by depth. Tree mode auto-enables when a path source is present.
  - The hierarchy model is a trimmed lift of `@keenmate/web-treeview`'s `ltree` (`src/tree/`), reused so ordering matches the treeview.
  - **Always fully expanded** — there is no collapse/chevron. Reach for `@keenmate/web-treeview` when you need expand/collapse.
  - Separate render path (`renderTreeNode`): a tree row carries the same selection/checkbox/icon/subtitle content as a normal option, plus depth indentation (via the inline `--ms-tree-depth` custom property → `src/css/tree.css`; tune with `--ms-tree-indent`) and `--tree-branch` / `--tree-leaf` theming hooks. Every node (branch or leaf) is a normal, selectable option.
  - Search filters the hierarchy to **matches plus their ancestors**, so indentation stays coherent.
  - New attributes: `path-member`, `parent-path-member`, `level-member`, `has-children-member`, `tree-path-separator` (default `.`). New config keys: `isTreeEnabled`, `pathMember`, `getPathCallback`, `parentPathMember`, `levelMember`, `hasChildrenMember`, `treePathSeparator`. The member attributes are also settable as JS properties (`el.pathMember = 'path'`, etc.), each reflecting to its attribute.
  - New example page `examples-tree.html` (basic tree, single-select/checkboxes, ancestor-preserving search, custom separator, full breadcrumb on badges, indentation styling), linked from the index hub. New test fixture `test/tree.html`; unit specs `test/unit/ltree.test.ts` and `test/unit/tree.test.ts`.
- **Badge full title.** New `full-title-member` (or `el.getFullTitleCallback`) reads a fully-qualified label that ships with the data — e.g. a breadcrumb like `"Fruit / Pome fruit / Apple"`; it is never computed by the component. Turn on `show-badge-full-title` (`el.isBadgeFullTitleShown`) and badges render that full title instead of the display value, falling back to the display value for options without one. An explicit `getBadgeDisplayCallback` still wins. Pairs naturally with tree mode (show the full path in the badge). Unit spec `test/unit/full-title.test.ts`.
- **Cascade checkbox mode + a cascade value policy** for tree mode (`checkbox-mode` / `el.checkboxMode`, `cascade-select-policy` / `el.cascadeSelectPolicy`). Two orthogonal knobs — the second is the piece `@keenmate/web-treeview` is missing:
  - **`checkbox-mode`** `independent` (default) | `cascade` — the *interaction*. In `cascade`, checking a node toggles its **whole subtree** and a partially-selected branch shows a **tristate** (dash) box. Tree + multiple only; `independent` is the previous behaviour (nothing changes unless you opt in). Tristate renders from a CSS modifier class `.ms__checkbox--indeterminate` (the box is `appearance: none`, so no native `input.indeterminate` — string-render + virtual-scroll safe).
  - **`cascade-select-policy`** `rolled-up` (default) | `leaves` | `all` — *which values a cascade selection emits* (badges / form / `change`). `rolled-up` is the **minimal cover**: a fully-selected subtree collapses to its root ("complete node"), while a partially-selected branch emits its individually-checked descendants — and rolls to the nearest **selectable** descendant when the complete node itself is non-selectable (e.g. a leaves-only tree). `leaves` emits only the checked leaves; `all` emits every fully-checked node (branches + leaves), matching web-treeview.
  - Canonical state is the set of checked leaf-level **atoms**; the emitted `selectedValues` is a pure projection, so badges/form/events are untouched and every policy round-trips. The logic lives in a standalone, side-effect-free `src/tree/cascade.ts`. New unit spec `test/unit/cascade.test.ts` (12); browser spec `e2e/tree-cascade.spec.ts` (7, fixtures in `test/tree.html`). Demoed as section 10 ("Cascade Checkboxes & Value Policy") on `examples-tree.html`.

### Changed

- **Examples hub version badge is now sourced from `package.json`** instead of a hardcoded string, so it never drifts from the real package version (`index.html` imports the version via vite's JSON named exports).
- **More pronounced option checkboxes.** The unchecked box now draws its border from a **dedicated mid-grey token** (`--ms-checkbox-border-color`, default `#8f8f8f`) instead of the faint generic `--ms-border`, so it reads as a real, clickable control, and the checkmark stroke is a touch bolder. New/reworked tokens: `--ms-checkbox-border-width` (1px), `--ms-checkbox-border-color` (`--base-checkbox-border-color`, `#8f8f8f`), `--ms-checkbox-checkmark-thickness` (2.5px); `--ms-checkbox-border` / `--ms-checkbox-checked-border` recompose from the width token. Fully themeable — override any of these to restyle. Browser spec `e2e/checkbox.spec.ts`.

### Fixed

- **Row height jumped as filtering crossed the virtual-scroll threshold.** With `enable-virtual-scroll` + a custom `option-height`, a broad search (≥ threshold rows) rendered virtualized fixed-height rows while a narrower search (< threshold) fell back to natural content height — so the row height visibly changed (e.g. 32px → ~34px) as you typed. Non-virtual rendering now pins rows to the same `--ms-option-height` **when virtual scroll is enabled** (new `.ms__options--fixed-height` rule); plain non-virtual lists are unaffected. Regression in `e2e/tree-isco.spec.ts`.
- **Tree mode: clearing a search left the dropdown blank.** Pressing Escape to clear the search text (or closing and reopening after a search) reset the flat `filteredOptions` to all options but left the index-aligned `treeNodes` stale — so with virtual scroll the list reserved full height yet rendered **zero rows** (`treeNodes[index]` was `undefined`). Both the Escape-clear and `close()` paths now route through a tree-aware `resetVisibleToAll()` that rebuilds `treeNodes` from the full tree. Regression covered in `e2e/tree-isco.spec.ts`.

## [1.12.0-rc05] - 2026-06-30 [PUBLISHED]

### Added

- **Hover tooltips on dropdown options.** Opt in with the `enable-option-tooltips` attribute (or `el.enableOptionTooltips = true`). Each option row gets a hover tooltip built from the same `Tooltip` engine already used by badge and action-button tooltips, including Floating-UI positioning, show/hide delays, and virtual-scroll recycling support (tooltips re-attach as rows scroll into view). Default content is the option's display value, plus its subtitle on a second line when present; override per option with `getOptionTooltipCallback` (returns a `string` or `HTMLElement`).
- **Option tooltips are independently configurable** (not just shared with badge tooltips):
  - `option-tooltip-placement` (default `top-start`) — anchored to the row's **start edge** so the tooltip no longer centers in the middle of a full-width row. Use `left`/`right` for the start/end **side** of a narrow control.
  - `option-tooltip-follow-cursor` (default `false`) — anchors the tooltip to the mouse pointer and follows it across the row; ideal for very wide rows where a row-anchored tooltip would sit far from the cursor. Implemented in the shared `Tooltip` class via a Floating-UI virtual element driven by `mousemove`.
  - `option-tooltip-delay` / `option-tooltip-offset` — fall back to the `badge-tooltip-*` values, then the base defaults (100 ms / 8 px).
  - **Independent styling:** option tooltips render with the `.ms__option-tooltip` class and read `--ms-option-tooltip-*` variables (`-bg`, `-text-color`, `-padding`, `-border-radius`, `-font-size`, `-max-width`, `-shadow`, `-z-index`), each defaulting to the shared `--ms-tooltip-*` surface — so they look identical until you override one, and can be targeted separately in custom CSS.
- **New example page `examples-tooltips.html`** demonstrating default/custom option tooltips, virtual-scroll support, the full-width placement/follow-cursor fixes, narrow-control side placement, independent `--ms-option-tooltip-*` styling, and badge tooltips. Linked from the index hub.
- **Action-button positioning, rows, and alignment.**
  - `actions-position` (`top` default | `bottom`) — render the action-buttons block as a sticky footer at the bottom of the dropdown instead of the top. Sticky now pins to the matching edge (`top: 0` / `bottom: 0`).
  - `ActionButton.row` (1-based, default `1`) — arrange buttons across multiple stacked rows. **Row 1 sits at the panel's outer edge and higher rows stack inward toward the options list**, so with `actions-position="top"` row 1 is the topmost line and with `actions-position="bottom"` row 1 is the bottommost line (CSS `column-reverse` for the bottom case).
  - `actions-align` (`stretch` default | `left` | `right` | `center` | `space-between`) — horizontal arrangement of buttons within a row. `stretch` keeps the previous full-width behavior; the others size buttons to content and distribute them.
  - Internally `.ms__actions` is now a vertical stack of `.ms__actions-row` lines. Backward-compatible: no `row` set → a single row (today's behavior); `actions-align` defaults to `stretch`.
  - Demonstrated by a new section in `examples-action-buttons.html`.
- **Built-in actions auto-manage their disabled state.** The `select-all` action is now disabled by default once it would add nothing (every selectable option already selected), and `clear-all` is disabled while nothing is selected. This applies **only** when the consumer hasn't set an explicit static `isDisabled` or a `getIsDisabledCallback` — precedence is dynamic callback › static `isDisabled` › built-in default — so existing custom configs are unaffected.
- **`beforeSelectCallback` / `beforeDeselectCallback` interceptors** — veto a selection or deselection before it happens. Each receives `(option, selectedOptions)` (the option being toggled and the current selection *before* the change) and returns `false` to block, or `true`/`undefined` to allow. Silent by design — a blocked action mutates no state and fires no `select`/`deselect`/`change` event. The deselect veto covers **every interactive removal path**: the dropdown option toggle, a badge's remove (×) button, the selected-items popover's remove button, and the "remove hidden" badge (evaluated per item). Programmatic `setSelected()` and the Select-All / Clear-All action buttons intentionally bypass the veto. Example — block selecting `item1` while `item2` is selected: `el.beforeSelectCallback = (opt, sel) => !(opt.value === 'item1' && sel.some(o => o.value === 'item2'))`. In single-select mode a blocked pick leaves the previous value untouched and keeps the dropdown open.

### Changed

- **Fire-and-forget notifications renamed from `*Callback` to `on*` — breaking, no alias.** The BlissFramework naming guideline now draws the callback/event line by *whether the component consumes the return value*: return used → callback (`get*Callback` / `before*Callback`), return ignored → event (`on*`). The four notifications whose return value is discarded are therefore events, not callbacks, and are renamed: config `selectCallback` → `onSelect`, `deselectCallback` → `onDeselect`, `changeCallback` → `onChange`; and `ActionButton.onClick` (which had briefly been renamed to `clickCallback`) stays `onClick`. Each of `onSelect`/`onDeselect`/`onChange` still mirrors its bubbling `select`/`deselect`/`change` `CustomEvent` (the DOM event names are unchanged). Removed outright, no deprecated aliases — clean slate. Migration: rename the config keys / element properties (`el.selectCallback` → `el.onSelect`, etc.); `addEventListener('select' | 'deselect' | 'change', …)` is unaffected.
- **`ActionButton` predicate callbacks renamed to the `get*Callback` shape — breaking, no alias.** `isVisibleCallback` → `getIsVisibleCallback`, `isDisabledCallback` → `getIsDisabledCallback` (their return value *is* consumed, so they stay callbacks, matching the sibling `getTextCallback` / `getClassCallback` / `getTooltipCallback`). Static `isVisible` / `isDisabled` booleans are unchanged. Migration: rename the two keys in any `actionButtons` config.

### Fixed

- **Single-select dropdown no longer reopens with a stale search filter under an empty input box.** In single-select mode the input is dual-purpose — it shows the selected label while closed and acts as the search box while open. On open it was blanked unconditionally (`multiselect.ts`), ignoring `shouldKeepSearchOnClose` (default `true`, which `close()` honors for `searchTerm`/`filteredOptions`). So after searching e.g. `"java"` and picking a result, reopening showed an empty input while the list was still filtered to the two `"java"` matches — the box and the list silently disagreed. `open()` now mirrors `searchTerm` into the box (`this.input.value = this.searchTerm`) instead of clearing it, so the visible input and the filtered list always stay in sync: with `should-keep-search-on-close` (default) the box shows the kept term and the matching results; with it `false`, both reset to empty/full.
- **Dropdown no longer changes height when swapping between the empty "No data" state and the async loading state.** Both now share a `min-height` via the new `--ms-state-min-height` themable variable, so the panel keeps a stable footprint instead of resizing as an async search replaces the empty block with the spinner.

### Internal

- **Interactive select/deselect consolidated into single funnels.** All user-initiated mutations now route through `interactiveSelect()` / `interactiveDeselect()`, which own both the `before*Callback` veto and the state change; the low-level `selectOption()` / `deselectOption()` primitives are reserved for programmatic/bulk paths (`setSelected`, `clearAll`). This removed the duplicated toggle branches and made it structurally impossible for a removal affordance (dropdown, badge ×, popover ×, remove-hidden) to skip the veto — the drift that had let the badge × bypass `beforeDeselectCallback`.
- **New example page `examples-events-callbacks.html`** demonstrating the DOM events, the `on*` property twin, and the `beforeSelect`/`beforeDeselect` interceptors with live veto demos. Linked from the index hub.

## [1.12.0-rc04] - 2026-06-24 [PUBLISHED]

Placeholder ergonomics for pickers and cascade multiselects, plus a batch attribute setter. All additive and backward compatible — except the search-disabled default placeholder wording (see Changed).

### Added

- **`select-placeholder` attribute / `selectPlaceholder` config** — placeholder shown when the input isn't a usable search box (`enable-search="false"`, or `search-input-mode="readonly"` / `"hidden"`). Defaults to `"Pick an option..."` so a non-searchable picker no longer mislabels itself `"Search..."`.
- **`no-data-placeholder` attribute / `noDataPlaceholder` config** — opt-in placeholder shown when the option list is empty, so users see there's nothing to choose without opening the dropdown. Aimed at cascade multiselects (a child whose parent isn't resolved yet). Unset by default, so async-loaded selects don't flash an empty-state message before their data arrives. Takes priority over both other placeholders when the list is empty.
- **`setAttributes(attrs)` method** on the element — applies several attributes in a single in-place update (one re-render instead of one per attribute, or a single reinit at most if a change is structural). Keys are kebab-case attribute names, exactly like `setAttribute`; `null`/`undefined`/`false` removes the attribute, `true` sets it to `""`. Useful for i18n language switches that update multiple placeholder strings at once.
- **`search-debounce` attribute / `searchDebounce` config** — debounce delay in milliseconds before the async `searchCallback` is invoked, so a burst of keystrokes collapses into a single request instead of one per character. Each keystroke resets the timer. Applies to the async `searchCallback` path only — local in-memory filtering stays instant. Defaults to `0` (no debounce, unchanged behavior). The existing stale-result guard (apply results only if the term still matches) remains as a second line of defense against out-of-order responses.
- **`searchCallback` now receives an `AbortSignal`; in-flight requests are cancelled.** The callback signature is now `(searchTerm, signal) => Promise<options[]>`. When a newer search supersedes an in-flight one — or the term drops below `min-search-length`, or the component is destroyed — the previous request's signal is aborted; wire it into `fetch(url, { signal })` to actually cancel the network call. Backward compatible: the second argument is optional and existing callbacks that ignore it keep working (their stale results are still discarded). Aborted/superseded responses never overwrite the live filtered options.

### Changed

- **Search-disabled default placeholder is now `"Pick an option..."` instead of `"Search..."`** (behavior change). Only affects instances with search disabled (`enable-search="false"` / `readonly` / `hidden`) that didn't set a custom placeholder. To restore the old text, set `select-placeholder="Search..."`. Placeholder resolution is also re-evaluated on live updates now, so changing the placeholder attributes, the search mode, or the option list (e.g. a cascade clearing/filling) updates the visible placeholder on the fly.

### Internal

- Added `test/unit/placeholder.test.ts` + `test/unit/set-attributes.test.ts` (Vitest + happy-dom, 19 specs) covering placeholder resolution priority, live updates, and `setAttributes` batching/DOM reflection. Introduces a unit-test layer (`npm run test:unit`) alongside the existing Playwright e2e suite; `npm test` now runs both.
- Added `e2e/placeholder.spec.ts` (10 specs) + `test/placeholder.html` fixture: pins the search / select / no-data placeholder behavior, live i18n updates, cascade empty/refill, and `setAttributes` end-to-end in the browser.
- Added `test/unit/search-debounce.test.ts` (4 specs, fake timers) + `e2e/search-debounce.spec.ts` (3 specs) + `test/search-debounce.html` fixture: verify the async callback collapses keystroke bursts into one call, timer-reset behavior, and that local filtering is unaffected.
- Added `test/unit/search-abort.test.ts` (5 specs) + `e2e/search-abort.spec.ts` (3 specs) + `test/search-abort.html` fixture: verify the `AbortSignal` is passed, that a newer search / sub-min-length / destroy aborts the previous request, and that aborted results never clobber the live options.
- `examples-new-api.html` §8 (Async Search) now demonstrates cancellation and debouncing: an adjustable "simulated API delay" slider on the product search plus a live request log that shows requests firing, completing, and being cancelled when superseded; the GitHub-users search forwards the `AbortSignal` into its real `fetch`; and a dedicated **Debounced Search** demo with a `search-debounce` slider and a keystrokes-vs-API-calls counter that makes the coalescing obvious (e.g. 5 keystrokes → 1 call).

## [1.12.0-rc03] - 2026-06-18 [PUBLISHED]

Third release candidate addressing two real user-impact bugs surfaced during integration. Both fixes are minimal and additive; the bubbling/composition change is technically a behavior change that delegated form-level listeners may notice (see migration note).

### Fixed

- **Declarative `<option>` / `<optgroup>` children now render correctly.** Previously the light-DOM parser produced option objects with `{value, label, group}` keys, but `initializePicker` never wired the corresponding `valueMember` / `displayValueMember` / `groupMember` config, so every row fell through to the picker's `[N/A]` fallback (`multiselect.ts:200,210`). When declarative children are detected, the element now auto-defaults those member properties (plus `iconMember`/`subtitleMember`/`disabledMember`) — only when the consumer hasn't already configured them via attribute, property, or `get*Callback`, so all existing override paths still win.
- **`docs/*.md` now shipped in the published tarball.** The slim README links to `./docs/usage.md`, `theming.md`, `examples.md`, and `accessibility.md`, but those files weren't in `package.json`'s `files` array so consumers reading them from `node_modules` got 404s. Explicit per-file listing avoids dragging in the unrelated `docs/api-reference.html`.
- **Events now reach framework-delegated listeners.** `select`, `deselect`, and `change` events were dispatched as plain `new CustomEvent(name, { detail })` — neither bubbling nor composed. Svelte 5 routes `change` through document-level event delegation (`$.delegate(['change'])`), so the events never reached the handler when consumers used the Svelte 5 `onchange={fn}` callback-prop syntax. Same class of bug affects React's `onChange` and any framework that delegates event routing. Events are now dispatched with `bubbles: true, composed: true`, so framework delegation works out of the box.

### Changed

- **`select` / `deselect` / `change` events bubble and cross shadow DOM boundaries (behavior change).** Consumers who delegate `change` listeners at the form or container level will now also receive our event with `e.target.tagName === 'WEB-MULTISELECT'`. Filter on target if your form-state library extracts state from every `change`. `stopPropagation()` in an ancestor handler will now suppress our event from reaching framework delegation roots — use sparingly. `preventDefault()` remains a no-op (events fire post-commit; nothing to cancel).

### Internal

- Reorganized `ai/events-callbacks.txt` and `ai/selection-modes.txt` to reflect verified event semantics: callbacks fire post-commit (not pre-, cannot cancel); single-mode replacement fires no `deselect` for the displaced item; `setSelected()` is silent; `clearAll()` fires events; native-`change`/`select` name collisions and filter patterns; bubbling + composed flags documented.
- Added `e2e/single-select-events.spec.ts` (4 specs) + `test/single-select-events.html` fixture: pins single-select event semantics (initial pick, replacement-without-deselect, toggle-off) plus an ancestor-listener test that verifies `bubbles: true` / `composed: true` on all three event types. The bubbling test prevents future regressions on the dispatch flags from going unnoticed in CI.
- Added `svelte-test/` standalone Svelte 5 + Vite + Playwright sandbox reproducing the framework-delegation issue with both the legacy `on:change` directive and the Svelte 5 `onchange` callback-prop syntax. Documents the diagnostic path; not wired into the main CI run.

## [1.12.0-rc02] - 2026-06-16 [PUBLISHED]

Follow-up release-candidate addressing validation findings from the BlissFramework guideline checks. User-visible changes: badge tooltips now theme correctly when portaled (real bug fix), and the FOUC-prevention rule actually matches the component's tag. Docs structurally split into a slim README + `docs/` directory.

### Fixed

- **Badge tooltips now inherit `--ms-tooltip-*` and `data-theme` overrides.** Previously `spawnTooltip` appended the tooltip element to `document.body`, so it lived outside the shadow scope and didn't see the host's CSS variables or per-instance dark-mode flip. The tooltip now appends to the host's shadow root (Floating UI's `position: fixed` already escapes overflow containers), so dark-mode contrast holds and overrides like `<web-multiselect data-theme="dark">` propagate to badge tooltips. Resolves C-CS-10.
- **FOUC-prevention rule now actually matches.** `src/css/base.css` declared `multi-select:not(:defined) { ... }`, a leftover from a pre-rename version. The component registers as `web-multiselect`, so the rule never matched and both the pre-upgrade flash and the post-upgrade layout shift it was meant to prevent still happened. Renamed to `web-multiselect:not(:defined)`. Resolves C-TC-15.

### Added

- **Explicit `display: block` on `:host`** — custom elements default to `display: inline`, which is wrong for this block-level component. While the wrapper-host pattern compensated for chrome, hosts placed in inline contexts saw incorrect layout. Resolves C-TC-7.
- **`docs/usage.md`** — full API reference: declarative + programmatic usage, ~45-row attributes table, properties / methods / events, option structure.
- **`docs/theming.md`** — `--ms-rem` sizing, Theme Designer integration, complete `--ms-*` variable catalog (50+ entries across 11 categories), dark-mode signals, cascade layers, wrapper-host pattern, unlayered-reset footgun warning.
- **`docs/examples.md`** — full cookbook: rich content, groups, async / hybrid search, virtual scroll, search modes, display modes, badge positioning + tooltips, i18n, RTL, custom rendering (with XSS notice), flexible data handling, form integration.
- **`docs/accessibility.md`** — keyboard shortcuts, ARIA labels actually shipped, focus behavior, known gaps.
- **BlissFramework attribution** in README (`## Built with BlissFramework` section linking to `blissframework.dev`). Resolves C-RS-14.

### Changed

- **README slimmed from 2009 → ~120 lines** following BlissFramework readme-structure triad (D-RS-6 = A). The full reference content moved into the four `docs/` files above; the README is now a landing page with tagline, headline features, what's new, demos & docs index, install, quick start, browser support, dev, license. Resolves C-RS-2, C-RS-3, C-RS-5 through C-RS-8, C-RS-10 through C-RS-13.

### Internal

- Widened `TooltipOptions.container` to `HTMLElement | ShadowRoot` so the tooltip portal can target either — backward compatible with `document.body` and the existing `options.container` opt-out.
- Cosmetic: dropped a duplicate `display: block` declaration in `:host` (introduced when adding the explicit display intent above).

## [1.12.0-rc01] - 2026-06-10 [PUBLISHED]

This release aligns the component with the BlissFramework web-component guidelines (CSS structure, cascade layers, BEM naming, theming-variable hygiene). User-visible changes are limited to one BEM class rename; the rest is internal refactor and improved consumer override surface.

### Added

- **Dark-mode framework class + per-instance selectors** — new `dark-mode.css` partial (under `@layer overrides`) honors `:host-context([data-bs-theme="dark"])` (Bootstrap 5.3+), `:host-context(.dark)` (Tailwind), `:host-context([data-theme="dark"])` (custom apps), and `:host([data-theme="dark"])` per-instance. Symmetric `light` selectors let consumers force one widget back to light on a dark page. Precedence: per-instance > framework ancestor > page `color-scheme`. Implementation: each block sets `color-scheme: dark`/`light` on the host (not `--base-*`), so the `light-dark()` fallbacks in `variables.css` resolve to the correct branch while any consumer `--base-*` overrides on `:root` or an ancestor flow through unchanged — consumer theming stays the source of truth.
- **`test/dark-mode-signals.html` + 6 new e2e specs** — light-page fixture mounting one multiselect per signal (data-theme per-instance + 3 framework class signals + precedence test). Specs assert each picker renders dark by checking input-background luminance is below 0.2, plus a WCAG-AA contrast check on the per-instance dark hover. Brings dark-mode spec count from 5 to 11.
- **CSS cascade layers (`@layer variables, component, overrides`)** — `main.css` now declares the layer order and every internal `@import` is bound to its layer. Consumers can override any component rule with an unlayered rule (no `!important` required) or by declaring their own `@layer overrides` block that lands after the component's. The override contract is documented in the README.
- **Debug-panel theming variables** — 11 new `--ms-debug-*` variables (`--ms-debug-bg`, `--ms-debug-border-color`, `--ms-debug-text-color`, `--ms-debug-border-radius`, `--ms-debug-summary-color`, `--ms-debug-summary-bg-hover`, `--ms-debug-summary-outline-color`, `--ms-debug-summary-border-radius`, `--ms-debug-stats-bg`, `--ms-debug-stats-border-radius`, `--ms-debug-bullet-color`) on `:host`. Previously the debug panel had hardcoded hex literals and read `--base-border-radius-*` directly in rules; both are now routed through the standard `--ms-*` two-layer pattern.
- **`"./manifest"` short-import in package.json exports** — consumers can now `import manifest from '@keenmate/web-multiselect/manifest'` to read the variable manifest (still also reachable via the full filename for backward compatibility).
- **`test/AUDIT.md`** — living document tracking compliance against BlissFramework guideline checklists (`css-structure.checks.md`, `base-variables.checks.md`, `color-scheme.checks.md`).

### Changed

- **CSS file structure aligned with BlissFramework canonical Tier 1+2+3** — every Tier 1 (skeleton) and Tier 2 (canonical concerns) file now exists, and feature files are single-purpose:
  - Tier 2 `controls.css` carries input chrome (`.ms__input`, `.ms__toggle`, `.ms__counter`, `.ms__actions`, `.ms__action-btn`).
  - Tier 2 `floating.css` carries every Floating-UI-anchored panel (`.ms__hint`, `.ms__dropdown`, `.ms__badge-tooltip`, `.ms__selected-popover`).
  - Tier 2 `states.css` carries block-level state modifiers (`.ms--disabled`, `.ms--no-checkboxes`).
  - Tier 2 `animations.css` exists as an intentional stub (component has no `@keyframes`).
  - Tier 3 `badges.css` and `count-display.css` replace the old mixed-bag `badges-display.css`.
  - Removed: `input-dropdown.css`, `tooltips-popover.css`, `modifiers.css`, `badges-display.css` (content moved into the files above).
  Only affects consumers who deep-imported specific source files; the published `dist/style.css` bundle is unchanged.
- **CSS filenames lose underscore prefix** — `_variables.css` → `variables.css`, `_base.css` → `base.css`, `_options.css` → `options.css`, `_rtl.css` → `rtl.css`, `_debug.css` → `debug.css`. Underscore prefix is a SASS partial convention; these are plain CSS modules. Only affects consumers who deep-imported a specific source file via `@keenmate/web-multiselect/src/css/*` — the published `dist/style.css` bundle is unaffected.
- **BEM-aligned class names** — `.ms-wrapper` → `.ms__wrapper`, `.ms-wrapper--inline` → `.ms__wrapper--inline`, `.ms-debug-info` → `.ms__debug-info`, `.ms-debug-stats` → `.ms__debug-stats`. Brings them in line with the `.ms__*` BEM convention used elsewhere in the component. **Breaking** for anyone who styled these classes externally — see migration note below.

### Internal

- Updated `component-variables.manifest.json` with the 11 new `--ms-debug-*` entries under category `debug`.
- e2e suite updated to use the renamed BEM classes; all 126 tests pass.
- Resolves audit items C-CSS-1, C-CSS-2, C-CSS-3, C-CSS-7, C-CSS-8, C-CSS-9, C-CSS-10, C-BV-1, C-BV-5, C-BV-9, C-CS-3, C-CS-4, C-CS-5, C-CS-6, C-CS-8 from the BlissFramework guideline checklists.

### Migration notes

| What you wrote | What to write now |
|---|---|
| `web-multiselect .ms-wrapper { ... }` | `web-multiselect .ms__wrapper { ... }` |
| `web-multiselect .ms-wrapper--inline` | `web-multiselect .ms__wrapper--inline` |
| `web-multiselect .ms-debug-info` | `web-multiselect .ms__debug-info` |
| `web-multiselect .ms-debug-stats` | `web-multiselect .ms__debug-stats` |
| `import '@keenmate/web-multiselect/src/css/_variables.css'` | `import '@keenmate/web-multiselect/src/css/variables.css'` |
| `import '@keenmate/web-multiselect/src/css/_input-dropdown.css'` | split — see `controls.css` (input/toggle/counter/actions) + `floating.css` (dropdown/hint) |
| `import '@keenmate/web-multiselect/src/css/_tooltips-popover.css'` | `import '@keenmate/web-multiselect/src/css/floating.css'` |
| `import '@keenmate/web-multiselect/src/css/_badges-display.css'` | split — see `badges.css` + `count-display.css` |
| `import '@keenmate/web-multiselect/src/css/_modifiers.css'` | `import '@keenmate/web-multiselect/src/css/states.css'` |
| (any other underscore-prefixed deep import) | drop the underscore |

The wrapper class is internal layout chrome and rarely styled externally; the debug-* classes are dev-only.

## [1.11.0] - PUBLISHED - 2026-06-09

This release strengthens dropdown positioning across containing-block edge cases, adopts OS-aware light/dark defaults via the CSS `light-dark()` function, and realigns the `--base-*` theming hooks with the cleaner taxonomy used across other KeenMate components.

### Added

- **`light-dark()` defaults across the color palette** — Every `--base-*` fallback that previously held a hardcoded light color now resolves via `light-dark(<light>, <dark>)`. When the consumer's page declares `color-scheme: dark` anywhere in the ancestor chain (`:root`, `body`, etc.), the multiselect picks up readable dark defaults automatically — no need to enumerate ~15 variable overrides. Affected variables: `--ms-text-color-1..4`, `--ms-accent-color-light(-hover)`, `--ms-border-color`, `--ms-input-bg`, `--ms-hint-bg`, `--ms-dropdown-bg`, `--ms-actions-bg`, `--ms-tooltip-bg`, `--ms-tooltip-text-color`, `--ms-selected-popover-bg`.
- **Drift-detection warning for positioning edge cases** — Every dropdown position pass verifies the panel landed where the library told the browser to put it. If it drifts (e.g. an ancestor establishes a fixed-positioning containing block via a CSS property the library's heuristic doesn't recognize), a `console.warn` fires once per multiselect instance naming the likely culprit element and its responsible CSS, plus an actionable fix: replace `contain:` / `container-type:` on the ancestor with `transform: translateZ(0)`, or move the trigger out of that subtree.
- **`examples-positioning.html`** — new demo page walking through baseline / transformed-ancestor / container-type-ancestor scenarios and an interactive toggle to trigger the drift warning.
- **`test/dark-mode.html` + `e2e/dark-mode.spec.ts`** — fixture and 4-spec contrast suite. Verifies option hover, keyboard-focused, and selected states all maintain WCAG-AA contrast (≥ 3:1) on a dark page across three configurations: fully-themed, minimal-override, and pure OS-color-scheme inheritance with zero overrides.

### Changed

- **`--base-*` theming taxonomy aligned with cross-component naming.** The multiselect now reads the more specific hover/active/elevated/inverse vars instead of the legacy `--base-primary-bg*`. Consumer-side migration table:

  | Read until 1.10.x | Now (1.11.0) |
  |---|---|
  | `--base-primary-bg` | `--base-hover-bg` |
  | `--base-primary-bg-hover` | `--base-active-bg` |
  | `--base-dropdown-bg` | `--base-dropdown-bg` → `--base-elevated-bg` (chain) |
  | `--base-tooltip-bg` | `--base-tooltip-bg` → `--base-inverse-bg` (chain) |

  Consumers overriding `--base-primary-bg` or `--base-primary-bg-hover` on a `<web-multiselect>` should switch to `--base-hover-bg` / `--base-active-bg`. `--base-dropdown-bg` and `--base-tooltip-bg` continue to work as primary overrides; the new chain only adds a second-tier fallback. All seven theme demos in `examples-theming.html`, the theming e2e fixture, and `test/COVERAGE.md` are updated to match.
- **`--ms-primary-bg` hover color now stays visible on dark themes without extra overrides.** It used to fall back to a flat `var(--base-main-bg, #f3f4f6)`, which made the hover state collapse onto the panel background on dark themes (illegible). Now mixes 8% of `--ms-text-color-1` into `--base-main-bg`, so the hover is always a visible step toward the text — darker on light themes, lighter on dark. `--ms-primary-bg-hover` uses the same pattern with 14%.

### Fixed

- **Dropdown opened shifted away from its input when content was wider than the input.** The dropdown's `width` was being clamped to `input.offsetWidth` *after* `computePosition` had already run, so Floating UI's `shift({ padding: 8 })` middleware measured the panel at its (wider) natural content width and pushed it left to keep the panel in the viewport. The subsequent width clamp then left the dropdown stranded to the left of the input — most visible when the input sat near the right edge of the viewport, but any input narrower than the longest option label would drift. The width / min-width / max-width inline styles are now applied to the panel *before* `computePosition` runs in `anchorFloatingPanel`, so `shift` measures the final clamped size and only adjusts when actually necessary. The same helper drives the selected-items popover, so that's fixed too.
- **Dropdown positioned to the side of its input when an ancestor used `container-type` (or `contain:`)** — separate from the width-clamp issue above. Floating UI's default `getOffsetParent` walks up to a `container-type: inline-size` ancestor (per spec it establishes a containing block for fixed-positioned descendants), but in some shadow-DOM layouts the browser does *not* actually anchor the fixed panel there, leaving Floating UI's coordinates offset by the wrapper's viewport-x. The library now installs a custom `getOffsetParent` that only walks up through properties the browser reliably honors for fixed positioning (`transform`, `perspective`, `filter`, `backdrop-filter`, qualifying `will-change`), ignoring `container-type` and `contain`. Most visible in apps built on pure-admin's `.pa-layout__main` wrapper.
- **`:host { color-scheme: light dark }` overrode the consumer's `color-scheme: dark`.** The multiselect previously declared `color-scheme: light dark` on `:host` so its OWN `light-dark()` defaults would resolve when no consumer override existed. But that declaration also blocked an outer `body { color-scheme: dark }` from inheriting into the shadow root, so the multiselect always resolved to light defaults even when the page was dark. The declaration is removed; `color-scheme` now inherits normally from the consumer's page.

### Internal

- **Custom `getOffsetParent` helper + drift detector** in `multiselect.ts` — `getFixedPositionOffsetParent`, `findDriftCulprit`, `listContainingBlockProps`. The drift detector measures `panelRect.x - input.x` (and y) after every position pass and warns when |drift| ≥ 1px.
- **Manifest updated** — `component-variables.manifest.json` now lists `--base-active-bg`, `--base-elevated-bg`, `--base-inverse-bg` as consumed base variables, with updated descriptions for `--base-hover-bg`, `--base-dropdown-bg`, and `--base-tooltip-bg` to reflect the new cascade roles.

## [1.10.0] - PUBLISHED - 2026-05-24

This release fixes five bugs surfaced while building the e2e test suite (`test/COVERAGE.md`, ~110 specs across 19 fixture pages). Three of them are end-to-end broken features that the docs claim work; the other two are smaller. All have regression tests added.

### Added

- **`data-options` attribute on `<web-multiselect>`** - The inner picker already supported `data-options` on its container, but the host element never forwarded it, so options could only be supplied via `element.options = [...]` JavaScript assignment. The host attribute is now parsed at init when no JS-set options are present, enabling pure-HTML / server-rendered / SharePoint workbench usage where running an inline script per picker isn't practical. JS-property assignment continues to take precedence when both are present.
- **End-to-end test suite** - 114 Playwright specs across 19 fixture pages under `test/`, with a coverage tracker at `test/COVERAGE.md`. New `make` targets: `test-e2e`, `test-e2e-ui`, `test-e2e-headed`, `test-e2e-install`.
- **`THEMING.md` reference doc** - Top-level reference (~480 lines, 18 sections) cataloguing every theme-able component state — options, checkbox, input, toggle, counter, dropdown, action buttons, badges (incl. counter variant), count display, tooltip, selected popover, scrollbar, global — with the `.ms__*` classes and `--ms-*` CSS variables that style each. Companion piece to `component-variables.manifest.json` for theme authors who want a human-readable map of the styling surface.

### Fixed

- **Dropdown / hint / selected-popover clipped inside scrollable ancestors** - Reported by a SharePoint Framework workbench consumer whose web parts are wrapped in an `overflow-y: auto` canvas zone. Floating UI's `computePosition` was called without a `strategy`, defaulting to `'absolute'`, and the corresponding CSS rules used `position: absolute`. Absolute-positioned descendants are clipped by any ancestor with `overflow: hidden | auto | scroll`, regardless of whether that ancestor establishes a containing block. The dropdown, the floating search hint, and the selected-items popover all now use `strategy: 'fixed'` (with `position: fixed` written inline and as the CSS rule default), so they're positioned relative to the viewport and escape ancestor overflow. `autoUpdate` was already in place, so the panels still stay anchored to the trigger across scroll/resize. No behavior change for consumers whose multiselect lives in a non-scrolling parent. The in-flow `.ms__toggle` and `.ms__counter` icons (children of the input wrapper) deliberately remain `absolute`.
- **`initial-values` was a no-op when `options` arrived later** - `parseInitialSelection()` ran once at init and only populated the internal `selectedOptions` map for values it could resolve in `allOptions` at that moment. When options were set via `element.options =` after construction (or arrived from `searchCallback` / async fetch), the initial values were stuck in `selectedValues` but never resolved — `getValue()` (which reads from `selectedOptions`) returned `[]`, badges didn't render, and the popover header showed phantom counts whose body was empty. Reconciliation now runs both at init *and* every time `options` is replaced, so `<web-multiselect initial-values='["x"]'>` works regardless of when options arrive.
- **`form.reset()` did nothing** - The element wasn't form-associated, so the standard reset lifecycle never reached the picker. Hidden inputs got re-stamped from the picker's internal state on every render, undoing whatever the form thought it had cleared. The element now declares `static formAssociated = true`, attaches `ElementInternals`, and implements `formResetCallback()` to clear the selection — making the multiselect a first-class citizen of the form lifecycle (and unblocking proper constraint validation in future work).
- **Keyboard Enter bypassed disabled state on options** - The click handler at `multiselect.ts:1157` correctly checked `.ms__option--disabled` before calling `toggleOption`, but the Enter-key handler called `toggleOption` directly. Mouse users couldn't select disabled options; keyboard users could. The check now lives inside `toggleOption` itself, so both code paths (and any future entry points) are covered.
- **`searchHint` doc comment was wrong** - Said "shown above the input when focused" in `types.ts`; the code actually shows it only when the dropdown is open. Comment now matches behavior.
- **Keyboard navigation stopped working entirely after clicking any option** — two bugs stacked on top of each other in the option-click path, both visible as "the focus indicator stayed on the clicked option while the list scrolled, and pressing ArrowDown / ArrowUp / Enter did nothing visible." (1) **Search input lost focus on every option click** — each rendered option contains a real `<input type="checkbox">` (used for the checkmark), and clicking the row moves browser focus from the search input to the checkbox. The multiselect's `keydown` listener is bound to `this.input`, so once focus left, none of the arrow keys ever reached the handler. (2) **`focusedIndex` was never anchored to the click** — the click handler called `toggleOption` to flip selection state but never updated `focusedIndex`, so even if focus *had* stayed on the input, the next ArrowDown would have incremented from `-1` / `0` (jumping the list to the top) rather than from the clicked row. Click now both (a) sets `focusedIndex` to the clicked option's index in `filteredOptions` and (b) calls `this.input.focus()` after `toggleOption` to put focus back on the search input. Keyboard navigation from a mouse-anchored position now matches the keyboard-only path. Regression test added at `e2e/keyboard.spec.ts` ("click anchors keyboard focus") — no manual refocus, the test exercises the production behavior.
- **Count-clear and selected-popover close X rendered a circular hover backdrop** — `--ms-count-clear-border-radius` and `--ms-selected-popover-close-border-radius` defaulted to `50%`, the only two `50%` values in the entire component. Every other interactive element (`.ms__option`, `.ms__badge`, `.ms__badge-remove`, `.ms__counter-wrapper`, `.ms__action-btn`, `.ms__counter`) uses a rounded rectangle from the `--ms-border-radius-{sm|md|lg}` scale, so the two circles looked out-of-vocabulary. Both now default to `var(--ms-border-radius-sm)`. The 24px hit area and 14px centered X glyph are unchanged; the hover backdrop is now a small rounded square matching the rest of the component. Themes that explicitly want a circle can still set the variable back to `50%`.
- **Badge X, count-clear X, and selected-popover close X drifted off-center across fonts** - The three close/remove buttons rendered the `×` character (U+00D7) — two via CSS `content` on a `::before`, the popover-close as `&times;` text content directly in the button — so the X's optical position inside each button depended on the page's font metrics (typically a hair right and low in Inter/Roboto/Arial). All three (`.ms__badge-remove`, `.ms__count-clear`, `.ms__selected-popover-close`) now render the X as an SVG via `mask-image` + `background-color: currentColor` — pixel-perfect centering regardless of font, crisp at any zoom. Color theming still flows through the existing `--ms-badge-remove-color`, `--ms-badge-counter-remove-color`, `--ms-count-clear-color`, and `--ms-selected-popover-close-color` (incl. hover) variables via `currentColor`, so existing themes need no change. Three new vars (`--ms-badge-remove-icon-size`, `--ms-count-clear-icon-size`, `--ms-selected-popover-close-icon-size`) let theme authors resize the glyph; the previously-internal `--ms-icon-remove` and `--ms-icon-clear` are still present but now hold a CSS `url(...)` pointing to a mask SVG instead of the `"×"` character.

### Internal

- **`reconcileSelectedOptions()` helper** in `multiselect.ts` - factored out of `parseInitialSelection`; idempotent; safe to call after any `options` mutation. Walks `selectedValues`, looks up each unresolved entry in `allOptions`, and populates `selectedOptions`.
- **`clearAll()` is now public** on the core `WebMultiSelect` class - previously private but conceptually a public operation. Used by the new `formResetCallback`; still drives the built-in Clear All action button.

## [1.9.0] - PUBLISHED - 2026-04-26

This release reworks substantial chunks of the internals (attribute pipeline, tooltip system, data extraction, render paths) without breaking the public API. The user-visible wins are: live attribute changes no longer tear down the dropdown, theming hooks that were previously dead now actually work, and a long list of bugs around custom action buttons, grouped options, badge interaction, and logging are fixed.

### Added

- **`WebMultiSelect.updateOptions(partial)`** - New public method on the core class. Merges a partial config into the live picker without tearing down the DOM, applies cheap structural toggles (no-checkboxes class, badges-position class, input mode, hint text), and re-renders. Returns `false` only for changes that genuinely require a rebuild (currently just adding/removing the `searchHint` element). Used internally by `attributeChangedCallback` and all callback property setters.
- **`Tooltip` class** - New `src/tooltip.ts` exporting a reusable `Tooltip` class (Floating-UI positioning + paired show/hide timeouts + proper cleanup). Replaces three separate per-tooltip-type implementations inside the multiselect.
- **`--base-primary-bg` theming variable** - `--ms-primary-bg` now reads `--base-primary-bg` first, then falls back to `--base-main-bg`, then a hardcoded default. Theme authors who reach for the natural name `--base-primary-bg` get the expected behavior automatically. Both names continue to work.
- **9 previously-dead per-component override hooks now wired** - `--ms-hint-border-color`, `--ms-dropdown-border-color`, `--ms-actions-border-color`, `--ms-group-border-color`, `--ms-badge-counter-border-color`, `--ms-selected-popover-border-color`, `--ms-selected-popover-header-border-color`, `--ms-option-outline-color-focused`, and `--ms-option-border-matched-color`. They were declared but no rule actually read them, so overriding them did nothing. Now wired through their `*-border` shorthand declarations. Each falls back to `--ms-border-color` as before, so there's no visual change unless the consumer overrides one of the per-component hooks.
- **`setCategoryLevel` accepts bare logger names** - In addition to the full `MULTISELECT:UI` form, you can now pass the bare suffix (`'UI'`, `'INIT'`, `'DATA'`, `'INTERACTION'`) and it's normalized to the prefixed form.

### Changed (behavior, not API)

- **Attribute changes no longer rebuild the DOM** - Previously, `attributeChangedCallback` did `picker.destroy() + initializePicker()` for every observed attribute change. Selection state, scroll position, focused index, virtual-scroll buffer, and tooltip handles all rebuilt every time `placeholder`, `max-height`, etc. changed. Now `updateOptions(partial)` merges into the live options and re-renders in place. The full reinit path is reserved for attributes that genuinely require it (currently only adding/removing `searchHint`).
- **Callback property assignment no longer rebuilds the DOM** - All 24 callback / data setters on the web component (`getValueCallback`, `renderBadgeContentCallback`, `actionButtons`, `options`, `searchCallback`, etc.) used to call `reinitialize()` on assignment. They now route through `updatePicker(partial)` for the same in-place update path.
- **`selectAll` / `clearAll` now fire per-item callbacks** - Previously only `changeCallback` fired for bulk operations, so consumers wiring per-item analytics or side effects via `selectCallback` silently missed Select All / Clear All. Now `selectCallback` fires for each newly-added option (skipping items already selected), and `deselectCallback` fires for each removed option. `changeCallback` still fires once at the end and is skipped entirely if nothing changed.
- **Logging — module init no longer clobbers persisted user level** - Switched from `log.setLevel('silent')` (which writes silent to localStorage on every page load) to `setDefaultLevel('silent')` (only takes effect when nothing is persisted). A user who explicitly sets a level keeps it across reloads.

### Fixed

- **Custom action button tooltips never attached** - The lookup in `attachActionButtonTooltips` compared `dataset.customAction === dataset.action`, but `customAction` is never set on the rendered button. The `'custom'` branch always evaluated `undefined === 'custom'` → false, so no custom action button ever received a tooltip.
- **Custom action button click dispatch was fragile** - `handleDropdownClick` matched custom buttons by `btn.text === actionBtn.textContent?.trim()`, which broke for two custom buttons with the same text and for buttons whose text comes from `getTextCallback` instead of static `text`.
  - Fix for both: each rendered action button now carries a stable `data-button-index` attribute used for both tooltip attachment and click routing.
- **CSS variable typo silently ignored `badgeHeight` in virtual popover** - Inline style wrote `--ml-badge-height-virtual` but the CSS rule reads `--ms-badge-height-virtual`. Configured `badgeHeight` was never applied in the virtual-scrolled selected-items popover; it always used the 36px fallback.
- **`VirtualScroll.setItems` reset condition used `&&` where the comment said "OR"** - When a search returned a fresh array with the same length as the current one (very common — same item count for a different search term), `itemsChanged` was `false` and the scroll position wasn't reset. Changed to `||`.
- **`selectAll` / `clearAll` skipped per-item `selectCallback` / `deselectCallback`** - Only `changeCallback` fired for bulk operations, so consumers wiring per-item analytics or side effects via `selectCallback` silently missed Select All / Clear All. Now the per-item callbacks fire for items whose state actually changed (skipping items already selected on Select All; firing for the actual previous selection on Clear All). `changeCallback` still fires once at the end and is skipped entirely if nothing changed.
- **Popover virtual-scroll threshold was hardcoded** - The selected-items popover used `const threshold = 100` literally instead of reading `options.virtualScrollThreshold`, so tuning that option had no effect on the popover. Now both dropdown and popover honor the same threshold.
- **Three attributes were read but not observed** - `checkbox-align`, `badge-tooltip-delay`, and `badge-tooltip-offset` were parsed in `initializePicker` but missing from `observedAttributes`, so changing them at runtime did nothing. Now observed and live-updatable.
- **Grouped options highlighted multiple items at once on keyboard navigation** - Each option's `data-index` was computed from its position within its group rather than its global position in `filteredOptions`. With `focusedIndex === 1`, the second item of *every* group lit up. Now the global index is passed into `renderOption`, so only the actually-focused option highlights.
- **Compact-mode badge missing pointer cursor** - The `JavaScript (+2 more)` badge in compact mode is fully clickable to open the selected-items popover, but only `.ms__badge--counter` and `.ms__badge--more` had `cursor: pointer`. Added a generic `.ms__badge[data-action="show-selected"]` rule that covers all popover-opening badge variants.
- **Faint colored sliver next to badge X button on click** - After clicking the X to remove an item, sibling badges' X buttons retained `:focus`, and the focus `box-shadow` was clipped on the right by the badge container's `overflow: hidden` while remaining visible on the left edge as a thin band of color. Switched the focus ring from `:focus` to `:focus-visible` so mouse clicks no longer leave a focus ring (keyboard navigation still gets one).
- **Logging — runtime level changes didn't propagate** - The vendored loglevel only updates the logger you call `setLevel` on; named child loggers (`MULTISELECT:UI`, `:DATA`, etc.) keep their initial level. After clicking "Set INFO level" at runtime, child loggers stayed silent and no logs appeared until the page was reloaded. `enableLogging`, `disableLogging`, and `setLogLevel` now call `log.rebuild()` to propagate the new level to every named child.
- **Logging — colored prefix rendered as literal `%c[...]%c` text** - The previous setup wrapped the prefix-plugin's output with a separate color-injecting wrapper. The wrapper inspected `args[0]` for `%c` codes *before* the prefix wrapper had added them, so the conditional CSS-injection branch was never taken and console.info received the raw `%c`-laced string with no CSS args. Replaced the two-layer setup with a single combined factory that emits prefix and CSS args in one call.
- **Logging — module init clobbered persisted user level on every page load** - `log.setLevel('silent')` at module init would overwrite a previously-persisted user choice. Switched to `setDefaultLevel('silent')`, which only takes effect when nothing is persisted.
- **Logging — category buttons used wrong logger names** - The example called `setCategoryLevel('INIT', ...)` but the real loggers are named `MULTISELECT:INIT`. `setCategoryLevel` now normalizes bare names (`'UI'`, `'INIT'`, `'DATA'`, `'INTERACTION'`) to the prefixed form, so existing example code works as intended.
- **Theming — `--base-primary-bg` was a silent no-op** - The neon theme example set `--base-primary-bg` to drive option hover color, but `--ms-primary-bg` only fell back to `--base-main-bg`. `--ms-primary-bg` now reads `--base-primary-bg` first, then `--base-main-bg`, then a hardcoded default — both names work.
- **CSS — duplicate variable declarations** - The "INDIVIDUAL OPTIONS" and "INDIVIDUAL BADGES" blocks in `_variables.css` redeclared `--ms-option-bg*` and `--ms-badge-bg*` variables (already declared in the SEMANTIC VARIABLES block). Removed the duplicates and added a comment pointing readers to the canonical declarations.
- **CSS — self-referential variable** - `--ms-badge-bg-hover: var(--ms-badge-bg-hover)` was a remnant of the duplicate block; the canonical declaration in the semantic block resolves correctly to `var(--base-hover-bg, var(--ms-input-bg))`.
- **Tooltip handle leak** - Action-button tooltip IDs were generated with `Date.now()`, so every dropdown render produced a fresh ID and the previous tooltip's Floating-UI cleanup was orphaned in the tracking map. Now keyed by `data-button-index` so re-renders cleanly replace the previous handle.
- **Popover badge tooltips clobbered main badge tooltips** - Both used the option `value` as the map key, so opening the popover overwrote main-container tooltips' tracked handles and they leaked Floating-UI cleanups on close. Popover tooltips now use a `popover-` prefix and are torn down explicitly in `hideSelectedPopover`.
- **Per-frame `getComputedStyle` in tooltip positioning** - Position-update callbacks were calling `getComputedStyle(tooltip)` six times per frame to log diagnostic values, forcing layout flushes during `autoUpdate`. The diagnostic log was a leftover from a debugging session — removed.
- **Noisy emoji-prefixed logging in production paths** - `renderBadges`, `close`, and `toggleOption` had `info`/`warn` calls with emoji prefixes (✅ ❌ 🧹 🔒 🔍 📞) and a trailing `uiLogger.trace()` stack-dump in `close`. Removed — they were leftovers from a one-off debugging session that flooded any consumer enabling reasonable production logging.

### Internal

- **Single attribute table** - `web-component.ts` now has one `ATTRIBUTE_TABLE` that drives `observedAttributes`, the initial parse in `initializePicker`, and `attributeChangedCallback`. Eliminates the previous dual hand-coded mappings that were the source of the missing-`observedAttributes` bugs above.
- **Tooltip class consolidation** - Three previous tooltip implementations (badge text, badge-remove button, action button) — each ~80 lines with their own state maps and lifecycle — collapsed into the single `Tooltip` class in `src/tooltip.ts`.
- **Render-path dedup** - Replaced 7 near-identical `getItem*` data-extraction methods with one `extractField<R>(item, opts)` helper; collapsed three near-identical badge HTML render sites into one `renderBadgeHTML(option, ctx)`; collapsed action-button HTML duplicated between normal/virtual render paths into `renderActionsHTML()`; collapsed six focus methods (`focusNext`/`Previous`/`First`/`Last`/`PageUp`/`PageDown`) into thin wrappers over `focusBy(compute)`; collapsed dropdown/popover positioning into one `anchorFloatingPanel` helper. Selection state-change paths (`selectOption`/`deselectOption`/`selectAll`/`clearAll`) all delegate to one `commit({ added?, removed? })`. Three identical `selectedValues` IIFEs in the web-component event chain became one `collectSelectedValues()` helper.
- **Net code change** - `multiselect.ts` 2567 → 2207 lines (−360). New `tooltip.ts` 158 lines. `web-component.ts` 1011 → 1113 (+102 for the attribute table + helpers). TS total 4519 → 4415 net (−104, with significantly cleaner separation of concerns). UMD bundle 136.71 → 134.67 kB.

### Documentation & Examples

- **Navigate Mode** - Example now shows the `Ctrl/Cmd + ↓ / ↑` shortcut via the built-in `search-hint` attribute and lists all keyboard shortcuts below the example. README's Keyboard Shortcuts section now also includes Page Up/Down, Home/End, and the Enter behavior with `allow-add-new`.
- **Event Handling** - Example now logs the actual `selectedValues` and `selectedLabels` from the event detail instead of just the count.
- **Logging** - Example category buttons now actually work (they were calling `setCategoryLevel('INIT', ...)` against loggers actually named `MULTISELECT:INIT`).
- **Neon theme** - Example now properly tints option hover with the punk-magenta accent.
- **`CLAUDE.md`** - Updated to reflect the actual CSS architecture (was describing a removed SCSS layout). Removed false claims about `$ms-*` SCSS variables and Sass preprocessing.
- **`code-analysis.md`** - Added: documents the multi-phase refactor with rationale, decisions, and remaining items for future maintainers.

## [1.8.6] - PUBLISHED - 2026-02-01

### Fixed

- **TypeScript Declaration Bundling** - Fixed consuming projects seeing ~896 type errors ("implicit any") from untyped JS dist file
  - Root cause: `tsc` generated 6 individual `.d.ts` files mirroring source structure, but Vite bundles JS into a single `multiselect.js` — the mismatch caused consuming TypeScript projects to fail resolving types
  - Additionally, `index.d.ts` contained `import './css/main.css'` which doesn't exist in `dist/`, further breaking type resolution
  - Solution: Added `vite-plugin-dts` with `rollupTypes: true` to generate a single bundled `index.d.ts` with all types inlined and CSS imports stripped
  - Removed standalone `tsc` step from build script (now handled by vite-plugin-dts during Vite build)
  - Consuming projects now properly resolve all types regardless of their `moduleResolution` setting

## [1.8.5] - 2026-01-22

### Added

- **Inline Badge Vertical Alignment** - New `--ms-inline-align` CSS variable for controlling vertical alignment when using left/right badge positions
  - `center` (default) - Badges vertically centered with input
  - `flex-start` - Badges aligned to top of input
  - `flex-end` - Badges aligned to bottom of input
  - Example: `<web-multiselect badges-position="right" style="--ms-inline-align: flex-start;">`

### Fixed

- **RTL Inline Badge Margins** - Fixed badges touching input in RTL mode with left/right positioning
  - Root cause: Margins for inline badge positions were not RTL-aware
  - In RTL mode, flex layout reverses visually but CSS `margin-left`/`margin-right` weren't swapped
  - Added RTL overrides for `.ms__badges--left`, `.ms__badges--right`, `.ms__count-display--left`, `.ms__count-display--right`
  - Badges now have proper spacing from input in all RTL + inline position combinations

## [1.8.4] - 2026-01-22

### Added

- **Escape Key Behavior** - Pressing Escape now has priority-based behavior
  - First priority: closes Selected Items popover (if open)
  - Second priority: clears search text and resets filtered options (if search has text)
  - Third priority: closes dropdown
  - Standard UX pattern for quick dismissal without multiple clicks

### Fixed

- **RTL Input Padding** - Fixed missing padding on right side of input text/placeholder in RTL mode
  - Root cause: `_rtl.css` referenced `var(--ms-input-padding-h)` which didn't exist in `_variables.css`
  - Added missing `--ms-input-padding-h: calc(1.2 * var(--ms-rem))` variable to match horizontal component of `--ms-input-padding`

- **Document Event Listener Cleanup** - Fixed memory leak where document-level event listeners were not removed on component destroy
  - `click` handler for outside-click detection now properly removed
  - `keydown` handler for Escape key now properly removed
  - Prevents accumulating listeners when components are dynamically created/destroyed

### Documentation

- **HTML Injection (XSS) Notice** - Added comprehensive table in README documenting which callbacks allow raw HTML injection
  - Lists all callbacks that use innerHTML (not XSS-safe by design for full developer control)
  - Lists all safe callbacks (output escaped or used as data)
  - Advises sanitizing user-generated content

## [1.8.3] - 2026-01-21

### Added

- **Image/File Picker Example** - New example (#6) in `examples-templating.html` demonstrating:
  - Thumbnail images with custom option rendering
  - File metadata display (filename, dimensions, file size)
  - `renderSelectedItemContentCallback` for rich content in Selected Items popover
  - `badges-threshold="2"` with count mode showing "+N more"

### Fixed

- **Example Callback Names** - Fixed incorrect callback names in examples
  - `renderSelectionBadgeContentCallback` → `renderSelectedItemContentCallback`
  - `getSelectionBadgeClassCallback` → `getSelectedItemClassCallback`
  - Affected examples: Image/File Picker (#6), Priority Badges (#12)

### Changed

- **Example Files CSS Cleanup** - Removed redundant CSS from individual example files that duplicated styles in `examples-shared.css`
  - `examples-new-api.html` - Removed duplicate button, code, grid styles
  - `examples-action-buttons.html` - Removed duplicate code override
  - `examples-logging.html` - Removed button styles, updated to use shared `.note` class
  - `examples-base-variables.html` - Simplified button styling, uses shared `.btn-outline`
  - `examples-performance.html` - Replaced custom tips styling with shared `.note.warning`
  - `examples-sizes.html` - Replaced custom `.code-example` with shared `.code-block`

- **Theme Examples Styling** - Added padding and border-radius to `.theme-card` in `examples-theming.html` for better visual presentation

## [1.8.2] - 2026-01-03

### Added

- **Package Export**: Added `component-variables.manifest.json` to package exports for theme-designer integration

## [1.8.1] - 2026-01-03

### Added

- **Disabled Option Background** - New `--ms-option-disabled-bg` CSS variable for disabled option backgrounds
  - References `var(--base-disabled-bg, transparent)` from theme-designer
  - Provides subtle background tint for disabled options when theme-designer is used
  - Applied to `.ms__option--disabled` and `.ms__option--disabled:hover`

## [1.8.0] - 2025-12-30

### Changed

- **BREAKING: CSS Variable Naming Consolidation** - Renamed `background` → `bg` for shorter, consistent variable names
  - **`--base-*` variables (theme-designer integration):**
    - `--base-input-background` → `--base-input-bg`
    - `--base-input-background-disabled` → `--base-input-bg-disabled`
    - `--base-dropdown-background` → `--base-dropdown-bg`
    - `--base-actions-background` → `--base-actions-bg`
    - `--base-hint-background` → `--base-hint-bg`
    - `--base-tooltip-background` → `--base-tooltip-bg`
    - `--base-popover-background` → `--base-popover-bg`
    - `--base-badge-background-hover` → `--base-badge-bg-hover`
  - **`--ms-*` variables (component-specific):**
    - All `--ms-*-background*` variables renamed to `--ms-*-bg*` (35+ variables)
    - Includes: input, dropdown, actions, hint, tooltip, option, badge, popover, counter, etc.
  - **Migration:** Find and replace `background` → `bg` in your CSS variable overrides
  - Updated `examples-theming.html` with new variable names

- **BREAKING: Text Color Variable Rename** - Added `-color` suffix for consistency
  - `--base-text-on-accent` → `--base-text-color-on-accent`
  - `--ms-text-on-accent` → `--ms-text-color-on-accent`
  - **Migration:** Find and replace in your stylesheets

## [1.7.0] - 2025-12-28

### Added

- **Generic Border Variable** - New `--ms-border` variable for consistent border theming
  - Inherits from `--base-border` (theme-designer integration)
  - Pattern: `--ms-border: var(--base-border, 1px solid var(--ms-border-color))`
  - Aligns with web-daterangepicker v1.9.0 border variable pattern

- **Dropdown Inner Wrapper** - New `.ms__dropdown-inner` element for proper scrollbar clipping
  - Scrollbar no longer overlaps rounded corners in any theme
  - Outer `.ms__dropdown` clips content with `overflow: hidden` and `border-radius`
  - Inner `.ms__dropdown-inner` handles scrolling with `overflow-y: auto`
  - Cross-browser solution (Chrome, Firefox, Safari, Edge)

### Changed

- **Border Variables Refactor** - Component borders now inherit from `--ms-border`
  - Updated variables to use `var(--ms-border)` instead of hardcoded `1px solid var(--ms-border-color)`:
    - `--ms-hint-border`
    - `--ms-actions-border-bottom`
    - `--ms-action-btn-border`
    - `--ms-group-border-top`
    - `--ms-checkbox-border`
    - `--ms-checkbox-disabled-border`
    - `--ms-badge-counter-border`
    - `--ms-counter-wrapper-border`
    - `--ms-selected-popover-border`
    - `--ms-selected-popover-header-border-bottom`
  - Setting `--base-border` in theme-designer now cascades to all component borders
  - Individual border variables can still be overridden for component-specific styling

## [1.6.1] - 2025-12-13

### Fixed

- **Complete Theming Variable Cascade** - All hardcoded colors now respect `--base-*` variables
  - Setting `--base-*` variables from theme-designer properly cascades throughout the component
  - Dark themes, custom accent colors, and other theming scenarios now work correctly

- **Accent Color Theming** - Fixed hardcoded accent colors (`#3b82f6`, `#2563eb`)
  - Checkboxes, badges, counters, focus rings, hover states now use `var(--ms-accent-color)`
  - RGBA values converted to `color-mix(in srgb, var(--ms-accent-color) X%, transparent)`

- **Badge Hover Theming** - Badge hover backgrounds now respect themes
  - Was hardcoded to `#ffffff`, now uses `var(--base-badge-background-hover, var(--ms-input-background))`

- **Checkbox Theming** - Checkboxes now inherit theme colors
  - Background uses `var(--ms-input-background)` instead of `#ffffff`
  - Border uses `var(--ms-border-color)` instead of `#d1d5db`
  - Disabled state uses `var(--ms-primary-bg)` instead of `#e5e7eb`

- **Badge Counter Theming** - Badge counter variant now uses semantic variables
  - Text background, remove button colors now flow from `--ms-text-color-*` and `--ms-primary-bg`

- **Scrollbar Theming** - Scrollbar thumb now uses `var(--ms-border-color)`

- **Checkbox Checkmark Position** - Adjusted checkmark position from `top: 45%` to `top: 40%` for better visual alignment

### Removed

- **Redundant `-bg` Alias Variables** - Cleaned up duplicate variables for simpler architecture
  - Removed: `--ms-input-bg`, `--ms-hint-bg`, `--ms-dropdown-bg`, `--ms-actions-bg`, `--ms-tooltip-bg`, `--ms-selected-popover-bg`
  - Use the `-background` semantic variables directly (e.g., `--ms-dropdown-background`)

### Added

- **Accent Color Light Variants** - New CSS variables for light accent backgrounds
  - `--ms-accent-color-light: var(--base-accent-color-light, #eff6ff);`
  - `--ms-accent-color-light-hover: var(--base-accent-color-light-hover, #e0f2fe);`

### Changed

- **Theming Examples Updated** - `examples-theming.html` now demonstrates proper `--base-*` variable usage
  - All 7 themes (Dark, Neon, Audi, Rounded, Sharp, Material, Glass) use `--base-*` variables
  - Shows how themes can be defined with minimal component-specific overrides

## [1.6.0] - 2025-12-10

### Added

- **Preserve Search on Close** - New `shouldKeepSearchOnClose` option (default: `true`)
  - Search text and filtered results are preserved when dropdown closes
  - Re-opening dropdown shows the same filtered view
  - Set `should-keep-search-on-close="false"` or `shouldKeepSearchOnClose: false` for old behavior

- **Border Radius Theme Integration** - Integrated `--base-border-radius-*` variables from theme-designer
  - `--ms-border-radius-sm`: 4px - checkboxes, badges, counters, tags
  - `--ms-border-radius-md`: 6px - inputs, buttons (default)
  - `--ms-border-radius-lg`: 8px - dropdowns, popovers, hints
  - `--ms-border-radius`: backward compat alias → md
  - Pattern: `calc(var(--base-border-radius-sm, 0.4) * var(--ms-rem))`

- **Input Border Color Theme Integration** - Integrated `--base-input-border-color-*` variables from theme-designer
  - `--ms-input-border-color`: normal state → `var(--base-input-border-color, var(--ms-border-color))`
  - `--ms-input-border-color-hover`: hover state → `var(--base-input-border-color-hover, var(--ms-accent-color))`
  - `--ms-input-border-color-focus`: focus state → `var(--base-input-border-color-focus, var(--ms-accent-color))`

- **Remove Button Tooltip Customization** - New options to customize remove button tooltip text
  - `getRemoveButtonTooltipCallback`: Callback to generate custom tooltip text per item
  - `removeButtonTooltipText`: Format string with `{0}` placeholder (e.g., "Delete {0}")
  - `remove-button-tooltip-text` HTML attribute
  - Default remains "Remove {itemName}"

- **Input Size Variants** - Added five input size variants (xs, sm, md, lg, xl) with theme-designer integration
  - `--ms-input-size-xs-height`: `calc(var(--base-input-size-xs-height, 3.1) * var(--ms-rem))` (31px)
  - `--ms-input-size-sm-height`: `calc(var(--base-input-size-sm-height, 3.3) * var(--ms-rem))` (33px)
  - `--ms-input-size-md-height`: `calc(var(--base-input-size-md-height, 3.5) * var(--ms-rem))` (35px)
  - `--ms-input-size-lg-height`: `calc(var(--base-input-size-lg-height, 3.8) * var(--ms-rem))` (38px)
  - `--ms-input-size-xl-height`: `calc(var(--base-input-size-xl-height, 4.1) * var(--ms-rem))` (41px)
  - Each size also includes `-font`, `-padding-v`, `-padding-h` variables
  - Heights reference `--base-input-size-*-height` from theme-designer for consistent sizing across all KeenMate components

### Changed

- **Default Input Height** - `--ms-input-height` now references `--base-input-size-md-height` for theme-designer consistency

- **BREAKING: Migrated from SCSS to Pure CSS** - Complete removal of SCSS dependency
  - All 11 SCSS files converted to pure CSS in `src/css/` folder
  - Removed `sass-embedded` from devDependencies
  - Removed SCSS preprocessor configuration from `vite.config.ts`
  - Package exports changed: `./scss` → `./css`, `./src/scss/*` → `./src/css/*`
  - Files included: `src/css/` folder instead of `src/scss/`
  - **Migration**: If importing SCSS directly, update paths from `./scss/` to `./css/`

- **Simplified Variable Architecture** - Single source of truth for all styling
  - All SCSS `$variables` replaced with CSS custom property fallbacks
  - Pre-computed `color.mix()` values to static hex: `--ms-text-color-2: #353b47`, `--ms-text-color-4: #a0a3a9`
  - No more build-time vs runtime variable confusion
  - Theme-designer integration works correctly without SCSS interpolation overrides

- **Arrow Key Navigation** - Disabled wrap-around behavior on ArrowUp at first item
  - Previously: ArrowUp at first item jumped to last item
  - Now: ArrowUp at first item stays at first item (use Home/End to jump)

### Fixed

- **Tooltip Remains After Badge Removal** - Fixed tooltip staying visible when clicking remove button
  - Root cause: `showTimeout` and `hideTimeout` were local closure variables not cleared on cleanup
  - Added `badgeTooltipShowTimeouts` and `badgeTooltipHideTimeouts` Maps to track pending timeouts
  - `destroyAllBadgeTooltips()` now clears all pending timeouts before removing elements
  - `cleanupBadgeTooltip()` now clears specific timeouts for the tooltip being cleaned up

- **Badge Text Border Clipping** - Fixed top/bottom borders being hidden on `.ms__badge-text`
  - Root cause: `height: 100%` + border caused total height to exceed parent's fixed height with `overflow: hidden`
  - Added `box-sizing: border-box` to `.ms__badge-text` and `.ms__badge-remove`
  - Full border now visible on badge text and remove button

- **Text Color Levels Not Applying** - Fixed `--ms-text-color-1` through `--ms-text-color-4` not cascading to option titles/subtitles
  - Root cause: SCSS interpolation was overriding CSS variable fallback chains
  - Solution: Pure CSS removes the conflict entirely

- **Virtual Scroll Search Bug** - Fixed issue where searching for non-existent term broke subsequent searches
  - Root cause: When `filteredOptions.length === 0`, normal rendering was used (not virtual scroll), but `virtualScroll` instance wasn't destroyed
  - Clearing search caused virtual scroll to render to orphaned DOM elements
  - Added cleanup in `renderDropdown()` when transitioning from virtual scroll to normal rendering

- **Virtual Scroll Keyboard Navigation** - Fixed arrow key navigation not scrolling beyond visible area
  - `setItems()` no longer resets scroll position when items haven't changed (e.g., focus change)
  - `scrollToIndex()` now implements `scrollIntoView({ block: 'nearest' })` behavior - only scrolls if item is outside viewport

- **Checkbox Alignment Default** - Fixed `--ms-checkbox-align` fallback incorrectly set to `flex-start` instead of `center`
- **Options Padding Default** - Changed `--ms-options-padding` default from `calc(0.4 * var(--ms-rem)) 0` to `0`
- **Dropdown Border Cascading** - Fixed `--ms-dropdown-border` now uses `var(--base-dropdown-border, ...)` to respect theme-designer settings
- **Selected Option Title Color** - Added `--ms-option-title-color-selected` and `--ms-option-title-color-selected-hover` CSS rules so title text properly uses contrasted color (e.g., white) on selected accent background

### Removed

- **SCSS Files** - Deleted entire `src/scss/` folder (11 files, ~2,600 lines)
  - `_variables.scss`, `_css-variables.scss`, `_base.scss`, `_input-dropdown.scss`
  - `_options.scss`, `_badges-display.scss`, `_tooltips-popover.scss`
  - `_modifiers.scss`, `_rtl.scss`, `_debug.scss`, `main.scss`

- **Redundant Option Color Variables** - Removed container-level selected color variables in favor of element-specific ones
  - Removed: `--ms-option-color-selected`, `--ms-option-color-selected-hover`, `--ms-option-color-selected-focused`, `--ms-option-color-selected-matched`, `--ms-option-color-disabled-selected`
  - Color inheritance for selected options now handled by `--ms-option-title-color-selected` and `--ms-option-subtitle-color-selected`

### Performance

- **Faster Builds** - 375ms vs 851ms (no SCSS compilation)
- **Smaller Bundle** - 165KB vs 171KB JS bundle

## [1.5.1] - 2025-12-08

### Fixed

- **Option Content Alignment** - Fixed `.ms__option-content` not centering icon and text vertically
  - Changed `align-items` from `flex-start` to `center`
  - This was accidentally reverted in 1.5.0 during debugging

## [1.5.0] - PUBLISHED - 2025-12-08

### Changed

- **BREAKING: Default Option Alignment Changed to Center** - Options now vertically center by default
  - Changed `--ms-checkbox-align` default from `flex-start` to `center`
  - Checkbox, icon, and text now align vertically centered by default
  - For top alignment (tall custom templates), use `checkbox-align="top"`
  - CSS variant `[data-checkbox-align="center"]` replaced with `[data-checkbox-align="top"]`

- **Faster Badge Tooltips** - Default tooltip delay reduced from 300ms to 100ms
  - Applies to both badge tooltips and "+X more" badge tooltips
  - Configurable via `badge-tooltip-delay` attribute

### Fixed

- **Virtual Scroll Option Height** - Fixed `option-height` attribute not applying in virtual scroll mode
  - CSS variable was using old prefix `--ml-option-height` instead of `--ms-option-height`
  - Custom `option-height` values now correctly apply to virtual scroll items

- **Badge Tooltips in Selected Popover** - Fixed tooltips not appearing on badges in the selected items popover
  - Tooltips now work in both standard popover (< 100 items) and virtual scroll popover (100+ items)
  - `attachBadgeTooltips()` now accepts optional container parameter

## [1.5.0-rc01] - RELEASED - 2025-12-08

### Changed

- **BREAKING: Simplified Sizing System** - Removed `input-size` attribute and `--ms-input-size-*` CSS variables
  - Removed `input-size` attribute (`xs`, `sm`, `md`, `lg`, `xl`)
  - Removed `--ms-input-size-{size}-font`, `--ms-input-size-{size}-padding-v`, `--ms-input-size-{size}-padding-h`, `--ms-input-size-{size}-height` variables
  - Removed `.ms--size-xs`, `.ms--size-sm`, `.ms--size-lg`, `.ms--size-xl` modifier classes
  - **Migration**: Use `--ms-rem` for global scaling instead (e.g., `--ms-rem: 8px` for compact, `--ms-rem: 12px` for large)

- **Typography Integration** - Font sizes now use unitless multipliers with `--base-*` fallbacks
  - Pattern: `calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))`
  - Enables integration with theme-designer's typography variables
  - Affected variables: `--ms-input-font-size`, `--ms-option-title-font-size`, `--ms-badge-font-size`, etc.

- **SCSS Variable Prefix** - All SCSS variables now use `$ms-*` prefix (previously some used `$ml-*`)

### Added

- **`--ms-input-height`** - New CSS variable for input field height (previously only available via size variants)

### Fixed

- **Windows Build** - Fixed `npm run clean` failing on Windows due to rimraf glob pattern handling
  - Added `--glob` flag for `*.tgz` pattern

## [1.4.0] - 2025-11-30

### Added

- **Input Hover State** - New `--ms-input-border-color-hover` CSS variable for input border on hover
  - Hover state only applies when input is not focused and not disabled
  - Defaults to `--ms-text-secondary` (darker border on hover)

- **Badge Hover State** - New CSS variables for badge text styling on hover
  - `--ms-badge-text-background-hover` - Badge text background on hover
  - `--ms-badge-text-color-hover` - Badge text color on hover
  - Hover applies to `.ms__badge:hover .ms__badge-text`

- **Separate Badge Borders** - Badge text and remove button now have independent borders
  - `--ms-badge-text-border` - Border for the text/label part of the badge
  - `--ms-badge-remove-border` - Border for the remove (X) button part
  - Allows matching border color to each part's background for themed badges
  - Example: Light pink border on text part, dark red border on button part

### Fixed

- **CRITICAL: State-Specific Colors Not Applying** - Fixed `inherit` fallback bug causing state colors to be ignored
  - Root cause: Using `inherit` as CSS variable fallback causes element to inherit from parent's computed value, not the fallback chain
  - Affected 8 color variables: `--ms-option-color-focused-hover`, `--ms-option-color-matched-hover`, `--ms-option-color-selected-focused`, `--ms-option-color-selected-matched`, `--ms-option-color-disabled-selected`, `--ms-option-subtitle-color-hover`, `--ms-option-subtitle-color-selected`, `--ms-option-subtitle-color-selected-hover`
  - Solution: Changed to nested `var()` fallbacks (e.g., `var(--ms-option-color-selected, var(--ms-option-text-color, $ml-option-color))`)
  - State-specific colors now properly cascade: state color → parent state color → base color
  - Example: Setting `--ms-option-color-selected: #ffffff` now correctly applies to selected items

### Changed

- **BREAKING: Unified Theming Variable Rename** - Renamed `--ms-text-white` to `--ms-text-on-accent` for consistency with unified theming system across KeenMate components
  - This variable represents text color on accent-colored backgrounds (e.g., white text on blue buttons)
  - The new name better describes its purpose and matches the naming convention used in other KeenMate components (web-daterangepicker, etc.)
  - **Migration**: Find and replace `--ms-text-white` with `--ms-text-on-accent` in your stylesheets

- **Removed Redundant CSS Variables** - Removed 8 CSS custom properties that used `inherit` fallbacks
  - These variables are now optional overrides - if not set, they fall back through the CSS variable chain
  - Simplifies theming: set base color once, all states inherit automatically
  - Users can still override individual states when needed

- **Badge Border Structure** - Moved border from badge container to individual children
  - Removed `--ms-badge-border` (was on `.ms__badge` container)
  - Added `--ms-badge-text-border` (on `.ms__badge-text`)
  - `--ms-badge-remove-border` already existed (on `.ms__badge-remove`)
  - **Breaking**: If you were using `--ms-badge-border`, migrate to `--ms-badge-text-border` and `--ms-badge-remove-border`

## [1.3.0] - PUBLISHED - 2025-11-29

### Added

- **Custom Checkbox Styling** - Full control over checkbox appearance via CSS custom properties
  - `--ms-checkbox-bg` - Background color (default: `#ffffff`)
  - `--ms-checkbox-border` - Border style (default: `1px solid #d1d5db`)
  - `--ms-checkbox-border-radius` - Border radius
  - `--ms-checkbox-checked-bg` - Background when checked (default: accent color)
  - `--ms-checkbox-checked-border` - Border when checked
  - `--ms-checkbox-checkmark-color` - Checkmark color (default: `#ffffff`)
  - `--ms-checkbox-hover-border-color` - Border color on hover
  - `--ms-checkbox-disabled-bg` - Background when disabled
  - `--ms-checkbox-disabled-border` - Border when disabled
  - Custom checkbox implementation using CSS pseudo-elements for full styling control

- **Badge Border Styling** - New `--ms-badge-border` CSS variable for badge border customization
  - Default: `none` (no border)
  - Example: `--ms-badge-border: 1px solid #3b82f6;`

- **Scrollbar Theming** - Custom scrollbar styling for dropdown and popovers
  - `--ms-scrollbar-width` - Scrollbar width (default: `8px`)
  - `--ms-scrollbar-track-bg` - Track background color
  - `--ms-scrollbar-thumb-bg` - Thumb color
  - `--ms-scrollbar-thumb-bg-hover` - Thumb hover color
  - `--ms-scrollbar-thumb-border-radius` - Thumb border radius
  - Applied to `.ms__dropdown` and `.ms__selected-popover-body`

- **Option State Text Colors** - Complete color control for all option states
  - `--ms-option-color-hover` - Text color on hover
  - `--ms-option-color-focused` - Text color when focused (keyboard navigation)
  - `--ms-option-color-selected` - Text color when selected
  - `--ms-option-color-selected-hover` - Text color when hovering over selected option
  - `--ms-option-color-matched` - Text color for search matches (navigate mode)
  - Ensures proper contrast when background colors change (e.g., dark bg + white text)

- **Input Border Theming** - `--ms-input-border-style` now fully themeable
  - Full shorthand property: `1px solid #color`
  - Can be set per-theme for consistent styling

- **Toggle Icon Theming** - `--ms-toggle-icon-color` for dropdown arrow customization

- **10px-Based Sizing System** - Migrated to `--ms-rem` variable system for scalable sizing
  - New base variable `--ms-rem: 10px` enables proportional scaling across the component
  - All sizing values now use `calc(X * var(--ms-rem))` format internally
  - Input heights updated to Pure Admin standard: xs=31px, sm=33px, md=35px, lg=38px, xl=41px
  - Set `--ms-rem: 1rem` for Pure Admin integration (inherits from `html { font-size: 10px }`)
  - Set `--ms-rem: 12px` to scale all sizes up 20%
  - Maintains backward compatibility - default output unchanged (10px base = same pixel values)
  - Converted: padding, border-radius, font sizes, typography scale, input size variants, layout dimensions, checkbox sizing

### Fixed

- **Theme Examples** - Fixed all CSS variable prefixes from `--ml-*` to `--ms-*`
- **Badge Background Variable** - Fixed themes using wrong variable (`--ms-badge-bg` → `--ms-badge-text-bg`)
- **Selected Option Hover** - Fixed text becoming unreadable when hovering over selected options in themed modes (black-on-black in Sharp theme)
- **CSS Build Warning** - Fixed missing semicolon causing SCSS comments to leak into compiled CSS

### Changed

- **Default Checkbox Appearance** - More visible default styling with white background and darker border for better visibility
- **Theme Examples** - All 7 themes updated with comprehensive styling:
  - Dark Mode, Neon, Audi, Rounded, Sharp/Minimal, Material, Glass
  - Each theme now includes: input, dropdown, options, badges, checkboxes, scrollbar styling

## [1.2.0] - PUBLISHED - 2025-01-27

### Changed

- **10px-Based Sizing System** - Migrated to `--ms-rem` variable system for scalable sizing
  - New base variable `--ms-rem: 10px` enables proportional scaling across the component
  - All sizing values now use `calc(X * var(--ms-rem))` format internally
  - Input heights updated to Pure Admin standard: xs=31px, sm=33px, md=35px, lg=38px, xl=41px
  - Set `--ms-rem: 1rem` for Pure Admin integration (inherits from `html { font-size: 10px }`)
  - Set `--ms-rem: 12px` to scale all sizes up 20%
  - Maintains backward compatibility - default output unchanged (10px base = same pixel values)
  - Converted: padding, border-radius, font sizes, typography scale, input size variants, layout dimensions, checkbox sizing

## [1.2.0] - PUBLISHED - 2025-01-27

### Added

- **Input Size Attribute**: New `input-size` attribute for controlling input field dimensions
  - Supports 5-level scale: `xs`, `sm`, `md` (default), `lg`, `xl`
  - Consistent with web-daterangepicker sizing attributes
  - CSS classes: `.ms__input--xs`, `.ms__input--sm`, `.ms__input--lg`, `.ms__input--xl`
  - CSS variables for each size: `--ms-input-size-{size}-font`, `--ms-input-size-{size}-padding-v`, `--ms-input-size-{size}-padding-h`, `--ms-input-size-{size}-height`
  - JavaScript API: `element.inputSize = 'lg'`
  - Attribute change doesn't re-initialize picker (performance optimization)

## [1.1.0] - PUBLISHED - 2025-01-26

### Added
- **Standardized Checkbox Margins** - All 4 checkbox margins now controllable via CSS variables
  - Added `--ms-checkbox-margin-right`, `--ms-checkbox-margin-bottom`, `--ms-checkbox-margin-left` CSS variables
  - Complements existing `--ms-checkbox-margin-top` for complete margin control
  - Overrides browser default checkbox margins for consistent cross-browser appearance
  - All new margins default to `0` (horizontal/bottom spacing handled by flexbox gap)
  - Allows fine-tuned checkbox positioning for custom layouts
  - Defined in `src/scss/_variables.scss`, `src/scss/_css-variables.scss`, and `src/scss/_options.scss`
- **Custom Group Label Rendering** - New `renderGroupLabelContentCallback` for customizing group headers
  - Signature: `renderGroupLabelContentCallback(groupName: string) => string | HTMLElement`
  - Keeps standard `.ms__group-label` wrapper, replaces content inside
  - Supports HTML strings and HTMLElement returns
  - Use cases: capitalize group names, add icons/emojis, HTML formatting, i18n translation
  - Example in `examples-classic.html` showing uppercase + emoji formatting
  - Follows same naming convention as web-daterangepicker (`render*ContentCallback` = content only)
- **Initial Options + Async Search Example** - Added comprehensive example in `examples-classic.html`
  - Demonstrates "favorites + full search" pattern (show 5 most used items initially, search all on typing)
  - Security Groups example with 20 total items, showing 5 most used by default
  - Uses `keep-options-on-search="true"` + `min-search-length="2"` configuration
  - Simulated 400ms API delay for realistic async behavior
  - Perfect for enterprise scenarios: popular/recent items first, full database search on demand

### Fixed
- **Examples - Style Tag Rendering** - Fixed CSS appearing as plain text in `examples-templating.html`
  - Root cause: Premature `</style>` closing tag on line 14 left CSS rules (lines 15-156) outside style block
  - All page-specific CSS now properly enclosed in `<style>` tag
- **Examples - Priority Badge Styling** - Fixed priority-based badge colors not displaying in examples 2 and 11
  - Root cause: Using SCSS variable names (`--ml-badge-text-bg`) instead of CSS custom properties (`--ms-badge-text-background`)
  - SCSS variables compile to static values and cannot be overridden at runtime via `customStylesCallback`
  - Fixed in example 2 (Products): Budget/Mid-Range/Premium badges now show correct colors
  - Fixed in example 11 (Priority Badges): Urgent/Important/Normal/Low badges now show correct colors
  - Updated CSS variable names: `--ml-badge-text-bg` → `--ms-badge-text-background`, `--ml-badge-remove-bg` → `--ms-badge-remove-background`
- **Examples - Debug Logging** - Removed console.log statements from example 11 in `examples-templating.html`
  - Removed debug logging from `getBadgeClassCallback` and `getSelectionBadgeClassCallback`
  - Clean console output in production examples

- **CRITICAL: Single-Select Mode Event Values** - Fixed `selectedValues` splitting string values into individual characters
  - Root cause: `Array.from()` was being used on `getValue()` which returns a string in single-select mode
  - When selecting value `"acme"` in single-select, `selectedValues` was `["a", "c", "m", "e"]` instead of `["acme"]`
  - Impact: All single-select mode implementations (cascading selects, dropdowns with `multiple="false"`)
  - Fixed in: `src/web-component.ts` - All 3 event dispatches (`select`, `deselect`, `change`)
  - Solution: Properly wrap single values in array instead of treating string as iterable
  - Multi-select mode was not affected (already returns arrays)
- **Cascading Selects Example** - Fixed cascading dropdowns not working in `examples-new-api.html`
  - Root cause: Initialization code was outside `customElements.whenDefined()` block, running before components were ready
  - Moved all cascade initialization logic inside `whenDefined()` callback
  - HTML attributes now properly set: `value-member="value"` and `display-value-member="label"`
  - Organization → Business Unit → Department cascade now works correctly
- **Form Integration - Array Format** - Fixed array format only capturing last selected item in `examples-new-api.html`
  - Root cause: `Object.fromEntries(formData)` loses duplicate keys when multiple inputs share same name
  - Solution: Manual FormData iteration to properly handle array values (e.g., `tags[]`, `tags[]`, `tags[]`)
  - Array format now correctly captures all selected items, not just the last one
- **Debug Logging** - Removed all development console.log statements flooding browser console
  - Removed 24 debug statements from `src/multiselect.ts` (action button rendering logs)
  - Removed debug statements from `examples-new-api.html` (cascade debugging)
  - Production builds now have clean console output

### Changed
- **Examples - Improved Layouts** - Enhanced visual alignment in `examples-templating.html` custom rendering examples
  - Example 1 (Frameworks): Converted to CSS Grid layout with 3 columns (icon | content | stars)
    - Icon and star count span 2 rows and are vertically centered
    - Star counts always aligned in same column regardless of content length
  - Example 2 (Products): Changed `align-items: start` to `align-items: center` for vertically centered product icons
  - Example 3 (Articles): Converted to CSS Grid with 2 columns (icon | content), icon spans 3 rows and is vertically centered
  - Example 4 (Jobs): Converted to CSS Grid with 2 columns (icon | content), icon spans 3 rows and is vertically centered
  - Result: All option icons now properly centered in the middle of multi-line content
- **Showcase Property Names** - Corrected all property names in showcase examples to match actual API
  - **Display Modes page** (`display-modes/+page.svelte`):
    - `pills-display-mode` → `badges-display-mode` (all instances)
    - `pills-position` → `badges-position` (all instances)
    - `pills-threshold` → `badges-threshold` (all instances)
    - Updated documentation table to reflect correct property names
  - **Advanced Features page** (`advanced-features/+page.svelte`):
    - `pills-threshold` → `badges-threshold` (6 instances)
    - `pills-threshold-mode` → `badges-threshold-mode` (6 instances)
    - `pills-max-visible` → `badges-max-visible` (4 instances)
    - `enable-pill-tooltips` → `enable-badge-tooltips` (5 instances)
    - `pill-tooltip-placement` → `badge-tooltip-placement` (4 instances)
    - `getPillTooltipCallback` → `getBadgeTooltipCallback` (4 instances)
    - Updated all user-facing documentation text from "pill/pills" to "badge/badges" for consistency
  - Fixed duplicate variable binding in Compare section causing first example to have no data
  - Improved Compare section threshold: reduced from 4 to 2 items for easier demonstration
  - Impact: All previously broken examples (Count Mode Only, Compact Mode, None Mode) now work correctly

## [1.0.0] - PUBLISHED - 2025-11-20

### Changed
- **Window API Migration** - Switched to standard `window.components` pattern
  - Changed from `window.keenmate.multiselect` to `window.components['web-multiselect']`
  - Added `logging` object with all logging methods (enableLogging, disableLogging, setLogLevel, setCategoryLevel)
  - Added `getCategories()` method to list available logging categories
  - Migration: Replace `window.keenmate.multiselect` with `window.components['web-multiselect']`
  - This is a **breaking change** for code using the global window API

- **Logging System Refactored** - Simplified to match standard pattern from svelte-spa-router
  - Category names now hierarchical: `MULTISELECT:INIT`, `MULTISELECT:DATA`, `MULTISELECT:UI`, `MULTISELECT:INTERACTION`
  - `setCategoryLevel()` now accepts any string (not hardcoded enum) for dynamic category control
  - Simplified internal implementation - removed unnecessary complexity
  - Migration: Update category names: `'UI'` → `'MULTISELECT:UI'`, `'DATA'` → `'MULTISELECT:DATA'`, etc.
  - This is a **breaking change** - existing `setCategoryLevel()` calls must use new category names

- **Class Renaming** - Renamed base class for better branding alignment
  - Renamed `PureMultiSelect` to `WebMultiSelect` to align with package name `@keenmate/web-multiselect`
  - Updated all imports, exports, and documentation
  - Migration: Replace `import { PureMultiSelect }` with `import { WebMultiSelect }`
  - This is a **breaking change** - existing code using `PureMultiSelect` must be updated

### Added
- **Custom Rendering Callbacks** - Full control over how options, badges, and selected items are displayed
  - `renderOptionContentCallback(item, context)` - Customize dropdown option content with HTML or HTMLElement
    - Context provides: `{ index, isSelected, isFocused, isMatched, isDisabled }`
    - Replaces default icon + title + subtitle rendering while keeping wrapper structure
    - Virtual scroll compatible (content must fit within `optionHeight`)
  - `renderBadgeContentCallback(item, context)` - Customize badge (selected item) content with HTML or HTMLElement
    - Context provides: `{ displayMode, isInPopover }`
    - Can render different content based on where badge appears (main area vs popover)
    - Works across all display modes (pills, partial, compact) and popover
  - `renderSelectedContentCallback(item)` - Customize selected value text in single-select mode (plain text)
    - Determines what text shows in input field when closed
    - Separate from dropdown display text for maximum flexibility
  - All callbacks can return HTML strings (for performance) or HTMLElement objects (for convenience)
  - Maintains component structure and functionality (event handling, tooltips, remove buttons)
  - Falls back to existing callbacks (`getBadgeDisplayCallback`, `getDisplayValueCallback`) when not provided
  - Full TypeScript support with `OptionContentRenderContext` and `BadgeContentRenderContext` interfaces
- **Checkbox Control and Advanced Layouts** - Fine-grained control over checkbox appearance and positioning
  - `checkbox-align` attribute - Control checkbox vertical alignment: `'top'` (default), `'center'`, or `'bottom'`
    - Useful when custom content varies in height or uses multi-line layouts
    - CSS custom property: `--ml-checkbox-align` (flex-start, center, flex-end)
  - `--ml-checkbox-size` CSS variable - Control checkbox width/height (default: 16px)
  - `--ml-checkbox-scale` CSS variable - Scale checkbox larger/smaller while maintaining proportions (default: 1)
    - Example: `--ml-checkbox-scale: 1.5` for 50% larger checkbox
    - Scaled from top-left origin to prevent layout shifts
  - SCSS variables: `$ml-checkbox-size` and `$ml-checkbox-scale` for build-time customization
  - Works seamlessly with custom rendering callbacks for advanced layouts
  - Full support for CSS Grid and Flexbox layouts in custom option content
  - Added 3 advanced layout examples in `examples-templating.html`:
    - CSS Grid layout with center-aligned checkboxes
    - Flexbox multi-column layout with top-aligned checkboxes
    - Large checkbox scale (1.5×) demonstration
- **Custom Badge CSS Classes** - Add semantic styling to badges based on item data
  - `getBadgeClassCallback(item)` - Return custom CSS class(es) to apply to badges
    - Returns string (single class) or array of strings (multiple classes)
    - Classes added to badge's base `.ml__badge` element
    - Enables semantic color-coding (priority levels, status, categories, etc.)
  - Works across all badge rendering locations (main area, partial mode, popover)
  - Style badges using CSS variables (e.g., `--ml-badge-text-bg`, `--ml-badge-text-color`, `--ml-badge-remove-bg`)
  - Example use case: Color-code tasks by priority (red for urgent, yellow for important, green for low)
  - Added priority-based badge styling example in `examples-templating.html`
- **Shadow DOM CSS Injection** - Solve Shadow DOM CSS isolation for custom styling
  - `customStylesCallback()` - Inject custom CSS directly into Shadow DOM
    - Returns CSS string (not HTML) with style rules
    - Styles injected on component initialization
    - Can be updated dynamically - new styles replace old ones
    - Required for styling custom classes from `getBadgeClassCallback` or custom rendering callbacks
  - Solves Shadow DOM barrier: page CSS cannot reach shadow elements
  - Pattern follows `web-daterangepicker` implementation for consistency across Keenmate components
  - Works with all custom classes (pills, options, any shadow DOM elements)
  - Example: Inject `.badge-urgent { --ml-badge-text-bg: #fee2e2; }` to style priority-based badges
- **Separate Callbacks for Badges vs. Selected Items Popover** - Dedicated callbacks for different rendering contexts
  - `renderSelectedItemContentCallback(item)` - Custom renderer for selected items in the popover
    - Separate from `renderBadgeContentCallback` which renders badges in main area
    - Enables different rendering: compact badges in main area, detailed content in popover
    - Falls back to `renderBadgeContentCallback` if not defined
  - `getSelectedItemClassCallback(item)` - Add custom CSS classes to selected items in popover
    - Separate from `getBadgeClassCallback` which adds classes to badges in main area
    - Returns string (single class) or array of strings (multiple classes)
    - Falls back to `getBadgeClassCallback` if not defined
  - Design rationale: Selection box popover has more space for grandiose/detailed styling
  - Users can assign the same function to both callbacks if identical rendering is desired
  - Updated Example #11 to demonstrate separate callbacks for compact badges vs. detailed popover items

## [1.0.0-rc11] - 2025-11-13

### Added
- **Unified BadgeCounter Styling** - Created `.ml__badge--indicator` modifier class for consistent gray styling across all informational badges
  - Applies to "+ X more" badges (partial mode), "X selected" badges (count mode), and compact mode display badges
  - Deep gray appearance (`$ml-color-neutral-base` background, `$ml-color-neutral-dark` remove button) to distinguish from blue data badges
  - New SCSS variables: `$ml-badge-counter-bg`, `$ml-badge-counter-text-bg`, `$ml-badge-counter-text-color`, `$ml-badge-counter-remove-bg`, `$ml-badge-counter-remove-color`, `$ml-badge-counter-remove-bg-hover`
  - New CSS custom properties for runtime customization: `--ml-badge-indicator-*`
  - Consistent badge structure (`.ml__badge > .ml__badge-text + .ml__badge-remove`) across all display modes

### Changed
- **Refactored Compact/Count Mode HTML Structure** - Migrated from custom `.ml__count-badge-wrapper` to standard `.ml__badge--indicator` structure
  - Compact mode now uses `.ml__badge.ml__badge--indicator` instead of `.ml__count-badge-wrapper > .ml__count-text + .ml__count-clear`
  - Count mode now uses `.ml__badge.ml__badge--indicator` instead of `.ml__count-badge-wrapper > .ml__count-text + .ml__count-clear`
  - Updated event handlers to use `data-action` attributes (`show-selected`, `clear-count`) instead of old CSS class selectors
  - Container class changed from `.ml__count-display` to `.ml__badges` for consistency
- **Simplified `.ml__badge--more` Styling** - Removed duplicate background/hover styles, now inherits from `.ml__badge--indicator`
  - `.ml__badge--more` now only adds `cursor: pointer`, all visual styling comes from `.ml__badge--indicator`

### Fixed
- **Visual Inconsistency Between Display Modes** - Indicator badges ("+3 more", "5 selected", etc.) now have consistent gray styling across all modes instead of varying appearances

## [1.0.0-rc10] - 2025-11-13

### Fixed
- **Build/Publish Scripts** - Fixed circular dependency causing infinite loop during npm publish
  - Removed `publish` and `publish:dry` scripts from package.json that conflicted with npm lifecycle hooks
  - Makefile now handles full build and publish workflow directly
  - `make publish-dry` and `make publish` now work correctly without looping

## [1.0.0-rc09] - 2025-11-13

### Added
- **Virtual Scrolling for Selected Items Popover** - Handle massive selections (15,000+ items) with instant performance
  - Automatically activates when 100+ items are selected
  - Requires count badge setup: `badges-threshold="4"` + `badges-threshold-mode="count"` + `show-count-badge="true"`
  - Click the count badge to open popover with virtual scrolling
  - New `badge-height` attribute (default: 36px) - configurable height for badges in virtual scroll mode
  - Consistent 4px gap between badges (matches standard mode)
  - Same VirtualScroll implementation as dropdown for consistency
  - Performance: Renders only ~20-30 visible badges instead of all 15,000
- **`badges-display-mode="none"`** - New minimal display mode showing no badges/count in input area
  - Perfect for extremely space-constrained layouts
  - Typically combined with `show-count-badge="true"` to show only `[X]` indicator
  - No callbacks invoked (no display to render)
  - Badges container is empty and hidden via CSS
- **Proper `badges-display-mode="compact"` Implementation** - Shows first selected item + count in a single removable badge
  - Format: `[JavaScript (+2 more) | x]`
  - Uses `getBadgeDisplayCallback` for first item text (respects badge callback)
  - Uses `getCounterCallback(count, remainingCount)` for count text
  - Single X button clears ALL selections
  - Entire badge clickable to show selected items popover
  - Automatically shows next item when selections change
- **Comprehensive Callback Behavior Documentation** - Added detailed showcase documentation
  - When `getBadgeDisplayCallback` is invoked for each display mode
  - When `getCounterCallback` is invoked with `moreCount` parameter vs without
  - Clarified that count badge `[X]` is independent and works with all modes
  - Added quick reference tables showing what's displayed and which callbacks are used

### Fixed
- **Popover Virtual Scroll Display Issues** - Fixed multiple CSS and layout problems
  - Fixed parent container using `display: flex` which constrained child scrolling
  - Fixed body container `display: flex` and `max-height` preventing wrapper expansion
  - Solution: Apply `display: block` and `max-height: none` on both parent and body in virtual mode
  - Removed `max-height` from inline styles to allow 540,000px wrapper height
  - Now matches dropdown pattern exactly: parent doesn't constrain, child handles scrolling
- **Consistent Badge Heights** - Badges now have same height (36px) and spacing (4px) in virtual mode
  - Initially had mismatch: standard mode 24px, virtual mode was inconsistent
  - Now uses configurable `badge-height` attribute with 36px default
  - Gap properly included in itemHeight calculation (36px badge + 4px gap = 40px total)
- **`badges-display-mode="compact"` Implementation** - Was previously identical to 'count' mode (now properly implemented)
  - Previously fell through to count mode rendering
  - Now shows first item + count in a single badge as intended

### Changed
- **Count Badge Independence** - Clarified that `show-count-badge="true"` works independently with ALL display modes
  - Can be combined with any mode: badges, count, compact, partial, or none
  - Not affected by any callbacks - always shows just the number `[X]`
- **Classic Examples Reorganization** - Reorganized "Display Modes" section in `examples-classic.html`
  - Split into 4 clear categories: Basic Modes, Mode + Badge Combinations, Threshold Auto-Switching, and i18n
  - Each mode shown exactly once with clear labels and descriptions
  - Added all 5 basic modes including new 'none' mode
  - Better organization for understanding display mode options

## [1.0.0-rc08] - 2025-11-12

### Added
- **Virtual Scrolling** - Efficient rendering for large datasets (1,000+ items)
  - Renders only visible items (~30) instead of entire dataset for instant performance
  - Auto-activates at 100+ items (configurable via `virtual-scroll-threshold`)
  - Opt-in feature via `enable-virtual-scroll="true"` attribute
  - Fixed item height (50px default, configurable via `option-height`)
  - Configurable buffer size for smooth scrolling (default: 10 items above/below viewport)
  - Performance improvements: 25× faster dropdown opening (750ms → 30ms), 13-33× faster search (200-500ms → 15ms)
  - Memory reduction: 99.8% less DOM (7.5 MB → 15 KB for 15,000 items)
  - Full keyboard navigation support (arrows, Page Up/Down, Home/End)
  - Full mouse wheel scrolling support
  - New dedicated VirtualScroll class in `src/virtual-scroll.ts`
  - New performance demo: `examples-performance.html` with 15,000 random options
  - Limitation: Groups disabled in virtual scroll mode (falls back to standard rendering)

### Fixed
- **Mouse Wheel Scrolling in Virtual Scroll** - Fixed wheel events not triggering scroll
  - Root cause: Dropdown's wheel event handler was calling `stopPropagation()` on all wheel events
  - Solution: Skip dropdown's wheel handler when virtual scroll is active
  - Mouse wheel now works smoothly alongside drag scrollbar and keyboard navigation

## [1.0.0-rc07] - 2025-11-12

### Documentation
- Updated README with hybrid search documentation and API reference
- Added `beforeSearchCallback` to Properties section
- Added `keep-options-on-search` to Attributes table
- Fixed import path for logging utilities - import from main package instead of `/logger` subpath

## [1.0.0-rc06] - 2025-11-11

### Added
- **Hybrid Static + Dynamic Search** - Display initial "popular" items while supporting async database search
  - New `isKeepOptionsOnSearch` option (default: `true`) - Keeps initial options visible when searchCallback is active
  - Shows initial options when dropdown opens, below min search length, or search is cleared
  - Perfect for showing top 10 popular items, then switching to full database search
  - Works seamlessly with existing `searchCallback` - no breaking changes
- **Search Pre-Processing** - New `beforeSearchCallback` to transform or block search requests
  - Transform search terms (e.g., accent removal: "café" → "cafe")
  - Validate/sanitize user input before calling API
  - Block search by returning `null` (useful for preventing searches below certain criteria)
  - Use cases: accent removal, trimming whitespace, blocking profanity, custom validation
- **Categorized Logging System** - Professional logging infrastructure using loglevel library
  - 4 log categories: INIT (initialization), DATA (async loading), UI (rendering), INTERACTION (user events)
  - Color-coded console output with millisecond-precision timestamps
  - Runtime enable/disable controls - silent by default for production
  - Category-specific filtering (e.g., debug only UI operations)
  - Exported utilities: `enableLogging()`, `setLogLevel()`, `setCategoryLevel()`, `disableLogging()`
  - New examples page: `examples-logging.html` with interactive logging demos
- **CSS Custom Properties at :host** - All 150+ SCSS variables now exposed as CSS custom properties
  - Inspectable in browser DevTools at the `:host` level
  - Easy runtime customization via JavaScript or CSS
  - Full Shadow DOM compatibility with proper inheritance
  - New file: `src/scss/_css-variables.scss` (360 lines)
  - Added "Inspecting Variables in DevTools" section to README

### Fixed
- **Badge Close Button Icon** - Fixed missing "×" symbol in badge remove buttons
  - Root cause: CSS `content` property requires quoted strings, SCSS interpolation was stripping quotes
  - Fixed `--ml-icon-remove` and `--ml-icon-clear` to preserve quotes: `"#{$variable}"`
  - Close buttons now display properly with visible "×" symbol

### Changed
- **Logging Implementation** - Migrated from inline custom logger to loglevel library (~1KB)
  - Vendored loglevel and loglevel-plugin-prefix for bundler compatibility
  - Converted UMD modules to pure ESM to work with Vite/Rollup tree-shaking
  - All ~45 log calls categorized and updated with structured logging
  - Backward compatible - logging is silent by default

### Documentation
- Added `LOGGING_MIGRATION.md` documenting the logging system migration
- Updated `README.md` with CSS variables inspection guide
- Added comprehensive examples in `examples-logging.html` demonstrating all logging features
- Added Example 3: Hybrid Search with accent removal demonstration

## [1.0.0-rc05] - 2025-11-10

### Added
- **Badge Display Customization** - New `getBadgeDisplayCallback` property to customize badge text independently from dropdown display
  - Allows showing different text in badges vs dropdown (e.g., "John Doe" in badge, "John Doe (john@example.com)" in dropdown)
  - Falls back to standard display value if not provided
  - Useful for showing concise text in badges while keeping detailed information in dropdown
  - Applied to all badge rendering locations: badges mode, partial mode, selected popover, and tooltips

### Fixed
- **RTL Detection in Shadow DOM** - Fixed RTL mode not being detected when using web components
  - Root cause: Shadow DOM prevents direct access to host element's `dir` attribute
  - Solution: Check `shadowRoot.host` element for `dir="rtl"` attribute
  - RTL styles now properly apply when `dir="rtl"` is set on `<multi-select>` element
- **Input Toggle Behavior** - Fixed dropdown not properly toggling when clicking input field
  - Added proper open/close toggle logic on mousedown event
  - Fixed issue where dropdown couldn't be reopened after first close (focus event conflict)
  - Dropdown now properly toggles: open → close → open → close indefinitely
- **Input Cursor** - Added `cursor: pointer` to input field for better UX indication
- **Left Badges Alignment** - Fixed left-positioned badges appearing at far left edge instead of close to input
  - Changed from `justify-content: flex-start` to `flex-end` so badges appear immediately before input

## [1.0.0-rc04] - 2025-11-09

### Added
- **RTL (Right-to-Left) Language Support** - Full support for Arabic, Hebrew, Persian, Urdu, and other RTL languages
  - Auto-detection from `dir="rtl"` attribute on component or any ancestor element
  - Complete UI mirroring: toggle icon, text alignment, badges, dropdown, badges
  - Logical position mirroring: `badges-position="left"` becomes physically right in RTL (and vice versa)
  - Badges remove buttons flip to left side in RTL mode
  - All text content properly right-aligned with correct text direction
  - New RTL showcase page in `/examples/rtl` with Arabic and Hebrew examples
  - New SCSS file `_rtl.scss` with comprehensive RTL styles

### Fixed
- **Badges Positioning** - Fixed `badges-position` attribute not working (pills were always below input)
  - Root cause: Missing `ml-wrapper` flex container in DOM structure
  - Added wrapper div with `ml-wrapper` class and `--inline` modifier for left/right positioning
  - Badges now correctly position based on `badges-position` attribute (top, bottom, left, right)
  - Fixed right-positioned badges alignment: changed from `flex-end` to `flex-start` so badges appear immediately after input instead of at far right edge
- **Badges Spacing** - Reduced left/right badges margin from 0.5rem to 0.25rem for better spacing next to input

## [1.0.0-rc03] - 2025-11-09

### Fixed
- **SSR Compatibility** - Fixed "HTMLElement is not defined" error in Server-Side Rendering environments
  - Added HTMLElement stub for safe module imports in Node.js SSR contexts (SvelteKit, Next.js, Nuxt, etc.)
  - Component remains client-side only but module can now be safely imported during SSR
  - Added browser environment checks around all `customElements` API calls
  - No special client-side wrappers or dynamic imports required

## [1.0.0-rc02] - Previous Release

### Added

#### Badge Tooltips
- **`enable-badge-tooltips` attribute** - Enable tooltips on selected item badges
- **`badge-tooltip-placement` attribute** - Control tooltip position ('top', 'bottom', 'left', 'right')
- **`badge-tooltip-delay` attribute** - Customize tooltip show delay (default: 300ms, previously 500ms)
- **`badge-tooltip-offset` attribute** - Control distance between badge and tooltip (default: 8px)
- **`getBadgeTooltipCallback` property** - Custom callback for tooltip content
- **Separate tooltips** for badge text vs remove button to prevent overlap
- **Floating UI integration** with `strategy: 'fixed'` for proper Shadow DOM positioning
- Tooltips automatically clean up on component updates

#### Display Mode Enhancements
- **Enhanced `getCounterCallback`** - Now supports optional `moreCount` parameter for i18n/pluralization
  - When `moreCount` is provided: Used for "+X more" badge in partial mode
  - When `moreCount` is undefined: Used for total count display in count mode
  - Enables unified i18n handling: `(count: number, moreCount?: number) => string`

#### Flexible Data Handling (Major Feature)
- **Generic Type Support**: Component now supports `WebMultiSelect<T>` and `MultiSelectElement<T>` for any data structure
- **Member/Callback Pattern** (following svelte-treeview):
  - `valueMember` / `getValueCallback` - Extract unique ID from items
  - `displayValueMember` / `getDisplayValueCallback` - Extract display text
  - `searchValueMember` / `getSearchValueCallback` - Extract searchable text
  - `iconMember` / `getIconCallback` - Extract icon/emoji
  - `subtitleMember` / `getSubtitleCallback` - Extract subtitle/description
  - `groupMember` / `getGroupCallback` - Extract group name
  - `disabledMember` / `getDisabledCallback` - Determine if item is disabled
- **Auto-detection** for `[key, value]` tuple arrays
- **7 extraction methods** in core class for data abstraction

#### Form Integration
- **`name` attribute** - HTML form field name/ID for hidden input generation
- **`formValueFormat` property** - Choose format: `'json'` (default), `'csv'`, or `'array'`
  - `json`: `["val1","val2","val3"]`
  - `csv`: `val1,val2,val3`
  - `array`: Multiple `<input name="field[]">` elements
- **`getFormValueCallback`** - Custom callback for form value formatting
- **Automatic hidden input management** - Updates on selection changes

#### New Public API
- **`selectedValue` property** - Get selected value(s) (mode-dependent: single value or array)
- **`selectedItem` property** - Get first selected item object
- **`getValue()` method** - Get form-ready value (mode-dependent return type)
- **Enhanced `setSelected()`** - Now accepts `(string | number)[]` for flexibility

#### SCSS Improvements
- **MIT License**: Added formal LICENSE file with copyright notice and terms
- **Component-Specific Semantic Variables**: Added 125+ SCSS semantic variables
  - Input component, toggle icon, count badge, hint, dropdown
  - Actions, buttons, options, groups, empty states
  - Badges, count display, badge elements, selected popover
- Comprehensive API documentation for all semantic variables

### Changed

#### Tooltip Improvements
- **Default tooltip delay reduced** from 500ms to 300ms for faster response
- **Tooltip attachment** now targets badge text element instead of entire badge to prevent overlap with remove button

#### Breaking Changes - Data Handling
- **Internal property names** now use `is` prefix for booleans:
  - `multiple` → `isMultipleEnabled`
  - `allowGroups` → `isGroupsAllowed`
  - `allowSelectAll` → `isSelectAllAllowed`
  - `showCheckboxes` → `isCheckboxesShown`
  - `closeOnSelect` → `isCloseOnSelect`
  - `lockPlacement` → `isPlacementLocked`
  - `enableSearch` → `isSearchEnabled`
  - `allowAddNew` → `isAddNewAllowed`
  - `showCountBadge` → `isCountBadgeShown`
  - `stickyActions` → `isActionsSticky`
  - `allowClearAll` → `isClearAllAllowed`
- **External API** (HTML attributes) still uses familiar names (`multiple`, `allow-groups`, etc.)
- **Event detail structure** updated:
  - `selectedValues` now returns `(string | number)[]` instead of `string[]`
  - Generic type `MultiSelectEventDetail<T>` for type safety

#### Breaking Changes - SCSS
- Refactored all component styles to use semantic variables
- All SCSS variables now consistently use `$ml-` prefix

### Fixed

#### Critical Bug Fixes
- **Selection with numeric values** - Fixed type mismatch bug where options with numeric IDs couldn't be selected
  - Root cause: HTML data attributes are strings, but Map keys were using original types (numbers)
  - Solution: Normalized all internal Map/Set keys to strings while preserving original types in public API
  - Affected: `selectOption()`, `deselectOption()`, `toggleOption()`, `renderOption()`, and all selection tracking
- **Form integration with Shadow DOM** - Fixed hidden inputs not being accessible to FormData
  - Root cause: Hidden inputs were created inside Shadow DOM where FormData cannot access them
  - Solution: Added `hostElement` config option to append hidden inputs to light DOM (web component host)
  - All form formats (json, csv, array) now work correctly with standard HTML forms
- **Option lookup in async search** - Fixed `opt.value` direct property access on generic type `T`
  - Changed to use `getItemValue(opt)` for proper value extraction

#### Example Files
- **New API Examples** (`examples-new-api.html`) - Created comprehensive examples showcasing:
  - Custom object structures with member properties
  - [key, value] tuple arrays with auto-detection
  - Callback patterns for complex logic
  - Form integration with all 3 formats (JSON, CSV, array)
  - Mode-dependent getValue() API
  - Async search with GitHub API (with graceful fallback to mock data)
  - Simulated product search with 300ms delay
  - Country search with flag emojis
- **Classic Examples** (`examples-classic.html`) - Fixed all examples showing `[N/A]`
  - Added missing `value-member`, `display-value-member`, `icon-member`, `subtitle-member` attributes
  - Added async search examples (GitHub users, products)
- **Landing Page** (`index.html`) - Created navigation page with cards linking to example sets
- **Error Display** - Async search examples now show user-friendly error messages in dropdown:
  - ⚠️ GitHub API Rate Limit - Showing Mock Data
  - ⚠️ Invalid API Response - Showing Mock Data
  - ⚠️ Network Error - Showing Mock Data
  - Error messages appear as disabled options at top of results

### Benefits
- **Framework Consistency**: Matches svelte-treeview patterns across Keenmate components
- **Maximum Flexibility**: Works with any data structure (custom objects, tuples, existing APIs)
- **Form Integration**: Seamless HTML form submission support
- **Type Safety**: Full TypeScript support with generics
- **No Conflicts**: All variables prefixed with `$ml-` to prevent framework collisions
- **Easy Customization**: Semantic variables like `$ml-action-btn-border: none;`
- **Mode-Aware API**: `getValue()` returns appropriate type based on single/multi-select mode

## [1.0.0-rc01] - Previous Release

Initial release candidate with core multiselect functionality.
