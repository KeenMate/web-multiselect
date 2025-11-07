# MultiSelect Web Component

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-multiselect.svg)](https://www.npmjs.com/package/@keenmate/web-multiselect)

A lightweight, accessible multiselect web component with typeahead search, rich content support, and excellent keyboard navigation.

## Features

- 🔍 **Typeahead Search** - Real-time filtering as you type
- ⌨️ **Keyboard Navigation** - Full keyboard support (arrows, Enter, Esc, Tab)
- 🎨 **Rich Content** - Icons, subtitles, and multiline text support
- 📊 **Multiple Display Modes** - Pills, count, or compact display
- 🎯 **Single & Multi-Select** - Switch between single and multiple selection modes
- 🔄 **Async Data Loading** - On-demand data fetching support
- 📦 **Grouped Options** - Organize options into collapsible groups
- 🎉 **Smart Positioning** - Uses Floating UI for intelligent dropdown placement
- ✨ **Modern** - Web Component with Shadow DOM, TypeScript, bundled with Vite
- 🌐 **Framework Agnostic** - Works with any framework or vanilla JS

## Installation

```bash
npm install @keenmate/web-multiselect
```

## Usage

### Basic HTML

```html
<!-- Multi-select -->
<multi-select
  search-placeholder="Search options..."
  initial-values='["js","ts"]'>
</multi-select>

<!-- Single-select -->
<multi-select
  multiple="false"
  search-placeholder="Select one..."
  initial-values='["python"]'>
</multi-select>
```

### With JavaScript/TypeScript

```typescript
// Import the component (includes styles)
import '@keenmate/web-multiselect';

// Or import styles separately if needed
import '@keenmate/web-multiselect/style.css';

const multiselect = document.querySelector('multi-select');

// Set options programmatically
multiselect.options = [
  { value: 'js', label: 'JavaScript', icon: '🟨' },
  { value: 'ts', label: 'TypeScript', icon: '🔷' },
  { value: 'py', label: 'Python', icon: '🐍' }
];

// Listen for events
multiselect.addEventListener('change', (e) => {
  console.log('Selected:', e.detail.selectedOptions);
  console.log('Values:', e.detail.selectedValues);
});

// Public API
const selected = multiselect.getSelected();
multiselect.setSelected(['js', 'ts']);
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `multiple` | `boolean` | `true` | Allow multiple selections |
| `search-placeholder` | `string` | `'Search...'` | Placeholder text for search input |
| `search-hint` | `string` | - | Hint text shown above input when focused |
| `allow-groups` | `boolean` | `true` | Enable option grouping |
| `allow-select-all` | `boolean` | `true` | Show "Select All" button |
| `allow-clear-all` | `boolean` | `true` | Show "Clear All" button |
| `show-checkboxes` | `boolean` | `true` | Show checkboxes next to options |
| `close-on-select` | `boolean` | `false` | Close dropdown after selecting |
| `dropdown-min-width` | `string` | - | Min width for dropdown (e.g., '20rem') |
| `display-mode` | `'pills' \| 'count' \| 'compact'` | `'pills'` | How to display selected items |
| `pills-threshold` | `number` | - | Auto-switch to count mode when exceeded |
| `pills-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Position of pills container |
| `count-format` | `string` | `'{count} selected'` | Template for count display |
| `show-count-badge` | `boolean` | `false` | Show [3] badge next to toggle icon |
| `max-height` | `string` | `'20rem'` | Maximum height of dropdown |
| `empty-message` | `string` | `'No results found'` | Message when no options found |
| `loading-message` | `string` | `'Loading...'` | Message while loading async data |
| `min-search-length` | `number` | `0` | Minimum search length for async |
| `initial-values` | `string` (JSON array) | - | Pre-selected values |

## Properties

```typescript
// Get/set options
multiselect.options = [
  { value: 'js', label: 'JavaScript' },
  { value: 'ts', label: 'TypeScript' }
];

// Async data loading
multiselect.onSearch = async (searchTerm) => {
  const response = await fetch(`/api/search?q=${searchTerm}`);
  return await response.json();
};

// Event callbacks
multiselect.onSelect = (option) => {
  console.log('Selected:', option);
};

multiselect.onDeselect = (option) => {
  console.log('Deselected:', option);
};

multiselect.onChange = (selectedOptions) => {
  console.log('Changed:', selectedOptions);
};
```

## Methods

| Method | Description |
|--------|-------------|
| `getSelected()` | Get currently selected options |
| `setSelected(values: string[])` | Set selected values |
| `destroy()` | Clean up and destroy instance |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `select` | `{ option, selectedOptions }` | Fired when an option is selected |
| `deselect` | `{ option, selectedOptions }` | Fired when an option is deselected |
| `change` | `{ selectedOptions, selectedValues }` | Fired when selection changes |

## Keyboard Shortcuts

- **↑ ↓** - Navigate up/down through options
- **Enter** - Select focused option
- **Escape** - Close dropdown
- **Tab** - Close dropdown and move to next field
- **Type** - Filter options by search term

## Advanced Features

### Rich Content with Icons

```html
<multi-select id="frameworks"></multi-select>

<script type="module">
  const select = document.getElementById('frameworks');
  select.options = [
    {
      value: 'react',
      label: 'React',
      icon: '⚛️',
      subtitle: 'A JavaScript library for building user interfaces'
    },
    {
      value: 'vue',
      label: 'Vue.js',
      icon: '🖖',
      subtitle: 'The Progressive JavaScript Framework'
    }
  ];
</script>
```

### Grouped Options

```javascript
select.options = [
  { value: 'js', label: 'JavaScript', group: 'Frontend' },
  { value: 'ts', label: 'TypeScript', group: 'Frontend' },
  { value: 'python', label: 'Python', group: 'Backend' },
  { value: 'java', label: 'Java', group: 'Backend' }
];
```

### Async Data Loading

```html
<multi-select
  id="async-select"
  min-search-length="2"
  loading-message="Searching..."
  empty-message="No products found">
</multi-select>

<script type="module">
  const select = document.getElementById('async-select');

  select.onSearch = async (searchTerm) => {
    const response = await fetch(`/api/products?q=${searchTerm}`);
    const data = await response.json();
    return data.products;
  };
</script>
```

### Count Display Mode

Perfect for narrow inputs where pills would overflow:

```html
<!-- Show count instead of pills -->
<multi-select
  display-mode="count"
  count-format="{count} selected"
  show-count-badge="true"
  style="max-width: 10rem;">
</multi-select>

<!-- Auto-switch from pills to count at threshold -->
<multi-select
  display-mode="pills"
  pills-threshold="3"
  show-count-badge="true">
</multi-select>
```

### Pills Positioning

Control where selected item badges appear:

```html
<!-- Pills below input (default) -->
<multi-select pills-position="bottom"></multi-select>

<!-- Pills above input -->
<multi-select pills-position="top"></multi-select>

<!-- Pills to the left (RTL) -->
<multi-select pills-position="left"></multi-select>

<!-- Pills to the right (LTR) -->
<multi-select pills-position="right"></multi-select>
```

### Disabled Options

```javascript
select.options = [
  { value: 'basic', label: 'Basic License', subtitle: 'Free forever' },
  { value: 'pro', label: 'Pro License', subtitle: 'Available for purchase' },
  {
    value: 'enterprise',
    label: 'Enterprise License',
    subtitle: 'Contact sales',
    disabled: true
  }
];
```

## Option Structure

```typescript
interface MultiSelectOption {
  value: string;           // Required: Unique identifier
  label: string;           // Required: Display text
  icon?: string;           // Optional: Icon or emoji
  subtitle?: string;       // Optional: Subtitle/description
  group?: string;          // Optional: Group name
  disabled?: boolean;      // Optional: Disable selection
}
```

## Styling

The component uses Shadow DOM, so styles are encapsulated. You can style the host element:

```css
/* Size the component */
multi-select {
  width: 100%;
  max-width: 400px;
}

/* Custom positioning */
multi-select {
  display: block;
  margin-bottom: 1rem;
}
```

Internal styles use CSS custom properties (CSS variables) which can be themed from outside the Shadow DOM in a future version.

## Browser Support

- Modern browsers with Web Components support
- Chrome/Edge 67+
- Firefox 63+
- Safari 10.1+

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Create package
npm run package
```

## License

Copyright (c) 2024 Keenmate

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ Free to use in commercial products
- ✅ Free to modify and distribute
- ✅ No licensing fees or restrictions
- ⚠️ Provided "as is" without warranty
- 📝 Must include copyright notice in copies

## Credits

Created by [Keenmate](https://github.com/keenmate) as part of the Pure Admin design system.
