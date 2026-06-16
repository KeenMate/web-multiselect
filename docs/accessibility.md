# Accessibility

This component is designed to be navigable from the keyboard alone and to work with assistive technologies via standard HTML semantics. This document covers what's currently shipped — keyboard model, ARIA labels, focus behavior — and any known gaps.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **↑ / ↓** | Navigate up/down through options |
| **Ctrl + ↑ / Ctrl + ↓** | Jump between matched items (navigate mode only) |
| **Page Up / Page Down** | Move focus by 10 options at a time |
| **Home / End** | Jump to first / last option |
| **Enter** | Select focused option (or add new entry when `allow-add-new="true"` and the search has text) |
| **Escape** | Close popover → clear search → close dropdown (priority order) |
| **Tab** | Close dropdown and move to next field |
| **Type** | Filter options by search term |

> 💡 To surface these shortcuts to your users, set the `search-hint` attribute — the hint floats above the input when focused. Example:
>
> ```html
> <web-multiselect
>   search-mode="navigate"
>   search-hint="Ctrl/Cmd + ↓ / ↑ to jump between matches">
> </web-multiselect>
> ```

## ARIA labels

The component ships labels on every interactive control:

| Control | Label | Source |
|---------|-------|--------|
| Per-badge remove button | `Remove {item display value}` | `getRemoveButtonTooltipCallback` or `removeButtonTooltipText` (with `{0}` placeholder); default `"Remove {name}"` |
| Hidden-items remove badge (partial mode "+N more") | `Remove {N} hidden items` | Built-in |
| Clear-all badge (count mode) | `Clear all selections` | Built-in |
| Selected-items popover close | `Close` | Built-in |

Custom remove-button labels via the `getRemoveButtonTooltipCallback`:

```javascript
multiselect.getRemoveButtonTooltipCallback = (option) => {
  return `Unassign ${option.name} from this task`;
};
```

Or via attribute, with `{0}` as the item name placeholder:

```html
<web-multiselect remove-button-tooltip-text="Unassign {0}"></web-multiselect>
```

## Focus & input behavior

- Opening the dropdown moves DOM focus to the search input.
- Arrow-key navigation moves a *visual* focus indicator through options without moving DOM focus — the search input stays focused so typing continues to filter.
- **Escape** behaves in priority order: close the selected-items popover (if open) → clear the search text (if any) → close the dropdown.
- **Tab** closes the dropdown and moves DOM focus to the next focusable element in the page, matching native `<select>` semantics.
- Disabled options are skipped during keyboard navigation.

## Form integration & screen readers

When the `name` attribute is set, the component creates hidden inputs in the **light DOM** (outside the shadow root) for form submission. This means:

- Standard `<label for="…">` linking to a wrapping `<form>` or sibling label works as expected.
- Form validation events (`invalid`, `change`) propagate to the host element.
- Screen readers that announce form controls will see the hidden inputs.

For best results, wrap the component with a `<label>` so the label's text becomes the accessible name:

```html
<label>
  Pick your skills
  <web-multiselect name="skills"></web-multiselect>
</label>
```

## Known gaps

The component does **not** currently declare a `role="combobox"` /`role="listbox"` / `aria-expanded` / `aria-activedescendant` ARIA combobox pattern on the host. Screen-reader announcements rely on the labels above and on the underlying form integration. If you need the formal combobox pattern (e.g. for WCAG 2.2 AAA compliance), please open an issue on the GitHub repo with your use case.

## See also

- [Keyboard shortcuts as a search hint](./usage.md#attributes) — `search-hint` attribute reference.
- [`examples-classic.html`](../examples-classic.html) — interactive demos including focus behavior.
