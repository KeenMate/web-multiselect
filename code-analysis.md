# Code Analysis: web-multiselect

Snapshot taken from the working tree on `main` at v1.8.6. The library has matured well; this is a triage for simplification, deduplication, and a handful of real bugs uncovered along the way. Findings are ordered by impact, not by file.

Total source: ~6.5k lines (TS: 4.4k, CSS: 2.0k).

---

## Status (Phase 4 — attribute pipeline + granular updateOptions)

**Done:**
- ✅ §3.2 / §4 — Single `ATTRIBUTE_TABLE` in `web-component.ts` is now the source of truth. Each entry maps `{ attr, key, parser, default?, enumValues? }`. Drives `observedAttributes`, the initial parse in `initializePicker`, and `attributeChangedCallback`. Eliminated the hand-coded ~80-line attribute → option block in `initializePicker` and the parallel hand-listed `observedAttributes` array.
- ✅ §3.1 / bug 1.7 — New `picker.updateOptions(partial)` on `WebMultiSelect`. Merges into `this.options`, applies cheap structural toggles in place (`ms--no-checkboxes` class, `ms-wrapper--inline` toggle for badges position, input.placeholder/readOnly/style.display, hint textContent), refreshes `allOptions` if `options` changed, and re-renders. Returns `true` on success, `false` for genuinely structural changes (the only one currently is adding/removing the hint element). Caller falls back to full reinit when it sees `false`.
- ✅ `attributeChangedCallback` now goes through the table → `updateOptions` instead of always doing `destroy() + initializePicker()`. Changing `placeholder`, `max-height`, `badges-display-mode` etc. no longer tears down the dropdown / popover / virtual scroll state.
- ✅ §3.3 — All 24 callback/data setters (e.g. `getValueCallback`, `renderBadgeContentCallback`, `actionButtons`, `options`, `searchCallback`) now route through `updatePicker(partial)` instead of `reinitialize()`. The full destroy + rebuild path is reserved for the `searchHint`-add-or-remove case via the `updateOptions` return value.
- ✅ Bonus: `show-debug-info` attribute now toggles the debug panel without rebuilding the picker.
- ✅ Build clean throughout. Dev server starts cleanly. No public API surface changed.

**Honest line-count impact for Phase 4:**

This phase **added** lines net (+189) — the architectural win is the point, not LOC. What grew:
- `multiselect.ts`: 2125 → 2207 (+82) — `updateOptions` method (~75 lines)
- `web-component.ts`: 1006 → 1113 (+107) — ATTRIBUTE_TABLE (~60 lines), `parseAttrValue` (~25), `MEMBER_PROPERTY_FALLBACKS` (~10), `parseAttributesFromTable` (~10), `updatePicker` helper (~10). Existing `initializePicker` shrank ~30 lines but the new infrastructure outweighs that.

The setter boilerplate (24 × ~5 lines) wasn't reduced — each setter still needs to assign its `_field` and call `updatePicker`. A Proxy-based meta-pattern could collapse them, but that's much riskier and not worth it here. The architectural fix (live updates instead of destroy+rebuild) is what mattered.

**Cumulative across Phase 1 + 2 + 3 + 4:**
- `multiselect.ts`: 2567 → 2207 (**−360 lines**, −14%)
- `web-component.ts`: 1011 → 1113 (**+102 lines** — table + helpers)
- new `tooltip.ts`: 158 lines
- `types.ts`: 371 → 366 (−5)
- TS total: 4519 → 4415 (**−104 lines** net, with new infrastructure layered in)
- UMD bundle: 136.71 → 134.53 kB (**−2.2 kB net**)

**Behavioral changes worth knowing about:**
- Changing an attribute via JS (`el.setAttribute('placeholder', ...)`) or via reactive framework binding no longer destroys and rebuilds the dropdown. Selection state, scroll position, focused index, virtual-scroll buffer all survive.
- Setting a callback via JS property (`el.getValueCallback = fn`) likewise no longer rebuilds.
- The two attributes that still trigger full reinit: any structural change involving the `searchHint` element (going from undefined to defined or vice versa), and `initial-values` continues to be init-time only.
- The two parallel attribute parsers issue (§4) is half-resolved: the web-component layer now uses the table, but the `multiselect.ts` constructor still reads `dataset.*` directly when the core class is instantiated without the web component. Defaults could still drift between the two paths, just less so. Worth a follow-up to share a defaults table, but not urgent.

---

## Status (Phase 3 — Tooltip class + Floating-UI position helper)

