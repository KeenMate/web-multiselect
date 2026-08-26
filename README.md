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

## What's New in v2.0.0-rc09

- **Fullscreen header — the close (✕) button no longer wraps to a second line** — On narrower phones the ✕ could drop below the search field instead of sharing its row, and only on *some* devices. The overlay header is `flex-wrap: wrap` (so the navigate-mode match-nav row can drop below), and flex chooses which items share a line from each item's flex-basis *before* shrinking — so the leading search wrapper's `flex: 1 1 auto` reserved its full content width and pushed the ✕ over the edge even though it was fully shrinkable. Switching the wrapper (and the selected-items popover header) to `flex: 1 1 0` keeps the ✕ on the header row at every width while flex-grow still fills the bar.

- **Fullscreen header — the search-mode toggle and the close button are now symmetric** — With `show-search-mode-toggle` enabled, the leading magnifier/funnel toggle and the trailing ✕ sat at different distances from their edges: the ✕ is nudged toward the trailing edge but the toggle had no matching inset and used a smaller gap. The toggle now takes a mirrored `margin-inline-start` that lands its drawn glyph centre the same distance from the leading edge as the ✕'s is from the trailing edge (compensating for the toggle being a smaller chip), and its gap defaults to the header gap — measured glyph centres now both land 26.4px in.

- **Fullscreen action buttons align with the rest of the content** — Select All / Clear All started ~0.4rem further out than the search field and option checkboxes, because the actions row used a uniform 0.8rem padding while the header and options use a 1.2rem horizontal gutter. The overlay now sets `--ms-actions-padding: 0.8rem 1.2rem`, so the buttons' outer edges line up on the same vertical edge as everything above them.

- **Consistent Lucide `x` close icon** — `--ms-icon-remove` (the badge remove × and the fullscreen/popover close ✕) was a hand-drawn X at stroke-width 2.5; it's now Lucide's exact `x` (stroke-width 2, round joins) so the whole icon set stays Lucide-consistent with the magnifier, funnel, and `search-x`. Cosmetic only, still themeable via `--ms-icon-remove`.

## What's New in v2.0.0-rc08

- **Keyboard hook — redefine key behavior with `keydownCallback`** — A new property-only callback that runs on every keydown *before* the built-in handling, receiving the raw event, the current state (open, presentation, search term, focused option, filtered options, selection), and a `controller` — an imperative facade mirroring every built-in action (`focusNext/Previous/First/Last`, `focusPageUp/Down`, `focusNextMatch/PreviousMatch`, `focusIndex`, `toggleFocused`, `toggleValue`, `selectValue`, `deselectValue`, `open`, `close`, `setSearch`, `clearSearch`). Return `true` to fully own a key (you call `preventDefault`); return falsy to fall through to the defaults. Use it to remap keys (Vim `j`/`k`), add shortcuts (`Ctrl`+`A` → select all, `Ctrl`+`I` → invert), or suppress a default — the same veto-hook shape KM components share. Reactive, no reinit; set it as `el.keydownCallback = …`.

- **`Home` / `End` no longer steal the caret in the search box** — Both keys were intercepted unconditionally to jump list focus to the first/last option, so pressing `Home` to move the caret to the start of the search text jumped the list instead — breaking normal text-field muscle memory. They're now caret-aware: in an editable search field the key moves the caret first, and only navigates the list when the caret is already at that end (or the box is empty / has no editable caret; an active selection is left to the browser). So `Home` moves the caret to the start, and a second `Home` (already there) jumps to the first option. Empty-box `Home`/`End` navigation is unchanged.

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
