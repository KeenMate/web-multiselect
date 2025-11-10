# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-rc05] - 2025-11-10

### Added
- **Pill Display Customization** - New `getPillDisplayCallback` property to customize pill text independently from dropdown display
  - Allows showing different text in pills vs dropdown (e.g., "John Doe" in pill, "John Doe (john@example.com)" in dropdown)
  - Falls back to standard display value if not provided
  - Useful for showing concise text in pills while keeping detailed information in dropdown
  - Applied to all pill rendering locations: pills mode, partial mode, selected popover, and tooltips

### Fixed
- **RTL Detection in Shadow DOM** - Fixed RTL mode not being detected when using web components
  - Root cause: Shadow DOM prevents direct access to host element's `dir` attribute
  - Solution: Check `shadowRoot.host` element for `dir="rtl"` attribute
  - RTL styles now properly apply when `dir="rtl"` is set on `<multi-select>` element
- **Input Toggle Behavior** - Fixed dropdown not properly toggling when clicking input field
  - Added proper open/close toggle logic on mousedown event
  - Fixed issue where dropdown couldn't be reopened after first close (focus event conflict)
  - Dropdown now properly toggles: open → close → open → close indefinitely
- **Input Cursor** - Added `cursor: pointer` to input field for better UX indication
- **Left Pills Alignment** - Fixed left-positioned pills appearing at far left edge instead of close to input
  - Changed from `justify-content: flex-start` to `flex-end` so pills appear immediately before input

## [1.0.0-rc04] - 2025-11-09

### Added
- **RTL (Right-to-Left) Language Support** - Full support for Arabic, Hebrew, Persian, Urdu, and other RTL languages
  - Auto-detection from `dir="rtl"` attribute on component or any ancestor element
  - Complete UI mirroring: toggle icon, text alignment, pills, dropdown, badges
  - Logical position mirroring: `pills-position="left"` becomes physically right in RTL (and vice versa)
  - Pills remove buttons flip to left side in RTL mode
  - All text content properly right-aligned with correct text direction
  - New RTL showcase page in `/examples/rtl` with Arabic and Hebrew examples
  - New SCSS file `_rtl.scss` with comprehensive RTL styles

### Fixed
- **Pills Positioning** - Fixed `pills-position` attribute not working (pills were always below input)
  - Root cause: Missing `ml-wrapper` flex container in DOM structure
  - Added wrapper div with `ml-wrapper` class and `--inline` modifier for left/right positioning
  - Pills now correctly position based on `pills-position` attribute (top, bottom, left, right)
  - Fixed right-positioned pills alignment: changed from `flex-end` to `flex-start` so pills appear immediately after input instead of at far right edge
- **Pills Spacing** - Reduced left/right pills margin from 0.5rem to 0.25rem for better spacing next to input

## [1.0.0-rc03] - 2025-11-09

### Fixed
- **SSR Compatibility** - Fixed "HTMLElement is not defined" error in Server-Side Rendering environments
  - Added HTMLElement stub for safe module imports in Node.js SSR contexts (SvelteKit, Next.js, Nuxt, etc.)
  - Component remains client-side only but module can now be safely imported during SSR
  - Added browser environment checks around all `customElements` API calls
  - No special client-side wrappers or dynamic imports required

## [1.0.0-rc02] - Previous Release

### Added

#### Pill Tooltips
- **`enable-pill-tooltips` attribute** - Enable tooltips on selected item pills
- **`pill-tooltip-placement` attribute** - Control tooltip position ('top', 'bottom', 'left', 'right')
- **`pill-tooltip-delay` attribute** - Customize tooltip show delay (default: 300ms, previously 500ms)
- **`pill-tooltip-offset` attribute** - Control distance between pill and tooltip (default: 8px)
- **`getPillTooltipCallback` property** - Custom callback for tooltip content
- **Separate tooltips** for pill text vs remove button to prevent overlap
- **Floating UI integration** with `strategy: 'fixed'` for proper Shadow DOM positioning
- Tooltips automatically clean up on component updates

#### Display Mode Enhancements
- **Enhanced `getCountPillCallback`** - Now supports optional `moreCount` parameter for i18n/pluralization
  - When `moreCount` is provided: Used for "+X more" badge in partial mode
  - When `moreCount` is undefined: Used for total count display in count mode
  - Enables unified i18n handling: `(count: number, moreCount?: number) => string`

#### Flexible Data Handling (Major Feature)
- **Generic Type Support**: Component now supports `PureMultiSelect<T>` and `MultiSelectElement<T>` for any data structure
- **Member/Callback Pattern** (following svelte-treeview):
  - `valueMember` / `getValueCallback` - Extract unique ID from items
  - `displayValueMember` / `getDisplayValueCallback` - Extract display text
  - `searchValueMember` / `getSearchValueCallback` - Extract searchable text
  - `iconMember` / `getIconCallback` - Extract icon/emoji
  - `subtitleMember` / `getSubtitleCallback` - Extract subtitle/description
  - `groupMember` / `getGroupCallback` - Extract group name
  - `disabledMember` / `getDisabledCallback` - Determine if item is disabled
- **Auto-detection** for `[key, value]` tuple arrays
- **7 extraction methods** in core class for data abstraction

