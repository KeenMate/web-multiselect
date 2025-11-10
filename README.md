# MultiSelect Web Component

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-multiselect.svg)](https://www.npmjs.com/package/@keenmate/web-multiselect)

A lightweight, accessible multiselect web component with typeahead search, RTL language support, rich content, and excellent keyboard navigation.

## Features

- 🔍 **Typeahead Search** - Real-time filtering as you type
- ⌨️ **Keyboard Navigation** - Full keyboard support (arrows, Enter, Esc, Tab)
- 🎨 **Rich Content** - Icons, subtitles, and multiline text support
- 📊 **Multiple Display Modes** - Pills, count, compact, or partial (pills + threshold)
- 💬 **Pill Tooltips** - Customizable tooltips on selected items with placement control
- 🎯 **Single & Multi-Select** - Switch between single and multiple selection modes
- 🔄 **Async Data Loading** - On-demand data fetching support
- 📦 **Grouped Options** - Organize options into collapsible groups
- 🎉 **Smart Positioning** - Uses Floating UI for intelligent dropdown placement
- 🌍 **i18n Support** - Customizable callbacks for pluralization and localization
- 🌐 **RTL Support** - Full right-to-left language support (Arabic, Hebrew, Persian, Urdu, etc.)
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
| `pills-display-mode` | `'pills' \| 'count' \| 'compact' \| 'partial'` | `'pills'` | How to display selected items |
| `pills-threshold` | `number` | - | Auto-switch mode when exceeded (see pills-threshold-mode) |
| `pills-threshold-mode` | `'count' \| 'partial'` | `'count'` | Mode after threshold: 'count' shows badge, 'partial' shows limited pills + more badge |
| `pills-max-visible` | `number` | `3` | Max pills shown in partial mode |
| `pills-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Position of pills container |
| `show-count-badge` | `boolean` | `false` | Show [3] badge next to toggle icon |
| `enable-pill-tooltips` | `boolean` | `false` | Enable tooltips on selected pills |
| `pill-tooltip-placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip placement relative to pill |
| `pill-tooltip-delay` | `number` | `300` | Delay in ms before showing tooltip |
| `pill-tooltip-offset` | `number` | `8` | Distance in pixels between pill and tooltip |
| `max-height` | `string` | `'20rem'` | Maximum height of dropdown |
| `empty-message` | `string` | `'No results found'` | Message when no options found |
| `loading-message` | `string` | `'Loading...'` | Message while loading async data |
| `min-search-length` | `number` | `0` | Minimum search length for async |
| `sticky-actions` | `boolean` | `true` | Keep Select All/Clear All buttons fixed at top while scrolling |
| `lock-placement` | `boolean` | `true` | Lock dropdown placement after first open to prevent flipping |
| `enable-search` | `boolean` | `true` | Enable/disable search functionality |
| `search-input-mode` | `'normal' \| 'readonly' \| 'hidden'` | `'normal'` | Search input display mode |
| `allow-add-new` | `boolean` | `false` | Allow adding new options not in the list |
| `value-member` | `string` | - | Property name for value/ID extraction from custom objects |
| `display-value-member` | `string` | - | Property name for display text extraction from custom objects |
| `search-value-member` | `string` | - | Property name for search text extraction from custom objects |
| `icon-member` | `string` | - | Property name for icon extraction from custom objects |
| `subtitle-member` | `string` | - | Property name for subtitle extraction from custom objects |
| `group-member` | `string` | - | Property name for group extraction from custom objects |
| `disabled-member` | `string` | - | Property name for disabled state extraction from custom objects |
| `name` | `string` | - | HTML form field name for form integration (creates hidden input) |
| `value-format` | `'json' \| 'csv' \| 'array'` | `'json'` | Format for form value serialization |
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

// Pill tooltip customization
multiselect.getPillTooltipCallback = (item) => {
  return `${item.label} - ${item.subtitle}`;
};

// Count pill i18n/pluralization
multiselect.getCountPillCallback = (count, moreCount) => {
  if (moreCount !== undefined) {
    return `+${moreCount} more`; // Partial mode badge
  }
  return `${count} selected`; // Count mode display
};

// Data extraction - Member properties (for simple property names)
multiselect.valueMember = 'id';
multiselect.displayValueMember = 'name';
multiselect.iconMember = 'icon';
multiselect.subtitleMember = 'description';
multiselect.groupMember = 'category';
multiselect.disabledMember = 'isDisabled';

// Data extraction - Callback functions (for complex logic)
multiselect.getValueCallback = (item) => item.id || item.value;
multiselect.getDisplayValueCallback = (item) => item.label || item.name;
multiselect.getSearchValueCallback = (item) => `${item.name} ${item.tags.join(' ')}`;
multiselect.getIconCallback = (item) => item.icon || '📄';
multiselect.getSubtitleCallback = (item) => `${item.price} - ${item.stock} in stock`;
multiselect.getGroupCallback = (item) => item.category;
multiselect.getDisabledCallback = (item) => item.stock === 0;

// Form integration
multiselect.name = 'selected_items';
multiselect.valueFormat = 'json'; // 'json' | 'csv' | 'array'
multiselect.getValueFormatCallback = (values) => values.join('|'); // Custom format

// Read-only properties
const selectedValue = multiselect.selectedValue; // string | number | array | null
const selectedItem = multiselect.selectedItem; // First selected item object

// Add new option callback
multiselect.addNewCallback = async (value) => {
  // Validate and create new option
  const newOption = await fetch('/api/options', {
    method: 'POST',
    body: JSON.stringify({ name: value })
  }).then(r => r.json());
  return newOption;
};
```

## Methods

| Method | Description |
|--------|-------------|
| `getSelected()` | Get currently selected options as array of option objects |
| `setSelected(values: (string \| number)[])` | Set selected values by ID/value |
| `getValue()` | Get selected value(s) - returns single value in single-select mode, array in multi-select mode |
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

Icons support multiple formats - emojis, SVG markup, Font Awesome, images, or any HTML:

```html
<multi-select id="frameworks"></multi-select>

<script type="module">
  const select = document.getElementById('frameworks');
  select.options = [
    {
      value: 'react',
      label: 'React',
      icon: '⚛️',  // Emoji
      subtitle: 'A JavaScript library for building user interfaces'
    },
    {
      value: 'vue',
      label: 'Vue.js',
      icon: '<svg viewBox="0 0 24 24"><path d="M2 3l10 18L22 3h-4l-6 10.5L6 3H2z"/></svg>',  // SVG
      subtitle: 'The Progressive JavaScript Framework'
    },
    {
      value: 'angular',
      label: 'Angular',
      icon: '<i class="fab fa-angular"></i>',  // Font Awesome
      subtitle: 'Platform for building mobile and desktop apps'
    },
    {
      value: 'svelte',
      label: 'Svelte',
      icon: '<img src="svelte-logo.png" alt="Svelte" />',  // Image
      subtitle: 'Cybernetically enhanced web apps'
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

### Display Modes

Perfect for different use cases and space constraints:

```html
<!-- Pills mode (default) - Show all selections as removable pills -->
<multi-select pills-display-mode="pills"></multi-select>

<!-- Count mode - Show only count badge -->
<multi-select pills-display-mode="count" show-count-badge="true"></multi-select>

<!-- Compact mode - Show first item + count -->
<multi-select pills-display-mode="compact"></multi-select>

<!-- Auto-switch from pills to count at threshold -->
<multi-select
  pills-threshold="3"
  pills-threshold-mode="count"
  show-count-badge="true">
</multi-select>

<!-- Partial mode - Show limited pills + "+X more" badge -->
<multi-select
  pills-threshold="5"
  pills-threshold-mode="partial"
  pills-max-visible="3">
</multi-select>
```

### Pills Positioning

Control where selected item badges appear relative to the input:

```html
<!-- Pills below input (default) -->
<multi-select pills-position="bottom"></multi-select>

<!-- Pills above input -->
<multi-select pills-position="top"></multi-select>

<!-- Pills to the left of input -->
<multi-select pills-position="left"></multi-select>

<!-- Pills to the right of input -->
<multi-select pills-position="right"></multi-select>
```

**Note:** In RTL mode, left/right positions are automatically mirrored - `pills-position="left"` will appear on the physical right side in RTL languages.

### Pill Tooltips

Enable tooltips on selected item pills with customizable placement and delay:

```html
<!-- Basic tooltips -->
<multi-select
  enable-pill-tooltips="true"
  pill-tooltip-placement="top">
</multi-select>

<!-- Fast tooltips with custom delay -->
<multi-select
  enable-pill-tooltips="true"
  pill-tooltip-delay="100">
</multi-select>

<script type="module">
  const select = document.querySelector('multi-select');

  // Custom tooltip content
  select.getPillTooltipCallback = (item) => {
    return `${item.label} - ${item.subtitle}`;
  };
</script>
```

### Internationalization (i18n)

Customize count pill text for proper pluralization and localization:

```html
<multi-select
  id="i18n-select"
  pills-threshold="5"
  pills-threshold-mode="partial"
  pills-max-visible="3">
</multi-select>

<script type="module">
  const select = document.getElementById('i18n-select');

  // Spanish pluralization example
  select.getCountPillCallback = (count, moreCount) => {
    if (moreCount !== undefined) {
      // Partial mode: "+X more" badge
      return moreCount === 1 ? '+1 más' : `+${moreCount} más`;
    }
    // Count mode: total count
    return count === 1 ? '1 elemento seleccionado' : `${count} elementos seleccionados`;
  };
</script>
```

### Right-to-Left (RTL) Language Support

Full RTL support for Arabic, Hebrew, Persian, Urdu, and other right-to-left languages with automatic detection and complete UI mirroring:

```html
<!-- Automatic RTL detection from dir attribute -->
<multi-select dir="rtl" search-placeholder="ابحث..."></multi-select>

<!-- RTL inherited from parent element -->
<div dir="rtl">
  <multi-select search-placeholder="חיפוש..."></multi-select>
</div>

<!-- RTL on page level -->
<html dir="rtl">
  <!-- All multi-selects will auto-detect RTL -->
</html>
```

**RTL Features:**
- ✅ **Auto-detection** - Detects `dir="rtl"` on component or any ancestor element
- ✅ **Complete UI mirroring** - Toggle icon, text alignment, pills, dropdown, badges
- ✅ **Logical positioning** - `pills-position="left"` becomes physically right in RTL
- ✅ **Pills remove buttons** - Flip to left side in RTL mode
- ✅ **Text direction** - All text content properly right-aligned
- ✅ **No configuration needed** - Just set `dir="rtl"` attribute

### Flexible Data Handling

The component supports **any data structure** through a member/callback pattern, allowing you to work with custom objects, tuple arrays, or existing API responses without transformation.

#### Member Properties (Simple Property Names)

For objects with consistent property names, use member attributes:

```html
<multi-select
  id="products"
  value-member="productId"
  display-value-member="productName"
  icon-member="icon"
  subtitle-member="description"
  group-member="category">
</multi-select>

<script type="module">
  const select = document.getElementById('products');
  select.options = [
    {
      productId: 'p1',
      productName: 'Laptop',
      icon: '💻',
      description: 'High-performance laptop',
      category: 'Electronics'
    },
    {
      productId: 'p2',
      productName: 'Mouse',
      icon: '🖱️',
      description: 'Wireless mouse',
      category: 'Electronics'
    }
  ];
</script>
```

#### Callback Functions (Complex Logic)

For complex data extraction or conditional logic, use callbacks:

```javascript
const select = document.querySelector('multi-select');

// Custom value extraction
select.getValueCallback = (item) => item.id || item.code || item.value;

// Combine multiple fields for display
select.getDisplayValueCallback = (item) => {
  return `${item.firstName} ${item.lastName}`;
};

// Include multiple fields in search
select.getSearchValueCallback = (item) => {
  return `${item.name} ${item.sku} ${item.tags.join(' ')}`;
};

// Conditional icons
select.getIconCallback = (item) => {
  return item.inStock ? '✅' : '❌';
};

// Dynamic subtitles
select.getSubtitleCallback = (item) => {
  return `$${item.price} - ${item.stock} in stock`;
};

// Disable based on conditions
select.getDisabledCallback = (item) => {
  return item.stock === 0 || item.discontinued;
};
```

#### Tuple Array Auto-Detection

The component automatically detects `[key, value]` tuple arrays:

```javascript
select.options = [
  ['js', 'JavaScript'],
  ['ts', 'TypeScript'],
  ['py', 'Python']
];
// First element becomes value, second becomes display text
```

#### Priority Order

When multiple extraction methods are defined, the component uses this priority:

1. **Callbacks** (highest priority) - `getValueCallback`, `getDisplayValueCallback`, etc.
2. **Member properties** - `valueMember`, `displayValueMember`, etc.
3. **Default properties** (lowest priority) - Falls back to `value`, `label`, `name`, etc.

#### TypeScript Support

The component is fully typed with generics:

```typescript
import type { MultiSelectElement } from '@keenmate/web-multiselect';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

const select = document.querySelector<MultiSelectElement<Product>>('multi-select');
select.options = [
  { id: 'p1', name: 'Laptop', price: 999, category: 'Electronics' }
];
```

### Form Integration

The component seamlessly integrates with standard HTML forms by automatically creating hidden inputs in the light DOM (outside Shadow DOM) so FormData can access them.

#### Basic Form Integration

```html
<form id="userForm" action="/submit" method="POST">
  <label>Select Skills:</label>
  <multi-select
    name="skills"
    value-format="json"
    multiple="true">
  </multi-select>

  <button type="submit">Submit</button>
</form>

<script type="module">
  import '@keenmate/web-multiselect';

  const form = document.getElementById('userForm');
  const select = form.querySelector('multi-select');

  select.options = [
    { value: 'js', label: 'JavaScript' },
    { value: 'ts', label: 'TypeScript' },
    { value: 'py', label: 'Python' }
  ];

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    // Access the value
    const skills = formData.get('skills');
    console.log('Selected skills:', skills);
    // Output: ["js","ts"] (JSON string)
  });
</script>
```

#### Value Formats

Choose how selected values are serialized in forms:

**JSON Format** (default):
```html
<multi-select name="items" value-format="json"></multi-select>
<!-- FormData result: items = ["item1","item2","item3"] -->
```

**CSV Format**:
```html
<multi-select name="items" value-format="csv"></multi-select>
<!-- FormData result: items = "item1,item2,item3" -->
```

**Array Format** (multiple inputs):
```html
<multi-select name="items" value-format="array"></multi-select>
<!-- FormData result:
     items[] = "item1"
     items[] = "item2"
     items[] = "item3"
-->
```

#### Custom Value Formatting

For advanced use cases, provide a custom formatting function:

```javascript
const select = document.querySelector('multi-select');

select.name = 'product_ids';
select.getValueFormatCallback = (values) => {
  // Custom format: pipe-separated with prefix
  return values.map(v => `ID:${v}`).join('|');
};

// When submitted, FormData will have:
// product_ids = "ID:123|ID:456|ID:789"
```

#### Using getValue() for JavaScript Submissions

For JavaScript-based form submissions (AJAX, fetch), use `getValue()`:

```javascript
// Single-select mode
const select = document.querySelector('multi-select[multiple="false"]');
const selectedId = select.getValue();
// Returns: "js" or null

// Multi-select mode
const multiSelect = document.querySelector('multi-select[multiple="true"]');
const selectedIds = multiSelect.getValue();
// Returns: ["js", "ts", "py"] or []

// Submit with fetch
const response = await fetch('/api/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skills: multiSelect.getValue()
  })
});
```

#### Working with Numeric Values

The component handles both string and numeric values correctly:

```javascript
select.options = [
  { value: 1, label: 'Option 1' },
  { value: 2, label: 'Option 2' },
  { value: 3, label: 'Option 3' }
];

// getValue() preserves types
const values = select.getValue();
// Returns: [1, 2, 3] (numbers, not strings)

// FormData serialization
// JSON format: [1,2,3]
// CSV format: 1,2,3
// Array format: items[]=1, items[]=2, items[]=3
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

The component uses Shadow DOM for style encapsulation, but exposes CSS custom properties (CSS variables) that you can override to customize the appearance.

### CSS Variables (No Build System Required)

You can customize the component using CSS variables even with just a `<script>` tag:

```html
<style>
  /* Override tooltip appearance */
  multi-select {
    --ml-tooltip-bg: #1f2937;
    --ml-tooltip-color: #f9fafb;
    --ml-tooltip-padding: 0.625rem 0.875rem;
    --ml-tooltip-border-radius: 0.5rem;
    --ml-tooltip-font-size: 0.8125rem;
    --ml-tooltip-max-width: 24rem;
    --ml-tooltip-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    --ml-tooltip-z-index: 10000;
  }

  /* Override "+X more" badge colors */
  multi-select {
    --ml-more-badge-bg: #dbeafe;
    --ml-more-badge-hover-bg: #bfdbfe;
    --ml-more-badge-active-bg: #93c5fd;
  }

  /* Size the component */
  multi-select {
    width: 100%;
    max-width: 400px;
  }
</style>
```

### Available CSS Variables

The component exposes 200+ SCSS variables as CSS custom properties with fallbacks. Below are the **50+ most commonly customized variables** organized by category.

For the complete list of all available CSS variables, see the SCSS source files:
- [_variables.scss](./src/scss/_variables.scss) - Foundation variables (colors, spacing, typography)
- [_input-dropdown.scss](./src/scss/_input-dropdown.scss) - Input and dropdown styles
- [_pills-display.scss](./src/scss/_pills-display.scss) - Pills and count display
- [_options.scss](./src/scss/_options.scss) - Options and groups
- [_tooltip.scss](./src/scss/_tooltip.scss) - Tooltip styles
- [_rtl.scss](./src/scss/_rtl.scss) - RTL overrides

#### Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-accent-color` | `#3b82f6` | Primary accent color (blue) |
| `--ml-accent-color-hover` | `#2563eb` | Accent color on hover |
| `--ml-accent-color-active` | `#1d4ed8` | Accent color when active |
| `--ml-text-primary` | `#111827` | Primary text color |
| `--ml-text-secondary` | `#6b7280` | Secondary/muted text color |
| `--ml-border-color` | `#e5e7eb` | Default border color |

#### Input Component

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-input-bg` | `#ffffff` | Input background |
| `--ml-input-text` | `#111827` | Input text color |
| `--ml-input-border` | `#d1d5db` | Input border color |
| `--ml-input-focus-border-color` | `#3b82f6` | Border color when focused |
| `--ml-input-padding-v` | `0.5rem` | Input vertical padding |
| `--ml-input-padding-h` | `0.75rem` | Input horizontal padding |
| `--ml-input-font-size` | `0.875rem` | Input font size |
| `--ml-input-border-radius` | `0.375rem` | Input border radius |
| `--ml-input-placeholder-color` | `#6b7280` | Placeholder text color |

#### Dropdown & Options

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-dropdown-bg` | `#ffffff` | Dropdown background |
| `--ml-dropdown-border` | `#e5e7eb` | Dropdown border color |
| `--ml-dropdown-shadow` | (box shadow) | Dropdown shadow |
| `--ml-dropdown-max-height` | `20rem` | Max height of dropdown |
| `--ml-option-padding-v` | `0.5rem` | Option vertical padding |
| `--ml-option-padding-h` | `0.75rem` | Option horizontal padding |
| `--ml-option-hover-bg` | `#f9fafb` | Option background on hover |
| `--ml-option-bg-selected` | (rgba accent) | Selected option background |

#### Pills & Badges

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-pill-bg` | `#eff6ff` | Pill background color |
| `--ml-pill-text-color` | `#3b82f6` | Pill text color |
| `--ml-pill-gap` | `0.5rem` | Gap between pills |
| `--ml-pill-height` | `1.5rem` | Height of pills |
| `--ml-pill-font-size` | `0.75rem` | Pill font size |
| `--ml-pill-border-radius` | `0.375rem` | Pill border radius |
| `--ml-pill-remove-bg` | `#3b82f6` | Remove button background |
| `--ml-pill-remove-color` | `#ffffff` | Remove button color |
| `--ml-more-badge-bg` | (pill background) | "+X more" badge background |
| `--ml-more-badge-hover-bg` | `#ffffff` | "+X more" badge hover |
| `--ml-more-badge-active-bg` | `#e0f2fe` | "+X more" badge active |

#### Count Badge (in input)

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-count-badge-bg` | `#3b82f6` | Count badge background |
| `--ml-count-badge-color` | `#ffffff` | Count badge text color |
| `--ml-count-badge-font-size` | `0.75rem` | Count badge font size |
| `--ml-count-badge-bg-hover` | `#2563eb` | Hover background color |

#### Tooltips

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-tooltip-bg` | `#333` | Tooltip background color |
| `--ml-tooltip-color` | `#fff` | Tooltip text color |
| `--ml-tooltip-padding` | `0.5rem 0.75rem` | Tooltip padding |
| `--ml-tooltip-border-radius` | `0.375rem` | Tooltip border radius |
| `--ml-tooltip-font-size` | `0.875rem` | Tooltip font size |
| `--ml-tooltip-max-width` | `20rem` | Tooltip maximum width |
| `--ml-tooltip-shadow` | (box shadow) | Tooltip box shadow |
| `--ml-tooltip-z-index` | `10000` | Tooltip z-index |

#### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-font-size-xs` | `0.75rem` | Extra small font size |
| `--ml-font-size-sm` | `0.875rem` | Small font size |
| `--ml-font-size-base` | `1rem` | Base font size |
| `--ml-font-weight-medium` | `500` | Medium font weight |
| `--ml-font-weight-semibold` | `600` | Semibold font weight |

#### Effects & Transitions

| Variable | Default | Description |
|----------|---------|-------------|
| `--ml-transition-fast` | `150ms` | Fast transition duration |
| `--ml-transition-normal` | `200ms` | Normal transition duration |
| `--ml-easing-snappy` | (cubic-bezier) | Snappy easing function |
| `--ml-shadow-md` | (box shadow) | Medium shadow |
| `--ml-shadow-xl` | (box shadow) | Extra large shadow |
| `--ml-disabled-opacity` | `0.5` | Opacity for disabled state |

### Advanced: Custom SCSS

For users with a build system, you can import and customize the SCSS:

```scss
// Import and override SCSS variables
@use '@keenmate/web-multiselect/scss' with (
  $ml-primary: #10b981,
  $ml-border-radius: 0.5rem,
  $ml-font-size: 1rem
);
```

## Browser Support

- Modern browsers with Web Components support
- Chrome/Edge 67+
- Firefox 63+
- Safari 10.1+

## SSR Compatibility

⚠️ **Important for SSR frameworks (SvelteKit, Next.js, Nuxt, etc.):**

This is a **client-side only** web component that uses Shadow DOM and browser APIs. While the module is safe to import during Server-Side Rendering (it won't crash), the component will only work in the browser.

**The component automatically handles SSR compatibility** - no special configuration needed. However, be aware that:
- The component will not render during SSR
- It will only become interactive after hydration in the browser
- No special client-side import wrappers are required

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
