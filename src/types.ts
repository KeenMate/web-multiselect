/**
 * Type definitions for the MultiSelect component
 */

import type { Placement } from '@floating-ui/dom';


/**
 * Position of the pills container relative to the input
 */
export type PillsPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Search input display mode
 */
export type SearchInputMode = 'normal' | 'readonly' | 'hidden';

/**
 * Value format for serialization (forms and callbacks)
 */
export type ValueFormat = 'json' | 'csv' | 'array';

/**
 * Threshold behavior mode when pills exceed threshold
 */
export type PillsThresholdMode = 'count' | 'partial';

/**
 * Display mode for selected items (pills area)
 */
export type PillsDisplayMode = 'pills' | 'count' | 'compact' | 'partial';

/**
 * Support both object arrays and [key, value] tuples
 */
export type MultiSelectDataItem<T> = T | [string | number, string];

/**
 * Generic configuration options for the MultiSelect component
 * @template T The type of data items
 */
export interface MultiSelectConfig<T = any> {
    // ========================================================================
    // DATA AND OPTIONS
    // ========================================================================

    /** Options array - can be objects or [key, value] tuples */
    options?: T[];

    // ========================================================================
    // MEMBER/CALLBACK PROPERTIES (following svelte-treeview pattern)
    // ========================================================================

    /** Member property name for value/ID extraction */
    valueMember?: string;
    /** Callback to extract value/ID from item */
    getValueCallback?: (item: T) => string | number;

    /** Member property name for display value extraction */
    displayValueMember?: string;
    /** Callback to extract display value from item */
    getDisplayValueCallback?: (item: T) => string;
    /** Callback to customize pill display text (defaults to display value if not provided) */
    getPillDisplayCallback?: (item: T) => string;

    /** Member property name for search value extraction */
    searchValueMember?: string;
    /** Callback to extract search value from item */
    getSearchValueCallback?: (item: T) => string;

    /** Member property name for icon extraction */
    iconMember?: string;
    /** Callback to extract icon from item */
    getIconCallback?: (item: T) => string;

    /** Member property name for subtitle extraction */
    subtitleMember?: string;
    /** Callback to extract subtitle from item */
    getSubtitleCallback?: (item: T) => string;

    /** Member property name for group extraction */
    groupMember?: string;
    /** Callback to extract group from item */
    getGroupCallback?: (item: T) => string;

    /** Member property name for disabled state extraction */
    disabledMember?: string;
    /** Callback to extract disabled state from item */
    getDisabledCallback?: (item: T) => boolean;

    // ========================================================================
    // FORM INTEGRATION & VALUE FORMATTING
    // ========================================================================

    /** HTML form field ID/name for hidden input */
    formFieldId?: string;
    /** Format for value serialization (forms and callbacks) */
    valueFormat?: ValueFormat;
    /** Custom callback to format value */
    getValueFormatCallback?: (selectedValues: (string | number)[]) => string;

    // ========================================================================
    // BOOLEAN OPTIONS (internal names with 'is' prefix)
    // ========================================================================

    /** Allow multiple selections (internal: isMultipleEnabled) */
    isMultipleEnabled?: boolean;
    /** Enable search/filtering (internal: isSearchEnabled) */
    isSearchEnabled?: boolean;
    /** Allow grouping of options (internal: isGroupsAllowed) */
    isGroupsAllowed?: boolean;
    /** Show 'Select All' button (internal: isSelectAllAllowed) */
    isSelectAllAllowed?: boolean;
    /** Show 'Clear All' button (internal: isClearAllAllowed) */
    isClearAllAllowed?: boolean;
    /** Show checkboxes next to options (internal: isCheckboxesShown) */
    isCheckboxesShown?: boolean;
    /** Keep Select All/Clear All buttons fixed at top while scrolling (internal: isActionsSticky) */
    isActionsSticky?: boolean;
    /** Close dropdown after selecting an option (internal: isCloseOnSelect) */
    isCloseOnSelect?: boolean;
    /** Lock dropdown placement after first open (internal: isPlacementLocked) */
    isPlacementLocked?: boolean;
    /** Allow adding new options not in the list (internal: isAddNewAllowed) */
    isAddNewAllowed?: boolean;
    /** Show count badge next to toggle icon (internal: isCountBadgeShown) */
    isCountBadgeShown?: boolean;

