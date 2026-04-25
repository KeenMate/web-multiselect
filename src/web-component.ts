import { WebMultiSelect } from './multiselect';
import type { MultiSelectConfig, MultiSelectEventDetail, OptionContentRenderContext, BadgeContentRenderContext } from './types';
import styles from './css/main.css?inline';
import { dataLogger } from './logger';

// SSR compatibility: provide stub HTMLElement if not in browser
const BaseElement = (typeof HTMLElement !== 'undefined' ? HTMLElement : class {}) as typeof HTMLElement;

// Type declarations for build-time constants
declare const __VERSION__: string;

// Instance tracking for global API
const instances = new Set<MultiSelectElement>();

// Export for global API
export function getAllInstances(): MultiSelectElement[] {
    return Array.from(instances);
}

export class MultiSelectElement<T = any> extends BaseElement {
    private picker?: WebMultiSelect<T>;
    private containerElement?: HTMLDivElement;
    private shadow: ShadowRoot;

    // Properties for complex data (not attributes)
    private _options?: T[];

    // Member/Callback properties
    private _valueMember?: string;
    private _getValueCallback?: (item: T) => string | number;
    private _displayValueMember?: string;
    private _getDisplayValueCallback?: (item: T) => string;
    private _getBadgeDisplayCallback?: (item: T) => string;
    private _getBadgeClassCallback?: (item: T) => string | string[];
    private _customStylesCallback?: () => string;
    private _searchValueMember?: string;
    private _getSearchValueCallback?: (item: T) => string;
    private _iconMember?: string;
    private _getIconCallback?: (item: T) => string;
    private _subtitleMember?: string;
    private _getSubtitleCallback?: (item: T) => string;
    private _groupMember?: string;
    private _getGroupCallback?: (item: T) => string;
    private _renderGroupLabelContentCallback?: (groupName: string) => string | HTMLElement;
    private _disabledMember?: string;
    private _getDisabledCallback?: (item: T) => boolean;

    // Value formatting callbacks
    private _getValueFormatCallback?: (selectedValues: (string | number)[]) => string;

    // Tooltip callbacks
    private _getBadgeTooltipCallback?: (item: T) => string | HTMLElement;
    private _getRemoveButtonTooltipCallback?: (item: T) => string;

    // Custom rendering callbacks
    private _renderOptionContentCallback?: (item: T, context: OptionContentRenderContext) => string | HTMLElement;
    private _renderBadgeContentCallback?: (item: T, context: BadgeContentRenderContext) => string | HTMLElement;
    private _renderSelectedItemContentCallback?: (item: T) => string | HTMLElement;
    private _getSelectedItemClassCallback?: (item: T) => string | string[];
    private _renderSelectedContentCallback?: (item: T) => string;

    // Count badge callback
    private _getCounterCallback?: (count: number, moreCount?: number) => string;

    // Action buttons
    private _actionButtons?: any[];

    // Event callbacks
    private _beforeSearchCallback?: (searchTerm: string) => string | null;
    private _searchCallback?: (searchTerm: string) => Promise<T[]>;
    private _addNewCallback?: (value: string) => T | Promise<T>;
    private _selectCallback?: (option: T) => void;
    private _deselectCallback?: (option: T) => void;
    private _changeCallback?: (selectedOptions: T[]) => void;

