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

## What's New in v2.0.0-rc03

**Full-screen dropdown on phones (`mobile-presentation`).** On a phone, a dropdown
that floats next to the input fights the on-screen keyboard. `<web-multiselect>`
now detects phones and, by default (`mobile-presentation="auto"`), presents the
open dropdown as a **full-screen overlay** with its own search field and close (✕)
button — while desktop and tablets keep the familiar floating panel, unchanged. A
"phone" is a touch-primary device whose **shorter** viewport side is `< 600px`
(the Material `sw600dp` line), so a phone in **landscape** still gets the overlay
and tablets never do. The **selected-items popover** goes full-screen on phones
too, with a matching header. The phone view is scaled up ~1.2× for comfortable
touch targets via the `--ms-fullscreen-rem` knob (default `12px` vs the base
`--ms-rem: 10px`) — one value grows rows, text, checkboxes, header and search
together. Override the mode per instance with `mobile-presentation="floating"`
(anchored panel everywhere) or `"fullscreen"` (force the overlay on any device —
handy for previews). Theme it with the new `--ms-fullscreen-*` CSS variables.

```html
<!-- auto (default): full-screen on phones, floating on desktop/tablet -->
<web-multiselect mobile-presentation="auto"></web-multiselect>

<!-- never go full-screen -->
<web-multiselect mobile-presentation="floating"></web-multiselect>

<!-- always full-screen (preview the mobile view on desktop) -->
<web-multiselect mobile-presentation="fullscreen"></web-multiselect>
```

This is powered by device/viewport/orientation detection in
[`@keenmate/web-components-core`](https://www.npmjs.com/package/@keenmate/web-components-core)
(via `BlissElement`'s `environmentChanged` hook), which this release pins at
**1.0.0-rc06** — rc04 also **dropped `loglevel`** as a transitive runtime
dependency. The floating dropdown additionally gains a viewport-width safety cap so
a wide panel can't overflow the screen edge.

**Right-to-left, done properly — including runtime switching.** Give the element (or
any ancestor) `dir="rtl"` and the whole component mirrors: the toggle and in-input
counter move to the left, checkboxes sit on the right of each row, badges reverse,
and the full-screen overlay mirrors too (search/close swap sides, the match
navigator flips). RTL is now built on CSS **logical properties** driven by the
inherited direction, which fixes cases that silently never worked before — the
dropdown, hint, and selected-popover live in the shadow root, so the old `.ms--rtl`
override rules never reached them. And flipping `dir` at runtime — an app-wide
language switch — re-mirrors the live picker without a rebuild (via core rc06's new
`directionChanged` hook).

**Friendlier phone browsing.** The full-screen sheet opens with the **keyboard
closed** by default, so you can scan long lists and reach the bottom action buttons
before typing (opt into immediate type-to-filter with `fullscreen-autofocus="true"`).
The phone **Back gesture** now closes the sheet instead of navigating the page away.
In `search-mode="navigate"`, an on-screen **match navigator** (an `N of M` count plus
prev/next buttons) stands in for the desktop `Ctrl`+`Arrow` match-stepping that touch
can't do — and the focused match now stays visible above the keyboard instead of
scrolling behind it. Tapping an option no longer pops the keyboard mid-browse.

See `CHANGELOG.md` for the full list.

## What's New in v2.0.0-rc02

**Form association restored for host frameworks (`el.form`).** Selecting inside a
`<web-multiselect>` that lives in a `<form>` again delivers changes to frameworks
that resolve the parent form via `event.target.form` — most notably Phoenix
LiveView's `phx-change` delegation, which silently dropped changes in rc01.
`<web-multiselect>` is a form-associated custom element, so it now exposes a real
`el.form` / `event.target.form` like a native control. (rc01 had hardened its
internal `ElementInternals` handle to a true `#private` field, which killed the
`.form` that host-framework wrappers read.) The fix lives upstream in
[`@keenmate/web-components-core`](https://www.npmjs.com/package/@keenmate/web-components-core)
1.0.0-rc02 (the `el.form` getter), which this release pins.

See `CHANGELOG.md` for the full list.

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
