/**
 * Type definitions for the MultiSelect component
 */

import type { Placement } from '@floating-ui/dom';


/**
 * Position of the badges container relative to the input
 */
export type BadgesPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Search input display mode
 */
export type SearchInputMode = 'normal' | 'readonly' | 'hidden';

/**
 * Value format for serialization (forms and callbacks)
 */
export type ValueFormat = 'json' | 'csv' | 'array';

/**
 * Threshold behavior mode when badges exceed threshold
 */
export type BadgesThresholdMode = 'count' | 'partial';

/**
 * Display mode for selected items (badges area)
 */
export type BadgesDisplayMode = 'badges' | 'count' | 'compact' | 'partial' | 'none';

/**
 * Search behavior mode
 * - 'filter': Hide non-matching options (default)
 * - 'navigate': Keep all options visible, jump to matches
 */
export type SearchMode = 'filter' | 'navigate';

/**
 * Layout mode for action buttons container
 * - 'nowrap': Buttons stay in single row (default)
 * - 'wrap': Buttons wrap to multiple rows when needed
 */
export type ActionsLayout = 'nowrap' | 'wrap';

/**
 * Support both object arrays and [key, value] tuples
 */
export type MultiSelectDataItem<T> = T | [string | number, string];

/**
 * Context provided to renderOptionContentCallback
 */
export interface OptionContentRenderContext {
    /** Index of the option in the filtered list */
    index: number;
    /** Whether the option is currently selected */
    isSelected: boolean;
    /** Whether the option is currently focused (keyboard navigation) */
    isFocused: boolean;
    /** Whether the option matches the current search term (navigate mode only) */
    isMatched: boolean;
    /** Whether the option is disabled */
    isDisabled: boolean;
}

/**
 * Context provided to renderBadgeContentCallback
 */
export interface BadgeContentRenderContext {
    /** Current badges display mode */
    displayMode: BadgesDisplayMode;
    /** Whether the badge is being rendered in the selected items popover */
    isInPopover: boolean;
}

/**
 * Action button configuration for dropdown actions (Select All, Clear All, custom actions)
 * @template T The type of data items
 */
