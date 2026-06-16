# Usage & API reference

This document covers the public surface of `<web-multiselect>` — declarative HTML usage, the full attribute / property / method / event tables, and the data shape.

## Declarative (no JavaScript)

Perfect for simple forms — just use standard HTML `<option>` and `<optgroup>` elements:

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

## Programmatic (with JavaScript)

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
| `dropdown-min-width` | `string` | - | Min width for dropdown (e.g., `'20rem'`) |
| `badges-display-mode` | `'pills' \| 'count' \| 'compact' \| 'partial' \| 'none'` | `'pills'` | How to display selected items. `compact`: first item + count. `none`: no display |
| `badges-threshold` | `number` | - | Auto-switch mode when exceeded (see `badges-threshold-mode`) |
| `badges-threshold-mode` | `'count' \| 'partial'` | `'count'` | Mode after threshold: `count` shows badge, `partial` shows limited badges + more badge |
| `badges-max-visible` | `number` | `3` | Max badges shown in partial mode |
| `badges-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Position of badges container |
| `show-counter` | `boolean` | `false` | Show `[3]` badge next to toggle icon |
| `enable-badge-tooltips` | `boolean` | `false` | Enable tooltips on selected badges |
| `badge-tooltip-placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip placement relative to badge |
| `badge-tooltip-delay` | `number` | `100` | Delay in ms before showing tooltip |
| `badge-tooltip-offset` | `number` | `8` | Distance in pixels between badge and tooltip |
| `max-height` | `string` | `'20rem'` | Maximum height of dropdown |
| `empty-message` | `string` | `'No results found'` | Message when no options found |
| `loading-message` | `string` | `'Loading...'` | Message while loading async data |
| `min-search-length` | `number` | `0` | Minimum search length for async |
| `keep-options-on-search` | `boolean` | `true` | Keep initial options visible when `searchCallback` is active (hybrid search) |
| `should-keep-search-on-close` | `boolean` | `true` | Preserve search text and filtered results when dropdown closes |
| `sticky-actions` | `boolean` | `true` | Keep action buttons fixed at top while scrolling |
| `actions-layout` | `'nowrap' \| 'wrap'` | `'nowrap'` | Layout mode for action buttons: `nowrap` (single row) or `wrap` (multi-row) |
| `lock-placement` | `boolean` | `true` | Lock dropdown placement after first open to prevent flipping |
| `enable-search` | `boolean` | `true` | Enable/disable search functionality |
| `search-input-mode` | `'normal' \| 'readonly' \| 'hidden'` | `'normal'` | Search input display mode |
| `search-mode` | `'filter' \| 'navigate'` | `'filter'` | Search behavior: `filter` hides non-matches, `navigate` jumps to matches |
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
| `virtual-scroll-buffer` | `number` | `10` | Buffer size — extra items rendered above/below viewport |

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
  const normalized = searchTerm.normalize('NFD').replace(/[̀-ͯ]/g, '');

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
    isDisabled: false // Static disabled state
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
  return `<strong>📦 ${groupName.toUpperCase()}</strong>`;
};

multiselect.renderOptionContentCallback = (item, context) => {
  return `<strong>${item.name}</strong> <span class="badge">${item.status}</span>`;
};

multiselect.renderBadgeContentCallback = (item, context) => {
  return context.isInPopover
    ? `${item.icon} ${item.name} - ${item.description}`
    : `${item.icon} ${item.name}`;
};

multiselect.renderSelectedContentCallback = (item) => {
  // Customize selected item text in single-select mode (plain text only)
  return item.firstName;
};

// Form integration
multiselect.name = 'selected_items';
multiselect.valueFormat = 'json'; // 'json' | 'csv' | 'array'
multiselect.getValueFormatCallback = (values) => values.join('|'); // Custom format

// Read-only properties
const selectedValue = multiselect.selectedValue; // string | number | array | null
const selectedItem = multiselect.selectedItem;   // First selected item object

// Add new option callback
multiselect.addNewCallback = async (value) => {
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
| `getValue()` | Get selected value(s) — returns single value in single-select mode, array in multi-select mode |
| `destroy()` | Clean up and destroy instance |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `select` | `{ option, selectedOptions }` | Fired when an option is selected |
| `deselect` | `{ option, selectedOptions }` | Fired when an option is deselected |
| `change` | `{ selectedOptions, selectedValues }` | Fired when selection changes |

## Option structure

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

The component also accepts:

- **Tuple arrays** like `[['js', 'JavaScript'], ['ts', 'TypeScript']]` — first element becomes value, second becomes display text.
- **Arbitrary custom objects** via member attributes (`value-member`, `display-value-member`, etc.) or callbacks (`getValueCallback`, `getDisplayValueCallback`, etc.). See [examples.md → Flexible Data Handling](./examples.md#flexible-data-handling).
