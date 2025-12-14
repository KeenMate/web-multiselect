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
- 📊 **Multiple Display Modes** - Badges, count, compact, partial, or none (minimal UI)
- 💬 **Badge Tooltips** - Customizable tooltips on selected items with placement control
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
| `show-checkboxes` | `boolean` | `true` | Show checkboxes next to options |
| `close-on-select` | `boolean` | `false` | Close dropdown after selecting |
| `dropdown-min-width` | `string` | - | Min width for dropdown (e.g., '20rem') |
| `badges-display-mode` | `'pills' \| 'count' \| 'compact' \| 'partial' \| 'none'` | `'pills'` | How to display selected items. `compact`: first item + count. `none`: no display |
| `badges-threshold` | `number` | - | Auto-switch mode when exceeded (see badges-threshold-mode) |
| `badges-threshold-mode` | `'count' \| 'partial'` | `'count'` | Mode after threshold: 'count' shows badge, 'partial' shows limited badges + more badge |
| `badges-max-visible` | `number` | `3` | Max badges shown in partial mode |
| `badges-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Position of badges container |
| `show-counter` | `boolean` | `false` | Show [3] badge next to toggle icon |
| `enable-badge-tooltips` | `boolean` | `false` | Enable tooltips on selected badges |
| `badge-tooltip-placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip placement relative to badge |
| `badge-tooltip-delay` | `number` | `100` | Delay in ms before showing tooltip |
| `badge-tooltip-offset` | `number` | `8` | Distance in pixels between badge and tooltip |
| `max-height` | `string` | `'20rem'` | Maximum height of dropdown |
| `empty-message` | `string` | `'No results found'` | Message when no options found |
| `loading-message` | `string` | `'Loading...'` | Message while loading async data |
| `min-search-length` | `number` | `0` | Minimum search length for async |
| `keep-options-on-search` | `boolean` | `true` | Keep initial options visible when searchCallback is active (hybrid search) |
| `should-keep-search-on-close` | `boolean` | `true` | Preserve search text and filtered results when dropdown closes |
| `sticky-actions` | `boolean` | `true` | Keep action buttons fixed at top while scrolling |
| `actions-layout` | `'nowrap' \| 'wrap'` | `'nowrap'` | Layout mode for action buttons: 'nowrap' (single row) or 'wrap' (multi-row) |
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

// Badge display customization (show different text in badges vs dropdown)
multiselect.getBadgeDisplayCallback = (item) => {
  // Show shorter text in badges (e.g., just name instead of "name (email)")
  return item.name; // Dropdown might show "John Doe (john@example.com)"
};

// Badge tooltip customization
multiselect.getBadgeTooltipCallback = (item) => {
  return `${item.label} - ${item.subtitle}`;
};

// Action buttons (Select All, Clear All, custom actions)
multiselect.actionButtons = [
  {
    action: 'select-all',
    text: 'Select All',
    tooltip: 'Select all items',
    cssClass: 'my-custom-class',
    isVisibleCallback: (multiselect) => multiselect.getSelected().length < 5  // Hide if 5+ selected
  },
  {
    action: 'clear-all',
    text: 'Clear All',
    tooltip: 'Clear selection',
    isVisible: true,  // Static visibility
    isDisabled: false  // Static disabled state
  },
  {
    action: 'custom',
    text: 'Invert',
    tooltip: 'Invert selection',
    onClick: (multiselect) => {
      // Custom action - invert selection
      const allValues = multiselect.options.map(opt => opt.value);
      const selectedValues = multiselect.getValue();
      const inverted = allValues.filter(v => !selectedValues.includes(v));
      multiselect.setSelected(inverted);
    },
    // Dynamic callbacks (take priority over static properties)
    isDisabledCallback: (multiselect) => multiselect.getSelected().length === 0,
    getTextCallback: (multiselect) => multiselect.getSelected().length > 0 ? 'Invert' : 'Select Items First',
    getClassCallback: (multiselect) => multiselect.getSelected().length > 0 ? 'active' : 'inactive'
  }
];

