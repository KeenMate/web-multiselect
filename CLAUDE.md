# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A feature-rich multiselect web component with typeahead search, virtual scrolling, grouping, and extensive customization options. Published as `@keenmate/web-multiselect` on npm.

**Current Status**: Fully implemented TypeScript web component with Vite build tooling, ready for development and publishing.

## Architecture

### Source Files

**src/multiselect.ts** (~2500 lines)
- Core `WebMultiSelect<T>` class with generic type support
- Handles all multiselect logic: search, selection, keyboard navigation, virtual scrolling
- Uses member/callback pattern for data extraction (similar to svelte-treeview)
- Depends on Floating UI (`@floating-ui/dom`) for dropdown positioning

**src/web-component.ts** (~950 lines)
- `MultiSelectElement<T>` custom element wrapping the core class
- Shadow DOM encapsulation with style injection
- Attribute observation and property setters
- Event dispatching (select, deselect, change)
- Form integration with hidden inputs

**src/types.ts** (~360 lines)
- TypeScript interfaces: `MultiSelectConfig<T>`, `MultiSelectOption`, `ActionButton<T>`
- Type definitions for display modes, positions, search modes
- Callback context interfaces for custom rendering

**src/virtual-scroll.ts**
- `VirtualScroll<T>` class for rendering large lists efficiently
- Used for both options dropdown and selected items popover

**src/logger.ts**
- Debug logging utilities (initLogger, dataLogger, uiLogger, interactionLogger)

### CSS Structure

The styles are plain CSS (no SCSS / no preprocessor). All theming is done via CSS custom properties.

**src/css/main.css** - Entry point that `@import`s all partials:
- `_variables.css` - All `--ms-*` CSS custom properties at `:host` level (base primitives, semantic per-component theming hooks, sizing)
- `_base.css` - FOUC prevention + layout containers
- `_input-dropdown.css` - Input, toggle, counter, hint, dropdown, actions
- `_options.css` - Options list, groups, checkbox, content, states
- `_badges-display.css` - Badges, count display, individual badges
- `_tooltips-popover.css` - Badge tooltips + selected items popover
- `_rtl.css` - RTL language support
- `_modifiers.css` - State modifiers (disabled, no-checkboxes)
- `_debug.css` - Debug information panel

### Naming Conventions

- **CSS Classes**: `.ms__*` prefix (e.g., `.ms__input`, `.ms__dropdown`, `.ms__option`)
- **CSS Variables**: `--ms-*` prefix (e.g., `--ms-accent-color`, `--ms-input-border-radius`)

## Key Features

### Data Handling
- Generic type support `<T>` for any data structure
- Member/callback pattern: `valueMember` + `getValueCallback`
- Auto-detection of `[key, value]` tuples
- Async search via `searchCallback`

### Display Modes
- `badgesDisplayMode`: 'badges' | 'count' | 'compact' | 'partial' | 'none'
- `badgesPosition`: 'top' | 'bottom' | 'left' | 'right'
- `searchMode`: 'filter' | 'navigate'
- `searchInputMode`: 'normal' | 'readonly' | 'hidden'

### Virtual Scrolling
- Automatic for large datasets (threshold: 100 items)
- Fixed item height required (`optionHeight`, `badgeHeight`)
- Buffer for smooth scrolling

### Custom Rendering
- `renderOptionContentCallback` - Custom dropdown option content
- `renderBadgeContentCallback` - Custom badge content
- `renderSelectedItemContentCallback` - Custom popover item content
- `customStylesCallback` - Inject custom CSS into Shadow DOM

### Sizing System

The component uses `--ms-rem` for global scaling. Default is `10px` (so `1.4 * --ms-rem = 14px`).

**Global Scaling:**
```html
<!-- Compact (80%) -->
<web-multiselect style="--ms-rem: 8px;"></web-multiselect>

<!-- Default (100%) -->
<web-multiselect></web-multiselect>

<!-- Large (120%) -->
<web-multiselect style="--ms-rem: 12px;"></web-multiselect>
```

