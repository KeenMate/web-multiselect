# @keenmate/web-multiselect

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-multiselect.svg)](https://www.npmjs.com/package/@keenmate/web-multiselect)

> A lightweight, themeable multi-select web component with typeahead search, RTL support, rich content, and full keyboard navigation.

## What is it

`@keenmate/web-multiselect` is a custom element (`<web-multiselect>`) that turns a list of options into a searchable, themeable multi-select dropdown. Framework-agnostic — works in React, Vue, Svelte, Blazor, plain HTML.

Reads `--base-*` variables from the page if [`@keenmate/theme-designer`](https://theme-designer.keenmate.dev) is present, falls back to sensible OS-aware defaults otherwise, and ships with first-class dark-mode and per-instance theming.

**Headline features:**

- Declarative `<option>` / `<optgroup>` markup — no JavaScript required for simple cases.
- Virtual scrolling for 10,000+ option datasets (25× faster opening, 99.8% memory reduction).
- Filter or navigate search modes; async / hybrid search.
- Five badge display modes (pills, count, compact, partial, none) with positioning on any side.
- Full keyboard navigation, RTL language support, badge tooltips.
- Custom rendering callbacks for options, badges, and group headers.
- Form integration via standard hidden inputs (FormData-compatible).

## What's New in v1.12.0-rc07

- **Selection — `setSelected(values, { notify: true })` announces programmatic changes** — `setSelected()` stays silent by default (restoring saved state, cascade/dependent resets, and server-authoritative corrections must not re-fire `change`, or they trip "the user changed it" handlers and can bounce in a feedback loop), but the new `{ notify: true }` option fires a **single aggregate `change`** — no per-item `select`/`deselect` flood — for when a programmatic change is a deliberate user gesture, e.g. a custom action button that sets the selection and should reach the same listeners a manual pick does. Threaded through both the internal picker and the web component's `setSelected`.
- **Cascade mode — Select All now honours the value policy** — the built-in `select-all` action added every selectable node's value directly, bypassing the cascade projection, so with `checkbox-mode="cascade"` + `cascade-select-policy="rolled-up"` it emitted every node instead of the rolled-up roots (unlike a click, which rolls up). `selectAll()` is now cascade-aware — it fills the checked-atom set from the visible nodes and projects through the active policy via a shared `commitCascadeAtoms` helper — so Select All emits the same shape a click does. Shown in the new "Action Buttons" section of `examples-tree.html`.
- **Options no longer text-select on click-drag** — clicking a row, or dragging across the dropdown, used to highlight the labels like selectable text, which reads as broken for a pure selection gesture (most visible on the denser tree rows). Options now set `user-select: none` (with the `-webkit-` prefix) on `.ms__option`. Purely presentational — no API or behaviour change.

## What's New in v1.12.0-rc06

- **Tree of options — options can render as an always-expanded hierarchy** — give each option a materialized dot-path (`"1"`, `"1.1"`, `"1.1.1"`, …) and set `path-member` (or `el.getPathCallback`) and tree mode auto-enables, deriving parent/level from the path and rendering depth-first with indentation. The hierarchy model is a trimmed lift of `@keenmate/web-treeview`'s `ltree` (`src/tree/`) so ordering matches the treeview. There is no collapse/chevron — reach for `@keenmate/web-treeview` when you need expand/collapse. A separate `renderTreeNode` path carries the same selection/checkbox/icon/subtitle content plus depth indentation (via `--ms-tree-depth` → `src/css/tree.css`, tuned with `--ms-tree-indent`), and search filters the hierarchy to matches plus their ancestors so indentation stays coherent.
- **Per-node selectability — mark tree nodes non-selectable without greying them out** — `is-selectable-member` (a data flag) or `el.getIsSelectableCallback` (a predicate over the built `LTreeNode`, so it can read the derived `node.hasChildren`) makes the common "leaves only" rule a one-liner. A non-selectable node is distinct from a disabled one: it renders *normally* but drops its checkbox, is skipped by keyboard focus, and can't be toggled by click/Enter or Select All. New `.ms__option--tree-unselectable` theming hook (plus `data-selectable="false"`) ships with only `cursor: default` and no hover highlight, so structural branch rows read as structure while staying visually normal.
- **External search now composes with tree mode** — previously the async `searchCallback` path set the flat `filteredOptions` but not the parallel `treeNodes`, so an externalized search over a tree rendered blank or mis-indexed. It now rebuilds the hierarchy from the returned matches, keeping their ancestors (`rebuildTreeVisibleFromMatches`) — the async analogue of the built-in matches-plus-ancestors behaviour — and the below-min-length / error fallbacks are tree-aware too. A new `examples-search-index.html` demonstrates delegating the whole search to FlexSearch (fuzzy / accent-insensitive / ranked) over both a flat list and the full ISCO-08 tree, with an exact/prefix code lookup so `2211` resolves to its node and `72` to the whole subtree. FlexSearch stays a dev/consumer dependency — never in the shipped bundle.
- **Badge full title — render a supplied breadcrumb on badges** — new `full-title-member` (or `el.getFullTitleCallback`) reads a fully-qualified label that ships with the data (e.g. `"Fruit / Pome fruit / Apple"`); it is never computed. Turn on `show-badge-full-title` and badges render that full title instead of the display value, falling back to the display value for options without one, while an explicit `getBadgeDisplayCallback` still wins. Pairs naturally with tree mode to show the full path in the badge.
- **Adjustable row height and long-title handling** — new CSS variables (no new attributes) control every `.ms__option`, flat and tree: `--ms-option-min-height` sets a consistent minimum row height for non-virtual rows (they still grow if content is taller; virtual rows keep the fixed `--ms-option-height`), and `--ms-option-title-white-space` / `-overflow` / `-text-overflow` flip a title from the default wrap to a one-line ellipsis. `.ms__option-title` is the label hook (the analog of web-treeview's `.wtv__node-label`), and because its flex ancestors already set `min-width: 0`, ellipsis works with no extra CSS — pair it with `enable-option-tooltips` to reveal the full text on hover.
- **Cascade checkboxes for tree mode, with a value policy** — set `checkbox-mode="cascade"` and checking a node toggles its whole subtree while a partially-selected branch shows a tristate (dash) box. Orthogonally, `cascade-select-policy` decides *which values* the selection emits: `rolled-up` (default) collapses a fully-selected subtree to one "complete node" value and surfaces individual descendants under partially-selected branches (the minimal cover — the bit svelte-treeview lacks); `leaves` emits only checked leaves; `all` emits every checked node like web-treeview. Canonical state is the set of checked leaf atoms and the emitted `selectedValues` is a pure projection, so badges/form/`change` are untouched and every policy round-trips. Non-breaking — `independent` (the previous behaviour) is the default. Logic is isolated in `src/tree/cascade.ts`; tristate renders from a CSS modifier class (virtual-scroll-safe). Demoed as §10 on `examples-tree.html`.
- **More pronounced option checkboxes** — the unchecked box draws its border from a dedicated mid-grey token (`--ms-checkbox-border-color`, default `#8f8f8f`) instead of the faint generic `--ms-border`, so it reads as a real, clickable control, with a slightly bolder checkmark. New themeable tokens `--ms-checkbox-border-width` (1px), `--ms-checkbox-border-color`, and `--ms-checkbox-checkmark-thickness` drive it, and `--ms-checkbox-border` / `--ms-checkbox-checked-border` recompose from the width token — override any of them to restyle.
- **Fixes — stable tree rows across search** — two virtual-scroll/tree regressions are fixed: row height no longer jumps as filtering crosses the virtual-scroll threshold (non-virtual rows now pin to `--ms-option-height` when virtual scroll is enabled), and clearing a search with Escape (or reopening after a search) no longer leaves the dropdown blank — both the Escape-clear and `close()` paths route through a tree-aware `resetVisibleToAll()` that rebuilds `treeNodes` from the full tree.

> ⚠️ **Security notice:** This component intentionally allows raw HTML in rendering callbacks to give developers full control over content display. If you display user-generated content, you must sanitize it yourself. See [docs/examples.md → HTML Injection (XSS) notice](./docs/examples.md#html-injection-xss-notice) for the complete list of affected callbacks.

## Demos & docs

- 🚀 [Live demo](https://web-multiselect.keenmate.dev)
- 📘 [Usage / API reference](./docs/usage.md) — attributes, properties, methods, events.
- 🎨 [Theming](./docs/theming.md) — `--ms-*` variables, dark mode, cascade layers, Theme Designer integration.
- 📚 [Examples / cookbook](./docs/examples.md) — rich content, async search, virtual scroll, custom rendering, forms.
- ♿ [Accessibility](./docs/accessibility.md) — keyboard model, ARIA labels, focus behavior.

## Install

```bash
npm install @keenmate/web-multiselect
```

## Quick start

**Declarative — no JavaScript required:**

```html
<script type="module">
  import '@keenmate/web-multiselect';
</script>

<web-multiselect placeholder="Pick a country">
  <option value="cz">Czech Republic</option>
  <option value="sk">Slovakia</option>
  <option value="at">Austria</option>
</web-multiselect>
```

**Programmatic — dynamic data + events:**

```html
<web-multiselect id="picker" search-placeholder="Search…"></web-multiselect>

<script type="module">
  import '@keenmate/web-multiselect';

  const picker = document.getElementById('picker');
  picker.options = [
    { value: 'js', label: 'JavaScript', icon: '🟨' },
    { value: 'ts', label: 'TypeScript', icon: '🔷' },
    { value: 'py', label: 'Python', icon: '🐍' }
  ];

  picker.addEventListener('change', (e) => {
    console.log('Selected:', e.detail.selectedValues);
  });
</script>
```

See [docs/usage.md](./docs/usage.md) for the full API and [docs/examples.md](./docs/examples.md) for advanced patterns (async data, virtual scrolling, custom rendering, form integration).

## Browser support

Modern evergreen browsers — anything with native `customElements`, Shadow DOM, and CSS `@layer` support:

- Chrome / Edge 99+
- Firefox 97+
- Safari 15.4+

No polyfills are shipped. SSR-safe: the module imports without crashing in Node, but renders only after hydration in the browser.

## Development

```bash
# Install dependencies
npm install

# Start dev server (HMR)
npm run dev

# Build for production
npm run build

# Create package tarball
npm run package

# Run tests
npm run test:unit   # Vitest (happy-dom) — fast logic checks
npm run test:e2e    # Playwright (browser) — interaction/visual
npm test            # both
```

## Code structure

Follows the BlissFramework four-layer web-component layout:

| Layer | File | Role |
|-------|------|------|
| Element | `src/web-component.ts` | `MultiSelectElement` — custom-element I/O wrapper, `ATTRIBUTE_TABLE`-driven |
| Logic | `src/multiselect.ts` | `WebMultiSelect<T>` — framework-agnostic core |
| Service | `src/tooltip.ts`, `src/virtual-scroll.ts` | single-purpose helpers (`Tooltip`, `VirtualScroll`) |
| Side | `src/types.ts`, `src/logger.ts`, `src/vendor/` | types, logging, vendored deps |

Two deviations from the canonical shape, both intentional:

- **`MultiSelectElement extends BaseElement`, not `HTMLElement` directly.** `BaseElement` is a local `const` resolving to `HTMLElement` in the browser and to a stub class under SSR (`typeof HTMLElement === 'undefined'`), so importing the module in Node doesn't throw. A literal `grep "extends HTMLElement"` structure check will not match here by design.
- **`src/vite-env.d.ts`** is a standard Vite ambient-types file, not part of the four-layer model.

## License

MIT — see [LICENSE](./LICENSE).

## Built with BlissFramework

Follows the [BlissFramework component guidelines](https://blissframework.dev/) for structure, theming, color-scheme, and accessibility. Per-check verifications run via `/validate-web-component`.

## Credits

Created by [Keenmate](https://github.com/keenmate) as part of the Pure Admin design system.