// Counter i18n/pluralization
multiselect.getCounterCallback = (count, moreCount) => {
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

// Custom rendering - Full HTML control
multiselect.renderGroupLabelContentCallback = (groupName) => {
  // Customize group header display (HTML string or HTMLElement)
  return `<strong>📦 ${groupName.toUpperCase()}</strong>`;
};

multiselect.renderOptionContentCallback = (item, context) => {
  // Customize option content (HTML string or HTMLElement)
  return `<strong>${item.name}</strong> <span class="badge">${item.status}</span>`;
};

multiselect.renderBadgeContentCallback = (item, context) => {
  // Customize badge content (HTML string or HTMLElement)
  return context.isInPopover
    ? `${item.icon} ${item.name} - ${item.description}`
    : `${item.icon} ${item.name}`;
};

multiselect.renderSelectedContentCallback = (item) => {
  // Customize selected item text in single-select mode (plain text only)
  return item.firstName; // Show just first name when closed
};

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
<!-- Badges mode (default) - Show all selections as removable badges -->
<web-multiselect badges-display-mode="pills"></web-multiselect>

<!-- Count mode - Show "X selected" text with clear button -->
<web-multiselect badges-display-mode="count" show-counter="true"></web-multiselect>

<!-- Compact mode - Show first item + count in a single removable badge -->
<web-multiselect badges-display-mode="compact"></web-multiselect>
<!-- Example output: [JavaScript (+2 more) | x] -->

<!-- None mode - No display in badges area (minimal UI) -->
<web-multiselect badges-display-mode="none" show-counter="true"></web-multiselect>
<!-- Only shows [X] badge next to toggle icon -->

<!-- Auto-switch from badges to count at threshold -->
<web-multiselect
  badges-threshold="3"
  badges-threshold-mode="count"
  show-counter="true">
</web-multiselect>

<!-- Partial mode - Show limited badges + "+X more" badge -->
<web-multiselect
  badges-threshold="5"
  badges-threshold-mode="partial"
  badges-max-visible="3">
</web-multiselect>
```

**Display Mode Behavior:**
- **`pills`**: Individual removable badges for each selected item. Calls `getBadgeDisplayCallback` for each item.
- **`count`**: Shows "X selected" text with clear button. Calls `getCounterCallback(count)`.
- **`compact`**: Shows first item + count in single badge (e.g., "JavaScript (+2 more)"). Calls `getBadgeDisplayCallback(firstItem)` and `getCounterCallback(count, remainingCount)`.
- **`partial`**: Shows first N badges + "+X more" badge. Calls `getBadgeDisplayCallback` for visible items and `getCounterCallback(count, remainingCount)` for badge.
- **`none`**: No display in badges area. No callbacks invoked. Use with `show-counter="true"` for minimal UI.

**Badge Styling:**
- **Data badges** (selected items like "JavaScript", "Python"): Blue styling by default
- **BadgeCounters** ("+3 more", "5 selected", compact mode display): Gray styling to distinguish from data
- Both can be customized via CSS variables (see `--ms-badge-*` and `--ms-badge-counter-*`)

**Counter (`show-counter="true"`)**: Independent feature showing `[X]` next to toggle icon. Works with all display modes. Not affected by callbacks.

### Badge Positioning

Control where selected item badges appear relative to the input:

```html
<!-- Badges below input (default) -->
<web-multiselect badges-position="bottom"></web-multiselect>

<!-- Badges above input -->
<web-multiselect badges-position="top"></web-multiselect>

<!-- Badges to the left of input -->
<web-multiselect badges-position="left"></web-multiselect>

<!-- Badges to the right of input -->
<web-multiselect badges-position="right"></web-multiselect>
```

**Note:** In RTL mode, left/right positions are automatically mirrored - `badges-position="left"` will appear on the physical right side in RTL languages.

### Badge Tooltips

Enable tooltips on selected item badges with customizable placement and delay:

```html
<!-- Basic tooltips -->
<web-multiselect
  enable-badge-tooltips="true"
  badge-tooltip-placement="top">
</web-multiselect>

<!-- Fast tooltips with custom delay -->
<web-multiselect
  enable-badge-tooltips="true"
  badge-tooltip-delay="100">
</web-multiselect>

<script type="module">
  const select = document.querySelector('web-multiselect');

  // Custom tooltip content
  select.getBadgeTooltipCallback = (item) => {
    return `${item.label} - ${item.subtitle}`;
  };
</script>
```

### Internationalization (i18n)

Customize counter text for proper pluralization and localization:

```html
<web-multiselect
  id="i18n-select"
  badges-threshold="5"
  badges-threshold-mode="partial"
  badges-max-visible="3">
</web-multiselect>

<script type="module">
  const select = document.getElementById('i18n-select');

  // Spanish pluralization example
  select.getCounterCallback = (count, moreCount) => {
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
- ✅ **Complete UI mirroring** - Toggle icon, text alignment, badges, dropdown, badges
- ✅ **Logical positioning** - `badges-position="left"` becomes physically right in RTL
- ✅ **Badge remove buttons** - Flip to left side in RTL mode
- ✅ **Text direction** - All text content properly right-aligned
- ✅ **No configuration needed** - Just set `dir="rtl"` attribute

### Custom Rendering

The component provides powerful custom rendering callbacks that allow you to fully customize how options, badges, and selected items are displayed while maintaining the component's structure and functionality.

#### Overview

Three rendering callbacks are available:
- **`renderOptionContentCallback`** - Customize dropdown option content
- **`renderBadgeContentCallback`** - Customize badge (selected item) content
- **`renderSelectedContentCallback`** - Customize selected value text (single-select mode)

All callbacks can return either **HTML strings** or **HTMLElement** objects (except `renderSelectedContentCallback` which returns plain text).

#### Custom Option Rendering

Customize how options appear in the dropdown:

```html
<web-multiselect id="custom-options"></web-multiselect>

<script type="module">
  import '@keenmate/web-multiselect';

  const select = document.getElementById('custom-options');

  select.options = [
    { id: 1, name: 'React', stars: 220000, trending: true },
    { id: 2, name: 'Vue', stars: 207000, trending: false },
    { id: 3, name: 'Angular', stars: 94000, trending: false },
    { id: 4, name: 'Svelte', stars: 76000, trending: true }
  ];

  // Custom renderer with full HTML control
  select.renderOptionContentCallback = (item, context) => {
    // Context provides: { index, isSelected, isFocused, isMatched, isDisabled }

    return `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <strong>${item.name}</strong>
        <span style="color: #666; font-size: 0.875rem;">⭐ ${(item.stars / 1000).toFixed(0)}k</span>
        ${item.trending ? '<span style="background: #10b981; color: white; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem;">🔥 Trending</span>' : ''}
      </div>
    `;
  };
</script>
```

**Context object** (`OptionContentRenderContext`):
- `index: number` - Index of the option in the filtered list
- `isSelected: boolean` - Whether the option is currently selected
- `isFocused: boolean` - Whether the option is currently focused (keyboard navigation)
- `isMatched: boolean` - Whether the option matches the current search term (navigate mode only)
- `isDisabled: boolean` - Whether the option is disabled

#### Custom Badge Rendering

Customize how selected items appear as badges:

```javascript
const select = document.querySelector('web-multiselect');

select.options = [
  { id: 1, name: 'John Doe', role: 'Admin', avatar: '👨‍💼' },
  { id: 2, name: 'Jane Smith', role: 'Developer', avatar: '👩‍💻' },
  { id: 3, name: 'Bob Johnson', role: 'Designer', avatar: '🎨' }
];

// Custom badge rendering in main badges area
select.renderBadgeContentCallback = (item, context) => {
  // Compact view in badges area
  return `${item.avatar} ${item.name}`;
};

// Custom rendering for selected items popover (separate callback)
select.renderSelectedItemContentCallback = (item) => {
  // Full details in popover - has more space
  return `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span>${item.avatar}</span>
      <div>
        <div><strong>${item.name}</strong></div>
        <div style="font-size: 0.75rem; color: #666;">${item.role}</div>
      </div>
    </div>
  `;
};
```

**Separate Callbacks for Badges vs. Popover:**
- `renderBadgeContentCallback` - Renders badges in the main badges area (compact display)
- `renderSelectedItemContentCallback` - Renders items in the selected items popover (can be more detailed)
- If `renderSelectedItemContentCallback` is not defined, falls back to `renderBadgeContentCallback`
- Users can assign the same function to both if identical rendering is desired

**Context object** (`BadgeContentRenderContext` for `renderBadgeContentCallback`):
- `displayMode: BadgesDisplayMode` - Current badges display mode ('pills', 'count', 'compact', 'partial', 'none')
- `isInPopover: boolean` - Whether the badge is being rendered in the selected items popover (always false for this callback)

#### Custom Group Label Rendering

Customize how group headers are displayed using `renderGroupLabelContentCallback`:

```javascript
const select = document.querySelector('web-multiselect');

select.options = [
  { value: 'react', label: 'React', group: 'frontend' },
  { value: 'vue', label: 'Vue', group: 'frontend' },
  { value: 'nodejs', label: 'Node.js', group: 'backend' },
  { value: 'postgres', label: 'PostgreSQL', group: 'database' }
];

select.isGroupsAllowed = true;
select.groupMember = 'group';

// Customize group label display
select.renderGroupLabelContentCallback = (groupName) => {
  const emojis = {
    'frontend': '🎨',
    'backend': '🔧',
    'database': '🗄️'
  };
  const emoji = emojis[groupName] || '📦';
  return `<strong>${emoji} ${groupName.toUpperCase()}</strong>`;
};
```

**Signature:** `(groupName: string) => string | HTMLElement`

**Use cases:**
- Capitalize or format group names
- Add icons, emojis, or badges to group headers
- Apply HTML formatting (bold, colors, etc.)
- Internationalization (i18n) - translate group names
- Add group-specific metadata or counts

**Notes:**
- Keeps standard `.ms__group-label` wrapper for consistent styling
- Can return HTML string or HTMLElement
- Group name is passed as a string parameter

#### Custom Badge Styling with CSS Classes

Add custom CSS classes to badges based on item data for semantic styling:

```javascript
const select = document.querySelector('web-multiselect');

select.options = [
  { id: 1, task: 'Fix security bug', priority: 'urgent' },
  { id: 2, task: 'Update docs', priority: 'normal' },
  { id: 3, task: 'Refactor code', priority: 'low' }
];

// Add CSS class based on priority
select.getBadgeClassCallback = (item) => {
  return `badge-${item.priority}`; // Returns 'badge-urgent', 'badge-normal', etc.
};

// Can also return array of classes
select.getBadgeClassCallback = (item) => {
  const classes = [`badge-${item.priority}`];
  if (item.urgent) classes.push('badge-blink');
  return classes;
};
```

Then style with CSS:

```css
/* Target specific badges with custom classes */
.badge-urgent {
  --ms-badge-text-background: #fee2e2;
  --ms-badge-text-color: #dc2626;
  --ms-badge-remove-background: #dc2626;
}

.badge-normal {
  --ms-badge-text-background: #dbeafe;
  --ms-badge-text-color: #2563eb;
  --ms-badge-remove-background: #2563eb;
}

.badge-low {
  --ms-badge-text-background: #d1fae5;
  --ms-badge-text-color: #059669;
  --ms-badge-remove-background: #059669;
}
```

The callback:
- Takes the item as a parameter
- Returns a string (single class) or array of strings (multiple classes)
- Classes are added to the badge's base `.ml__badge` element
- Works across all rendering locations (main badges, partial mode, popover)

**Separate Class Callbacks for Badges vs. Popover:**

Similar to rendering callbacks, you can use different class callbacks for badges and selected items:

```javascript
// Add classes to badges in main area
select.getBadgeClassCallback = (item) => {
  return `badge-${item.priority}`;
};

// Add different/additional classes to selected items in popover
select.getSelectedItemClassCallback = (item) => {
  // Could add more detailed classes for popover items
  return [`badge-${item.priority}`, 'badge-detailed'];
};
```

- `getBadgeClassCallback` - Adds classes to badges in the main badges area
- `getSelectedItemClassCallback` - Adds classes to items in the selected items popover
- If `getSelectedItemClassCallback` is not defined, falls back to `getBadgeClassCallback`
- Users can assign the same function to both if identical styling is desired

**Shadow DOM CSS Injection:**

Since the component uses Shadow DOM, regular page CSS cannot style shadow elements. Use `customStylesCallback` to inject CSS directly into the Shadow DOM:

```javascript
const select = document.querySelector('web-multiselect');

// Add CSS classes to badges based on item data
select.getBadgeClassCallback = (item) => {
  return `badge-${item.priority}`;
};

// Inject CSS into Shadow DOM to style those classes
select.customStylesCallback = () => `
  .badge-urgent {
    --ms-badge-text-background: #fee2e2;
    --ms-badge-text-color: #dc2626;
    --ms-badge-remove-background: #dc2626;
  }

  .badge-normal {
    --ms-badge-text-background: #dbeafe;
    --ms-badge-text-color: #2563eb;
    --ms-badge-remove-background: #2563eb;
  }

  .badge-low {
    --ms-badge-text-background: #d1fae5;
    --ms-badge-text-color: #059669;
    --ms-badge-remove-background: #059669;
  }
`;
```

The `customStylesCallback`:
- Returns a CSS string (not HTML)
- Styles are injected into the Shadow DOM on initialization
- Can be updated dynamically - new styles replace old ones
- Works with all custom classes (from `getBadgeClassCallback`, `renderOptionContentCallback`, etc.)

#### Custom Selected Item Rendering (Single-Select)

Customize the text shown in the input field when in single-select mode:

```javascript
const select = document.querySelector('web-multiselect[multiple="false"]');

select.options = [
  { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
];

// Show just first name when closed
select.renderSelectedContentCallback = (item) => {
  return item.firstName; // Returns plain text (not HTML)
};

// While dropdown shows full details
select.getDisplayValueCallback = (item) => {
  return `${item.firstName} ${item.lastName} (${item.email})`;
};
```

#### Conditional Rendering Example

Use JavaScript logic for conditional rendering:

```javascript
select.renderOptionContentCallback = (item, context) => {
  const classes = [];
  if (context.isSelected) classes.push('selected');
  if (context.isFocused) classes.push('focused');

  return `
    <div class="${classes.join(' ')}">
      ${item.isNew ? '<span class="badge-new">NEW</span>' : ''}
      <strong>${item.name}</strong>
      ${item.description ? `<p style="font-size: 0.875rem; color: #666;">${item.description}</p>` : ''}
      ${item.tags ? `<div class="tags">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
    </div>
  `;
};
```

#### Returning HTMLElement

You can also return DOM elements for more complex rendering:

```javascript
select.renderOptionContentCallback = (item, context) => {
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '0.5rem';

  const img = document.createElement('img');
  img.src = item.avatarUrl;
  img.style.width = '32px';
  img.style.height = '32px';
  img.style.borderRadius = '50%';

  const span = document.createElement('span');
  span.textContent = item.name;

  div.appendChild(img);
  div.appendChild(span);

  return div; // Return HTMLElement instead of string
};
```

#### Virtual Scroll Compatibility

When using `renderOptionContentCallback` with virtual scroll enabled:

⚠️ **Important**: Custom option content **must fit within** the configured `optionHeight` (default: 50px)

```html
<web-multiselect
  id="large-dataset"
  enable-virtual-scroll="true"
  option-height="60">
</web-multiselect>

<script type="module">
  const select = document.getElementById('large-dataset');

  select.renderOptionContentCallback = (item) => {
    // Content must fit in 60px height
    return `
      <div style="height: 60px; display: flex; align-items: center;">
        <strong>${item.name}</strong>
      </div>
    `;
  };
</script>
```

**Virtual scroll requirements:**
- Content height must be **fixed** and match `optionHeight`
- Overflow will be clipped
- Variable-height content only works in non-virtual mode

#### Callback Priority

The component uses a fallback chain when callbacks are not provided:

**For options:**
1. `renderOptionContentCallback` (full HTML control)
2. Default: icon + `getDisplayValueCallback` + subtitle

**For badges:**
1. `renderBadgeContentCallback` (full HTML control)
2. `getBadgeDisplayCallback` (text only)
3. `getDisplayValueCallback` (text only)

**For selected item (single-select):**
1. `renderSelectedContentCallback` (text only)
2. `getDisplayValueCallback` (text only)

#### Checkbox Control

Control checkbox appearance and alignment with CSS variables and attributes:

**Checkbox Alignment (via attribute):**
```html
<web-multiselect checkbox-align="top"></web-multiselect>    <!-- Default -->
<web-multiselect checkbox-align="center"></web-multiselect> <!-- Middle aligned -->
<web-multiselect checkbox-align="bottom"></web-multiselect> <!-- Bottom aligned -->
```

**Checkbox Size/Scale (via CSS):**
```html
<style>
  /* Change checkbox size */
  web-multiselect {
    --ms-checkbox-size: 20px;  /* Width and height (default: 16px) */
  }

  /* Scale checkbox */
  web-multiselect {
    --ms-checkbox-scale: 1.5;  /* Scale multiplier (default: 1) */
  }

  /* Fine-tune checkbox positioning */
  web-multiselect {
    --ms-checkbox-margin-top: 0.5rem;    /* Vertical alignment (default: 0.125rem) */
    --ms-checkbox-margin-right: 0;       /* Right spacing (default: 0) */
    --ms-checkbox-margin-bottom: 0;      /* Bottom spacing (default: 0) */
    --ms-checkbox-margin-left: 0;        /* Left spacing (default: 0) */
  }
</style>
```

**CSS Grid/Flexbox in Custom Content:**

Custom rendering callbacks support full CSS layout control:

```javascript
// CSS Grid example
multiselect.renderOptionContentCallback = (item, context) => {
  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
      <div><strong>Name:</strong> ${item.name}</div>
      <div><strong>Price:</strong> ${item.price}</div>
      <div><strong>Stock:</strong> ${item.stock}</div>
      <div><strong>Rating:</strong> ${item.rating}</div>
    </div>
  `;
};

// Flexbox example
multiselect.renderOptionContentCallback = (item, context) => {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; flex-direction: column;">
        <strong>${item.name}</strong>
        <span style="font-size: 0.875rem; color: #666;">${item.description}</span>
      </div>
      <div style="text-align: right;">
        <div>${item.price}</div>
        <div style="font-size: 0.875rem;">${item.stock} in stock</div>
      </div>
    </div>
  `;
};
```

**Available CSS Variables:**
- `--ms-checkbox-size`: Checkbox width/height (default: `16px`)
- `--ms-checkbox-scale`: Scale multiplier (default: `1`)
- `--ms-checkbox-margin-top`: Top margin for vertical alignment (default: `0.125rem`)
- `--ms-checkbox-margin-right`: Right margin (default: `0`)
- `--ms-checkbox-margin-bottom`: Bottom margin (default: `0`)
- `--ms-checkbox-margin-left`: Left margin (default: `0`)
- `--ms-checkbox-align`: Alignment value (default: `flex-start`)
- `--ms-option-gap`: Gap between checkbox and content (default: `0.5rem`)

**Note:** Horizontal and bottom margins default to `0` since spacing is handled by flexbox gap. Override for custom layouts.

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

// Customize badge display (show different text in badges vs dropdown)
select.getBadgeDisplayCallback = (item) => {
  // Badges show just the name for space efficiency
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

### Sizing

The component uses `--ms-rem` as a base unit for proportional scaling. Default is `10px`, meaning `calc(1.4 * var(--ms-rem))` equals `14px`.

**Global Scaling:**
```html
<!-- Compact (80%) -->
<web-multiselect style="--ms-rem: 8px;"></web-multiselect>

<!-- Default (100%) -->
<web-multiselect></web-multiselect>

<!-- Large (120%) -->
<web-multiselect style="--ms-rem: 12px;"></web-multiselect>

<!-- Pure Admin integration (inherits from html { font-size: 10px }) -->
<web-multiselect style="--ms-rem: 1rem;"></web-multiselect>
```

**Via CSS class:**
```css
web-multiselect.compact { --ms-rem: 8px; }
web-multiselect.large { --ms-rem: 12px; }
```

**Shadow DOM Note:** CSS variables must be set on the `<web-multiselect>` element itself, not on wrapper divs.

**Fine-grained Control:**
Override individual sizing variables for specific adjustments:
- `--ms-input-height` - Input field height (default: 35px)
- `--ms-input-font-size` - Input font size
- `--ms-input-padding` - Input padding
- `--ms-badge-height` - Badge height
- `--ms-option-height` - Option height in dropdown

**Input Size Variants:**
Five size variants for consistent input sizing across KeenMate components:

| Size | Variable | Height | Base Variable |
|------|----------|--------|---------------|
| XS | `--ms-input-size-xs-height` | 31px | `--base-input-size-xs-height` |
| SM | `--ms-input-size-sm-height` | 33px | `--base-input-size-sm-height` |
| MD | `--ms-input-size-md-height` | 35px | `--base-input-size-md-height` |
| LG | `--ms-input-size-lg-height` | 38px | `--base-input-size-lg-height` |
| XL | `--ms-input-size-xl-height` | 41px | `--base-input-size-xl-height` |

Heights reference `--base-input-size-*-height` from the [Theme Designer](https://theme-designer.keenmate.dev), ensuring consistent input heights across all KeenMate components.

```css
/* Set consistent input heights across all components */
:root {
  --base-input-size-md-height: 4.0;  /* All components: 40px at 10px rem */
}
```

### Theme Designer

The easiest way to customize the appearance of this component is using the **KeenMate Theme Designer** at:

**[theme-designer.keenmate.dev](https://theme-designer.keenmate.dev)**

#### How It Works

1. **Choose 3 base colors** - background, text, and accent
2. **Preview changes live** - see your theme applied instantly
3. **Fine-tune individual variables** - lock specific values while adjusting others
4. **Export your theme** - copy CSS, JSON, or SCSS to your project

#### CSS Variable Layers

KeenMate components support a **two-layer theming architecture**:

**Standalone Mode (Simple)** - Just override the component-specific variables you need:

```css
:root {
  --ms-accent-color: #your-brand-color;
  --ms-primary-bg: #your-background;
  --ms-text-primary: #your-text-color;
}
```

**Cascading Mode (Multi-Component)** - When using multiple KeenMate components, you can define a shared base layer:

```css
:root {
  /* Base layer - single source of truth */
  --base-accent-color: #3b82f6;
  --base-primary-bg: #ffffff;
  --base-text-primary: #111827;

  /* Components reference base layer */
  --ms-accent-color: var(--base-accent-color);
  --drp-accent-color: var(--base-accent-color);
}
```

Change `--base-accent-color` once → all components update automatically.

#### Unified Variable Naming

All KeenMate components follow a consistent naming convention for **Tier 1 variables** (core theming):

| Purpose | web-multiselect | web-daterangepicker |
|---------|-----------------|---------------------|
| Brand color | `--ms-accent-color` | `--drp-accent-color` |
| Background | `--ms-primary-bg` | `--drp-primary-bg` |
| Text color | `--ms-text-primary` | `--drp-text-primary` |
| Text on accent | `--ms-text-on-accent` | `--drp-text-on-accent` |
| Border color | `--ms-border-color` | `--drp-border-color` |

Learn the pattern once, apply it across all components.

### CSS Variables (No Build System Required)

You can customize the component using CSS variables even with just a `<script>` tag:

```html
<style>
  /* Override tooltip appearance */
  web-multiselect {
    --ms-tooltip-background: #1f2937;
    --ms-tooltip-color: #f9fafb;
    --ms-tooltip-padding: 0.625rem 0.875rem;
    --ms-tooltip-border-radius: 0.5rem;
    --ms-tooltip-font-size: 0.8125rem;
    --ms-tooltip-max-width: 24rem;
    --ms-tooltip-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    --ms-tooltip-z-index: 10000;
  }

  /* Override "+X more" badge colors */
  web-multiselect {
    --ms-more-badge-bg: #dbeafe;
    --ms-more-badge-hover-bg: #bfdbfe;
    --ms-more-badge-active-bg: #93c5fd;
  }

  /* Size the component */
  web-multiselect {
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
  web-multiselect {
    --ms-accent-color: #10b981;  /* Changes primary color */
    --ms-input-border-radius: 0.5rem;  /* Rounds input corners */
  }
</style>
```

For the complete list of all available CSS variables, see:
- [_variables.css](./src/css/_variables.css) - All 150+ CSS custom properties at `:host` level

#### Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-accent-color` | `#3b82f6` | Primary accent color (blue) |
| `--ms-accent-color-hover` | `#2563eb` | Accent color on hover |
| `--ms-accent-color-active` | `#1d4ed8` | Accent color when active |
| `--ms-text-primary` | `#111827` | Primary text color |
| `--ms-text-secondary` | `#6b7280` | Secondary/muted text color |
| `--ms-border-color` | `#e5e7eb` | Default border color |

#### Input Component

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-input-background` | `var(--base-input-background, #ffffff)` | Input background |
| `--ms-input-text` | `#111827` | Input text color |
| `--ms-input-border` | `#d1d5db` | Input border color |
| `--ms-input-focus-border-color` | `#3b82f6` | Border color when focused |
| `--ms-input-padding-v` | `0.5rem` | Input vertical padding |
| `--ms-input-padding-h` | `0.75rem` | Input horizontal padding |
| `--ms-input-font-size` | `0.875rem` | Input font size |
| `--ms-input-border-radius` | `0.375rem` | Input border radius |
| `--ms-input-placeholder-color` | `#6b7280` | Placeholder text color |

#### Dropdown & Options

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-dropdown-background` | `var(--base-dropdown-background, #ffffff)` | Dropdown background |
| `--ms-dropdown-border` | `var(--ms-border-color)` | Dropdown border color |
| `--ms-dropdown-shadow` | (box shadow) | Dropdown shadow |
| `--ms-dropdown-max-height` | `20rem` | Max height of dropdown |
| `--ms-option-padding-v` | `0.5rem` | Option vertical padding |
| `--ms-option-padding-h` | `0.75rem` | Option horizontal padding |
| `--ms-option-hover-bg` | `#f9fafb` | Option background on hover |
| `--ms-option-color-hover` | `inherit` | Option text color on hover |
| `--ms-option-bg-selected` | (rgba accent) | Selected option background |
| `--ms-option-bg-focused` | `#f9fafb` | Focused option background (keyboard) |
| `--ms-option-color-focused` | `inherit` | Focused option text color |
| `--ms-option-bg-matched` | (accent 8%) | Matched option background (navigate mode) |
| `--ms-option-color-matched` | `inherit` | Matched option text color |

#### Badges

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-badge-text-background` | `var(--ms-accent-color-light)` | Badge background color |
| `--ms-badge-text-color` | `var(--ms-accent-color)` | Badge text color |
| `--ms-badge-gap` | `0.5rem` | Gap between badges |
| `--ms-badge-height` | `1.5rem` | Height of badges |
| `--ms-badge-font-size` | `0.75rem` | Badge font size |
| `--ms-badge-border-radius` | `0.375rem` | Badge border radius |
| `--ms-badge-remove-background` | `var(--ms-accent-color)` | Remove button background |
| `--ms-badge-remove-color` | `var(--ms-text-on-accent)` | Remove button color |
| `--ms-badge-counter-text-background` | `var(--ms-primary-bg)` | BadgeCounter text background ("+X more") |
| `--ms-badge-counter-text-color` | `var(--ms-text-color-3)` | BadgeCounter text color |
| `--ms-badge-counter-remove-background` | `var(--ms-text-color-3)` | BadgeCounter remove button background |
| `--ms-badge-counter-remove-color` | `var(--ms-text-on-accent)` | BadgeCounter remove button color |
| `--ms-badge-counter-border` | `1px solid var(--ms-border-color)` | BadgeCounter border |
| `--ms-badge-border` | `none` | Badge border (e.g., `1px solid #3b82f6`) |

#### Checkboxes

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-checkbox-bg` | `var(--ms-input-background)` | Checkbox background |
| `--ms-checkbox-border` | `1px solid var(--ms-border-color)` | Checkbox border |
| `--ms-checkbox-border-radius` | `0.3rem` | Checkbox border radius |
| `--ms-checkbox-checked-bg` | `var(--ms-accent-color)` | Background when checked |
| `--ms-checkbox-checked-border` | `1px solid var(--ms-accent-color)` | Border when checked |
| `--ms-checkbox-checkmark-color` | `var(--ms-text-on-accent)` | Checkmark color |
| `--ms-checkbox-hover-border-color` | `var(--ms-accent-color)` | Border on hover |
| `--ms-checkbox-disabled-bg` | `var(--ms-primary-bg)` | Disabled background |
| `--ms-checkbox-disabled-border` | `1px solid var(--ms-border-color)` | Disabled border |

#### Scrollbar

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-scrollbar-width` | `8px` | Scrollbar width |
| `--ms-scrollbar-track-bg` | `transparent` | Track background |
| `--ms-scrollbar-thumb-bg` | `var(--ms-border-color)` | Thumb color |
| `--ms-scrollbar-thumb-bg-hover` | `var(--ms-text-color-3)` | Thumb hover color |
| `--ms-scrollbar-thumb-border-radius` | `4px` | Thumb border radius |

#### Counter (in input)

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-counter-bg` | `#3b82f6` | Counter background |
| `--ms-counter-color` | `#ffffff` | Counter text color |
| `--ms-counter-font-size` | `0.75rem` | Counter font size |
| `--ms-counter-bg-hover` | `#2563eb` | Hover background color |

#### Tooltips

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-tooltip-background` | `var(--base-tooltip-background, #333333)` | Tooltip background color |
| `--ms-tooltip-color` | `var(--ms-tooltip-text-color)` | Tooltip text color |
| `--ms-tooltip-padding` | `0.5rem 0.75rem` | Tooltip padding |
| `--ms-tooltip-border-radius` | `0.375rem` | Tooltip border radius |
| `--ms-tooltip-font-size` | `0.875rem` | Tooltip font size |
| `--ms-tooltip-max-width` | `20rem` | Tooltip maximum width |
| `--ms-tooltip-shadow` | (box shadow) | Tooltip box shadow |
| `--ms-tooltip-z-index` | `10000` | Tooltip z-index |

#### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-font-size-xs` | `0.75rem` | Extra small font size |
| `--ms-font-size-sm` | `0.875rem` | Small font size |
| `--ms-font-size-base` | `1rem` | Base font size |
| `--ms-font-weight-medium` | `500` | Medium font weight |
| `--ms-font-weight-semibold` | `600` | Semibold font weight |

#### Effects & Transitions

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-transition-fast` | `150ms` | Fast transition duration |
| `--ms-transition-normal` | `200ms` | Normal transition duration |
| `--ms-easing-snappy` | (cubic-bezier) | Snappy easing function |
| `--ms-shadow-md` | (box shadow) | Medium shadow |
| `--ms-shadow-xl` | (box shadow) | Extra large shadow |
| `--ms-disabled-opacity` | `0.5` | Opacity for disabled state |

### Advanced: Direct CSS Import

For users who want to import the raw CSS source files:

```css
/* Import component CSS directly */
@import '@keenmate/web-multiselect/css';

/* Or import individual partials */
@import '@keenmate/web-multiselect/src/css/_variables.css';
@import '@keenmate/web-multiselect/src/css/_base.css';
/* ... etc */
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

Copyright (c) 2025 Keenmate

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ Free to use in commercial products
- ✅ Free to modify and distribute
- ✅ No licensing fees or restrictions
- ⚠️ Provided "as is" without warranty
- 📝 Must include copyright notice in copies

## Credits

Created by [Keenmate](https://github.com/keenmate) as part of the Pure Admin design system.
