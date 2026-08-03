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

## What's New in v2.0.0-rc01

**The core-adoption major.** `<web-multiselect>` is now built on
[`@keenmate/web-components-core`](https://www.npmjs.com/package/@keenmate/web-components-core)
(`BlissElement`) — shared, tested custom-element plumbing (attribute parsing,
reactivity, reflection, event handling, logging, registration, positioning). The
dropdown, tree, virtual scroll, theming, and every attribute behave the same; the
change is under the hood, with three **breaking** API changes to be aware of:

- **`onSelect` / `onDeselect` / `onChange` are event-handler properties now.** They
  receive the `CustomEvent` (like `el.onclick`), so read `e.detail.option` /
  `e.detail.selectedOptions` / `e.detail.selectedValues` instead of a bare
  argument — equivalent to `addEventListener('select', …)`. The bubbling
  `select` / `deselect` / `change` events are unchanged.
- **`setAttributes()` takes typed property values by camelCase key.**
  `el.setAttributes({ searchPlaceholder: 'Search…', isCounterShown: true })`. To
  batch attribute **strings**, use `el.batch(() => { el.setAttribute('search-placeholder', 'Search…'); … })`.
- **Property writes are async (coalesced).** Setting a property (e.g.
  `el.options = […]`) applies on a microtask; `await el.whenSettled()` before
  reading back rendered state. `setAttributes()` / `batch()` still flush
  synchronously.
- **`data-options` gains CSV & plain formats.** The `data-options` attribute now
  takes `data-options-format="json|csv|plain"` (default `json`) — feed a CSV table
  (first row is a header; columns mapped via `*-member`) or a bare, newline-
  delimited value list without hand-writing JSON. Field and row delimiters are
  configurable via `data-options-splitter` / `data-options-row-splitter` (so TSV
  or a custom separator is expressible in the attribute), and `data-options` is
  now a fully reactive, shape-validated input — changing any of these re-renders.

See `CHANGELOG.md` for the full list.

## What's New in v1.12.0-rc08

- **Panel sizing — dropdown and popover are independently sizable via CSS variables** — The options dropdown and selected-items popover no longer inherit the input's width. `--ms-dropdown-width` (defaults to the live input width) and `--ms-selected-popover-width` (intrinsic 32rem) drive them, alongside the existing max-height variables. Set them at app level (`web-multiselect { --ms-dropdown-width: 60rem }`) or override a single instance with the new `dropdown-width` / `selected-popover-width` attributes, which write those variables inline on the element. This also fixes a latent bug where `--ms-selected-popover-width` was dead (an internal width-sync always overrode it), so the popover now honours its 32rem default. See section 14 of `examples-tree.html`.
- **Tree rendering — the option render callback receives full tree context** — `renderOptionContentCallback(item, ctx)` gains `isTreeNode`, `isBranch`, `isLeaf`, `childCount`, `level`, `depth`, `path`, `isSelectable`, and the cascade `isIndeterminate` tristate. Rendering a child-count badge on branches or branch/leaf-specific markup is now a one-liner, without re-deriving the hierarchy yourself. All fields are optional (flat options report `isTreeNode: false`), so existing callbacks are untouched. Demoed as the new "Custom Node Rendering" section.
- **Cascade counter — the `[N]` chip counts what you actually picked** — In cascade mode the counter used to show the emitted value count, which balloons under `cascade-select-policy="leaves"` / `"all"` (one branch click can emit five values) — jarring next to a couple of rolled-up badges. It now counts the rolled-up minimal cover — the branches you selected — regardless of emit policy, and gained a hover tooltip listing those items. Under the default `rolled-up` policy nothing changes.
- **Theming cleanup — dead input size-variant surface removed from the bundle** — The unused `.ms__input--xs/sm/lg/xl` preset classes and their `--ms-input-size-*` variable chain were never wired to anything (no `size` attribute toggles them), so they've been commented out — kept for a possible future preset API but no longer shipped as dead CSS (the compiled stylesheet shrank ~2 kB). Input sizing still works through `--ms-rem` for proportional global scale or the individual `--ms-input-*` variables for targeted overrides.
- **Fixes — badge hover and live cascade switching** — Badge hover no longer washes the chip to white (the hover background fell through to the white input background; it now deepens the accent tint, dark-mode aware). And switching `checkbox-mode` or `cascade-select-policy` live rebuilds the cascade index and silently re-projects the current selection, so badges, form value, and checkboxes all reflect the new mode instantly.

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
