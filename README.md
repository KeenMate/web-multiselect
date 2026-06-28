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

## What's New in v1.12.0-rc04

- **Placeholders — context-aware wording for pickers and empty cascades** — The input used to show `"Search..."` unconditionally, even when search was off or there was nothing to pick. Two new attributes fix that. `select-placeholder` (default `"Pick an option..."`) is shown when the input isn't a usable search box — `enable-search="false"`, or `search-input-mode="readonly"`/`"hidden"` — so a non-searchable picker stops mislabeling itself. `no-data-placeholder` is an opt-in string shown when the option list is empty, letting users see there's nothing to choose without opening the dropdown; it targets cascade multiselects whose parent isn't resolved yet, and stays unset by default so async-loaded selects don't flash an empty-state before their data lands. Placeholder resolution is now recomputed on live updates too, so changing these attributes, the search mode, or the option list updates the visible text on the fly. **Behavior change:** search-disabled instances without a custom placeholder now read `"Pick an option..."` — set `select-placeholder="Search..."` to keep the old text.
- **setAttributes() — batch attribute updates in a single render** — Setting attributes one at a time triggered a full re-render per call. The new `setAttributes(attrs)` method on `<web-multiselect>` applies a whole map of attributes in one in-place update (or a single reinit at most, if any change is structural). Keys are kebab-case attribute names, exactly like `setAttribute`; a value of `null`/`undefined`/`false` removes the attribute and `true` sets it to `""`. It's particularly handy for i18n language switches that swap several placeholder strings at once without flicker.
- **search-debounce — coalesce async search into one request** — A new `search-debounce` attribute (milliseconds, default `0`) debounces the async `searchCallback` so a burst of keystrokes collapses into a single request instead of one per character. Each keystroke resets the timer, and it applies to the async `searchCallback` path only — local in-memory filtering stays instant. The existing stale-result guard (results applied only if the term still matches) remains as a second line of defense against out-of-order responses. The examples page §8 now ships a "Debounced Search" demo with a live keystrokes-vs-API-calls counter that makes the coalescing obvious.
- **searchCallback AbortSignal — cancel superseded in-flight requests** — `searchCallback` now receives an `AbortSignal` as its second argument: `(searchTerm, signal) => Promise<options[]>`. When a newer search supersedes an in-flight one — or the term drops below `min-search-length`, or the component is destroyed — the previous request's signal is aborted; forward it into `fetch(url, { signal })` to actually cancel the network call. It's backward compatible: the argument is optional, and existing callbacks that ignore it keep working with their stale results discarded as before. Aborted or superseded responses never overwrite the live filtered options.

## What's New in v1.12.0-rc03

- **Declarative options — `<option>` children render without member attributes** — Declarative `<option>` / `<optgroup>` markup previously required `value-member` / `display-value-member` / `group-member` to be set, or every row rendered as `[N/A]`. The element now auto-wires those member properties (plus `icon`/`subtitle`/`disabled`) when declarative children are detected — only when the consumer hasn't already configured them — so markup-only usage works out of the box while every override path still wins.
- **Framework events — bubbling + composed dispatch** — `select`, `deselect`, and `change` are now dispatched with `bubbles: true, composed: true`, so Svelte 5 `onchange={fn}`, React `onChange`, Vue `@change`, and any framework using delegated event routing work without the legacy `on:` directive. **Behavior change:** delegated form-level `change` listeners now also receive the component's event — filter by `e.target.tagName === 'WEB-MULTISELECT'` if your form library reacts to every `change`.

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