#### Form Integration
- **`name` attribute** - HTML form field name/ID for hidden input generation
- **`formValueFormat` property** - Choose format: `'json'` (default), `'csv'`, or `'array'`
  - `json`: `["val1","val2","val3"]`
  - `csv`: `val1,val2,val3`
  - `array`: Multiple `<input name="field[]">` elements
- **`getFormValueCallback`** - Custom callback for form value formatting
- **Automatic hidden input management** - Updates on selection changes

#### New Public API
- **`selectedValue` property** - Get selected value(s) (mode-dependent: single value or array)
- **`selectedItem` property** - Get first selected item object
- **`getValue()` method** - Get form-ready value (mode-dependent return type)
- **Enhanced `setSelected()`** - Now accepts `(string | number)[]` for flexibility

#### SCSS Improvements
- **MIT License**: Added formal LICENSE file with copyright notice and terms
- **Component-Specific Semantic Variables**: Added 125+ SCSS semantic variables
  - Input component, toggle icon, count badge, hint, dropdown
  - Actions, buttons, options, groups, empty states
  - Pills, count display, pill elements, selected popover
- Comprehensive API documentation for all semantic variables

### Changed

#### Tooltip Improvements
- **Default tooltip delay reduced** from 500ms to 300ms for faster response
- **Tooltip attachment** now targets pill text element instead of entire pill to prevent overlap with remove button

#### Breaking Changes - Data Handling
- **Internal property names** now use `is` prefix for booleans:
  - `multiple` → `isMultipleEnabled`
  - `allowGroups` → `isGroupsAllowed`
  - `allowSelectAll` → `isSelectAllAllowed`
  - `showCheckboxes` → `isCheckboxesShown`
  - `closeOnSelect` → `isCloseOnSelect`
  - `lockPlacement` → `isPlacementLocked`
  - `enableSearch` → `isSearchEnabled`
  - `allowAddNew` → `isAddNewAllowed`
  - `showCountBadge` → `isCountBadgeShown`
  - `stickyActions` → `isActionsSticky`
  - `allowClearAll` → `isClearAllAllowed`
- **External API** (HTML attributes) still uses familiar names (`multiple`, `allow-groups`, etc.)
- **Event detail structure** updated:
  - `selectedValues` now returns `(string | number)[]` instead of `string[]`
  - Generic type `MultiSelectEventDetail<T>` for type safety

#### Breaking Changes - SCSS
- Refactored all component styles to use semantic variables
- All SCSS variables now consistently use `$ml-` prefix

### Fixed

#### Critical Bug Fixes
- **Selection with numeric values** - Fixed type mismatch bug where options with numeric IDs couldn't be selected
  - Root cause: HTML data attributes are strings, but Map keys were using original types (numbers)
  - Solution: Normalized all internal Map/Set keys to strings while preserving original types in public API
  - Affected: `selectOption()`, `deselectOption()`, `toggleOption()`, `renderOption()`, and all selection tracking
- **Form integration with Shadow DOM** - Fixed hidden inputs not being accessible to FormData
  - Root cause: Hidden inputs were created inside Shadow DOM where FormData cannot access them
  - Solution: Added `hostElement` config option to append hidden inputs to light DOM (web component host)
  - All form formats (json, csv, array) now work correctly with standard HTML forms
- **Option lookup in async search** - Fixed `opt.value` direct property access on generic type `T`
  - Changed to use `getItemValue(opt)` for proper value extraction

#### Example Files
- **New API Examples** (`examples-new-api.html`) - Created comprehensive examples showcasing:
  - Custom object structures with member properties
  - [key, value] tuple arrays with auto-detection
  - Callback patterns for complex logic
  - Form integration with all 3 formats (JSON, CSV, array)
  - Mode-dependent getValue() API
  - Async search with GitHub API (with graceful fallback to mock data)
  - Simulated product search with 300ms delay
  - Country search with flag emojis
- **Classic Examples** (`examples-classic.html`) - Fixed all examples showing `[N/A]`
  - Added missing `value-member`, `display-value-member`, `icon-member`, `subtitle-member` attributes
  - Added async search examples (GitHub users, products)
- **Landing Page** (`index.html`) - Created navigation page with cards linking to example sets
- **Error Display** - Async search examples now show user-friendly error messages in dropdown:
  - ⚠️ GitHub API Rate Limit - Showing Mock Data
  - ⚠️ Invalid API Response - Showing Mock Data
  - ⚠️ Network Error - Showing Mock Data
  - Error messages appear as disabled options at top of results

### Benefits
- **Framework Consistency**: Matches svelte-treeview patterns across Keenmate components
- **Maximum Flexibility**: Works with any data structure (custom objects, tuples, existing APIs)
- **Form Integration**: Seamless HTML form submission support
- **Type Safety**: Full TypeScript support with generics
- **No Conflicts**: All variables prefixed with `$ml-` to prevent framework collisions
- **Easy Customization**: Semantic variables like `$ml-action-btn-border: none;`
- **Mode-Aware API**: `getValue()` returns appropriate type based on single/multi-select mode

## [1.0.0-rc01] - Previous Release

Initial release candidate with core multiselect functionality.