**Done:**
- ✅ §2.5 — Three tooltip implementations (badge text, badge-remove button, action button) collapsed into a single `Tooltip` class in new file `src/tooltip.ts` (158 lines). One callsite, one cleanup, one mental model. The action-button-tooltip leak (was using local `let` vars instead of tracked timeouts) is fixed as a side effect — the new class always tracks its own timers.
- ✅ §2.6 — `positionDropdown` and `positionSelectedPopover` collapsed into a shared `anchorFloatingPanel(panel, opts)` helper. Both panels now share placement-locking, width-syncing, and Floating UI middleware in one place. `positionHint` stays separate (its anti-flip / opposite-of-dropdown logic doesn't fit the shared shape).
- ✅ Bonus fix — main-container badge tooltips and popover badge tooltips used to share the same map keys (option `value`), so opening the popover overwrote the main container's tracked tooltip handles and they never got cleaned up. Fixed by prefixing popover tooltip IDs with `popover-` and adding cleanup in `hideSelectedPopover`.
- ✅ Bonus fix — action-button tooltip IDs no longer use `Date.now()`, which previously made every render generate fresh IDs and accumulated handles in the map. Now keyed by `data-button-index` for stable replace-on-re-render.
- ✅ Build clean. Bundle dropped further (UMD: 133.65 → 131.54 kB).

**Net code reduction (Phase 1 + 2 + 3):**
- `multiselect.ts`: 2567 → 2125 (**−442 lines**, −17%)
- `tooltip.ts`: new, 158 lines (extracted from above)
- `web-component.ts`: 1011 → 1006 (−5)
- `types.ts`: 371 → 366 (−5)
- TS total: 4519 → 4226 (**−293 lines net**, with cleaner separation of concerns)
- UMD bundle: 136.71 → 131.54 kB (**−5.2 kB**, ~3.8% smaller)

**Not started (deferred):**
- Phase 4 — Attribute pipeline rewrite (§3, §4, bug 1.7) — biggest leverage, biggest risk.
- Cosmetic items in §6.7 (decisions on remaining unwired CSS vars).
- §6.4 / §6.5 (CSS scrollbar dedup, debug.css hardcoded colors).

---

## Status (Phase 2 — internal dedup, behavior-preserving)

**Done:**
- ✅ §2.1 — Seven near-identical `getItem*` methods replaced with a single `extractField<R>(item, opts)` helper. Each `getItem*` is now a 5-line config call. Net: ~95 lines removed from data-extraction.
- ✅ §2.2 — Action-button rendering extracted to `renderActionsHTML()`; `renderDropdown` and `renderDropdownVirtual` no longer carry the 33-line duplicated forEach block.
- ✅ §2.3 — Three badge HTML render sites (`badges` mode, `partial` mode, popover) collapsed into one `renderBadgeHTML(option, ctx)` helper that takes a `BadgeContentRenderContext`. The popover-specific callbacks (`renderSelectedItemContentCallback`, `getSelectedItemClassCallback`) are selected based on `ctx.isInPopover`. The standalone `renderBadgeForPopover` method is gone.
- ✅ §2.4 — Six focus methods (`focusNext`/`Previous`/`First`/`Last`/`PageUp`/`PageDown`) now one-line wrappers over a single `focusBy(compute)` helper. `focusNextMatch`/`focusPreviousMatch` also use it.
- ✅ §2.7 — `selectOption`/`deselectOption`/`selectAll`/`clearAll` all delegate to a single `commit({ added?, removed? })` helper that handles the `renderDropdown` + `renderBadges` + `updateHiddenInput` + per-item callbacks + once-only `changeCallback` pattern.
- ✅ §2.8 — Three identical `selectedValues` IIFEs in `web-component.ts`'s event-dispatch chain replaced with one `collectSelectedValues()` helper.
- ✅ Build clean after every refactor; bundle shrunk slightly (UMD: 136.71 → 133.65 kB).

**Net code reduction so far (Phase 1 + 2):**
- `multiselect.ts`: 2567 → 2372 (−195 lines)
- `web-component.ts`: 1011 → 1006 (−5 lines)
- `types.ts`: 371 → 366 (−5 lines)
- TS total: 4519 → 4315 (**−204 lines**, ~4.5% smaller, with new helpers added)

**Not started (deferred to later phases):**
- Phase 3 — Tooltip class consolidation (§2.5) and Floating-UI position helpers (§2.6).
- Phase 4 — Attribute pipeline rewrite (§3, §4, bug 1.7).

---

## Status (Phase 1 — bug fixes, cleanup, doc updates)

**Done:**
- ✅ All bugs in §1 (1.1–1.6).
- ✅ Noisy emoji-prefixed `info`/`warn` logging in `renderBadges`/`close`/`toggleOption` and per-frame `getComputedStyle` in tooltip positioning (§5).
- ✅ CSS — fixed self-reference (`--ms-badge-bg-hover: var(--ms-badge-bg-hover)`) and the duplicate-block declarations (§6.2, §6.3).
- ✅ CSS — wired previously-unused per-component override hooks into the actual rules so they do something when overridden:
  `--ms-hint-border-color`, `--ms-dropdown-border-color`, `--ms-actions-border-color`, `--ms-group-border-color`, `--ms-badge-counter-border-color`, `--ms-selected-popover-border-color`, `--ms-selected-popover-header-border-color`, `--ms-option-outline-color-focused`, `--ms-option-border-matched-color`. (Wired through their existing `*-border` shorthands in `_variables.css`.)
- ✅ Dead exports — removed unused `MultiSelectOption`/`MultiSelectOptions` import in `multiselect.ts`; deleted unused `MultiSelectDataItem` type.
- ✅ CLAUDE.md drift — replaced SCSS architecture description with current CSS structure; removed the `$ms-*` SCSS-variables claim and the Sass build-tool entry; updated "Adding New CSS Variables" guidance.
- ✅ Build passes clean (no TS errors, no warnings).

**Decision changes from the original plan:**
- Did **not** delete unused per-component override variables. They're public theming surface; the right fix is to wire them, not delete them. Wired the obvious ones (border colors above). Some declared vars remain unwired (e.g. `--ms-text-color-2`, `--ms-accent-color-active`, `--ms-more-badge-*`, the unused typography scale, `--ms-input-size-md-*`, the `--ms-action-btn-*` naming-mismatch siblings) — see §6.7 below for the remaining list and how to handle each.

**Not started (deferred to later phases):**
- §1.7 (full reinit on every attribute change) — moved to Phase 4.
- §6.4 (scrollbar pattern triplicated across three partials) — small but visual-impact, defer.
- §6.5 (hardcoded debug colors in `_debug.css`) — defer.
- §8 — `MultiSelectOption` and `MultiSelectOptions` interfaces still exported (deprecated). Removing is a breaking change; defer to a major bump.

---

## 1. Bugs (concrete defects, fix first) — ✅ DONE

### 1.1 CSS variable typo breaks dynamic badge height in popover virtual mode — ✅ FIXED
`src/multiselect.ts:1908` writes the inline style:
```ts
... --ml-badge-height-virtual: ${badgeHeight}px; ...
```
but `src/css/_tooltips-popover.css:160-162` reads `--ms-badge-height-virtual`. The override never lands, so the configured `badgeHeight` option is silently ignored and the 36px fallback is always used in the virtual popover. **Fix:** rename `--ml-` → `--ms-`.

### 1.2 `VirtualScroll.setItems` uses `&&` where it needs `||` — ✅ FIXED
`src/virtual-scroll.ts:209`:
```ts
const itemsChanged = items !== this.items && items.length !== this.items.length;
```
The comment one line above says "different array OR different length". When a search returns a fresh array with the same length as the current one (very common — e.g., a different search term producing the same result count), `itemsChanged` is `false` and the scroll position is **not** reset. **Fix:** change `&&` to `||`.

### 1.3 `attachActionButtonTooltips` cannot match custom buttons reliably — ✅ FIXED
`src/multiselect.ts:2422-2427`:
```ts
const actionConfig = this.options.actionButtons?.find(btn => {
    if (btn.action === 'custom') {
        return buttonElement.dataset.customAction === buttonElement.dataset.action;
    }
    return btn.action === action;
});
```
`buttonElement.dataset.customAction` is never set anywhere in the codebase (search confirms it). The `btn.action === 'custom'` branch is therefore always `undefined === 'custom'` → `false`, so **no custom action button ever gets a tooltip attached**. Additionally, even if it worked, multiple custom buttons share `action="custom"` and would collide. **Fix:** stamp a unique `data-button-index` (or similar) on the rendered button and look up by that.

### 1.4 `handleDropdownClick` finds custom buttons by text content — ✅ FIXED (both sites now use `data-button-index`)
`src/multiselect.ts:1276-1278`:
```ts
const button = this.options.actionButtons?.find(btn =>
    btn.action === 'custom' && btn.text === actionBtn.textContent?.trim()
);
```
Two issues: (a) two custom buttons with the same text label collide; (b) when `getTextCallback` provides the text dynamically, `btn.text` may be empty/stale and the lookup fails. Same fix as 1.3 — index by `data-button-index`.

### 1.5 Virtual-scroll popover threshold hardcoded — ✅ FIXED (now reads `options.virtualScrollThreshold`)
`src/multiselect.ts:1845, 1878` hardcode `const threshold = 100;` for the popover's virtual-scroll cutoff while the dropdown reads it from `options.virtualScrollThreshold`. Inconsistent and undocumented — large selection counts pop into virtual mode even when the user has tuned the option for the dropdown.

### 1.6 `selectAll` / `clearAll` don't fire per-item callbacks — ✅ FIXED
`selectOption` / `deselectOption` fire `selectCallback` / `deselectCallback` per item, but `selectAll` (line 1598) and `clearAll` (line 1616) fire only `changeCallback` once. Consumers wiring per-item analytics or side effects via `selectCallback` will silently miss bulk actions. Decide on the contract and make it consistent.

**Resolution:** `selectAll` now fires `selectCallback` for each newly-added option (skipping items already selected and items disabled). `clearAll` fires `deselectCallback` for each removed option. `changeCallback` still fires once at the end (and is skipped entirely if nothing changed).

### 1.7 `attributeChangedCallback` rebuilds the entire picker on any attribute change — ✅ FIXED
`src/web-component.ts:143-151` calls `picker.destroy()` + `initializePicker()` for any observed attribute except `initial-values`. Changing `placeholder` or `max-height` tears down all DOM, event listeners, virtual scroll state, the dropdown, and the popover. Selection state is preserved only because `_options` is held on the element — but `_declarativeSelectedValues` is **not** re-applied on rebuild (it's consumed in `connectedCallback` only), so reactive frameworks toggling attributes will lose initial selection.

---

## 2. Massive duplication in `multiselect.ts`

`multiselect.ts` is 2,567 lines. A large fraction is mechanical duplication. Rough estimate: a focused refactor pass could remove 400-600 lines without changing behavior.

### 2.1 Seven near-identical "extract field from item" methods — ✅ DONE
`getItemValue`, `getItemDisplayValue`, `getItemBadgeDisplayValue`, `getItemSearchValue`, `getItemIcon`, `getItemSubtitle`, `getItemGroup`, `getItemDisabled` (lines 75-219) all follow the same pattern: tuple short-circuit → member lookup → callback → fallback. Collapse into:
```ts
private extract<R>(item: T, opts: {
    member?: string;
    callback?: (item: T) => R;
    tuple?: 0 | 1;          // which tuple slot to pull
    fallback: R;
    transform?: (v: any) => R;
}): R { ... }
```
This deletes ~150 lines and makes adding new extractable fields a one-liner.

### 2.2 Action-button rendering duplicated verbatim across normal vs virtual paths — ✅ DONE
`renderDropdown` (lines 472-504) and `renderDropdownVirtual` (lines 565-597) contain a 33-line `forEach` loop that is byte-for-byte identical. Extract to `private renderActionsHTML(): string`. Same for the empty-state HTML.

### 2.3 Three badge-rendering paths duplicate the same template — ✅ DONE
`renderBadges` lines 808-842 (badges mode), 851-882 (partial mode), and `renderBadgeForPopover` lines 1951-1986 share the same shape: pick content (callback vs default), pick classes (callback vs default), wrap in `<div class="ms__badge"><span class="ms__badge-text">…</span><button class="ms__badge-remove" …></button></div>`. Extract a `renderBadgeHTML(option, { mode, isInPopover })` helper.

### 2.4 Six focus-* methods differ only in index calculation — ✅ DONE
`focusNext`, `focusPrevious`, `focusFirst`, `focusLast`, `focusPageUp`, `focusPageDown` (lines 1406-1480) are each 5 lines of guard + one expression for the new index + render + scroll. Collapse to:
```ts
private focusBy(compute: (current: number, total: number) => number): void { ... }
focusNext()    { this.focusBy((i, n) => Math.min(n - 1, i + 1)); }
focusPageUp()  { this.focusBy((i)    => Math.max(0, i - 10)); }
// ...
```

### 2.5 Three tooltip implementations share the same scaffolding — ✅ DONE
`createTooltipForElement`, `createRemoveButtonTooltip`, `createActionButtonTooltip` (and their `position*` / `cleanup*` / `destroyAll*` siblings) all do:
1. create `<div class="ms__badge-tooltip">`
2. show/hide handlers with timeout pairing
3. `autoUpdate(ref, tooltip, computePosition(...))`
4. tracked cleanup map

There are essentially three copies of the same ~80-line tooltip lifecycle. Worse: the action-button variant doesn't even use the tracked-timeout maps (it uses local `let` vars), so it leaks differently from the badge variants. A single `Tooltip` class (or factory) keyed by `uniqueId` would eliminate ~250 lines and unify cleanup.

### 2.6 Two Floating-UI position helpers are 90% identical — ✅ DONE
`positionDropdown` (lines 1714-1763) and `positionSelectedPopover` (lines 2013-2047). Same `autoUpdate` + `computePosition` + lock-on-first-placement pattern. Different only in which element + which placement state field. Extract.

### 2.7 `selectOption` / `deselectOption` / `selectAll` / `clearAll` all repeat the commit pattern — ✅ DONE
```ts
this.renderDropdown();
this.renderBadges();
this.updateHiddenInput();
if (this.options.changeCallback) this.options.changeCallback(this.getSelected());
```
A `private commit()` method would centralize this and make adding (e.g.) a debounced `change` event trivial later.

### 2.8 `dispatchEvent` IIFE repeated three times in `web-component.ts` — ✅ DONE
Lines 472-510 contain three identical inline IIFEs computing `selectedValues`:
```ts
selectedValues: (() => {
    const val = this.picker?.getValue();
    if (val == null) return [];
    return Array.isArray(val) ? val : [val];
})()
```
Extract to a `private collectSelectedValues(): (string|number)[]` helper.

---

## 3. `web-component.ts` boilerplate — ✅ MOSTLY DONE (item 1 + 2 fixed; item 3 deferred)

The file is 1,011 lines. About 700 of those are getter/setter pairs (~50 properties × ~14 lines each). Each callback-style setter calls `this.reinitialize()` (full destroy + rebuild).

**Recommendation, in priority order:**

1. **Stop reinitializing on every callback assignment.** The picker holds its `options` object by reference; a `picker.updateOptions(partial)` method on the core class would let setters mutate just what changed. This is also what `attributeChangedCallback` should do (see bug 1.7).
2. **Batch attribute → option mapping.** `initializePicker` (lines 367-515) hand-maps ~50 attributes by name. Drive it from a single declarative table (`{ attr: 'badges-display-mode', key: 'badgesDisplayMode', type: 'enum', default: 'badges' }`) and parse generically. Same table should drive `observedAttributes`. Today the two lists drift independently — e.g., `'checkbox-align'` and `'badge-tooltip-delay'` / `'badge-tooltip-offset'` are read in `initializePicker` but **not in `observedAttributes`** (lines 76-101), so changing them at runtime does nothing. Real drift, real bug. ✅ The three missing entries are now in `observedAttributes` as a stopgap; the table-driven approach is still the right architectural fix and is deferred to Phase 4.
3. **Consider a generic `defineProperty`-style helper** for the string-attribute getter/setters (e.g., `valueMember`, `displayValueMember`, etc., lines 560-628 — eight near-identical pairs).

---

## 4. Two parallel attribute parsers — ⚠️ HALF DONE

`web-component.ts` parses `getAttribute('xyz')` in `initializePicker`. `multiselect.ts` constructor (lines 226-264) ALSO parses `element.dataset.xyz` for nearly the same set of options. The web component then puts the resolved options into the constructor, which re-defaults them against the empty dataset. Two parsers, two default tables, two opportunities for drift.

The dataset-based parsing in `multiselect.ts` exists because the core class is also exported for direct use (no web component). Reasonable, but the defaults should live in **one** place — e.g., a `DEFAULT_OPTIONS` const that both layers reference. Today they're hand-copied and already out of sync (e.g., `actionsLayout` defaults exist only in the web-component layer; `badgesMaxVisible` only on the web-component side).

---

## 5. Noisy debug logging left in production paths — ✅ DONE

`renderBadges` (lines 757-774) and `close` (lines 1675-1696) contain `uiLogger.warn` / `uiLogger.info` calls with emoji prefixes (`✅ ❌ 🧹 🔒 ⏭️ 🔍 📞`) that read like a one-off bug-hunting session, not production telemetry. Two problems:

1. They run at `warn`/`info` levels — anyone enabling reasonable production logging will be flooded.
2. `close()` ends with `uiLogger.trace()` (line 1711) which dumps a stack trace.

These should be `debug` level at most, or removed. Same flavor of noise appears in the tooltip code (`positionBadgeTooltip` logs computed styles for every position update — that's per-frame during `autoUpdate`).

**Resolution:** Removed the emoji-prefixed `info`/`warn` calls from `renderBadges` and `close` (the kept paths are functionally identical, just quieter). Removed the trailing `uiLogger.trace()` and emoji `info` calls in `toggleOption`. Removed the per-frame `getComputedStyle` log block in `positionBadgeTooltip`. The remaining loggers continue to log at `debug` level for legitimate diagnosis.

---

## 6. CSS findings (full audit ran in subagent) — ✅ MOSTLY DONE

### 6.1 ~48 unused CSS variables in `_variables.css` — ⚠️ REINTERPRETED
Declared but never `var()`-referenced anywhere. Includes the entire typography scale (`--ms-font-size-xs/sm/base/lg/2xs`, all `--ms-font-weight-*`, all `--ms-line-height-*`), the legacy text aliases (`--ms-text-primary`, `--ms-text-secondary`), most `--ms-counter-*` variables, all `--ms-more-badge-*`, and a naming-mismatch set: `--ms-action-btn-*` is declared but the rules use `--ms-action-button-*`.

**Decision:** the original framing of "unused = dead code" was wrong for the per-component override hooks. They're public theming surface — declaring them is the *contract*, even if no internal rule reads them. The fix is to **wire them into rules** so they're real overrides, not delete them. We did the wiring for the obvious border-color hooks (see §6.7). The remaining unwired vars need per-case judgment — also in §6.7.

### 6.2 Eight variables declared twice with identical values — ✅ FIXED
Lines 125-139 (the "SEMANTIC VARIABLES" block) and lines 318-330 (the "INDIVIDUAL OPTIONS" block) both declare `--ms-option-bg`, `--ms-option-bg-hover`, `--ms-option-bg-focused`, `--ms-option-bg-matched`, `--ms-option-bg-selected`, `--ms-option-mark-bg`, `--ms-badge-bg`, `--ms-badge-bg-hover`. Drop one block.

**Resolution:** Removed the duplicate declarations from the lower per-section blocks; kept the canonical declarations in the SEMANTIC VARIABLES block. Added comments to the lower blocks pointing readers to where the bg/color vars live.

### 6.3 Self-referential variable — ✅ FIXED
`_variables.css:421`:
```css
--ms-badge-bg-hover: var(--ms-badge-bg-hover);
```
References itself. Should reference `--ms-accent-color-light-hover` (the pattern used at line 148).

**Resolution:** The self-referential line was inside the duplicate block removed in §6.2. The remaining (canonical) declaration at line 148 is `var(--base-hover-bg, var(--ms-input-bg))` — properly resolves.

### 6.4 Scrollbar pattern triplicated — ⏳ DEFERRED (Phase 2)
The same scrollbar rule block is copy-pasted into `_input-dropdown.css` (191-210), `_options.css` (17-36), and `_tooltips-popover.css` (111-130). Extract to a single targeted selector or use CSS nesting.

### 6.5 Hardcoded colors in `_debug.css` — ⏳ DEFERRED
Bypass theming: `#f9fafb`, `#e5e7eb`, `#111827`, `#2563eb`, `#f3f4f6`, `#3b82f6`, `#ffffff`. Should reference `--ms-primary-bg`, `--ms-border-color`, `--ms-text-color-1`, `--ms-accent-color`.

### 6.6 Per-component override hooks — ✅ WIRED
Several `*-border-color` semantic vars were declared but never wired into a CSS rule (so overriding them did nothing). Wired through their existing `*-border` shorthands:

| Variable | Shorthand affected |
|---|---|
| `--ms-hint-border-color` | `--ms-hint-border` |
| `--ms-dropdown-border-color` | `--ms-dropdown-border` (preserved `--base-dropdown-border` outer fallback) |
| `--ms-actions-border-color` | `--ms-actions-border-bottom` |
| `--ms-group-border-color` | `--ms-group-border-top` |
| `--ms-badge-counter-border-color` | `--ms-badge-counter-border` |
| `--ms-selected-popover-border-color` | `--ms-selected-popover-border` |
| `--ms-selected-popover-header-border-color` | `--ms-selected-popover-header-border-bottom` |
| `--ms-option-outline-color-focused` | `--ms-option-outline-focused` |
| `--ms-option-border-matched-color` | `--ms-option-border-matched` |

Each shorthand still defaults to the same color it had before (the per-component `*-color` defaults to `var(--ms-border-color)`), so no visual change. But now overriding `multi-select { --ms-hint-border-color: red; }` actually does something.

### 6.7 Remaining unwired declarations — needs per-case decision
After §6.6, these variables are still declared in `_variables.css` but have no `var()` reader. Each needs an explicit decision:

**Naming-mismatch siblings** (rules use a slightly different name):
- `--ms-action-btn-bg`, `--ms-action-btn-color`, `--ms-action-btn-bg-hover`, `--ms-action-btn-border-color-hover` — rules use `--ms-action-button-*`. Either rename the unused ones to `-button-` and wire, or delete as obsolete.
- `--ms-counter-bg`, `--ms-counter-color`, `--ms-counter-bg-hover` — rules use `--ms-counter-badge-*`. Same dilemma.
- `--ms-input-text` — rules use `--ms-input-color`. Likely redundant.
- `--ms-loading-text-color` — rules use `--ms-loading-color`. Likely redundant.

**Explicit legacy aliases** (the file flags these in a comment):
- `--ms-text-primary` → alias of `--ms-text-color-1`
- `--ms-text-secondary` → alias of `--ms-text-color-3`
Document as deprecated or remove on next major.

**Replaced by sibling vars** (file comment confirms):
- `--ms-more-badge-bg`, `--ms-more-badge-hover-bg`, `--ms-more-badge-active-bg` — `_badges-display.css:248` says "Now uses .ms__badge--counter for styling, this just adds cursor". The "+X more" badge inherits `--ms-badge-counter-*`. Safe to remove.

**`--ms-input-size-md-*`** — md is the default size, handled by the regular `--ms-input-padding`/`--ms-input-font-size`/`--ms-input-height`. The `xs/sm/lg/xl` size variants ARE used. Either wire the md vars into a `.ms__input--md` class (matching the other variants), or remove for symmetry.

**Probably-keep-as-theming-surface** (declared base hooks, intentionally part of the API even if no internal rule uses them):
- `--ms-text-color-2` — completes the 1/2/3/4 hierarchy. Keep.
- `--ms-accent-color-active` — completes accent normal/hover/active. Keep for parity even though no internal active state currently styles with it.
- `--ms-input-border-width` — granular input border control. Keep.

**Typography/scale tokens** (likely intentional design-token surface):
- `--ms-font-size-xs/sm/lg/2xs` (base IS used) — design tokens. Keep.
- `--ms-font-weight-normal/medium/semibold` — design tokens. Keep.
- `--ms-line-height-tight/normal` (`-none`/`-relaxed` are used) — design tokens. Keep.
- `--ms-spacing-md/lg` (`xs/sm` are used) — design tokens. Keep.
- `--ms-toggle-color` — likely a leftover that was renamed to `--ms-toggle-icon-color`. Remove or wire, judgment call.
- `--ms-dropdown-box-shadow-semantic` — duplicates `--ms-dropdown-box-shadow` with a different default. Remove the redundant one.

---

## 7. Documentation drift (`CLAUDE.md`) — ✅ FIXED

`CLAUDE.md` documents an SCSS architecture that no longer exists:
- "src/scss/main.scss - Entry point importing all partials" — the actual file is `src/css/main.css`. There are **zero** `.scss` files in the repo (Glob `**/*.scss` returns nothing).
- Lists `_variables.scss` and `_css-variables.scss` as separate partials. The actual layer is one file: `_variables.css`.
- States "**SCSS Variables**: `$ms-*` prefix" — no `$ms-*` SCSS variables exist; everything is CSS custom properties.
- References "**Sass** - CSS preprocessing" under "Build Tools" — Sass is not used.
- Approximate line counts in CLAUDE.md (multiselect.ts ~2500, web-component.ts ~950) vs actual (2567, 1011) — minor, but the architectural drift suggests the SCSS→CSS migration happened without updating CLAUDE.md.

**Resolution:** Replaced the SCSS section with the actual CSS structure (single `src/css/main.css` entry, 9 partials in `src/css/`). Removed the `$ms-*` claim and the Sass build-tool entry. Rewrote "Adding New CSS Variables" to reflect reality (declare in `_variables.css`, reference from a partial; warn against dead theming surface).

---

## 8. Dead exports & types — ✅ PARTIALLY DONE

`MultiSelectOption` and `MultiSelectOptions` (`types.ts:345-371`) are marked `@deprecated` and have **no runtime usage** in the source — they're only imported as types in `multiselect.ts:7` (and not actually used in the code below that import) and re-exported from `index.ts`. They are part of the public API surface, so removing them is a breaking change, but at minimum the import in `multiselect.ts` should be deleted.

`MultiSelectDataItem<T>` (`types.ts:50`) is exported but used nowhere — not even in the codebase as a type annotation. Likely safe to remove.

**Resolution:** Deleted the unused `MultiSelectOption`/`MultiSelectOptions` (and `BadgesDisplayMode`/`BadgesThresholdMode`) imports from `multiselect.ts`. Deleted the unused `MultiSelectDataItem<T>` type from `types.ts`. The `@deprecated` `MultiSelectOption`/`MultiSelectOptions` interfaces remain re-exported from `index.ts` (they're part of the public API surface; deletion is a breaking change deferred to a major bump).

---

## 9. Smaller cleanups & code smells

- **HTML string concatenation everywhere with `${callbackResult}` interpolation** — `renderOption`, `renderBadges`, `renderBadgeForPopover` all interpolate user-callback output directly into HTML strings. For default-rendered text (no callback), this means `displayValue` and `subtitle` are not escaped. If a consumer feeds in unsanitized data containing `<` or `&`, it's an XSS vector. Either escape at the boundary or document loudly that callbacks are HTML-trusted.
- **`getValue()` and `selectedValue` getter** (lines 2150 and 2134) are nearly identical — only difference is `selectedValue` returns `null` if no `valueMember` / `getValueCallback` is configured. Decide which is the public API; the other can be inlined.
- **`updateHiddenInput()`** removes and recreates all hidden inputs on every selection change. For `valueFormat: 'array'` with hundreds of selected items, this thrashes the DOM. Diff and update.
- **Counter element dual-purpose UI**: the `ms__counter` element is both a visual indicator AND the click target for the popover, with custom mousedown/click handlers. Non-obvious — would benefit from either a wrapping interactive element or a comment explaining the intent.
- **`shouldUseVirtualScroll` disables for groups** ("v1 limitation" comment, line 422) — long-standing TODO.
- **`badgesThreshold !== null && count > badgesThreshold`** at line 779 — when `badgesThreshold` is `undefined` (the default), the second clause does `count > undefined` which is always `false`. Works by accident; should be `badgesThreshold != null` or `typeof badgesThreshold === 'number'` for clarity.
- **Logger emoji noise in tooltip positioning** (line 2356-2364) calls `getComputedStyle` *six times per autoUpdate frame* just to log them. Even at debug level, this stalls layout. Wrap in `if (uiLogger.getLevel() <= log.levels.DEBUG)` or remove.
- **`instanceId` generation** uses `Math.random().toString(36).substr(2, 9)` — `substr` is deprecated; should be `slice`. Cosmetic. ✅ FIXED

---

## 10. Suggested refactor order (lowest-risk first)

1. **Fix the bugs in section 1** — small, isolated, behavior-correcting. Especially 1.1 (CSS var typo) and 1.2 (setItems bug) are one-character fixes.
2. **Update CLAUDE.md** to match reality — costs nothing, prevents future agent confusion.
3. **Delete dead exports** (`MultiSelectDataItem`, optionally the deprecated interfaces if you're willing to ship a minor-bump deprecation).
4. **CSS cleanup** — drop unused vars, remove the duplicate variable block (6.2), fix the self-reference (6.3), fix debug colors (6.5). Pure deletion, easy to verify with examples.
5. **Clean up the noisy logging** (section 5) — pure deletion.
6. **Extract data-extractor helper** (2.1) and **`commit()` helper** (2.7) — local refactors with no API impact.
7. **Extract action-button HTML helper** (2.2) and **badge HTML helper** (2.3).
8. **Extract `Tooltip` class** (2.5) — bigger refactor, but pays for itself in clarity and fixes the action-button leak.
9. **Unify the two attribute parsers** (section 4) — needs a shared defaults table; touches both files.
10. **Stop full-reinit on every attribute change** (1.7 / web-component recommendation 1) — needs a `picker.updateOptions(partial)` API and is the highest-leverage but riskiest change.

---

## Appendix: file inventory

| File | Lines | Notes |
|---|---:|---|
| `src/multiselect.ts` | 2,567 | Core class. Largest dedup target. |
| `src/web-component.ts` | 1,011 | ~70% getter/setter boilerplate. |
| `src/types.ts` | 371 | Two deprecated interfaces still present. |
| `src/virtual-scroll.ts` | 316 | Bug at line 209. Otherwise clean. |
| `src/logger.ts` | 141 | Fine. |
| `src/index.ts` | 107 | Fine. |
| `src/css/_variables.css` | 597 | 48 unused vars, 8 dupes, 1 self-ref. |
| `src/css/_options.css` | 366 | Scrollbar dup. |
| `src/css/_input-dropdown.css` | 273 | Scrollbar dup. |
| `src/css/_badges-display.css` | 251 | |
| `src/css/_tooltips-popover.css` | 173 | Scrollbar dup; reads `--ms-badge-height-virtual` (bug 1.1). |
| `src/css/_rtl.css` | 173 | |
| `src/css/_debug.css` | 57 | Hardcoded colors. |
| `src/css/_base.css` | 43 | |
| `src/css/_modifiers.css` | 32 | |
| `src/css/main.css` | 27 | |
