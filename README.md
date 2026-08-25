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

## What's New in v2.0.0-rc07

- **Responsive custom rendering — one callback, rich on desktop, lean on the phone** — `renderOptionContentCallback` (and the badge callback) now receive a `presentation` field (`'floating' | 'fullscreen'`) plus an `isFullscreen` convenience, resolved from the same device/viewport classification that chooses the overlay. A single callback can render a rich desktop row — price, popularity, a thumbnail — and a leaner one in the phone fullscreen sheet where space is tight, with no `matchMedia` or resize wiring in your page. It's reactive: rotating or resizing across the phone boundary re-renders and re-invokes the callback with the new value. The flags come from the shared `PresentationContext` in `@keenmate/web-components-core` (rc08), so the shape stays consistent across KM components.

- **In-overlay filter ↔ navigate switch — `show-search-mode-toggle`** — An opt-in toggle at the leading edge of the phone fullscreen search field that flips `search-mode` between `filter` (narrow the list) and `navigate` (keep it whole, jump between matches) in place — no reopen. Its icon reflects the current mode (magnifier for navigate, funnel for filter), and switching rebuilds the `N of M` match navigator and re-projects the current term live. It's the touch stand-in for the desktop `Ctrl`+`Arrow` match-stepping phones can't reach. Enabled without an explicit `search-placeholder`, the placeholder also becomes mode-aware — `Search…` in navigate, `Filter…` in filter.

- **More visible borders by default** — The default `--ms-border-color` was very low-contrast (`#e5e7eb` on white, `#3a3a3a` on near-black), so the 1px input and panel edges nearly disappeared, especially on phones. It's now `light-dark(#cbd5e1, #52525b)` — a clearly-visible but still soft gray on each side — driving every border that inherits it. Apps that set `--base-border-color` or their own `--ms-*` border overrides are unchanged.

- **Fullscreen overlay polish** — Several phone-overlay rough edges are gone: the match-navigator prev/next buttons no longer flash a near-white chip on dark or custom themes (hover is now a translucent accent tint that adapts to any background), and the search field no longer jumps upward when the `N of M` navigator row appears (the header anchors its rows to the top so the field keeps a constant position).

- **Sharper option checkboxes** — The option checkbox used to sit ~1px below the label's optical center because an asymmetric top margin fought the row's centering — most visible at larger scales like the fullscreen overlay. The default nudge is now `0` (center alignment is truly centered), scoped back only to the explicit top-aligned checkbox mode.

- **No more phantom first-row highlight** — Switching search mode or clearing the box on an empty search used to highlight the first row as if it were selected. An empty box now leaves nothing focused (matching a fresh open); typing still auto-focuses the first result so Enter picks it.

## What's New in v2.0.0-rc06

- **Tree search — `search-mode="navigate"` now works on trees** — Navigate mode (keep the whole list on screen and jump focus between matches instead of filtering it down) was silently ignored on tree data: the tree search path always collapsed the hierarchy to matches + ancestors and cleared the match set *before* the navigate branch could run, so `search-mode="navigate"` on a `path-member` tree did nothing. It now honors the mode — the always-expanded tree stays fully visible, matching rows get the highlight, focus jumps to the first match, and the match set powers `Ctrl`+`ArrowUp`/`ArrowDown` on desktop plus the fullscreen `N of M` match navigator (count + prev/next) on touch, which now shows for trees too. Filter mode (the default) is unchanged.

- **Fullscreen overlay — no longer slips under the system bar on pages with horizontal overflow** — A host page that overflows sideways (e.g. an unbreakable-wide token in a heading) makes the mobile browser shrink-to-fit — it zooms the page out so the overflow fits, splitting the visual viewport from the layout viewport. Because the fullscreen dropdown and selected-items popover are `position: fixed` (anchored to the layout viewport), that zoom left them inset from the physical screen and their top edge slid under the status/nav bar — easily misread as a safe-area issue, but `env(safe-area-inset-*)` is `0` in that state. Opening a fullscreen sheet now clamps `overflow-x: hidden` on `<html>` (restored on close), which removes the overflow so the browser drops the zoom and the sheet sits flush — regardless of the host page. No-op when the page doesn't overflow, and touches only `<html>` so it doesn't fight core's body scroll-lock.

- **Fullscreen selected-items popover — Back gesture closes it instead of leaving the page** — The options dropdown already traps the Android Back gesture so it dismisses the fullscreen sheet rather than navigating away, but the selected-items popover — which also goes fullscreen on phones — skipped that guard, so a Back gesture fell through to a real `history(-1)` and left the page (losing the selection view and any unsaved state). The popover now pushes and consumes the same history entry as the dropdown, and the shared handler closes whichever overlay is open. Floating popovers are unaffected.

- **Search results — the current match no longer nudges the row sideways** — The leading accent bar on the current match was a real `border-inline-start` that existed only in the matched state, so the checkbox and label jumped ~3px inward the instant a row became the match — content visibly "walked" as you stepped between results. The bar is now an out-of-flow `::before` overlay pinned to the leading edge, so it paints the same accent without touching the row's box model. Still themeable via `--ms-option-border-matched` and RTL-mirrored.

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

## Editor IntelliSense

The package ships editor metadata so you get autocomplete and hover docs for the
element's attributes, events, and all `--ms-*` CSS custom properties. All of it is
generated from the component's source on every build, so it never drifts.

- **JetBrains** (WebStorm / IntelliJ) — works automatically. The IDE discovers
  `web-types.json` via the `web-types` field in `package.json`; no setup needed.
- **VS Code** — the data files ship but VS Code doesn't auto-discover them from a
  dependency, so point your workspace at them once in `.vscode/settings.json`:

  ```json
  {
    "html.customData": [
      "./node_modules/@keenmate/web-multiselect/vscode.html-custom-data.json"
    ],
    "css.customData": [
      "./node_modules/@keenmate/web-multiselect/vscode.css-custom-data.json"
    ]
  }
  ```

  `html.customData` powers tag/attribute completion on `<web-multiselect>`;
  `css.customData` powers completion for the `--ms-*` theming variables. Reload
  the window after adding them.

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
