/**
 * Type definitions for the MultiSelect component
 */

/**
 * Display mode for selected items
 */
export type DisplayMode = 'pills' | 'count' | 'compact';

/**
 * Position of the pills container relative to the input
 */
export type PillsPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Search input display mode
 */
export type SearchInputMode = 'normal' | 'readonly' | 'hidden';

/**
 * Option structure for the multiselect
 */
export interface MultiSelectOption {
    /** Unique identifier for the option */
    value: string;
    /** Display label */
    label: string;
    /** Optional icon or emoji */
    icon?: string;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Optional group name */
    group?: string;
    /** Whether the option is disabled */
    disabled?: boolean;
}

/**
 * Configuration options for the MultiSelect component
 */
export interface MultiSelectOptions {
    /** Options array */
    options?: MultiSelectOption[];
    /** Hint text shown above the input when focused */
    searchHint?: string;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /** Allow multiple selections (default: true) */
    multiple?: boolean;
    /** Allow grouping of options (default: true) */
    allowGroups?: boolean;
    /** Show 'Select All' button (default: true) */
    allowSelectAll?: boolean;
    /** Show 'Clear All' button (default: true) */
    allowClearAll?: boolean;
    /** Show checkboxes next to options (default: true) */
    showCheckboxes?: boolean;
    /** Keep Select All/Clear All buttons fixed at top while scrolling (default: true) */
    stickyActions?: boolean;
    /** Close dropdown after selecting an option (default: false) */
    closeOnSelect?: boolean;
    /** Lock dropdown placement after first open to prevent jumping when content changes (default: true) */
    lockPlacement?: boolean;
    /** Minimum width for the dropdown (e.g., '20rem', '300px') */
    dropdownMinWidth?: string | null;
    /** Display mode for selected items */
    displayMode?: DisplayMode;
    /** Auto-switch from pills to count when threshold is exceeded */
    pillsThreshold?: number | null;
    /** Position of pills container */
    pillsPosition?: PillsPosition;
    /** Template for count display (use {count} placeholder) */
    countFormat?: string;
    /** Show count badge next to toggle icon */
    showCountBadge?: boolean;
    /** Maximum height for dropdown */
    maxHeight?: string;
    /** Message shown when no results found */
    emptyMessage?: string;
    /** Message shown while loading async data */
    loadingMessage?: string;
    /** Minimum search length before loading data */
    minSearchLength?: number;
    /** Enable search/filtering (default: true). When false, only keyboard navigation works */
    enableSearch?: boolean;
    /** Search input display mode (default: 'normal') */
    searchInputMode?: SearchInputMode;
    /** Allow adding new options not in the list (default: false) */
    allowAddNew?: boolean;
    /** Async function to load data: (searchTerm) => Promise<options[]> */
    onSearch?: ((searchTerm: string) => Promise<MultiSelectOption[]>) | null;
    /** Callback to add a new option when allowAddNew is true */
    onAddNew?: ((value: string) => MultiSelectOption | Promise<MultiSelectOption>) | null;
    /** Callback when an option is selected */
    onSelect?: ((option: MultiSelectOption) => void) | null;
    /** Callback when an option is deselected */
    onDeselect?: ((option: MultiSelectOption) => void) | null;
    /** Callback when selection changes */
    onChange?: ((selectedOptions: MultiSelectOption[]) => void) | null;
    /** Container element for dropdown/hint/popover (for Shadow DOM support) */
    container?: HTMLElement | null;
}

/**
 * Event detail structure for multiselect events
 */
export interface MultiSelectEventDetail {
    /** Currently selected options */
    selectedOptions: MultiSelectOption[];
    /** Selected values array */
    selectedValues: string[];
    /** The option that triggered the event (for select/deselect) */
    option?: MultiSelectOption;
}
