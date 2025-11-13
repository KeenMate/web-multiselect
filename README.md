# MultiSelect Web Component

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-multiselect.svg)](https://www.npmjs.com/package/@keenmate/web-multiselect)

A lightweight, accessible multiselect web component with typeahead search, RTL language support, rich content, and excellent keyboard navigation.

## Features

- 📝 **Declarative HTML** - Use standard `<option>` and `<optgroup>` elements - no JavaScript required for simple cases!
- ⚡ **Virtual Scrolling** - Handle 15,000+ options instantly (25× faster opening, 99.8% memory reduction)
- 🔍 **Flexible Search Modes** - Filter (hide non-matches) or navigate (jump to matches, keep all visible)
- ⌨️ **Keyboard Navigation** - Full keyboard support (arrows, Enter, Esc, Tab)
- 🎨 **Rich Content** - Icons, subtitles, and multiline text support
- 📊 **Multiple Display Modes** - Pills, count, compact, partial, or none (minimal UI)
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

### Declarative (No JavaScript!)

Perfect for simple forms - just use standard HTML `<option>` elements:

```html
<!-- Simple choice -->
<web-multiselect multiple="false">
  <option value="yes">Yes</option>
  <option value="no">No</option>
  <option value="maybe" selected>Maybe</option>
</web-multiselect>

<!-- With icons -->
<web-multiselect>
  <option value="apple" data-icon="🍎">Apple</option>
  <option value="banana" data-icon="🍌" selected>Banana</option>
  <option value="orange" data-icon="🍊">Orange</option>
</web-multiselect>

<!-- With groups -->
<web-multiselect>
  <optgroup label="Frontend">
    <option value="js" data-icon="🟨">JavaScript</option>
    <option value="ts" data-icon="🔷">TypeScript</option>
  </optgroup>
  <optgroup label="Backend">
    <option value="python" data-icon="🐍" selected>Python</option>
    <option value="java" data-icon="☕">Java</option>
  </optgroup>
</web-multiselect>
```

### Programmatic (With JavaScript)

For dynamic data and advanced features:

```html
<!-- Multi-select -->
<web-multiselect
  id="my-select"
  search-placeholder="Search options..."
  initial-values='["js","ts"]'>
</web-multiselect>
```

```typescript
// Import the component (includes styles)
import '@keenmate/web-multiselect';

// Or import styles separately if needed
import '@keenmate/web-multiselect/style.css';

const multiselect = document.querySelector('web-multiselect');

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
| `pills-display-mode` | `'pills' \| 'count' \| 'compact' \| 'partial' \| 'none'` | `'pills'` | How to display selected items. `compact`: first item + count. `none`: no display |
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
| `keep-options-on-search` | `boolean` | `true` | Keep initial options visible when searchCallback is active (hybrid search) |
| `sticky-actions` | `boolean` | `true` | Keep Select All/Clear All buttons fixed at top while scrolling |
| `lock-placement` | `boolean` | `true` | Lock dropdown placement after first open to prevent flipping |
| `enable-search` | `boolean` | `true` | Enable/disable search functionality |
| `search-input-mode` | `'normal' \| 'readonly' \| 'hidden'` | `'normal'` | Search input display mode |
| `search-mode` | `'filter' \| 'navigate'` | `'filter'` | Search behavior: 'filter' hides non-matches, 'navigate' jumps to matches |
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
| `enable-virtual-scroll` | `boolean` | `false` | Enable virtual scrolling for large datasets |
| `virtual-scroll-threshold` | `number` | `100` | Minimum items before virtual scroll activates |
| `option-height` | `number` | `50` | Fixed height for each option in pixels (required for virtual scroll) |
| `virtual-scroll-buffer` | `number` | `10` | Buffer size - extra items rendered above/below viewport |

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

// Pre-process search terms before calling searchCallback
multiselect.beforeSearchCallback = (searchTerm) => {
  // Remove accents: "café" → "cafe"
  const normalized = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Block search if too short (return null to prevent search)
  if (normalized.length < 2) return null;

  return normalized; // Return transformed term
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

// Pill display customization (show different text in pills vs dropdown)
multiselect.getPillDisplayCallback = (item) => {
  // Show shorter text in pills (e.g., just name instead of "name (email)")
  return item.name; // Dropdown might show "John Doe (john@example.com)"
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
- **Ctrl+↑ Ctrl+↓** - Jump between matched items (navigate mode only)
- **Enter** - Select focused option
- **Escape** - Close dropdown
- **Tab** - Close dropdown and move to next field
- **Type** - Filter options by search term

## Advanced Features

### Rich Content with Icons

Icons support multiple formats - emojis, SVG markup, Font Awesome, images, or any HTML:

```html
<web-multiselect id="frameworks"></web-multiselect>

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
<web-multiselect
  id="async-select"
  min-search-length="2"
  loading-message="Searching..."
  empty-message="No products found">
</web-multiselect>

<script type="module">
  const select = document.getElementById('async-select');

  select.onSearch = async (searchTerm) => {
    const response = await fetch(`/api/products?q=${searchTerm}`);
    const data = await response.json();
    return data.products;
  };
</script>
```

### Hybrid Static + Dynamic Search

Show popular items initially, then switch to full database search when the user types. Perfect for showing "Top 10" items while supporting comprehensive search:

```html
<web-multiselect
  id="hybrid-select"
  min-search-length="3"
  keep-options-on-search="true">
</web-multiselect>

<script type="module">
  const select = document.getElementById('hybrid-select');

  // Set initial popular items (shown when dropdown opens)
  select.options = [
    { id: 1, name: 'React' },
    { id: 2, name: 'Vue' },
    { id: 3, name: 'Angular' },
    { id: 4, name: 'Svelte' },
    { id: 5, name: 'Solid' }
  ];

  // Pre-process search terms (remove accents, validate, etc.)
  select.beforeSearchCallback = (searchTerm) => {
    // Remove accents: "café" → "cafe"
    const normalized = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Block search if too short (return null to prevent search)
    if (normalized.length < 2) return null;

    return normalized;
  };

  // Search full database when user types 3+ characters
  select.onSearch = async (searchTerm) => {
    const response = await fetch(`/api/frameworks/search?q=${searchTerm}`);
    return await response.json();
  };
</script>
```

**How it works:**
1. **Dropdown opens** → Shows 5 popular frameworks
2. **User types "rea"** → Calls API, shows all matching results from database
3. **User clears search** → Shows 5 popular frameworks again
4. **User types "café"** → `beforeSearchCallback` converts to "cafe", then searches

**Key options:**
- `keep-options-on-search="true"` (default) - Keep initial options visible when search is empty/short
- `beforeSearchCallback` - Transform search text or block search by returning `null`
- `min-search-length` - Minimum characters before triggering search (shows initial options below this)

### Virtual Scrolling for Large Datasets

Handle 10,000+ options with smooth 60fps performance by rendering only visible items:

```html
<web-multiselect
  id="large-dataset"
  enable-virtual-scroll="true"
  virtual-scroll-threshold="100"
  option-height="50"
  virtual-scroll-buffer="10"
  search-mode="filter"
  max-height="400px">
</web-multiselect>

<script type="module">
  import '@keenmate/web-multiselect';

  const select = document.getElementById('large-dataset');

  // Generate 15,000 options
  const largeDataset = Array.from({ length: 15000 }, (_, i) => ({
    value: i,
    label: `Item ${i.toString().padStart(5, '0')}`
  }));

  select.options = largeDataset;
</script>
```

**Performance Comparison (15,000 items):**

| Metric | Without Virtual Scroll | With Virtual Scroll | Improvement |
|--------|------------------------|---------------------|-------------|
| Initial render | 750ms | 30ms | **25× faster** |
| Search keystroke | 200-500ms | 15ms | **13-33× faster** |
| DOM nodes | 15,000 | ~30 | **99.8% reduction** |
| Memory usage | ~7.5 MB | ~15 KB | **500× less** |

**Configuration:**

- `enable-virtual-scroll="true"` - Enable virtual scrolling (default: `false`)
- `virtual-scroll-threshold="100"` - Auto-activate when this many items are present (default: `100`)
- `option-height="50"` - Fixed height per option in pixels (default: `50px`)
- `virtual-scroll-buffer="10"` - Extra items rendered above/below viewport for smooth scrolling (default: `10`)

**How it works:**
- Only renders ~30 visible items instead of all 15,000 DOM elements
- Uses absolute positioning with calculated offsets
- Maintains 10-item buffer zones above/below viewport for smooth scrolling
- Automatically calculates visible range based on scroll position
- Works seamlessly with search filtering and selection

**Requirements:**
- All options must have the same fixed height (enforced via CSS)
- Not compatible with grouped options (automatically falls back to normal rendering)
- Works with both filter and navigate search modes

**Example with search:**
```html
<!-- Virtual scroll + filter search for optimal large dataset performance -->
<web-multiselect
  id="products"
  enable-virtual-scroll="true"
  search-mode="filter"
  value-member="id"
  display-value-member="name"
  max-height="400px">
</web-multiselect>

<script type="module">
  const select = document.getElementById('products');

  // Load from API
  const response = await fetch('/api/products');
  const products = await response.json();

  select.options = products; // Could be 10,000+ items
</script>
```

**Live Demo:**
See [examples-performance.html](examples-performance.html) for a working demo with 15,000 randomly generated options.

### Virtual Scrolling

Handle massive datasets (10,000+ items) with instant performance using virtual scrolling. Only visible items (~30) are rendered in the DOM, dramatically reducing memory usage and improving responsiveness.

**Enable virtual scrolling:**
```html
<web-multiselect
  enable-virtual-scroll="true"
  virtual-scroll-threshold="100"
  option-height="50"
  virtual-scroll-buffer="10">
</web-multiselect>
```

**Performance improvements with 15,000 items:**
- **Dropdown opening**: 750ms → 30ms (25× faster)
- **Search performance**: 200-500ms → 15ms per keystroke (13-33× faster)
- **Memory usage**: 7.5 MB → 15 KB (99.8% reduction)
- **DOM nodes**: 15,000 → ~30 visible items

**Configuration:**
- `enable-virtual-scroll="true"` - Opt-in to virtual scrolling
- `virtual-scroll-threshold="100"` - Auto-activates at 100+ items (default)
- `option-height="50"` - Fixed height per option in pixels (default: 50px)
- `virtual-scroll-buffer="10"` - Extra items rendered above/below viewport (default: 10)

**Features:**
- Full keyboard navigation (arrows, Page Up/Down, Home/End)
- Smooth mouse wheel scrolling
- Drag scrollbar support
- Works with search in both filter and navigate modes
- Automatic activation based on threshold

**Limitations:**
- Groups (`<optgroup>`) are disabled in virtual scroll mode (automatically falls back to standard rendering)
- All options must have consistent height (enforced via CSS)

**Live Demo:**
See [examples-performance.html](examples-performance.html) for a working demo testing virtual scroll with 15,000 randomly generated options.

### Search Modes: Filter vs Navigate

Choose between two search behaviors:

**Filter Mode** (default) - Hide non-matching options as you type:
```html
<web-multiselect search-mode="filter" id="countries"></web-multiselect>
```

**Navigate Mode** - Keep all options visible, jump to matches:
```html
<web-multiselect search-mode="navigate" id="states"></web-multiselect>

<script>
  const select = document.getElementById('states');
  select.options = [...50 US states...];

  // User types "cal" → Jumps to "California", shows all states
  // Matching options are highlighted with left border
</script>
```

**When to use each mode:**
- **Filter Mode**: Large datasets where narrowing down is essential (product catalogs, user lists, search results)
- **Navigate Mode**: Quick selection from familiar lists (countries, states, keyboard shortcuts, known options)

**Key differences:**
- Filter mode hides non-matches, navigate mode highlights matches with a left border
- Navigate mode keeps previous focus if no match is found (type "xyz" → stays on current option)
- Navigate mode only works with local data (automatically falls back to filter mode when using `searchCallback`)
- Both modes respect `beforeSearchCallback` for search term preprocessing (accent removal, validation)
- **Ctrl+↑/↓** jumps between matches only (navigate mode) - regular arrows navigate through all items

### Display Modes

Perfect for different use cases and space constraints:

```html
<!-- Pills mode (default) - Show all selections as removable pills -->
<web-multiselect pills-display-mode="pills"></web-multiselect>

<!-- Count mode - Show "X selected" text with clear button -->
<web-multiselect pills-display-mode="count" show-count-badge="true"></web-multiselect>

<!-- Compact mode - Show first item + count in a single removable pill -->
<web-multiselect pills-display-mode="compact"></web-multiselect>
<!-- Example output: [JavaScript (+2 more) | x] -->

<!-- None mode - No display in pills area (minimal UI) -->
<web-multiselect pills-display-mode="none" show-count-badge="true"></web-multiselect>
<!-- Only shows [X] badge next to toggle icon -->

<!-- Auto-switch from pills to count at threshold -->
<web-multiselect
  pills-threshold="3"
  pills-threshold-mode="count"
  show-count-badge="true">
</web-multiselect>

<!-- Partial mode - Show limited pills + "+X more" badge -->
<web-multiselect
  pills-threshold="5"
  pills-threshold-mode="partial"
  pills-max-visible="3">
</web-multiselect>
```

**Display Mode Behavior:**
- **`pills`**: Individual removable pills for each selected item. Calls `getPillDisplayCallback` for each item.
- **`count`**: Shows "X selected" text with clear button. Calls `getCountPillCallback(count)`.
- **`compact`**: Shows first item + count in single pill (e.g., "JavaScript (+2 more)"). Calls `getPillDisplayCallback(firstItem)` and `getCountPillCallback(count, remainingCount)`.
- **`partial`**: Shows first N pills + "+X more" badge. Calls `getPillDisplayCallback` for visible items and `getCountPillCallback(count, remainingCount)` for badge.
- **`none`**: No display in pills area. No callbacks invoked. Use with `show-count-badge="true"` for minimal UI.

**Pill Styling:**
- **Data pills** (selected items like "JavaScript", "Python"): Blue styling by default
- **Indicator pills** ("+3 more", "5 selected", compact mode display): Gray styling to distinguish from data
- Both can be customized via CSS variables (see `--ml-pill-*` and `--ml-pill-indicator-*`)

**Count Badge (`show-count-badge="true"`)**: Independent feature showing `[X]` next to toggle icon. Works with all display modes. Not affected by callbacks.

### Pills Positioning

Control where selected item badges appear relative to the input:

```html
<!-- Pills below input (default) -->
<web-multiselect pills-position="bottom"></web-multiselect>

<!-- Pills above input -->
<web-multiselect pills-position="top"></web-multiselect>

<!-- Pills to the left of input -->
<web-multiselect pills-position="left"></web-multiselect>

<!-- Pills to the right of input -->
<web-multiselect pills-position="right"></web-multiselect>
```

**Note:** In RTL mode, left/right positions are automatically mirrored - `pills-position="left"` will appear on the physical right side in RTL languages.

### Pill Tooltips

Enable tooltips on selected item pills with customizable placement and delay:

```html
<!-- Basic tooltips -->
<web-multiselect
  enable-pill-tooltips="true"
  pill-tooltip-placement="top">
</web-multiselect>

<!-- Fast tooltips with custom delay -->
<web-multiselect
  enable-pill-tooltips="true"
  pill-tooltip-delay="100">
</web-multiselect>

<script type="module">
  const select = document.querySelector('web-multiselect');

  // Custom tooltip content
  select.getPillTooltipCallback = (item) => {
    return `${item.label} - ${item.subtitle}`;
  };
</script>
```

### Internationalization (i18n)

Customize count pill text for proper pluralization and localization:

```html
<web-multiselect
  id="i18n-select"
  pills-threshold="5"
  pills-threshold-mode="partial"
  pills-max-visible="3">
</web-multiselect>

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
<web-multiselect dir="rtl" search-placeholder="ابحث..."></web-multiselect>

<!-- RTL inherited from parent element -->
<div dir="rtl">
  <web-multiselect search-placeholder="חיפוש..."></web-multiselect>
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
<web-multiselect
  id="products"
  value-member="productId"
  display-value-member="productName"
  icon-member="icon"
  subtitle-member="description"
  group-member="category">
</web-multiselect>

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
const select = document.querySelector('web-multiselect');

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

// Customize pill display (show different text in pills vs dropdown)
select.getPillDisplayCallback = (item) => {
  // Pills show just the name for space efficiency
  return item.name;
  // While dropdown can show full details: "Laptop - $999 - Electronics"
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

const select = document.querySelector<MultiSelectElement<Product>>('web-multiselect');
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
  <web-multiselect
    name="skills"
    value-format="json"
    multiple="true">
  </web-multiselect>

  <button type="submit">Submit</button>
</form>

<script type="module">
  import '@keenmate/web-multiselect';

  const form = document.getElementById('userForm');
  const select = form.querySelector('web-multiselect');

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
<web-multiselect name="items" value-format="json"></web-multiselect>
<!-- FormData result: items = ["item1","item2","item3"] -->
```

**CSV Format**:
```html
<web-multiselect name="items" value-format="csv"></web-multiselect>
<!-- FormData result: items = "item1,item2,item3" -->
```

**Array Format** (multiple inputs):
```html
<web-multiselect name="items" value-format="array"></web-multiselect>
<!-- FormData result:
     items[] = "item1"
     items[] = "item2"
     items[] = "item3"
-->
```

#### Custom Value Formatting

For advanced use cases, provide a custom formatting function:

```javascript
const select = document.querySelector('web-multiselect');

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

The component exposes **150+ CSS custom properties** defined at the `:host` level, making them inspectable and overridable. Below are the **50+ most commonly customized variables** organized by category.

#### Inspecting Variables in DevTools

All CSS custom properties are now defined at the `:host` level in the compiled CSS, making them visible in browser DevTools:

1. Open DevTools (F12) and select the `<web-multiselect>` element
2. In the **Styles** panel, look for the `:host` selector
3. You'll see all 150+ variables with their default values
4. Edit values live to preview changes instantly

**CSS variables work with Shadow DOM** because they inherit through the shadow boundary. This means you can customize the component from outside:

```html
<style>
  /* These variables will penetrate into the Shadow DOM */
  multi-select {
    --ml-accent-color: #10b981;  /* Changes primary color */
    --ml-input-border-radius: 0.5rem;  /* Rounds input corners */
  }
</style>
```

For the complete list of all available CSS variables, see:
- [_css-variables.scss](./src/scss/_css-variables.scss) - All 150+ CSS custom properties at `:host` level
- [_variables.scss](./src/scss/_variables.scss) - Foundation SCSS variables (colors, spacing, typography)

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
| `--ml-pill-bg` | `#eff6ff` | Pill background color (data pills) |
| `--ml-pill-text-color` | `#3b82f6` | Pill text color (data pills) |
| `--ml-pill-gap` | `0.5rem` | Gap between pills |
| `--ml-pill-height` | `1.5rem` | Height of pills |
| `--ml-pill-font-size` | `0.75rem` | Pill font size |
| `--ml-pill-border-radius` | `0.375rem` | Pill border radius |
| `--ml-pill-remove-bg` | `#3b82f6` | Remove button background (data pills) |
| `--ml-pill-remove-color` | `#ffffff` | Remove button color (data pills) |
| `--ml-pill-indicator-text-bg` | `#d1d5db` | Indicator pill text background (gray) |
| `--ml-pill-indicator-text-color` | `#6b7280` | Indicator pill text color (gray) |
| `--ml-pill-indicator-remove-bg` | `#6b7280` | Indicator pill remove button bg (gray) |
| `--ml-pill-indicator-remove-color` | `#ffffff` | Indicator pill remove button color |
| `--ml-pill-indicator-border` | `1px solid #e5e7eb` | Indicator pill border |

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
