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

### SCSS Structure

**src/scss/main.scss** - Entry point importing all partials:
- `_variables.scss` - SCSS variables (base primitives + semantic)
- `_css-variables.scss` - CSS custom properties at `:host` level (for theming)
- `_base.scss` - FOUC prevention + layout containers
- `_input-dropdown.scss` - Input, toggle, counter, hint, dropdown, actions
- `_options.scss` - Options list, groups, checkbox, content, states
- `_badges-display.scss` - Badges, count display, individual badges
- `_tooltips-popover.scss` - Badge tooltips + selected items popover
- `_rtl.scss` - RTL language support
- `_modifiers.scss` - Size variants + state modifiers
- `_debug.scss` - Debug information panel

### Naming Conventions

- **CSS Classes**: `.ms__*` prefix (e.g., `.ms__input`, `.ms__dropdown`, `.ms__option`)
- **CSS Variables**: `--ms-*` prefix (e.g., `--ms-accent-color`, `--ms-input-border-radius`)
- **SCSS Variables**: `$ml-*` prefix for semantic, `$ms-*` for component-specific

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

### Input Size System

The component uses a 5-level size scale (xs, sm, md, lg, xl) for input sizing:

**Web Component Attribute:**
- `input-size` - Input field size

**CSS Variables (per size):**
- `--ms-input-size-{size}-font` - Font size
- `--ms-input-size-{size}-padding-v` - Vertical padding
- `--ms-input-size-{size}-padding-h` - Horizontal padding
- `--ms-input-size-{size}-height` - Input height

**Example:**
```html
<web-multiselect input-size="lg"></web-multiselect>
```

## Development Guidelines

### Adding New Attributes

1. Add to `observedAttributes` in `web-component.ts`
2. Handle in `attributeChangedCallback` (consider if re-init needed)
3. Add getter/setter property
4. For size-related: add method like `applyInputSizeStyles()`

### Adding New CSS Variables

1. Add SCSS variable in `_variables.scss`
2. Add CSS custom property in `_css-variables.scss`
3. Use in component SCSS with fallback: `var(--ms-new-var, $scss-fallback)`

### Consistency with web-daterangepicker

Both components share similar patterns:
- Same size scale (xs, sm, md, lg, xl)
- Similar attribute naming (`input-size`)
- CSS variable prefixes (multiselect: `--ms-*`, daterangepicker: `--drp-*`)
- Same `applyInputSizeStyles()` pattern for efficient attribute handling

## Build System

### Build Tools
- **Vite** - Fast build tool and dev server with HMR
- **TypeScript** - Type-safe development
- **Sass** - CSS preprocessing
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