**Fine-grained Control:**
Override individual variables like `--ms-input-font-size`, `--ms-input-padding-v`, `--ms-input-height`, etc.

**Shadow DOM Note:** CSS variables must be set on the `<web-multiselect>` element itself, not on wrapper divs.

### Typography Integration

Font sizes use unitless multipliers that get multiplied by `--ms-rem`:
```css
--ms-input-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));
```

This enables integration with theme-designer's `--base-*` variables:
- `--base-font-family` - Font family
- `--base-font-size-xs`, `--base-font-size-sm`, etc. - Unitless multipliers
- `--base-font-weight-normal`, `--base-font-weight-semibold`, etc. - Font weights
- `--base-line-height-tight`, `--base-line-height-normal` - Line heights

## Development Guidelines

### Adding New Attributes

1. Add to `observedAttributes` in `web-component.ts`
2. Map the attribute to a config key inside `initializePicker` (`web-component.ts`)
3. Handle in `attributeChangedCallback` (consider if re-init needed)
4. Add getter/setter property

### Adding New CSS Variables

1. Declare the variable in `src/css/_variables.css` at `:host` level. Per-component theming hooks default to a base variable, e.g.
   `--ms-myComponent-border-color: var(--ms-border-color);`
2. Reference the new variable from the actual rule in the relevant `_*.css` partial — e.g.
   `.ms__myComponent { border: 1px solid var(--ms-myComponent-border-color); }`
3. Always wire a declared variable into at least one rule. A declaration with no `var()` reader is dead theming surface.

### Consistency with web-daterangepicker

Both components share similar patterns:
- Same `--*-rem` scaling approach (`--ms-rem`, `--drp-rem`)
- Same typography integration with `--base-*` variables
- CSS variable prefixes (multiselect: `--ms-*`, daterangepicker: `--drp-*`)

## Build System

### Build Tools
- **Vite** - Fast build tool and dev server with HMR
- **TypeScript** - Type-safe development
- **Makefile** / **make.bat** - Build automation

### Available Commands

```bash
# Using Makefile (Unix/Mac/WSL/Git Bash)
make setup        # Install dependencies
make dev          # Start dev server (watches changes)
make build        # Build for production
make package      # Create npm package
make publish-dry  # Dry-run publish
make publish      # Publish to npm
make clean        # Clean all artifacts
make help         # Show all commands

# Using npm directly
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Build for production
```

### Output Files
Build creates `dist/` with:
- `multiselect.js` - ES module format
- `multiselect.umd.js` - UMD format for CDN/legacy
- `style.css` - Compiled styles

## State Management

Key state in `WebMultiSelect`:
- `selectedValues: Set<string>` - Currently selected value IDs
- `selectedOptions: Map<string, T>` - Full option objects by ID
- `allOptions: T[]` - All available options
- `filteredOptions: T[]` - Options after search filtering
- `focusedIndex: number` - Keyboard navigation index
- `isOpen: boolean` - Dropdown visibility
- `isLoading: boolean` - Async search loading state

## Known Dependencies

- `@floating-ui/dom` - Required for dropdown/tooltip positioning (bundled)
- All SCSS variables converted to CSS custom properties with `--ms-` prefix
- No external CSS frameworks required

## Event System

Custom events dispatched on the web component:
- `select` - Option selected (detail: `{ option, selectedOptions, selectedValues }`)
- `deselect` - Option deselected (detail: `{ option, selectedOptions, selectedValues }`)
- `change` - Selection changed (detail: `{ selectedOptions, selectedValues }`)

## Form Integration

- `name` attribute for form field name
- `value-format` attribute: 'json' | 'csv' | 'array'
- Hidden inputs created in light DOM for form submission
- Works with both Shadow DOM and traditional forms