export interface ActionButton<T = any> {
    /** Action identifier ('select-all', 'clear-all', or 'custom' for custom actions) */
    action: 'select-all' | 'clear-all' | 'custom';
    /** Button text label */
    text: string;
    /** Optional CSS class(es) to add to the button */
    cssClass?: string;
    /** Optional tooltip text */
    tooltip?: string;
    /** Static visibility - set to false to hide button */
    isVisible?: boolean;
    /** Static disabled state - set to true to disable button */
    isDisabled?: boolean;
    /** Custom click handler (required for 'custom' action) */
    onClick?: (multiselect: any) => void | Promise<void>;
    /** Dynamic visibility callback - return false to hide button (takes priority over isVisible) */
    isVisibleCallback?: (multiselect: any) => boolean;
    /** Dynamic disabled state callback - return true to disable button (takes priority over isDisabled) */
    isDisabledCallback?: (multiselect: any) => boolean;
    /** Dynamic text callback - return button text (takes priority over text) */
    getTextCallback?: (multiselect: any) => string;
    /** Dynamic CSS class callback - return class name(s) (takes priority over cssClass) */
    getClassCallback?: (multiselect: any) => string | string[];
    /** Dynamic tooltip callback - return tooltip text (takes priority over tooltip) */
    getTooltipCallback?: (multiselect: any) => string;
}

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
    /** Callback to customize badge display text (defaults to display value if not provided) */
    getBadgeDisplayCallback?: (item: T) => string;
    /** Callback to add custom CSS classes to badges - return string or array of class names */
    getBadgeClassCallback?: (item: T) => string | string[];
    /** Callback to inject custom CSS into Shadow DOM - return CSS string for styling custom classes */
    customStylesCallback?: () => string;

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
    /** Callback to customize group label content (can return HTML) */
    renderGroupLabelContentCallback?: (groupName: string) => string | HTMLElement;

    /** Member property name for disabled state extraction */
    disabledMember?: string;
    /** Callback to extract disabled state from item */
    getDisabledCallback?: (item: T) => boolean;

    // ========================================================================
    // CUSTOM RENDERING CALLBACKS
    // ========================================================================

    /** Custom renderer for dropdown option content - return HTML string or HTMLElement */
    renderOptionContentCallback?: (item: T, context: OptionContentRenderContext) => string | HTMLElement;
    /** Custom renderer for badge content (main badges area) - return HTML string or HTMLElement */
    renderBadgeContentCallback?: (item: T, context: BadgeContentRenderContext) => string | HTMLElement;
    /** Custom renderer for selected item content in popover - return HTML string or HTMLElement */
    renderSelectedItemContentCallback?: (item: T) => string | HTMLElement;
    /** Callback to add custom CSS classes to selected items in popover - return string or array of class names */
    getSelectedItemClassCallback?: (item: T) => string | string[];
    /** Custom renderer for selected item display in single-select mode - return plain text */
    renderSelectedContentCallback?: (item: T) => string;

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
    /** Action buttons configuration (Select All, Clear All, custom actions) */
    actionButtons?: ActionButton<T>[];
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
    /** Show count badge next to toggle icon (internal: isCounterShown) */
    isCounterShown?: boolean;
    /** Keep initial options visible when searchCallback is active and search term is empty/short (internal: isKeepOptionsOnSearch) */
    isKeepOptionsOnSearch?: boolean;
    /** Keep search text and filtered results when dropdown closes (default: true) */
    shouldKeepSearchOnClose?: boolean;
    /** Enable virtual scrolling for large datasets (internal: isVirtualScrollEnabled) */
    isVirtualScrollEnabled?: boolean;

    // ========================================================================
    // STRING OPTIONS
    // ========================================================================

    /** Vertical alignment of checkboxes relative to option content */
    checkboxAlign?: 'top' | 'center' | 'bottom';

    /** Hint text shown above the input when focused */
    searchHint?: string;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /** Minimum width for the dropdown (e.g., '20rem', '300px') */
    dropdownMinWidth?: string | null;
    /** Display mode for selected items in badges area */
    badgesDisplayMode?: BadgesDisplayMode;
    /** Position of badges container */
    badgesPosition?: BadgesPosition;
    /** Threshold behavior mode: 'count' shows count badge, 'partial' shows limited badges + more badge */
    badgesThresholdMode?: BadgesThresholdMode;
    /** Maximum height for dropdown */
    maxHeight?: string;
    /** Message shown when no results found */
    emptyMessage?: string;
    /** Message shown while loading async data */
    loadingMessage?: string;
    /** Search input display mode */
    searchInputMode?: SearchInputMode;
    /** Search behavior mode: 'filter' (hide non-matches) or 'navigate' (jump to matches, keep all visible) */
    searchMode?: SearchMode;
    /** Layout mode for action buttons: 'nowrap' (default) or 'wrap' for multi-row */
    actionsLayout?: ActionsLayout;

    // ========================================================================
    // NUMBER OPTIONS
    // ========================================================================

    /** Auto-switch from badges to count when threshold is exceeded */
    badgesThreshold?: number | null;
    /** Maximum number of badges to show in partial mode (used with thresholdMode='partial') */
    badgesMaxVisible?: number | null;
    /** Minimum search length before loading data */
    minSearchLength?: number;
    /** Minimum items before virtual scroll activates (default: 100) */
    virtualScrollThreshold?: number;
    /** Fixed height for each option in pixels (required for virtual scroll, default: 50) */
    optionHeight?: number;
    /** Fixed height for each badge in selected items popover in pixels (required for virtual scroll, default: 36) */
    badgeHeight?: number;
    /** Buffer size for virtual scroll - items above/below viewport (default: 10) */
    virtualScrollBuffer?: number;

    // ========================================================================
    // CALLBACK FUNCTIONS
    // ========================================================================

    /** Pre-process search term before calling searchCallback. Return null to prevent search. Use for accent removal, validation, etc. */
    beforeSearchCallback?: ((searchTerm: string) => string | null) | null;
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
    /** Callback to format count badge text (for i18n/pluralization). When moreCount is provided, it's for the "+X more" badge in partial mode. */
    getCounterCallback?: ((count: number, moreCount?: number) => string) | null;

    // ========================================================================
    // TOOLTIP OPTIONS
    // ========================================================================

    /** Enable tooltips on selected item badges (internal: isBadgeTooltipsEnabled) */
    isBadgeTooltipsEnabled?: boolean;
    /** Callback to generate custom tooltip content for a badge */
    getBadgeTooltipCallback?: ((item: T) => string | HTMLElement) | null;
    /** Callback to generate custom tooltip text for a remove button */
    getRemoveButtonTooltipCallback?: ((item: T) => string) | null;
    /** Format string for remove button tooltip text. Use {0} as placeholder for item name. Default: "Remove {0}" */
    removeButtonTooltipText?: string;
    /** Tooltip placement relative to badge */
    badgeTooltipPlacement?: Placement;
    /** Delay before showing tooltip in milliseconds */
    badgeTooltipDelay?: number;
    /** Offset distance for tooltip in pixels */
    badgeTooltipOffset?: number;

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