    // ========================================================================
    // STRING OPTIONS
    // ========================================================================

    /** Hint text shown above the input when focused */
    searchHint?: string;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /** Minimum width for the dropdown (e.g., '20rem', '300px') */
    dropdownMinWidth?: string | null;
    /** Display mode for selected items in pills area */
    pillsDisplayMode?: PillsDisplayMode;
    /** Position of pills container */
    pillsPosition?: PillsPosition;
    /** Threshold behavior mode: 'count' shows count badge, 'partial' shows limited pills + more badge */
    pillsThresholdMode?: PillsThresholdMode;
    /** Maximum height for dropdown */
    maxHeight?: string;
    /** Message shown when no results found */
    emptyMessage?: string;
    /** Message shown while loading async data */
    loadingMessage?: string;
    /** Search input display mode */
    searchInputMode?: SearchInputMode;

    // ========================================================================
    // NUMBER OPTIONS
    // ========================================================================

    /** Auto-switch from pills to count when threshold is exceeded */
    pillsThreshold?: number | null;
    /** Maximum number of pills to show in partial mode (used with thresholdMode='partial') */
    pillsMaxVisible?: number | null;
    /** Minimum search length before loading data */
    minSearchLength?: number;

    // ========================================================================
    // CALLBACK FUNCTIONS
    // ========================================================================

    /** Async function to load data: (searchTerm) => Promise<options[]> */
    searchCallback?: ((searchTerm: string) => Promise<T[]>) | null;
    /** Callback to add a new option when isAddNewAllowed is true */
    addNewCallback?: ((value: string) => T | Promise<T>) | null;
    /** Callback when an option is selected */
    selectCallback?: ((option: T) => void) | null;
    /** Callback when an option is deselected */
    deselectCallback?: ((option: T) => void) | null;
    /** Callback when selection changes */
    changeCallback?: ((selectedOptions: T[]) => void) | null;
    /** Callback to format count pill text (for i18n/pluralization). When moreCount is provided, it's for the "+X more" badge in partial mode. */
    getCountPillCallback?: ((count: number, moreCount?: number) => string) | null;

    // ========================================================================
    // TOOLTIP OPTIONS
    // ========================================================================

    /** Enable tooltips on selected item pills (internal: isPillTooltipsEnabled) */
    isPillTooltipsEnabled?: boolean;
    /** Callback to generate custom tooltip content for a pill */
    getPillTooltipCallback?: ((item: T) => string | HTMLElement) | null;
    /** Tooltip placement relative to pill */
    pillTooltipPlacement?: Placement;
    /** Delay before showing tooltip in milliseconds */
    pillTooltipDelay?: number;
    /** Offset distance for tooltip in pixels */
    pillTooltipOffset?: number;

    // ========================================================================
    // OTHER OPTIONS
    // ========================================================================

    /** Container element for dropdown/hint/popover (for Shadow DOM support) */
    container?: HTMLElement | null;

    /** Host element for appending hidden inputs (for form integration with shadow DOM) */
    hostElement?: HTMLElement;
}

/**
 * Event detail structure for multiselect events
 * @template T The type of data items
 */
export interface MultiSelectEventDetail<T = any> {
    /** Currently selected options */
    selectedOptions: T[];
    /** Selected values array */
    selectedValues: (string | number)[];
    /** The option that triggered the event (for select/deselect) */
    option?: T;
}

/**
 * Legacy interface for backward reference
 * Note: New code should use generic types with member/callback properties
 * @deprecated Use generic types with valueMember/displayValueMember instead
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
 * Legacy options interface
 * @deprecated Use MultiSelectConfig<T> instead
 */
export interface MultiSelectOptions extends MultiSelectConfig<MultiSelectOption> {
    options?: MultiSelectOption[];
    searchCallback?: ((searchTerm: string) => Promise<MultiSelectOption[]>) | null;
    addNewCallback?: ((value: string) => MultiSelectOption | Promise<MultiSelectOption>) | null;
    selectCallback?: ((option: MultiSelectOption) => void) | null;
    deselectCallback?: ((option: MultiSelectOption) => void) | null;
    changeCallback?: ((selectedOptions: MultiSelectOption[]) => void) | null;
}