    static get observedAttributes() {
        return [
            // Existing attributes (external names - standard/familiar)
            'search-hint', 'search-placeholder', 'multiple', 'allow-groups',
            'show-checkboxes', 'sticky-actions', 'close-on-select',
            'lock-placement', 'dropdown-min-width', 'dropdown-max-width', 'badges-display-mode', 'badges-threshold', 'badges-max-visible',
            'badges-threshold-mode', 'badges-position', 'show-counter', 'keep-options-on-search', 'should-keep-search-on-close', 'max-height', 'empty-message',
            'loading-message', 'min-search-length', 'enable-search', 'search-input-mode', 'search-mode', 'actions-layout', 'allow-add-new',
            'initial-values', 'checkbox-align',

            // Virtual scroll options
            'enable-virtual-scroll', 'virtual-scroll-threshold', 'option-height', 'badge-height', 'virtual-scroll-buffer',

            // New member properties
            'value-member', 'display-value-member', 'search-value-member',
            'icon-member', 'subtitle-member', 'group-member', 'disabled-member',

            // Form integration
            'name', 'value-format',

            // Tooltip options
            'enable-badge-tooltips', 'badge-tooltip-placement', 'badge-tooltip-delay', 'badge-tooltip-offset', 'remove-button-tooltip-text',

            // Debug
            'show-debug-info'
        ];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });

        // Inject styles immediately to prevent FOUC
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        this.shadow.appendChild(styleSheet);

        // Mark as ready after initialization to enable placeholder visibility
        requestAnimationFrame(() => {
            this.setAttribute('data-ready', '');
        });
    }

    connectedCallback() {
        instances.add(this);
        this.render();

        // Parse declarative options before initializing picker
        const declarativeOptions = this.parseDeclarativeOptions();
        if (declarativeOptions) {
            // Declarative options take priority over programmatically set options
            if (this._options && this._options.length > 0) {
                dataLogger.warn('[MultiSelectElement] Both declarative <option> elements and programmatic .options detected. Using declarative options.');
            }
            this._options = declarativeOptions as T[];
        }

        this.initializePicker();
    }

    disconnectedCallback() {
        instances.delete(this);
        if (this.picker) {
            this.picker.destroy();
        }
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;

        // Re-initialize picker if it exists and attributes changed
        if (this.picker && name !== 'initial-values') {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    private render() {
        // Create container element
        this.containerElement = document.createElement('div');
        this.containerElement.setAttribute('data-multiselect', '');

        // Copy any CSS classes from the host element to the container
        if (this.className) {
            this.containerElement.className = this.className;
        }

        this.shadow.appendChild(this.containerElement);

        // Add debug info if enabled
        if (this.getAttribute('show-debug-info') === 'true') {
            this.renderDebugInfo();
        }
    }

    private renderDebugInfo() {
        // Remove existing debug info if present
        const existingDebug = this.shadow.querySelector('.ms-debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }

        // Create debug info container
        const debugContainer = document.createElement('div');
        debugContainer.className = 'ms-debug-info';

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Debug Info';

        const statsDiv = document.createElement('div');
        statsDiv.className = 'ms-debug-stats';

        details.appendChild(summary);
        details.appendChild(statsDiv);
        debugContainer.appendChild(details);

        this.shadow.appendChild(debugContainer);

        // Update debug info periodically
        this.updateDebugInfo();
    }

    private updateDebugInfo() {
        const statsDiv = this.shadow.querySelector('.ms-debug-stats');
        if (!statsDiv || !this.picker) return;

        const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown';
        const totalInstances = getAllInstances().length;
        const selected = this.picker.getSelected();
        const selectedCount = selected.length;
        const totalOptions = this._options?.length || 0;

        // Access internal state via any type cast to avoid TS errors
        const pickerAny = this.picker as any;
        const isDropdownOpen = pickerAny.isOpen || false;
        const searchTerm = pickerAny.searchTerm || '';
        const isLoading = pickerAny.isLoading || false;
        const filteredCount = pickerAny.filteredOptions?.length || 0;

        statsDiv.innerHTML = `
            <span>Version: ${version}</span>
            <span>Total Instances: ${totalInstances}</span>
            <span>Options: ${totalOptions}</span>
            <span>Filtered: ${filteredCount}</span>
            <span>Selected: ${selectedCount}</span>
            <span>Dropdown: ${isDropdownOpen ? 'Open' : 'Closed'}</span>
            <span>Search: ${searchTerm || 'none'}</span>
            <span>Loading: ${isLoading ? 'Yes' : 'No'}</span>
        `;

        // Update again after a delay to catch state changes
        setTimeout(() => {
            if (this.getAttribute('show-debug-info') === 'true') {
                this.updateDebugInfo();
            }
        }, 500);
    }

    /**
     * Parse declarative <option> and <optgroup> elements from Light DOM
     * Returns array of options in the format expected by the picker
     */
    private parseDeclarativeOptions(): any[] | null {
        const options: any[] = [];

        // Get all direct children (option and optgroup elements)
        const children = Array.from(this.children);

        if (children.length === 0) {
            return null; // No declarative options
        }

        let hasValidOptions = false;

        for (const child of children) {
            if (child.tagName === 'OPTION') {
                const option = child as HTMLOptionElement;
                const parsed: any = {
                    value: option.value || option.textContent?.trim() || '',
                    label: option.textContent?.trim() || option.value || ''
                };

                // Handle selected attribute
                if (option.hasAttribute('selected')) {
                    if (!this._declarativeSelectedValues) {
                        this._declarativeSelectedValues = [];
                    }
                    this._declarativeSelectedValues.push(parsed.value);
                }

                // Handle disabled attribute
                if (option.hasAttribute('disabled')) {
                    parsed.disabled = true;
                }

                // Handle data-icon attribute for icons
                if (option.hasAttribute('data-icon')) {
                    parsed.icon = option.getAttribute('data-icon');
                }

                // Handle data-subtitle attribute for subtitles
                if (option.hasAttribute('data-subtitle')) {
                    parsed.subtitle = option.getAttribute('data-subtitle');
                }

                options.push(parsed);
                hasValidOptions = true;
            } else if (child.tagName === 'OPTGROUP') {
                const optgroup = child as HTMLOptGroupElement;
                const groupLabel = optgroup.label || optgroup.getAttribute('label') || 'Group';

                // Parse options within the optgroup
                const groupOptions = Array.from(optgroup.querySelectorAll('option'));
                for (const option of groupOptions) {
                    const parsed: any = {
                        value: option.value || option.textContent?.trim() || '',
                        label: option.textContent?.trim() || option.value || '',
                        group: groupLabel
                    };

                    // Handle selected attribute
                    if (option.hasAttribute('selected')) {
                        if (!this._declarativeSelectedValues) {
                            this._declarativeSelectedValues = [];
                        }
                        this._declarativeSelectedValues.push(parsed.value);
                    }

                    // Handle disabled attribute
                    if (option.hasAttribute('disabled')) {
                        parsed.disabled = true;
                    }

                    // Handle data-icon attribute
                    if (option.hasAttribute('data-icon')) {
                        parsed.icon = option.getAttribute('data-icon');
                    }

                    // Handle data-subtitle attribute
                    if (option.hasAttribute('data-subtitle')) {
                        parsed.subtitle = option.getAttribute('data-subtitle');
                    }

                    options.push(parsed);
                    hasValidOptions = true;
                }
            }
        }

        if (hasValidOptions) {
            dataLogger.debug(`[MultiSelectElement] Parsed ${options.length} declarative options from Light DOM`);

            // Remove parsed elements from DOM (clean up)
            children.forEach(child => {
                if (child.tagName === 'OPTION' || child.tagName === 'OPTGROUP') {
                    child.remove();
                }
            });

            return options;
        }

        return null;
    }

    private _declarativeSelectedValues?: (string | number)[];

    private initializePicker() {
        if (!this.containerElement) return;

        // Parse initial values - prioritize declarative selected options
        let initialValues: (string | number)[] | undefined;

        // Check for declarative selected values first (from <option selected>)
        if (this._declarativeSelectedValues && this._declarativeSelectedValues.length > 0) {
            initialValues = this._declarativeSelectedValues;
            dataLogger.debug(`[MultiSelectElement] Using ${initialValues.length} declaratively selected values`);
        } else {
            // Fall back to initial-values attribute
            const initialValuesAttr = this.getAttribute('initial-values');
            if (initialValuesAttr) {
                try {
                    initialValues = JSON.parse(initialValuesAttr);
                } catch (e) {
                    dataLogger.error('[MultiSelectElement] Failed to parse initial-values:', e);
                }
            }
        }

        // Map external attribute names to internal config (external → internal with 'is' prefix for booleans)
        const options: Partial<MultiSelectConfig<T>> = {
            // String options
            searchHint: this.getAttribute('search-hint') || undefined,
            searchPlaceholder: this.getAttribute('search-placeholder') || 'Search...',
            dropdownMinWidth: this.getAttribute('dropdown-min-width') || undefined,
            dropdownMaxWidth: this.getAttribute('dropdown-max-width') || undefined,
            badgesDisplayMode: (this.getAttribute('badges-display-mode') as any) || 'badges',
            badgesPosition: (this.getAttribute('badges-position') as any) || 'bottom',
            badgesThresholdMode: (this.getAttribute('badges-threshold-mode') as any) || 'count',
            maxHeight: this.getAttribute('max-height') || '20rem',
            emptyMessage: this.getAttribute('empty-message') || 'No results found',
            loadingMessage: this.getAttribute('loading-message') || 'Loading...',
            searchInputMode: (this.getAttribute('search-input-mode') as any) || 'normal',
            searchMode: (this.getAttribute('search-mode') as any) || 'filter',
            actionsLayout: (this.getAttribute('actions-layout') as any) || 'nowrap',

            // Number options
            badgesThreshold: this.getAttribute('badges-threshold') ? parseInt(this.getAttribute('badges-threshold')!) : undefined,
            badgesMaxVisible: this.getAttribute('badges-max-visible') ? parseInt(this.getAttribute('badges-max-visible')!) : undefined,
            minSearchLength: this.getAttribute('min-search-length') ? parseInt(this.getAttribute('min-search-length')!) : 0,

            // Boolean options (map external to internal with 'is' prefix)
            isMultipleEnabled: this.getAttribute('multiple') !== 'false',
            isGroupsAllowed: this.getAttribute('allow-groups') !== 'false',
            isCheckboxesShown: this.getAttribute('show-checkboxes') !== 'false',
            isActionsSticky: this.getAttribute('sticky-actions') !== 'false',
            isCloseOnSelect: this.getAttribute('close-on-select') === 'true',
            isPlacementLocked: this.getAttribute('lock-placement') !== 'false',
            isSearchEnabled: this.getAttribute('enable-search') !== 'false',
            isAddNewAllowed: this.getAttribute('allow-add-new') === 'true',
            isCounterShown: this.getAttribute('show-counter') === 'true',
            isKeepOptionsOnSearch: this.getAttribute('keep-options-on-search') !== 'false',
            shouldKeepSearchOnClose: this.getAttribute('should-keep-search-on-close') !== 'false',
            isVirtualScrollEnabled: this.getAttribute('enable-virtual-scroll') === 'true',

            // Action buttons
            actionButtons: this._actionButtons,

            // Checkbox options
            checkboxAlign: (this.getAttribute('checkbox-align') as 'top' | 'center' | 'bottom') || 'center',

            // Virtual scroll options
            virtualScrollThreshold: this.getAttribute('virtual-scroll-threshold') ? parseInt(this.getAttribute('virtual-scroll-threshold')!) : 100,
            optionHeight: this.getAttribute('option-height') ? parseInt(this.getAttribute('option-height')!) : 50,
            badgeHeight: this.getAttribute('badge-height') ? parseInt(this.getAttribute('badge-height')!) : 36,
            virtualScrollBuffer: this.getAttribute('virtual-scroll-buffer') ? parseInt(this.getAttribute('virtual-scroll-buffer')!) : 10,

            // Member properties
            valueMember: this.getAttribute('value-member') || this._valueMember,
            displayValueMember: this.getAttribute('display-value-member') || this._displayValueMember,
            searchValueMember: this.getAttribute('search-value-member') || this._searchValueMember,
            iconMember: this.getAttribute('icon-member') || this._iconMember,
            subtitleMember: this.getAttribute('subtitle-member') || this._subtitleMember,
            groupMember: this.getAttribute('group-member') || this._groupMember,
            disabledMember: this.getAttribute('disabled-member') || this._disabledMember,

            // Callback properties (JavaScript only)
            getValueCallback: this._getValueCallback,
            getDisplayValueCallback: this._getDisplayValueCallback,
            getBadgeDisplayCallback: this._getBadgeDisplayCallback,
            getBadgeClassCallback: this._getBadgeClassCallback,
            customStylesCallback: this._customStylesCallback,
            getSearchValueCallback: this._getSearchValueCallback,
            getIconCallback: this._getIconCallback,
            getSubtitleCallback: this._getSubtitleCallback,
            getGroupCallback: this._getGroupCallback,
            renderGroupLabelContentCallback: this._renderGroupLabelContentCallback,
            getDisabledCallback: this._getDisabledCallback,

            // Custom rendering callbacks
            renderOptionContentCallback: this._renderOptionContentCallback,
            renderBadgeContentCallback: this._renderBadgeContentCallback,
            renderSelectedItemContentCallback: this._renderSelectedItemContentCallback,
            getSelectedItemClassCallback: this._getSelectedItemClassCallback,
            renderSelectedContentCallback: this._renderSelectedContentCallback,

            // Form integration & value formatting
            formFieldId: this.getAttribute('name') || undefined,
            valueFormat: (this.getAttribute('value-format') as any) || 'json',
            getValueFormatCallback: this._getValueFormatCallback,

            // Tooltip options
            isBadgeTooltipsEnabled: this.getAttribute('enable-badge-tooltips') === 'true',
            getBadgeTooltipCallback: this._getBadgeTooltipCallback,
            getRemoveButtonTooltipCallback: this._getRemoveButtonTooltipCallback,
            removeButtonTooltipText: this.getAttribute('remove-button-tooltip-text') || undefined,
            badgeTooltipPlacement: (this.getAttribute('badge-tooltip-placement') as any) || 'top',
            badgeTooltipDelay: parseInt(this.getAttribute('badge-tooltip-delay') || '100'),
            badgeTooltipOffset: parseInt(this.getAttribute('badge-tooltip-offset') || '8'),

            // Count badge callback
            getCounterCallback: this._getCounterCallback || ((count: number, moreCount?: number) => {
                if (moreCount !== undefined) {
                    return `+${moreCount} more`;
                }
                return `${count} selected`;
            }),

            // Data and callbacks
            options: this._options,
            beforeSearchCallback: this._beforeSearchCallback,
            searchCallback: this._searchCallback,
            addNewCallback: this._addNewCallback,
            selectCallback: (option) => {
                if (this._selectCallback) this._selectCallback(option);
                this.dispatchEvent(new CustomEvent('select', {
                    detail: {
                        option,
                        selectedOptions: this.picker?.getSelected(),
                        selectedValues: this.collectSelectedValues()
                    } as MultiSelectEventDetail<T>
                }));
            },
            deselectCallback: (option) => {
                if (this._deselectCallback) this._deselectCallback(option);
                this.dispatchEvent(new CustomEvent('deselect', {
                    detail: {
                        option,
                        selectedOptions: this.picker?.getSelected(),
                        selectedValues: this.collectSelectedValues()
                    } as MultiSelectEventDetail<T>
                }));
            },
            changeCallback: (selectedOptions) => {
                if (this._changeCallback) this._changeCallback(selectedOptions);
                this.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        selectedOptions,
                        selectedValues: this.collectSelectedValues()
                    } as MultiSelectEventDetail<T>
                }));
            },
            // Pass shadow root as container for dropdown/hint/popover
            container: this.shadow as unknown as HTMLElement,
            // Pass host element (this) for hidden inputs in light DOM
            hostElement: this
        };

        // Set data attributes on container
        if (initialValues) {
            this.containerElement.dataset.initialValues = JSON.stringify(initialValues);
        }

        this.picker = new WebMultiSelect<T>(this.containerElement, options);

        // Inject custom styles if callback provided
        // Prepend to shadow root so @import rules work (must be at top of stylesheet)
        if (this._customStylesCallback) {
            const customStyles = this._customStylesCallback();
            if (customStyles) {
                const customStyleSheet = document.createElement('style');
                customStyleSheet.className = 'ms-custom-styles';
                customStyleSheet.textContent = customStyles;
                // Insert at beginning of shadow root so @import/@font-face work
                this.shadow.insertBefore(customStyleSheet, this.shadow.firstChild);
            }
        }
    }

    private reinitialize() {
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    /** Normalize the picker's getValue() return into the array form expected by event detail. */
    private collectSelectedValues(): (string | number)[] {
        const val = this.picker?.getValue();
        if (val == null) return [];
        return Array.isArray(val) ? val : [val];
    }

    // ========================================================================
    // PUBLIC API - PROPERTIES
    // ========================================================================

    // Data options
    get options(): T[] | undefined {
        return this._options;
    }

    set options(value: T[] | undefined) {
        this._options = value;
        this.reinitialize();
    }

    // Member properties (can also be set via attributes)
    set valueMember(value: string | null) {
        this._valueMember = value || undefined;
        if (value) this.setAttribute('value-member', value);
        else this.removeAttribute('value-member');
    }

    get valueMember(): string | null {
        return this.getAttribute('value-member');
    }

    set displayValueMember(value: string | null) {
        this._displayValueMember = value || undefined;
        if (value) this.setAttribute('display-value-member', value);
        else this.removeAttribute('display-value-member');
    }

    get displayValueMember(): string | null {
        return this.getAttribute('display-value-member');
    }

    set searchValueMember(value: string | null) {
        this._searchValueMember = value || undefined;
        if (value) this.setAttribute('search-value-member', value);
        else this.removeAttribute('search-value-member');
    }

    get searchValueMember(): string | null {
        return this.getAttribute('search-value-member');
    }

    set iconMember(value: string | null) {
        this._iconMember = value || undefined;
        if (value) this.setAttribute('icon-member', value);
        else this.removeAttribute('icon-member');
    }

    get iconMember(): string | null {
        return this.getAttribute('icon-member');
    }

    set subtitleMember(value: string | null) {
        this._subtitleMember = value || undefined;
        if (value) this.setAttribute('subtitle-member', value);
        else this.removeAttribute('subtitle-member');
    }

    get subtitleMember(): string | null {
        return this.getAttribute('subtitle-member');
    }

    set groupMember(value: string | null) {
        this._groupMember = value || undefined;
        if (value) this.setAttribute('group-member', value);
        else this.removeAttribute('group-member');
    }

    get groupMember(): string | null {
        return this.getAttribute('group-member');
    }

    set disabledMember(value: string | null) {
        this._disabledMember = value || undefined;
        if (value) this.setAttribute('disabled-member', value);
        else this.removeAttribute('disabled-member');
    }

    get disabledMember(): string | null {
        return this.getAttribute('disabled-member');
    }

    // Callback properties (JavaScript only - no attributes)
    set getValueCallback(callback: ((item: T) => string | number) | undefined) {
        this._getValueCallback = callback;
        this.reinitialize();
    }

    get getValueCallback() {
        return this._getValueCallback;
    }

    set getDisplayValueCallback(callback: ((item: T) => string) | undefined) {
        this._getDisplayValueCallback = callback;
        this.reinitialize();
    }

    get getDisplayValueCallback() {
        return this._getDisplayValueCallback;
    }

    set getBadgeDisplayCallback(callback: ((item: T) => string) | undefined) {
        this._getBadgeDisplayCallback = callback;
        this.reinitialize();
    }

    get getBadgeDisplayCallback() {
        return this._getBadgeDisplayCallback;
    }

    set getBadgeClassCallback(callback: ((item: T) => string | string[]) | undefined) {
        this._getBadgeClassCallback = callback;
        this.reinitialize();
    }

    get getBadgeClassCallback() {
        return this._getBadgeClassCallback;
    }

    set customStylesCallback(value: (() => string) | undefined) {
        this._customStylesCallback = value;
        // If picker already exists, we need to reinject styles
        // Remove old custom styles and inject new ones
        if (this.picker && value) {
            const customStyles = value();
            if (customStyles) {
                // Remove old custom stylesheet if exists
                const oldCustomStyle = this.shadow.querySelector('style.ms-custom-styles');
                if (oldCustomStyle) {
                    oldCustomStyle.remove();
                }
                // Inject new custom styles
                const customStyleSheet = document.createElement('style');
                customStyleSheet.className = 'ms-custom-styles';
                customStyleSheet.textContent = customStyles;
                this.shadow.appendChild(customStyleSheet);
                // Trigger re-render to apply new styles
                (this.picker as any).renderBadges();
            }
        }
    }

    get customStylesCallback(): (() => string) | undefined {
        return this._customStylesCallback;
    }

    set getSearchValueCallback(callback: ((item: T) => string) | undefined) {
        this._getSearchValueCallback = callback;
        this.reinitialize();
    }

    get getSearchValueCallback() {
        return this._getSearchValueCallback;
    }

    set getIconCallback(callback: ((item: T) => string) | undefined) {
        this._getIconCallback = callback;
        this.reinitialize();
    }

    get getIconCallback() {
        return this._getIconCallback;
    }

    set getSubtitleCallback(callback: ((item: T) => string) | undefined) {
        this._getSubtitleCallback = callback;
        this.reinitialize();
    }

    get getSubtitleCallback() {
        return this._getSubtitleCallback;
    }

    set getGroupCallback(callback: ((item: T) => string) | undefined) {
        this._getGroupCallback = callback;
        this.reinitialize();
    }

    get getGroupCallback() {
        return this._getGroupCallback;
    }

    set renderGroupLabelContentCallback(callback: ((groupName: string) => string | HTMLElement) | undefined) {
        this._renderGroupLabelContentCallback = callback;
        this.reinitialize();
    }

    get renderGroupLabelContentCallback() {
        return this._renderGroupLabelContentCallback;
    }

    set getDisabledCallback(callback: ((item: T) => boolean) | undefined) {
        this._getDisabledCallback = callback;
        this.reinitialize();
    }

    get getDisabledCallback() {
        return this._getDisabledCallback;
    }

    // Custom rendering callbacks
    set renderOptionContentCallback(callback: ((item: T, context: OptionContentRenderContext) => string | HTMLElement) | undefined) {
        this._renderOptionContentCallback = callback;
        this.reinitialize();
    }

    get renderOptionContentCallback() {
        return this._renderOptionContentCallback;
    }

    set renderBadgeContentCallback(callback: ((item: T, context: BadgeContentRenderContext) => string | HTMLElement) | undefined) {
        this._renderBadgeContentCallback = callback;
        this.reinitialize();
    }

    get renderBadgeContentCallback() {
        return this._renderBadgeContentCallback;
    }

    set renderSelectedItemContentCallback(callback: ((item: T) => string | HTMLElement) | undefined) {
        this._renderSelectedItemContentCallback = callback;
        this.reinitialize();
    }

    get renderSelectedItemContentCallback() {
        return this._renderSelectedItemContentCallback;
    }

    set getSelectedItemClassCallback(callback: ((item: T) => string | string[]) | undefined) {
        this._getSelectedItemClassCallback = callback;
        this.reinitialize();
    }

    get getSelectedItemClassCallback() {
        return this._getSelectedItemClassCallback;
    }

    set renderSelectedContentCallback(callback: ((item: T) => string) | undefined) {
        this._renderSelectedContentCallback = callback;
        this.reinitialize();
    }

    get renderSelectedContentCallback() {
        return this._renderSelectedContentCallback;
    }

    // Form integration
    set name(value: string | null) {
        if (value) this.setAttribute('name', value);
        else this.removeAttribute('name');
    }

    get name(): string | null {
        return this.getAttribute('name');
    }

    set valueFormat(value: 'json' | 'csv' | 'array' | null) {
        if (value) this.setAttribute('value-format', value);
        else this.removeAttribute('value-format');
    }

    get valueFormat(): string | null {
        return this.getAttribute('value-format');
    }

    set getValueFormatCallback(callback: ((values: (string | number)[]) => string) | undefined) {
        this._getValueFormatCallback = callback;
        this.reinitialize();
    }

    get getValueFormatCallback() {
        return this._getValueFormatCallback;
    }

    // Badges display options
    set thresholdMode(value: 'count' | 'partial' | null) {
        if (value) this.setAttribute('threshold-mode', value);
        else this.removeAttribute('threshold-mode');
    }

    get thresholdMode(): string | null {
        return this.getAttribute('threshold-mode');
    }

    set badgesMaxVisible(value: number | null) {
        if (value !== null) this.setAttribute('badges-max-visible', String(value));
        else this.removeAttribute('badges-max-visible');
    }

    get badgesMaxVisible(): number | null {
        const value = this.getAttribute('badges-max-visible');
        return value ? parseInt(value) : null;
    }

    // Checkbox options
    set checkboxAlign(value: 'top' | 'center' | 'bottom' | null) {
        if (value) this.setAttribute('checkbox-align', value);
        else this.removeAttribute('checkbox-align');
    }

    get checkboxAlign(): string | null {
        return this.getAttribute('checkbox-align');
    }

    // Tooltip options
    set enableBadgeTooltips(value: boolean) {
        if (value) this.setAttribute('enable-badge-tooltips', 'true');
        else this.removeAttribute('enable-badge-tooltips');
    }

    get enableBadgeTooltips(): boolean {
        return this.getAttribute('enable-badge-tooltips') === 'true';
    }

    set badgeTooltipPlacement(value: string | null) {
        if (value) this.setAttribute('badge-tooltip-placement', value);
        else this.removeAttribute('badge-tooltip-placement');
    }

    get badgeTooltipPlacement(): string | null {
        return this.getAttribute('badge-tooltip-placement');
    }

    set getBadgeTooltipCallback(callback: ((item: T) => string | HTMLElement) | undefined) {
        this._getBadgeTooltipCallback = callback;
        this.reinitialize();
    }

    get getBadgeTooltipCallback() {
        return this._getBadgeTooltipCallback;
    }

    set getRemoveButtonTooltipCallback(callback: ((item: T) => string) | undefined) {
        this._getRemoveButtonTooltipCallback = callback;
        this.reinitialize();
    }

    get getRemoveButtonTooltipCallback() {
        return this._getRemoveButtonTooltipCallback;
    }

    set removeButtonTooltipText(value: string | null) {
        if (value) {
            this.setAttribute('remove-button-tooltip-text', value);
        } else {
            this.removeAttribute('remove-button-tooltip-text');
        }
    }

    get removeButtonTooltipText(): string | null {
        return this.getAttribute('remove-button-tooltip-text');
    }

    set getCounterCallback(callback: ((count: number, moreCount?: number) => string) | undefined) {
        this._getCounterCallback = callback;
        this.reinitialize();
    }

    get getCounterCallback() {
        return this._getCounterCallback;
    }

    // Event callbacks
    get beforeSearchCallback(): ((searchTerm: string) => string | null) | undefined {
        return this._beforeSearchCallback;
    }

    set beforeSearchCallback(callback: ((searchTerm: string) => string | null) | undefined) {
        this._beforeSearchCallback = callback;
        this.reinitialize();
    }

    get searchCallback(): ((searchTerm: string) => Promise<T[]>) | undefined {
        return this._searchCallback;
    }

    set searchCallback(callback: ((searchTerm: string) => Promise<T[]>) | undefined) {
        this._searchCallback = callback;
        this.reinitialize();
    }

    get addNewCallback(): ((value: string) => T | Promise<T>) | undefined {
        return this._addNewCallback;
    }

    set addNewCallback(callback: ((value: string) => T | Promise<T>) | undefined) {
        this._addNewCallback = callback;
        this.reinitialize();
    }

    get selectCallback(): ((option: T) => void) | undefined {
        return this._selectCallback;
    }

    set selectCallback(callback: ((option: T) => void) | undefined) {
        this._selectCallback = callback;
    }

    get deselectCallback(): ((option: T) => void) | undefined {
        return this._deselectCallback;
    }

    set deselectCallback(callback: ((option: T) => void) | undefined) {
        this._deselectCallback = callback;
    }

    get changeCallback(): ((selectedOptions: T[]) => void) | undefined {
        return this._changeCallback;
    }

    set changeCallback(callback: ((selectedOptions: T[]) => void) | undefined) {
        this._changeCallback = callback;
    }

    // Action buttons
    get actionButtons(): any[] | undefined {
        return this._actionButtons;
    }

    set actionButtons(value: any[] | undefined) {
        this._actionButtons = value;
        this.reinitialize();
    }

    // New public properties
    get selectedValue(): string | number | (string | number)[] | null {
        return this.picker?.selectedValue ?? null;
    }

    get selectedItem(): T | null {
        return this.picker?.selectedItem ?? null;
    }

    // ========================================================================
    // PUBLIC API - METHODS
    // ========================================================================

    getSelected(): T[] {
        return this.picker ? this.picker.getSelected() : [];
    }

    setSelected(values: (string | number)[]): void {
        if (this.picker) {
            this.picker.setSelected(values);
        }
    }

    getValue(): string | number | (string | number)[] | null {
        return this.picker ? this.picker.getValue() : null;
    }

    destroy(): void {
        if (this.picker) {
            this.picker.destroy();
        }
    }
}

// Auto-register the custom element (browser only)
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('web-multiselect')) {
        customElements.define('web-multiselect', MultiSelectElement);
    }
}
