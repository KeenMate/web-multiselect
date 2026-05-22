/**
 * Pure Admin - MultiSelect with Typeahead
 * Comprehensive multiselect component with rich content support and floating hints
 */

import { computePosition, flip, offset, autoUpdate, shift, type Placement } from '@floating-ui/dom';
import type { MultiSelectConfig, BadgesPosition, SearchInputMode, SearchMode, OptionContentRenderContext, BadgeContentRenderContext } from './types';
import { initLogger, dataLogger, uiLogger, interactionLogger } from './logger';
import { VirtualScroll } from './virtual-scroll';
import { Tooltip } from './tooltip';

export class WebMultiSelect<T = any> {
    private element: HTMLElement;
    private instanceId: string;
    private options: MultiSelectConfig<T>;

    private isOpen = false;
    private selectedValues = new Set<string>();
    private selectedOptions = new Map<string, T>();
    private allOptions: T[] = [];
    private filteredOptions: T[] = [];
    private hiddenInputs: HTMLInputElement[] = [];
    private focusedIndex = -1;
    private matchingIndices: Set<number> = new Set();
    private searchTerm = '';
    private isLoading = false;
    private showSelectedPopover = false;
    private selectedPopoverPlacement: Placement | null = null;
    private dropdownPlacement: Placement | null = null;
    private isRTL = false;
    private effectiveBadgesPosition: BadgesPosition = 'bottom';
    private justClosedViaClick = false;

    // Floating UI cleanup functions
    private dropdownCleanup: (() => void) | null = null;
    private hintCleanup: (() => void) | null = null;
    private selectedPopoverCleanup: (() => void) | null = null;

    // All hover tooltips (badge text, badge-remove buttons, action buttons), keyed by id.
    private tooltips = new Map<string, Tooltip>();

    // Virtual scroll instance
    private virtualScroll: VirtualScroll<T> | null = null;
    private optionsContainer: HTMLDivElement | null = null;
    private selectedPopoverVirtualScroll: VirtualScroll<T> | null = null;
    private selectedPopoverContainer: HTMLDivElement | null = null;

    // DOM elements
    private input!: HTMLInputElement;
    private dropdown!: HTMLDivElement;
    private dropdownInner!: HTMLDivElement;
    private badgesContainer!: HTMLDivElement;
    private counter!: HTMLSpanElement;
    private hint?: HTMLDivElement;
    private selectedPopover!: HTMLDivElement;

    // Document-level event handlers (stored for cleanup)
    private documentKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;

    // ========================================================================
    // DATA EXTRACTION METHODS (following svelte-treeview pattern)
    // ========================================================================

    /**
     * Generic field extractor with the precedence:
     *   tuple short-circuit -> member property -> callback -> fallback
     *
     * Tuple handling:
     *   - `tupleIndex` (0 | 1): for `[key, value]` items, return that slot.
     *   - `tupleSkip: true`: for any tuple, skip directly to fallback (used for icon/subtitle/group/disabled —
     *     fields that don't make sense on a 2-element array).
     *   - neither: tuples flow through the member/callback/fallback chain as if they were objects.
     *
     * `transform` is applied to tuple-slot and member-property reads (not to callback returns or the fallback),
     * so e.g. you can pass `String` to coerce numeric members to strings while letting a typed callback return its
     * own type unchanged.
     */
    private extractField<R>(item: T, opts: {
        member?: string;
        callback?: (item: T) => R;
        tupleIndex?: 0 | 1;
        tupleSkip?: boolean;
        transform?: (raw: any) => R;
        fallback: R | (() => R);
    }): R {
        const isTuple = Array.isArray(item) && item.length === 2;

        if (isTuple) {
            if (opts.tupleSkip) {
                // skip member/callback for tuples — go straight to fallback
                return typeof opts.fallback === 'function' ? (opts.fallback as () => R)() : opts.fallback;
            }
            if (opts.tupleIndex !== undefined) {
                const raw = (item as any)[opts.tupleIndex];
                return opts.transform ? opts.transform(raw) : raw;
            }
        }

        if (opts.member && (item as any)[opts.member] !== undefined) {
            const raw = (item as any)[opts.member];
            return opts.transform ? opts.transform(raw) : raw;
        }

        if (opts.callback) {
            return opts.callback(item);
        }

        return typeof opts.fallback === 'function' ? (opts.fallback as () => R)() : opts.fallback;
    }

    private getItemValue(item: T): string | number {
        return this.extractField<string | number>(item, {
            tupleIndex: 0,
            member: this.options.valueMember,
            callback: this.options.getValueCallback,
            fallback: '[N/A]'
        });
    }

    private getItemDisplayValue(item: T): string {
        return this.extractField<string>(item, {
            tupleIndex: 1,
            member: this.options.displayValueMember,
            callback: this.options.getDisplayValueCallback,
            transform: String,
            fallback: '[N/A]'
        });
    }

    /**
     * Badge display falls back to the regular display value rather than '[N/A]', so consumers can override badge
     * text independently. Doesn't fit the extractField shape (no tuple/member layer of its own).
     */
    private getItemBadgeDisplayValue(item: T): string {
        if (this.options.getBadgeDisplayCallback) return this.options.getBadgeDisplayCallback(item);
        return this.getItemDisplayValue(item);
    }

    private getItemSearchValue(item: T): string {
        return this.extractField<string>(item, {
            member: this.options.searchValueMember,
            callback: this.options.getSearchValueCallback,
            transform: String,
            fallback: () => this.getItemDisplayValue(item)
        });
    }

    private getItemIcon(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.iconMember,
            callback: this.options.getIconCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemSubtitle(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.subtitleMember,
            callback: this.options.getSubtitleCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemGroup(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.groupMember,
            callback: this.options.getGroupCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemDisabled(item: T): boolean {
        return this.extractField<boolean>(item, {
            tupleSkip: true,
            member: this.options.disabledMember,
            callback: this.options.getDisabledCallback,
            transform: Boolean,
            fallback: false
        });
    }

    constructor(element: HTMLElement, options: Partial<MultiSelectConfig<T>> = {}) {
        this.element = element;
        this.instanceId = `MS-${Math.random().toString(36).slice(2, 11)}`;

        // Merge options with defaults (using internal naming with 'is' prefix for booleans)
        this.options = {
            // String options
            searchHint: element.dataset.searchHint || '',
            searchPlaceholder: element.dataset.searchPlaceholder || 'Search...',
            dropdownMinWidth: element.dataset.dropdownMinWidth || undefined,
            dropdownMaxWidth: element.dataset.dropdownMaxWidth || undefined,
            badgesDisplayMode: (element.dataset.badgesDisplayMode as any) || 'badges',
            badgesPosition: (element.dataset.badgesPosition as BadgesPosition) || 'bottom',
            badgesThresholdMode: (element.dataset.badgesThresholdMode as any) || 'count',
            maxHeight: element.dataset.maxHeight || '20rem',
            emptyMessage: element.dataset.emptyMessage || 'No results found',
            loadingMessage: element.dataset.loadingMessage || 'Loading...',
            searchInputMode: (element.dataset.searchInputMode as SearchInputMode) || 'normal',
            searchMode: (element.dataset.searchMode as SearchMode) || 'filter',

            // Number options
            badgesThreshold: element.dataset.badgesThreshold ? parseInt(element.dataset.badgesThreshold) : undefined,
            minSearchLength: parseInt(element.dataset.minSearchLength || '0') || 0,

            // Boolean options (internal names with 'is' prefix)
            isMultipleEnabled: element.dataset.multiple !== 'false',
            isGroupsAllowed: element.dataset.allowGroups !== 'false',
            isCheckboxesShown: element.dataset.showCheckboxes !== 'false',
            isActionsSticky: element.dataset.stickyActions !== 'false',
            isCloseOnSelect: element.dataset.closeOnSelect === 'true',
            isPlacementLocked: element.dataset.lockPlacement !== 'false',
            isSearchEnabled: element.dataset.enableSearch !== 'false',
            isAddNewAllowed: element.dataset.allowAddNew === 'true',
            isCounterShown: element.dataset.showCounter === 'true',
            isKeepOptionsOnSearch: element.dataset.keepOptionsOnSearch !== 'false',
            shouldKeepSearchOnClose: element.dataset.keepSearchOnClose !== 'false',

            // Data and callbacks
            options: [],
            container: undefined,

            // Override with provided options
            ...options
        };

        this.init();
    }

    private init(): void {
        this.parseOptions();
        this.buildHTML();
        this.attachEvents();
        this.parseInitialSelection();

        initLogger.debug(`Initialized [${this.instanceId}] with options:`, {
            placeholder: this.options.searchPlaceholder,
            totalOptions: this.allOptions.length,
            isCloseOnSelect: this.options.isCloseOnSelect,
            dataAttribute: this.element.dataset.closeOnSelect
        });
    }

    private parseOptions(): void {
        const dataOptions = this.element.dataset.options;
        if (dataOptions) {
            try {
                this.allOptions = JSON.parse(dataOptions);
            } catch (e) {
                dataLogger.error(`[${this.instanceId}] Failed to parse data-options:`, e);
                this.allOptions = [];
            }
        } else if (this.options.options) {
            this.allOptions = this.options.options;
        }

        this.filteredOptions = [...this.allOptions];
    }

    private buildHTML(): void {
        // Get container for dropdown/hint/popover (Shadow DOM or body)
        const container = this.options.container || document.body;

        // Detect RTL mode from dir attribute on host element (for shadow DOM) or element itself
        // In shadow DOM, we need to check the host element (<multi-select>), not the shadow root contents
        const rootNode = this.element.getRootNode();
        const hostElement = rootNode instanceof ShadowRoot
            ? (rootNode as ShadowRoot).host as HTMLElement
            : this.element;

        const hasElementDir = hostElement.getAttribute('dir') === 'rtl';
        const hasAncestorDir = hostElement.closest('[dir="rtl"]') !== null;
        this.isRTL = hasElementDir || hasAncestorDir;

        initLogger.debug(`[${this.instanceId}] RTL Debug:`, {
            isShadowRoot: rootNode instanceof ShadowRoot,
            hostElement,
            elementDir: hostElement.getAttribute('dir'),
            hasElementDir,
            hasAncestorDir,
            isRTL: this.isRTL
        });

        // Mirror badgesPosition in RTL mode (logical positioning)
        this.effectiveBadgesPosition = this.options.badgesPosition || 'bottom';
        if (this.isRTL) {
            if (this.effectiveBadgesPosition === 'left') {
                this.effectiveBadgesPosition = 'right';
            } else if (this.effectiveBadgesPosition === 'right') {
                this.effectiveBadgesPosition = 'left';
            }
        }

        // Add classes to the element
        this.element.classList.add('ms');

        if (this.isRTL) {
            this.element.classList.add('ms--rtl');
            initLogger.debug(`[${this.instanceId}] Added ms--rtl class to element`);
        }

        if (!this.options.isCheckboxesShown || !this.options.isMultipleEnabled) {
            this.element.classList.add('ms--no-checkboxes');
        }

        // Create input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'ms__input-wrapper';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'ms__input';
        this.input.placeholder = this.options.searchPlaceholder;
        this.input.autocomplete = 'off';

        // Apply searchInputMode
        if (this.options.searchInputMode === 'readonly') {
            this.input.readOnly = true;
        } else if (this.options.searchInputMode === 'hidden') {
            this.input.style.display = 'none';
        }

        const toggle = document.createElement('span');
        toggle.className = 'ms__toggle';
        toggle.innerHTML = '▼';

        this.counter = document.createElement('span');
        this.counter.className = 'ms__counter';
        this.counter.style.display = 'none';

        inputWrapper.appendChild(this.input);
        inputWrapper.appendChild(this.counter);
        inputWrapper.appendChild(toggle);

        // Create badges container
        this.badgesContainer = document.createElement('div');
        this.badgesContainer.className = 'ms__badges';

        // Create wrapper for input and badges (needed for positioning)
        const wrapper = document.createElement('div');
        wrapper.className = 'ms-wrapper';

        // Add layout modifier based on badges position
        if (this.effectiveBadgesPosition === 'left' || this.effectiveBadgesPosition === 'right') {
            wrapper.classList.add('ms-wrapper--inline');
        }

        // Build the structure: element contains wrapper, which contains inputWrapper and badgesContainer
        wrapper.appendChild(inputWrapper);
        wrapper.appendChild(this.badgesContainer);
        this.element.appendChild(wrapper);

        // Create dropdown (attached to container)
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'ms__dropdown';
        // Inner wrapper handles scrolling, outer clips to border-radius
        this.dropdownInner = document.createElement('div');
        this.dropdownInner.className = 'ms__dropdown-inner';
        this.dropdown.appendChild(this.dropdownInner);
        container.appendChild(this.dropdown);

        // Create hint if provided (attached to container)
        if (this.options.searchHint) {
            this.hint = document.createElement('div');
            this.hint.className = 'ms__hint';
            this.hint.textContent = this.options.searchHint;
            container.appendChild(this.hint);
        }

        // Create selected popover (attached to container)
        this.selectedPopover = document.createElement('div');
        this.selectedPopover.className = 'ms__selected-popover';
        container.appendChild(this.selectedPopover);

        this.renderDropdown();
    }

    /**
     * Check if virtual scroll should be used
     */
    private shouldUseVirtualScroll(): boolean {
        if (!this.options.isVirtualScrollEnabled) return false;
        if (this.options.isGroupsAllowed && this.hasGroups()) return false; // Disable for groups (v1 limitation)

        const threshold = this.options.virtualScrollThreshold ?? 100;
        return this.filteredOptions.length >= threshold;
    }

    /**
     * Check if any options have groups
     */
    private hasGroups(): boolean {
        return this.filteredOptions.some(option => {
            const group = this.getItemGroup(option);
            return group && group.trim() !== '';
        });
    }

    private renderDropdown(): void {
        // Clean up any existing action button tooltips before re-rendering
        this.destroyAllActionButtonTooltips();

        // Check if we should use virtual scrolling
        if (this.shouldUseVirtualScroll()) {
            // Add virtual scroll class to dropdown for CSS adjustments
            this.dropdown.classList.add('ms__dropdown--virtual');
            this.renderDropdownVirtual();
            return;
        }
        // Remove virtual scroll class if not using it
        this.dropdown.classList.remove('ms__dropdown--virtual');

        // Clean up virtual scroll when switching to normal rendering
        // This prevents stale references when items drop below threshold (e.g., search with 0 results)
        if (this.virtualScroll) {
            this.virtualScroll.destroy();
            this.virtualScroll = null;
            this.optionsContainer = null;
        }

        // Normal rendering (existing code)
        let html = '';

        if (this.isLoading) {
            html += '<div class="ms__loader">';
            html += '<div class="pa-loader pa-loader--sm"></div>';
            html += `<div class="ms__loading-text">${this.options.loadingMessage}</div>`;
            html += '</div>';
            this.dropdownInner.innerHTML = html;
            return;
        }

        html += this.renderActionsHTML();

        html += '<div class="ms__options">';

        if (this.filteredOptions.length === 0) {
            html += `<div class="ms__empty">${this.options.emptyMessage}</div>`;
        } else {
            if (this.options.isGroupsAllowed) {
                const groups = this.groupOptions(this.filteredOptions);
                // Each option's index must be its position in `filteredOptions`, not its position
                // within its group — `focusedIndex` is global, so per-group indices would make
                // every group's Nth item appear focused at once.
                const indexOf = new Map<T, number>();
                this.filteredOptions.forEach((opt, i) => indexOf.set(opt, i));
                Object.keys(groups).forEach(groupName => {
                    html += '<div class="ms__group">';
                    if (groupName !== '__ungrouped__') {
                        // Check if custom group label callback is provided
                        if (this.options.renderGroupLabelContentCallback) {
                            const customContent = this.options.renderGroupLabelContentCallback(groupName);
                            if (customContent instanceof HTMLElement) {
                                // HTMLElement - wrap in group-label div
                                const wrapper = document.createElement('div');
                                wrapper.className = 'ms__group-label';
                                wrapper.appendChild(customContent);
                                html += wrapper.outerHTML;
                            } else {
                                // String (HTML or plain text)
                                html += `<div class="ms__group-label">${customContent}</div>`;
                            }
                        } else {
                            // Default rendering
                            html += `<div class="ms__group-label">${groupName}</div>`;
                        }
                    }
                    groups[groupName].forEach(option => {
                        html += this.renderOption(option, indexOf.get(option) ?? -1);
                    });
                    html += '</div>';
                });
            } else {
                this.filteredOptions.forEach((option, index) => {
                    html += this.renderOption(option, index);
                });
            }
        }

        html += '</div>';
        this.dropdownInner.innerHTML = html;

        // Attach tooltips to action buttons after rendering
        this.attachActionButtonTooltips();
    }

    /**
     * Render dropdown with virtual scrolling
     */
    private renderDropdownVirtual(): void {
        // Clean up any existing action button tooltips before re-rendering
        this.destroyAllActionButtonTooltips();

        // Only create HTML structure if virtual scroll doesn't exist yet
        if (!this.virtualScroll) {
            let html = '';

            // Render actions (Select All/Clear All) outside virtual scroll
            html += this.renderActionsHTML();

            // Create options container for virtual scroll
            // Add inline styles to ensure proper height constraint and scrolling
            const maxHeight = this.options.maxHeight || '20rem';
            const optionHeight = this.options.optionHeight ?? 50;
            html += `<div class="ms__options ms__options--virtual" style="height: ${maxHeight}; max-height: ${maxHeight}; overflow-y: auto; position: relative; --ms-option-height: ${optionHeight}px;"></div>`;
            this.dropdownInner.innerHTML = html;

            // Get options container
            this.optionsContainer = this.dropdownInner.querySelector('.ms__options') as HTMLDivElement;
        }

        if (this.filteredOptions.length === 0) {
            // Destroy virtual scroll when showing empty message to prevent stale state
            if (this.virtualScroll) {
                this.virtualScroll.destroy();
                this.virtualScroll = null;
            }
            this.optionsContainer.innerHTML = `<div class="ms__empty">${this.options.emptyMessage}</div>`;
            return;
        }

        // Initialize or update virtual scroll
        const itemHeight = this.options.optionHeight ?? 50;
        const bufferSize = this.options.virtualScrollBuffer ?? 10;

        // Defer initialization until container has dimensions
        requestAnimationFrame(() => {
            if (!this.optionsContainer) {
                return;
            }

            if (!this.virtualScroll) {
                this.virtualScroll = new VirtualScroll<T>({
                    container: this.optionsContainer,
                    itemHeight,
                    items: this.filteredOptions,
                    renderItem: (item, index) => this.renderOption(item, index),
                    bufferSize
                });
            } else {
                this.virtualScroll.setItems(this.filteredOptions);
            }

            // Attach tooltips to action buttons after rendering
            this.attachActionButtonTooltips();
        });
    }

    /**
     * Render the Select All / Clear All / custom action buttons row.
     * Returns the empty string if multiple-select is off or no buttons are configured.
     */
    private renderActionsHTML(): string {
        const buttons = this.options.actionButtons;
        if (!this.options.isMultipleEnabled || !buttons || buttons.length === 0) return '';

        const stickyClass = this.options.isActionsSticky ? ' ms__actions--sticky' : '';
        const wrapClass = this.options.actionsLayout === 'wrap' ? ' ms__actions--wrap' : '';

        const buttonsHTML = buttons.map((button, buttonIndex) => {
            const isVisible = button.isVisibleCallback ? button.isVisibleCallback(this) : (button.isVisible ?? true);
            if (!isVisible) return '';

            const isDisabled = button.isDisabledCallback ? button.isDisabledCallback(this) : (button.isDisabled ?? false);
            const disabledAttr = isDisabled ? ' disabled' : '';

            const text = button.getTextCallback ? button.getTextCallback(this) : button.text;

            let cssClass = '';
            if (button.getClassCallback) {
                const classes = button.getClassCallback(this);
                cssClass = Array.isArray(classes) ? ` ${classes.join(' ')}` : (classes ? ` ${classes}` : '');
            } else if (button.cssClass) {
                cssClass = ` ${button.cssClass}`;
            }

            return `<button type="button"${disabledAttr} class="ms__action-btn${cssClass}" data-action="${button.action}" data-button-index="${buttonIndex}">${text}</button>`;
        }).join('');

        return `<div class="ms__actions${stickyClass}${wrapClass}">${buttonsHTML}</div>`;
    }

    private renderOption(option: T, index: number): string {
        const value = this.getItemValue(option);
        const displayValue = this.getItemDisplayValue(option);
        const icon = this.getItemIcon(option);
        const subtitle = this.getItemSubtitle(option);
        const disabled = this.getItemDisabled(option);

        const isSelected = this.selectedValues.has(String(value));
        const isFocused = index === this.focusedIndex;
        const isMatched = this.matchingIndices.has(index);

        const classes = ['ms__option'];
        if (isSelected) classes.push('ms__option--selected');
        if (isFocused) classes.push('ms__option--focused');
        if (isMatched) classes.push('ms__option--matched');
        if (disabled) classes.push('ms__option--disabled');

        const checkboxAlignAttr = this.options.checkboxAlign && this.options.checkboxAlign !== 'center'
            ? ` data-checkbox-align="${this.options.checkboxAlign}"`
            : '';

        let html = `<div class="${classes.join(' ')}" data-value="${value}" data-index="${index}"${checkboxAlignAttr}>`;

        if (this.options.isCheckboxesShown && this.options.isMultipleEnabled) {
            html += `<input type="checkbox" class="ms__checkbox" ${isSelected ? 'checked' : ''} ${disabled ? 'disabled' : ''}>`;
        }

        html += '<div class="ms__option-content">';

        // Check if custom render callback is provided
        if (this.options.renderOptionContentCallback) {
            const context: OptionContentRenderContext = {
                index,
                isSelected,
                isFocused,
                isMatched,
                isDisabled: disabled
            };
            const customContent = this.options.renderOptionContentCallback(option, context);

            if (typeof customContent === 'string') {
                html += customContent;
            } else {
                // HTMLElement - convert to HTML string
                html += customContent.outerHTML;
            }
        } else {
            // Default rendering
            if (icon) {
                html += `<span class="ms__option-icon">${icon}</span>`;
            }

            html += '<div class="ms__option-text">';
            html += `<div class="ms__option-title">${this.highlightMatch(displayValue, this.searchTerm)}</div>`;

            if (subtitle) {
                html += `<div class="ms__option-subtitle">${subtitle}</div>`;
            }

            html += '</div>';
        }

        html += '</div>';
        html += '</div>';

        return html;
    }

    private highlightMatch(text: string, searchTerm: string): string {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    private groupOptions(options: T[]): Record<string, T[]> {
        const groups: Record<string, T[]> = {};

        options.forEach(option => {
            const groupName = this.getItemGroup(option) || '__ungrouped__';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(option);
        });

        return groups;
    }

    private renderBadges(): void {
        // Clean up existing tooltips before re-rendering
        this.destroyAllBadgeTooltips();

        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        if (!this.options.isMultipleEnabled) {
            this.badgesContainer.innerHTML = '';
            this.counter.style.display = 'none';

            let selectedLabel: string | undefined;
            if (selectedOptions[0]) {
                // Check if custom render callback is provided
                if (this.options.renderSelectedContentCallback) {
                    selectedLabel = this.options.renderSelectedContentCallback(selectedOptions[0]);
                } else {
                    selectedLabel = this.getItemDisplayValue(selectedOptions[0]);
                }
            }

            if (!this.isOpen && count > 0 && selectedOptions.length > 0) {
                this.input.value = selectedLabel!;
            } else if (!this.isOpen) {
                this.input.value = '';
            }
            return;
        }

        let effectiveMode = this.options.badgesDisplayMode;
        const exceedsThreshold = this.options.badgesThreshold !== null && count > this.options.badgesThreshold;

        // Preserve 'none' mode even when threshold exceeded (user explicitly wants no display)
        if (exceedsThreshold && effectiveMode !== 'none') {
            effectiveMode = this.options.badgesThresholdMode || 'count';
        }

        if (!this.isOpen) {
            if (count > 0 && effectiveMode === 'count') {
                const countText = this.options.getCounterCallback ? this.options.getCounterCallback(count) : `${count} selected`;
                this.input.placeholder = countText;
            } else {
                this.input.placeholder = this.options.searchPlaceholder;
            }
        }

        if (this.options.isCounterShown && count > 0) {
            this.counter.textContent = `[${count}]`;
            this.counter.style.display = '';
        } else {
            this.counter.style.display = 'none';
        }

        // None mode: no display in badges area
        if (effectiveMode === 'none') {
            this.badgesContainer.innerHTML = '';
            return;
        }

        if (effectiveMode === 'badges') {
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
            this.badgesContainer.innerHTML = selectedOptions
                .map(option => this.renderBadgeHTML(option, { displayMode: 'badges', isInPopover: false }))
                .join('');
        } else if (effectiveMode === 'partial') {
            // Partial mode: show limited badges + "+X more" badge
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;

            const maxVisible = this.options.badgesMaxVisible || 3;
            const visibleOptions = selectedOptions.slice(0, maxVisible);
            const remainingCount = count - maxVisible;

            const visibleBadgesHtml = visibleOptions
                .map(option => this.renderBadgeHTML(option, { displayMode: 'partial', isInPopover: false }))
                .join('');

            let moreBadgeHtml = '';
            if (remainingCount > 0) {
                const moreText = this.options.getCounterCallback
                    ? this.options.getCounterCallback(count, remainingCount)
                    : `+${remainingCount} more`;

                moreBadgeHtml = `
                    <div class="ms__badge ms__badge--counter ms__badge--more" data-action="show-selected">
                        <span class="ms__badge-text">${moreText}</span>
                        <button type="button" class="ms__badge-remove" data-action="remove-hidden" aria-label="Remove ${remainingCount} hidden items"></button>
                    </div>
                `;
            }

            this.badgesContainer.innerHTML = visibleBadgesHtml + moreBadgeHtml;
        } else if (effectiveMode === 'compact') {
            // Compact mode: show first item + count in a single removable badge
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
            if (count > 0) {
                const firstItem = selectedOptions[0];
                const firstItemText = this.getItemBadgeDisplayValue(firstItem);
                const remainingCount = count - 1;

                // Build compact text: "FirstItem (+X more)" or just "FirstItem" if only one
                let compactText = firstItemText;
                if (remainingCount > 0) {
                    const moreText = this.options.getCounterCallback
                        ? this.options.getCounterCallback(count, remainingCount)
                        : `+${remainingCount} more`;
                    compactText = `${firstItemText} (${moreText})`;
                }

                this.badgesContainer.innerHTML = `
                    <div class="ms__badge" data-action="show-selected">
                        <span class="ms__badge-text">${compactText}</span>
                        <button type="button" class="ms__badge-remove" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
            } else {
                this.badgesContainer.innerHTML = '';
            }
        } else {
            // Count mode
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
            if (count > 0) {
                const countText = this.options.getCounterCallback ? this.options.getCounterCallback(count) : `${count} selected`;
                this.badgesContainer.innerHTML = `
                    <div class="ms__badge ms__badge--counter" data-action="show-selected">
                        <span class="ms__badge-text">${countText}</span>
                        <button type="button" class="ms__badge-remove" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
            } else {
                this.badgesContainer.innerHTML = '';
            }
        }

        // Attach tooltips after rendering badges
        this.attachBadgeTooltips();
    }

    private attachEvents(): void {
        // Toggle dropdown when clicking input
        this.input.addEventListener('mousedown', (e) => {
            e.stopPropagation();

            if (this.isOpen) {
                // Close if already open and prevent focus from reopening
                this.justClosedViaClick = true;
                this.close();
                setTimeout(() => {
                    this.justClosedViaClick = false;
                }, 0);
            } else {
                // Open if closed (don't rely on focus event as input might already be focused)
                this.open();
            }
        });

        this.input.addEventListener('focus', () => {
            // Open on focus only if not already open and didn't just close via click
            // This handles keyboard navigation (Tab key)
            if (!this.isOpen && !this.justClosedViaClick) {
                this.open();
            }
        });
        this.input.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;

            // Auto-open dropdown when user starts typing (if search is enabled)
            if (this.options.isSearchEnabled && !this.isOpen) {
                this.open();
            }

            this.handleSearch(value);
        });
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Delay click-outside handler to avoid immediate close
        this.documentClickHandler = (e: MouseEvent) => this.handleClickOutside(e);
        setTimeout(() => {
            document.addEventListener('click', this.documentClickHandler!);
        }, 0);

        // Document-level Escape handler for closing popover when input doesn't have focus
        this.documentKeydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.showSelectedPopover) {
                e.preventDefault();
                this.hideSelectedPopover();
            }
        };
        document.addEventListener('keydown', this.documentKeydownHandler);

        this.dropdown.addEventListener('click', (e) => this.handleDropdownClick(e));

        // Prevent page scroll when scrolling dropdown at boundaries
        this.dropdownInner.addEventListener('wheel', (e: WheelEvent) => {
            // In virtual scroll mode, the .ms__options container handles scrolling, not the dropdown
            // Skip this handler to let wheel events reach the virtual scroll container
            if (this.virtualScroll) {
                return;
            }

            const target = e.currentTarget as HTMLElement;
            const atTop = target.scrollTop === 0;
            const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight;

            // Prevent scroll propagation at boundaries
            if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                e.preventDefault();
            }
            e.stopPropagation();
        }, { passive: false });

        // Prevent click propagation for show-selected action (in badges container)
        this.badgesContainer.addEventListener('mousedown', (e) => {
            const showSelectedBtn = (e.target as HTMLElement).closest('[data-action="show-selected"]');
            if (showSelectedBtn && !this.showSelectedPopover) {
                e.stopPropagation();
            }
        });
        this.badgesContainer.addEventListener('click', (e) => this.handleBadgeClick(e));

        // Prevent click propagation for count badge to avoid immediate popover close
        this.counter.addEventListener('mousedown', (e) => {
            if (!this.showSelectedPopover) {
                e.stopPropagation();
            }
        });
        this.counter.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSelectedPopover();
        });

        this.selectedPopover.addEventListener('click', (e) => this.handleSelectedPopoverClick(e));
    }

    private async handleSearch(value: string): Promise<void> {
        this.searchTerm = value;

        // If search is disabled, don't filter options
        if (!this.options.isSearchEnabled) {
            return;
        }

        // Apply beforeSearchCallback if provided (for BOTH async and local search)
        let processedValue = value;
        if (this.options.beforeSearchCallback) {
            const result = this.options.beforeSearchCallback(value);
            if (result === null) {
                // beforeSearchCallback returned null - don't search, show all options
                dataLogger.debug(`[${this.instanceId}] beforeSearchCallback blocked search for term:`, value);
                this.filteredOptions = [...this.allOptions];
                this.matchingIndices.clear();
                this.renderDropdown();
                return;
            }
            processedValue = result;
            if (processedValue !== value) {
                dataLogger.debug(`[${this.instanceId}] beforeSearchCallback transformed: "${value}" -> "${processedValue}"`);
            }
        }

        if (this.options.searchCallback) {
            // ASYNC SEARCH PATH
            // Check minimum search length
            if (processedValue.length < this.options.minSearchLength) {
                this.isLoading = false; // Stop loading state
                if (this.options.isKeepOptionsOnSearch) {
                    // Keep showing initial options
                    this.filteredOptions = [...this.allOptions];
                    dataLogger.debug(`[${this.instanceId}] Search term below minimum, showing ${this.allOptions.length} initial options`);
                } else {
                    // Clear options (old behavior)
                    this.filteredOptions = [];
                }
                this.matchingIndices.clear();
                this.renderDropdown();
                return;
            }

            this.isLoading = true;
            this.renderDropdown();
            dataLogger.debug(`[${this.instanceId}] Loading data for search term:`, processedValue);

            try {
                const results = await this.options.searchCallback(processedValue);

                if (this.searchTerm === value) {
                    const searchResults = results || [];

                    // Always show the search results in filtered options
                    this.filteredOptions = [...searchResults];
                    this.isLoading = false;
                    this.matchingIndices.clear(); // Async search doesn't use matching indices

                    // Auto-focus first option if search is enabled and there are results
                    this.focusedIndex = (this.options.isSearchEnabled && this.filteredOptions.length > 0) ? 0 : -1;
                    this.renderDropdown();
                    dataLogger.debug(`[${this.instanceId}] Loaded ${searchResults.length} results`);
                }
            } catch (error) {
                dataLogger.error(`[${this.instanceId}] Error loading data:`, error);
                this.isLoading = false;
                if (this.options.isKeepOptionsOnSearch) {
                    // Show initial options on error
                    this.filteredOptions = [...this.allOptions];
                } else {
                    this.filteredOptions = [];
                }
                this.matchingIndices.clear();
                this.renderDropdown();
            }
        } else {
            // LOCAL SEARCH PATH
            if (!processedValue) {
                // Empty search - show all options
                this.filteredOptions = [...this.allOptions];
                this.matchingIndices.clear();
                this.focusedIndex = this.filteredOptions.length > 0 ? 0 : -1;
            } else {
                const searchMode = this.options.searchMode || 'filter';
                const lowerSearch = processedValue.toLowerCase();

                if (searchMode === 'filter') {
                    // FILTER MODE: Hide non-matching options (current behavior)
                    this.filteredOptions = this.allOptions.filter(option => {
                        const searchValue = this.getItemSearchValue(option).toLowerCase();
                        return searchValue.includes(lowerSearch);
                    });
                    this.matchingIndices.clear(); // Not used in filter mode
                    // Auto-focus first result
                    this.focusedIndex = this.filteredOptions.length > 0 ? 0 : -1;
                    dataLogger.debug(`[${this.instanceId}] Filter mode: ${this.filteredOptions.length} matches for "${processedValue}"`);
                } else {
                    // NAVIGATE MODE: Keep all options visible, jump to first match, highlight all matches
                    this.filteredOptions = [...this.allOptions];
                    this.matchingIndices.clear();

                    // Find all matching indices and first match
                    let firstMatchIndex = -1;
                    this.allOptions.forEach((option, index) => {
                        const searchValue = this.getItemSearchValue(option).toLowerCase();
                        if (searchValue.includes(lowerSearch)) {
                            this.matchingIndices.add(index);
                            if (firstMatchIndex === -1) {
                                firstMatchIndex = index;
                            }
                        }
                    });

                    // Keep previous focus if no match found (requirement: "keep previous focus")
                    if (firstMatchIndex >= 0) {
                        this.focusedIndex = firstMatchIndex;
                        dataLogger.debug(`[${this.instanceId}] Navigate mode: ${this.matchingIndices.size} matches, jumped to index ${firstMatchIndex}`);
                    } else {
                        // No match found - keep previous focusedIndex
                        dataLogger.debug(`[${this.instanceId}] Navigate mode: No matches found, keeping previous focus`);
                    }
                }
            }
            this.renderDropdown();
            // Scroll to focused item in navigate mode
            if (this.options.searchMode === 'navigate' && this.focusedIndex >= 0) {
                this.scrollToFocused();
            }
        }
    }

    private handleKeydown(e: KeyboardEvent): void {
        if (!this.isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.open();
            }
            return;
        }

        // If search is disabled, block all printable characters except navigation keys
        if (!this.options.isSearchEnabled) {
            const isPrintableChar = e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete';
            const isNavigationKey = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Enter', 'Escape', 'Tab'].includes(e.key);

            if (isPrintableChar && !isNavigationKey) {
                e.preventDefault();
                return;
            }
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd+Down: Jump to next match (navigate mode only)
                    this.focusNextMatch();
                } else {
                    // Down: Next option
                    this.focusNext();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd+Up: Jump to previous match (navigate mode only)
                    this.focusPreviousMatch();
                } else {
                    // Up: Previous option
                    this.focusPrevious();
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (this.focusedIndex >= 0) {
                    this.toggleOption(this.filteredOptions[this.focusedIndex]);
                } else if (this.options.isAddNewAllowed && this.options.addNewCallback && this.input.value.trim()) {
                    // Allow adding a new option if enabled and there's input text
                    this.handleAddNew(this.input.value.trim());
                }
                break;
            case 'Escape':
                e.preventDefault();
                // Priority: 1) Close selected popover, 2) Clear search, 3) Close dropdown
                if (this.showSelectedPopover) {
                    this.hideSelectedPopover();
                } else if (this.input.value) {
                    this.input.value = '';
                    this.searchTerm = '';
                    this.filteredOptions = [...this.allOptions];
                    this.focusedIndex = -1;
                    this.renderDropdown();
                } else {
                    this.close();
                }
                break;
            case 'Tab':
                this.close();
                break;
            case 'PageUp':
                e.preventDefault();
                this.focusPageUp();
                break;
            case 'PageDown':
                e.preventDefault();
                this.focusPageDown();
                break;
            case 'Home':
                e.preventDefault();
                this.focusFirst();
                break;
            case 'End':
                e.preventDefault();
                this.focusLast();
                break;
        }
    }

    private handleDropdownClick(e: MouseEvent): void {
        interactionLogger.debug(`[${this.instanceId}] Dropdown clicked`, { target: (e.target as HTMLElement).className });

        e.stopPropagation();

        const actionBtn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
        if (actionBtn) {
            e.preventDefault();
            const action = actionBtn.dataset.action;
            interactionLogger.debug(`[${this.instanceId}] Action button clicked:`, action);
            if (action === 'select-all') {
                this.selectAll();
            } else if (action === 'clear-all') {
                this.clearAll();
            } else if (action === 'custom') {
                // Look up the custom button by its rendered index (set as data-button-index)
                const buttonIndex = parseInt(actionBtn.dataset.buttonIndex || '-1');
                const button = this.options.actionButtons?.[buttonIndex];
                if (button?.onClick) {
                    button.onClick(this);
                }
            }
            return;
        }

        const option = (e.target as HTMLElement).closest('.ms__option') as HTMLElement;
        if (option && !option.classList.contains('ms__option--disabled')) {
            e.preventDefault();
            const value = option.dataset.value!;
            const optionData = this.filteredOptions.find(opt => String(this.getItemValue(opt)) === value);
            interactionLogger.debug(`[${this.instanceId}] Option clicked:`, {
                value,
                closeOnSelect: this.options.isCloseOnSelect,
                placeholder: this.options.searchPlaceholder
            });
            if (optionData) {
                this.toggleOption(optionData);
            }
        }
    }

    private handleBadgeClick(e: MouseEvent): void {
        const clearCountBtn = (e.target as HTMLElement).closest('[data-action="clear-count"]');
        if (clearCountBtn) {
            e.preventDefault();
            e.stopPropagation();
            interactionLogger.debug(`[${this.instanceId}] Clear count button clicked`);
            this.clearAll();
            return;
        }

        const showSelectedBtn = (e.target as HTMLElement).closest('[data-action="show-selected"]');
        if (showSelectedBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.ms__badge-remove') as HTMLElement;
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();

            // Handle remove-hidden action (remove all hidden items in partial mode)
            if (removeBtn.dataset.action === 'remove-hidden') {
                interactionLogger.debug(`[${this.instanceId}] Remove hidden items button clicked`);
                const maxVisible = this.options.badgesMaxVisible || 3;
                const selectedOptions = Array.from(this.selectedOptions.values());
                const hiddenOptions = selectedOptions.slice(maxVisible);

                // Deselect all hidden options
                hiddenOptions.forEach(option => this.deselectOption(option));
                return;
            }

            // Handle regular badge remove
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (option) {
                this.deselectOption(option);
            }
            return;
        }

        // Handle clicking the "+X more" badge itself (not the remove button)
        const moreBadge = (e.target as HTMLElement).closest('.ms__badge--more');
        if (moreBadge && !(e.target as HTMLElement).closest('.ms__badge-remove')) {
            e.preventDefault();
            e.stopPropagation();
            interactionLogger.debug(`[${this.instanceId}] '+X more' badge clicked, showing popover`);
            this.toggleSelectedPopover();
            return;
        }
    }

    private handleClickOutside(e: MouseEvent): void {
        // Use composedPath() to see through Shadow DOM boundaries
        const path = e.composedPath() as HTMLElement[];

        if (this.showSelectedPopover) {
            const clickedInsidePopover = path.some(el =>
                el instanceof Node && (
                    this.selectedPopover.contains(el) ||
                    this.counter.contains(el) ||
                    (el.closest && el.closest('[data-action="show-selected"]'))
                )
            );

            if (!clickedInsidePopover) {
                uiLogger.debug(`[${this.instanceId}] Closing selected popover due to click outside`);
                this.hideSelectedPopover();
                return;
            }
        }

        if (!this.isOpen) return;

        // Check if any element in the event path is inside our elements
        // Filter to only Nodes since composedPath() can include Window and other objects
        const clickedInside = path.some(el =>
            el instanceof Node && (
                this.element.contains(el) ||
                this.dropdown.contains(el) ||
                (this.hint && this.hint.contains(el))
            )
        );

        interactionLogger.debug(`[${this.instanceId}] handleClickOutside`, {
            target: (e.target as HTMLElement).className,
            targetTag: (e.target as HTMLElement).tagName,
            clickedInside,
            pathLength: path.length,
            firstInPath: path[0]?.tagName,
            elementContains: path.some(el => el instanceof Node && this.element.contains(el)),
            dropdownContains: path.some(el => el instanceof Node && this.dropdown.contains(el)),
            isConnected: this.dropdown.isConnected
        });

        if (!clickedInside) {
            interactionLogger.warn(`[${this.instanceId}] Closing dropdown due to click outside`);
            this.close();
        }
    }

    /**
     * Move focus by computing a new index from (current, total).
     * Returning -1 from `compute` is a no-op (used for empty list / no match).
     */
    private focusBy(compute: (current: number, total: number) => number): void {
        const total = this.filteredOptions.length;
        if (total === 0) return;
        const next = compute(this.focusedIndex, total);
        if (next < 0) return;
        this.focusedIndex = next;
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusNext(): void     { this.focusBy((i, n) => Math.min(n - 1, i + 1)); }
    private focusPrevious(): void { this.focusBy((i)    => Math.max(0, i - 1)); }
    private focusFirst(): void    { this.focusBy(()     => 0); }
    private focusLast(): void     { this.focusBy((_, n) => n - 1); }
    private focusPageUp(): void   { this.focusBy((i)    => Math.max(0, i - 10)); }
    private focusPageDown(): void { this.focusBy((i, n) => Math.min(n - 1, i + 10)); }

    private focusNextMatch(): void {
        if (this.matchingIndices.size === 0) return;
        const matched = Array.from(this.matchingIndices).sort((a, b) => a - b);
        const currentIndex = matched.findIndex(idx => idx === this.focusedIndex);
        const nextIndex = (currentIndex + 1) % matched.length;
        this.focusBy(() => matched[nextIndex]);
        interactionLogger.debug(`[${this.instanceId}] Jumped to next match: index ${this.focusedIndex} (${currentIndex + 1} of ${matched.length})`);
    }

    private focusPreviousMatch(): void {
        if (this.matchingIndices.size === 0) return;
        const matched = Array.from(this.matchingIndices).sort((a, b) => a - b);
        const currentIndex = matched.findIndex(idx => idx === this.focusedIndex);
        const prevIndex = currentIndex <= 0 ? matched.length - 1 : currentIndex - 1;
        this.focusBy(() => matched[prevIndex]);
        interactionLogger.debug(`[${this.instanceId}] Jumped to previous match: index ${this.focusedIndex} (${currentIndex + 1} of ${matched.length})`);
    }

    private scrollToFocused(): void {
        if (this.virtualScroll && this.focusedIndex >= 0) {
            // Use virtual scroll's scrollToIndex for smooth scrolling
            this.virtualScroll.scrollToIndex(this.focusedIndex);
        } else {
            // Standard mode: use scrollIntoView
            const focusedElement = this.dropdown.querySelector('.ms__option--focused');
            if (focusedElement) {
                focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    private toggleOption(option: T): void {
        // Disabled options must not be toggled regardless of how we got here
        // (click handler already filters disabled, but keyboard Enter used to
        // bypass — centralize the check at the choke point).
        if (this.getItemDisabled(option)) {
            interactionLogger.debug(`[${this.instanceId}] toggleOption ignored — option is disabled`);
            return;
        }
        const value = this.getItemValue(option);
        const valueKey = String(value);
        interactionLogger.debug(`[${this.instanceId}] toggleOption called`, { value, multiple: this.options.isMultipleEnabled });

        if (!this.options.isMultipleEnabled) {
            if (this.selectedValues.has(valueKey)) {
                interactionLogger.debug(`[${this.instanceId}] Deselecting option in single-select mode`, { value });
                this.deselectOption(option);
            } else {
                interactionLogger.debug(`[${this.instanceId}] Clearing previous selections and selecting new option`, { value });
                this.selectedValues.clear();
                this.selectedOptions.clear();
                this.selectOption(option);
            }

            this.close();
            return;
        }

        if (this.selectedValues.has(valueKey)) {
            interactionLogger.debug(`[${this.instanceId}] Deselecting option`, { value });
            this.deselectOption(option);
        } else {
            interactionLogger.debug(`[${this.instanceId}] Selecting option`, { value });
            this.selectOption(option);
        }

        if (this.options.isCloseOnSelect) {
            this.close();
        }
    }

    private async handleAddNew(value: string): Promise<void> {
        if (!this.options.addNewCallback) return;

        try {
            dataLogger.debug(`[${this.instanceId}] Adding new option:`, value);
            const newOption = await this.options.addNewCallback(value);

            // Add to options list
            this.allOptions.push(newOption);
            this.filteredOptions.push(newOption);

            // Select the new option
            this.selectOption(newOption);

            // Clear input and re-render
            this.input.value = '';
            this.renderDropdown();
            this.renderBadges();

            if (this.options.isCloseOnSelect) {
                this.close();
            }
        } catch (error) {
            dataLogger.error(`[${this.instanceId}] Error adding new option:`, error);
        }
    }

    private selectOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);
        this.selectedValues.add(valueKey);
        this.selectedOptions.set(valueKey, option);
        this.commit({ added: [option] });
    }

    private deselectOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);
        this.selectedValues.delete(valueKey);
        this.selectedOptions.delete(valueKey);
        this.commit({ removed: [option] });
    }

    private selectAll(): void {
        const added: T[] = [];
        this.filteredOptions.forEach(option => {
            if (this.getItemDisabled(option)) return;
            const valueKey = String(this.getItemValue(option));
            if (this.selectedValues.has(valueKey)) return;
            this.selectedValues.add(valueKey);
            this.selectedOptions.set(valueKey, option);
            added.push(option);
        });
        this.commit({ added });
    }

    public clearAll(): void {
        const removed = Array.from(this.selectedOptions.values());
        this.selectedValues.clear();
        this.selectedOptions.clear();
        this.commit({ removed });
    }

    /**
     * Re-render and fire callbacks after a selection state change.
     * `added` / `removed` drive per-item select/deselect callbacks.
     * `changeCallback` fires once if anything actually changed.
     */
    private commit(delta: { added?: T[]; removed?: T[] }): void {
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();

        const added = delta.added ?? [];
        const removed = delta.removed ?? [];

        if (this.options.selectCallback) {
            added.forEach(option => this.options.selectCallback!(option));
        }
        if (this.options.deselectCallback) {
            removed.forEach(option => this.options.deselectCallback!(option));
        }
        if ((added.length > 0 || removed.length > 0) && this.options.changeCallback) {
            this.options.changeCallback(this.getSelected());
        }
    }

    private open(): void {
        uiLogger.debug(`[${this.instanceId}] open() called`, { isOpen: this.isOpen });
        if (this.isOpen) return;

        this.isOpen = true;
        this.element.classList.add('ms--open');
        this.dropdown.classList.add('ms__dropdown--visible');
        uiLogger.info(`[${this.instanceId}] Dropdown opened`);

        this.input.placeholder = this.options.searchPlaceholder;

        // Only clear input if search is enabled
        if (!this.options.isMultipleEnabled && this.options.isSearchEnabled) {
            this.input.value = '';
        }

        // If using searchCallback with keepOptionsOnSearch, ensure initial options are shown
        if (this.options.searchCallback && this.options.isKeepOptionsOnSearch && !this.searchTerm) {
            this.filteredOptions = [...this.allOptions];
            uiLogger.debug(`[${this.instanceId}] Showing ${this.allOptions.length} initial options on open`);
        }

        this.renderDropdown();
        this.positionDropdown();

        if (this.hint) {
            this.hint.classList.add('ms__hint--visible');
            this.positionHint();
        }
    }

    private close(): void {
        uiLogger.debug(`[${this.instanceId}] close() called`, { isOpen: this.isOpen });
        if (!this.isOpen) return;

        this.isOpen = false;
        this.element.classList.remove('ms--open');
        this.dropdown.classList.remove('ms__dropdown--visible');
        if (this.hint) {
            this.hint.classList.remove('ms__hint--visible');
        }

        // Only clear search if shouldKeepSearchOnClose is false
        if (!this.options.shouldKeepSearchOnClose) {
            this.searchTerm = '';
            // Only clear input in multi-select mode or when search is enabled
            if (this.options.isMultipleEnabled || this.options.isSearchEnabled) {
                this.input.value = '';
            }

            this.filteredOptions = [...this.allOptions];
        }

        this.focusedIndex = -1;

        this.renderBadges();

        if (this.dropdownCleanup) {
            this.dropdownCleanup();
            this.dropdownCleanup = null;
        }
        if (this.hintCleanup) {
            this.hintCleanup();
            this.hintCleanup = null;
        }

        // Reset placement tracking
        this.dropdownPlacement = null;

        uiLogger.debug(`[${this.instanceId}] Dropdown closed`);
    }

    /**
     * Anchor a floating panel (dropdown or selected-items popover) below/above the input with
     * placement-locking and width-syncing. Returns the `autoUpdate` cleanup.
     *
     * Both panels share: anchor on input, sync width, default to 'bottom-start', flip on first
     * compute then lock the resulting placement, optionally clamp by dropdownMin/MaxWidth.
     */
    private anchorFloatingPanel(panel: HTMLElement, opts: {
        getPlacement: () => Placement | null;
        setPlacement: (p: Placement) => void;
        /** When false, never locks (re-flips on every update). Defaults to true. */
        isLocked?: () => boolean;
        applyMaxWidth?: boolean;
        afterPosition?: () => void;
    }): () => void {
        return autoUpdate(this.input, panel, () => {
            const locked = opts.isLocked?.() ?? true;
            const current = opts.getPlacement();
            const placement: Placement = (locked && current) ? current : 'bottom-start';
            const middleware = [
                offset(4),
                ...(locked && current ? [] : [flip()]),
                shift({ padding: 8 })
            ];

            computePosition(this.input, panel, { placement, strategy: 'fixed', middleware }).then(({ x, y, placement: finalPlacement }) => {
                if (!current) opts.setPlacement(finalPlacement);
                const styles: Record<string, string> = {
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${this.input.offsetWidth}px`
                };
                if (this.options.dropdownMinWidth) styles.minWidth = this.options.dropdownMinWidth;
                if (opts.applyMaxWidth && this.options.dropdownMaxWidth) styles.maxWidth = this.options.dropdownMaxWidth;
                Object.assign(panel.style, styles);
                opts.afterPosition?.();
            });
        });
    }

    private positionDropdown(): void {
        this.dropdownCleanup = this.anchorFloatingPanel(this.dropdown, {
            getPlacement: () => this.dropdownPlacement,
            setPlacement: (p) => {
                this.dropdownPlacement = p;
                uiLogger.debug(`[${this.instanceId}] Locked dropdown placement:`, p);
            },
            isLocked: () => !!this.options.isPlacementLocked,
            applyMaxWidth: true,
            afterPosition: () => { if (this.hint && this.isOpen) this.positionHint(); }
        });
    }

    private positionHint(): void {
        if (!this.hint) return;

        // Clean up previous autoUpdate if it exists
        if (this.hintCleanup) {
            this.hintCleanup();
        }

        this.hintCleanup = autoUpdate(
            this.input,
            this.hint,
            () => {
                // Calculate opposite placement of dropdown
                let hintPlacement: Placement = 'top-start';
                if (this.dropdownPlacement) {
                    // If dropdown is on bottom, hint goes on top and vice versa
                    if (this.dropdownPlacement.startsWith('bottom')) {
                        hintPlacement = this.dropdownPlacement.replace('bottom', 'top') as Placement;
                    } else if (this.dropdownPlacement.startsWith('top')) {
                        hintPlacement = this.dropdownPlacement.replace('top', 'bottom') as Placement;
                    }
                }

                computePosition(this.input, this.hint!, {
                    placement: hintPlacement,
                    strategy: 'fixed',
                    middleware: [
                        offset(4),
                        // Don't use flip() - we want hint to stay opposite of dropdown
                        shift({ padding: 8 })
                    ]
                }).then(({ x, y }) => {
                    Object.assign(this.hint!.style, {
                        position: 'fixed',
                        left: `${x}px`,
                        top: `${y}px`
                    });
                });
            }
        );
    }

    private parseInitialSelection(): void {
        const initialValues = this.element.dataset.initialValues;
        if (initialValues) {
            try {
                const values = JSON.parse(initialValues);
                values.forEach((value: string | number) => {
                    this.selectedValues.add(String(value));
                });
                this.reconcileSelectedOptions();
                this.renderBadges();
            } catch (e) {
                dataLogger.error(`[${this.instanceId}] Failed to parse initial values:`, e);
            }
        }
    }

    /**
     * Resolve any `selectedValues` entries that don't yet have a matching
     * `selectedOptions` object by looking them up in the current `allOptions`.
     * Idempotent; safe to call after init *and* after `options` is replaced
     * (e.g., async fetch, `searchCallback` result, or late `element.options =`
     * assignment). Without this, `initial-values` declared before options
     * arrive ends up with phantom values that `getValue()` can never report.
     */
    private reconcileSelectedOptions(): void {
        if (this.selectedValues.size === 0 || this.allOptions.length === 0) return;
        this.selectedValues.forEach(valueKey => {
            if (this.selectedOptions.has(valueKey)) return;
            const option = this.allOptions.find(opt => String(this.getItemValue(opt)) === valueKey);
            if (option) this.selectedOptions.set(valueKey, option);
        });
    }

    private toggleSelectedPopover(): void {
        if (this.showSelectedPopover) {
            this.hideSelectedPopover();
        } else {
            this.showPopover();
        }
    }

    private showPopover(): void {
        uiLogger.debug(`[${this.instanceId}] showPopover() called`);

        if (this.isOpen) {
            this.close();
        }

        this.showSelectedPopover = true;
        this.renderSelectedPopover();
        this.selectedPopover.classList.add('ms__selected-popover--visible');

        // Add virtual class if using virtual scroll (matches dropdown pattern)
        const threshold = this.options.virtualScrollThreshold ?? 100;
        if (this.selectedValues.size >= threshold) {
            this.selectedPopover.classList.add('ms__selected-popover--virtual');
        }

        this.positionSelectedPopover();
    }

    private hideSelectedPopover(): void {
        uiLogger.debug(`[${this.instanceId}] hideSelectedPopover() called`);
        this.showSelectedPopover = false;
        this.selectedPopover.classList.remove('ms__selected-popover--visible');
        this.selectedPopover.classList.remove('ms__selected-popover--virtual');
        this.selectedPopoverPlacement = null;

        // Cleanup virtual scroll
        if (this.selectedPopoverVirtualScroll) {
            this.selectedPopoverVirtualScroll.destroy();
            this.selectedPopoverVirtualScroll = null;
            this.selectedPopoverContainer = null;
        }

        if (this.selectedPopoverCleanup) {
            this.selectedPopoverCleanup();
            this.selectedPopoverCleanup = null;
        }

        // Tear down popover-only tooltips so they don't leak Floating UI cleanups.
        for (const id of Array.from(this.tooltips.keys())) {
            if (id.startsWith('popover-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    private renderSelectedPopover(): void {
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        // Use virtual scroll for large selections (same threshold as the dropdown)
        const threshold = this.options.virtualScrollThreshold ?? 100;
        if (count >= threshold) {
            this.renderSelectedPopoverVirtual(selectedOptions, count);
            return;
        }

        // Standard rendering for small selections
        this.selectedPopover.innerHTML = `
            <div class="ms__selected-popover-header">
                <span>Selected Items (${count})</span>
                <button type="button" class="ms__selected-popover-close" aria-label="Close"></button>
            </div>
            <div class="ms__selected-popover-body">
                ${selectedOptions.map(option => this.renderBadgeHTML(option, { displayMode: this.options.badgesDisplayMode || 'badges', isInPopover: true })).join('')}
            </div>
        `;

        // Attach tooltips to popover badges
        this.attachBadgeTooltips(this.selectedPopover);
    }

    private renderSelectedPopoverVirtual(selectedOptions: T[], count: number): void {
        // Only create HTML structure if virtual scroll doesn't exist yet
        if (!this.selectedPopoverVirtualScroll) {
            const badgeHeight = this.options.badgeHeight ?? 36;
            const html = `
                <div class="ms__selected-popover-header">
                    <span>Selected Items (${count})</span>
                    <button type="button" class="ms__selected-popover-close" aria-label="Close"></button>
                </div>
                <div class="ms__selected-popover-body ms__selected-popover-body--virtual" style="height: 18rem; overflow-y: auto; position: relative; --ms-badge-height-virtual: ${badgeHeight}px;"></div>
            `;
            this.selectedPopover.innerHTML = html;
            this.selectedPopoverContainer = this.selectedPopover.querySelector('.ms__selected-popover-body') as HTMLDivElement;
        } else {
            // Just update the count in header
            const header = this.selectedPopover.querySelector('.ms__selected-popover-header span');
            if (header) {
                header.textContent = `Selected Items (${count})`;
            }
        }

        if (!this.selectedPopoverContainer) return;

        // Initialize or update virtual scroll (same pattern as dropdown)
        // Add gap to itemHeight (4px default gap between badges)
        const badgeHeight = this.options.badgeHeight ?? 36;
        const gap = 4; // 0.25rem default gap
        const itemHeight = badgeHeight + gap;
        const bufferSize = this.options.virtualScrollBuffer ?? 10;

        // Defer initialization until container has dimensions
        requestAnimationFrame(() => {
            if (!this.selectedPopoverContainer) return;

            if (!this.selectedPopoverVirtualScroll) {
                this.selectedPopoverVirtualScroll = new VirtualScroll<T>({
                    container: this.selectedPopoverContainer,
                    itemHeight,
                    items: selectedOptions,
                    renderItem: (item) => this.renderBadgeHTML(item, { displayMode: this.options.badgesDisplayMode || 'badges', isInPopover: true }),
                    bufferSize,
                    onVisibleRangeChange: () => {
                        // Attach tooltips to newly rendered badges in virtual scroll
                        this.attachBadgeTooltips(this.selectedPopoverContainer!);
                    }
                });
            } else {
                this.selectedPopoverVirtualScroll.setItems(selectedOptions);
            }
        });
    }

    /**
     * Render a removable badge for a selected option (used by the badges/partial display modes
     * and by the selected-items popover).
     *
     * - In the popover, `renderSelectedItemContentCallback` and `getSelectedItemClassCallback` win
     *   over the regular badge callbacks; that's how consumers customize popover items independently.
     * - The `data-value` and aria-label both go through `getItemBadgeDisplayValue` so badge text and
     *   accessible name stay in sync.
     */
    private renderBadgeHTML(option: T, ctx: BadgeContentRenderContext): string {
        const value = this.getItemValue(option);

        // Resolve content
        let badgeContent: string;
        const popoverCallback = ctx.isInPopover ? this.options.renderSelectedItemContentCallback : undefined;
        if (popoverCallback) {
            const c = popoverCallback(option);
            badgeContent = typeof c === 'string' ? c : c.outerHTML;
        } else if (this.options.renderBadgeContentCallback) {
            const c = this.options.renderBadgeContentCallback(option, ctx);
            badgeContent = typeof c === 'string' ? c : c.outerHTML;
        } else {
            badgeContent = this.getItemBadgeDisplayValue(option);
        }

        // Resolve classes
        const classCallback = ctx.isInPopover
            ? (this.options.getSelectedItemClassCallback || this.options.getBadgeClassCallback)
            : this.options.getBadgeClassCallback;
        let badgeClasses = 'ms__badge';
        if (classCallback) {
            const customClasses = classCallback(option);
            const classArray = Array.isArray(customClasses) ? customClasses : [customClasses];
            badgeClasses += ' ' + classArray.filter(c => c).join(' ');
        }

        const removeLabel = this.getItemBadgeDisplayValue(option);
        return `
            <div class="${badgeClasses}">
                <span class="ms__badge-text">${badgeContent}</span>
                <button type="button" class="ms__badge-remove" data-value="${value}" aria-label="Remove ${removeLabel}"></button>
            </div>
        `;
    }

    private handleSelectedPopoverClick(e: MouseEvent): void {
        e.stopPropagation();

        const closeBtn = (e.target as HTMLElement).closest('.ms__selected-popover-close');
        if (closeBtn) {
            e.preventDefault();
            this.hideSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.ms__badge-remove') as HTMLElement;
        if (removeBtn) {
            e.preventDefault();
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (option) {
                this.deselectOption(option);
                this.renderSelectedPopover();
                if (this.selectedValues.size === 0) {
                    this.hideSelectedPopover();
                }
            }
        }
    }

    private positionSelectedPopover(): void {
        this.selectedPopoverCleanup = this.anchorFloatingPanel(this.selectedPopover, {
            getPlacement: () => this.selectedPopoverPlacement,
            setPlacement: (p) => {
                this.selectedPopoverPlacement = p;
                uiLogger.debug(`[${this.instanceId}] Locked popover placement:`, p);
            }
        });
    }

    // ========================================================================
    // FORM INTEGRATION
    // ========================================================================

    private updateHiddenInput(): void {
        if (!this.options.formFieldId) return;

        // Remove existing inputs
        this.hiddenInputs.forEach(input => input.remove());
        this.hiddenInputs = [];

        const format = this.options.valueFormat || 'json';
        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Use hostElement if provided (for shadow DOM), otherwise use element
        const targetElement = this.options.hostElement || this.element;

        if (format === 'array') {
            // Multiple <input name="field[]" value="val1">
            values.forEach(value => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = `${this.options.formFieldId}[]`;
                input.value = String(value);
                targetElement.appendChild(input);
                this.hiddenInputs.push(input);
            });
        } else {
            // Single input with formatted value
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = this.options.formFieldId;
            input.id = this.options.formFieldId;
            input.value = this.getFormValue();
            targetElement.appendChild(input);
            this.hiddenInputs.push(input);
        }
    }

    private getFormValue(): string {
        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Custom callback takes precedence
        if (this.options.getValueFormatCallback) {
            return this.options.getValueFormatCallback(values);
        }

        const format = this.options.valueFormat || 'json';

        if (format === 'csv') {
            return values.join(',');
        }

        // json format (default)
        return JSON.stringify(values);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public getSelected(): T[] {
        return Array.from(this.selectedOptions.values());
    }

    public setSelected(values: (string | number)[]): void {
        this.selectedValues = new Set(values.map(v => String(v)));
        this.selectedOptions.clear();
        values.forEach(value => {
            const valueKey = String(value);
            const option = this.allOptions.find(opt => String(this.getItemValue(opt)) === valueKey);
            if (option) {
                this.selectedOptions.set(valueKey, option);
            }
        });
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();
    }

    /**
     * Merge a partial config update into the live picker without tearing down the DOM.
     *
     * Handles the cheap structural toggles inline (no-checkboxes class, badges-position class,
     * input placeholder, search-input mode) and re-renders dropdown + badges + hidden inputs.
     *
     * Returns `true` if the change could be applied in place. Returns `false` for changes that
     * truly require rebuilding the DOM scaffolding (currently: adding/removing the `searchHint`
     * element, since it's only created in `buildHTML` if a hint string was provided). The caller
     * should fall back to destroy + re-init in that case.
     */
    public updateOptions(partial: Partial<MultiSelectConfig<T>>): boolean {
        // Adding/removing the hint element after init isn't supported in place — buildHTML decides
        // whether to create it. Force a rebuild.
        const hintExists = !!this.hint;
        const hintWanted = 'searchHint' in partial ? !!partial.searchHint : hintExists;
        if (hintExists !== hintWanted) return false;

        Object.assign(this.options, partial);

        if ('options' in partial && partial.options !== undefined) {
            this.allOptions = partial.options;
            this.filteredOptions = this.searchTerm ? this.filteredOptions : [...this.allOptions];
            this.reconcileSelectedOptions();
        }

        // Structural class on host
        this.element.classList.toggle('ms--no-checkboxes',
            !this.options.isCheckboxesShown || !this.options.isMultipleEnabled);

        // Badges position can change between block (top/bottom) and inline (left/right) layouts.
        if ('badgesPosition' in partial) {
            this.effectiveBadgesPosition = this.options.badgesPosition || 'bottom';
            if (this.isRTL) {
                if (this.effectiveBadgesPosition === 'left') this.effectiveBadgesPosition = 'right';
                else if (this.effectiveBadgesPosition === 'right') this.effectiveBadgesPosition = 'left';
            }
            const wrapper = this.element.querySelector('.ms-wrapper');
            wrapper?.classList.toggle('ms-wrapper--inline',
                this.effectiveBadgesPosition === 'left' || this.effectiveBadgesPosition === 'right');
        }

        // Input placeholder (only safe to set when dropdown is closed; otherwise renderBadges takes over).
        if ('searchPlaceholder' in partial && !this.isOpen) {
            this.input.placeholder = this.options.searchPlaceholder;
        }

        // Search input display mode
        if ('searchInputMode' in partial) {
            this.input.readOnly = this.options.searchInputMode === 'readonly';
            this.input.style.display = this.options.searchInputMode === 'hidden' ? 'none' : '';
        }

        // Hint text (element exists; just refresh content)
        if ('searchHint' in partial && this.hint) {
            this.hint.textContent = this.options.searchHint || '';
        }

        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();
        return true;
    }

    public get selectedItem(): T | null {
        if (this.selectedOptions.size === 0) return null;
        return Array.from(this.selectedOptions.values())[0];
    }

    public get selectedValue(): string | number | (string | number)[] | null {
        // Return null if no value configuration
        if (!this.options.valueMember && !this.options.getValueCallback) {
            return null;
        }

        if (this.selectedOptions.size === 0) {
            return this.options.isMultipleEnabled ? [] : null;
        }

        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Mode-dependent return
        return this.options.isMultipleEnabled ? values : (values[0] ?? null);
    }

    public getValue(): string | number | (string | number)[] | null {
        if (this.selectedOptions.size === 0) {
            return this.options.isMultipleEnabled ? [] : null;
        }

        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Single value in single-select, array in multi-select
        return this.options.isMultipleEnabled ? values : (values[0] ?? null);
    }

    // ========================================================================
    // TOOLTIPS (badge text, badge-remove buttons, action buttons)
    // ========================================================================

    /**
     * Create or replace a tracked tooltip with the given id. Replacing destroys the old one,
     * which is the normal flow when re-rendering badges/actions.
     */
    private spawnTooltip(spec: {
        id: string;
        trigger: HTMLElement;
        content: string | HTMLElement;
        onBeforeShow?: () => void;
    }): void {
        this.tooltips.get(spec.id)?.destroy();
        const tooltip = new Tooltip({
            trigger: spec.trigger,
            container: this.options.container || document.body,
            content: spec.content,
            placement: this.options.badgeTooltipPlacement || 'top',
            offsetDistance: this.options.badgeTooltipOffset ?? 8,
            showDelay: this.options.badgeTooltipDelay ?? 100,
            onBeforeShow: spec.onBeforeShow
        });
        this.tooltips.set(spec.id, tooltip);
    }

    private destroyAllTooltips(): void {
        this.tooltips.forEach(t => t.destroy());
        this.tooltips.clear();
    }

    /** Build the badge-text tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
    private buildBadgeTooltipContent(option: T): string | HTMLElement {
        if (this.options.getBadgeTooltipCallback) return this.options.getBadgeTooltipCallback(option);
        const displayValue = this.getItemBadgeDisplayValue(option);
        const subtitle = this.getItemSubtitle(option);
        return subtitle ? `${displayValue}\n${subtitle}` : displayValue;
    }

    /** Build the remove-button tooltip text (callback > format string with {0} > "Remove {name}"). */
    private buildRemoveButtonTooltipText(itemName: string, option?: T): string {
        if (option && this.options.getRemoveButtonTooltipCallback) return this.options.getRemoveButtonTooltipCallback(option);
        if (this.options.removeButtonTooltipText) return this.options.removeButtonTooltipText.replace('{0}', itemName);
        return `Remove ${itemName}`;
    }

    private attachBadgeTooltips(container?: HTMLElement): void {
        if (!this.options.isBadgeTooltipsEnabled) return;

        const isPopover = !!container;
        const targetContainer = container || this.badgesContainer;
        // Prefix popover tooltips so they don't collide with the main badges container's tooltips
        // (which are keyed by raw option value).
        const idPrefix = isPopover ? 'popover-' : '';
        const badges = targetContainer.querySelectorAll('.ms__badge:not(.ms__badge--more)');

        badges.forEach((badge: Element) => {
            const removeBtn = badge.querySelector('.ms__badge-remove') as HTMLElement;
            if (!removeBtn) return;
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (!option) return;

            const textId = `${idPrefix}${value}`;
            const removeId = `${idPrefix}${value}-remove`;

            const badgeText = badge.querySelector('.ms__badge-text') as HTMLElement;
            if (badgeText) {
                this.spawnTooltip({
                    id: textId,
                    trigger: badgeText,
                    content: this.buildBadgeTooltipContent(option)
                });
            }

            const displayValue = this.getItemBadgeDisplayValue(option);
            this.spawnTooltip({
                id: removeId,
                trigger: removeBtn,
                content: this.buildRemoveButtonTooltipText(displayValue, option),
                // Keep parent badge tooltip from overlapping the remove-button tooltip.
                onBeforeShow: () => this.tooltips.get(textId)?.hideImmediate()
            });
        });

        // "+X more" badge remove button (only relevant for the main badges container, not popover).
        if (!isPopover) {
            const moreBadge = this.badgesContainer.querySelector('.ms__badge--more');
            const removeBtn = moreBadge?.querySelector('.ms__badge-remove') as HTMLElement | null;
            if (removeBtn && removeBtn.dataset.action === 'remove-hidden') {
                const maxVisible = this.options.badgesMaxVisible || 3;
                const hiddenCount = this.selectedOptions.size - maxVisible;
                this.spawnTooltip({
                    id: 'more-badge-remove',
                    trigger: removeBtn,
                    content: this.buildRemoveButtonTooltipText(`${hiddenCount} hidden items`)
                });
            }
        }
    }

    private attachActionButtonTooltips(): void {
        const actionButtons = this.dropdown.querySelectorAll('.ms__action-btn');

        actionButtons.forEach((button: Element) => {
            const buttonElement = button as HTMLElement;
            const action = buttonElement.dataset.action;
            if (!action) return;

            const buttonIndex = parseInt(buttonElement.dataset.buttonIndex || '-1');
            const actionConfig = buttonIndex >= 0
                ? this.options.actionButtons?.[buttonIndex]
                : this.options.actionButtons?.find(btn => btn.action === action);
            if (!actionConfig) return;

            const tooltipText = actionConfig.getTooltipCallback
                ? actionConfig.getTooltipCallback(this)
                : actionConfig.tooltip;
            if (!tooltipText) return;

            const id = `action-${buttonIndex >= 0 ? buttonIndex : action}`;
            this.spawnTooltip({ id, trigger: buttonElement, content: tooltipText });
        });
    }

    /**
     * Destroy only the action-button tooltips. Called from `renderDropdown`/`renderDropdownVirtual`
     * before rebuilding the actions row, so per-button tooltip state doesn't leak.
     */
    private destroyAllActionButtonTooltips(): void {
        for (const id of Array.from(this.tooltips.keys())) {
            if (id.startsWith('action-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    /**
     * Destroy main-badges-container tooltips. Called before re-rendering the badges container.
     * Popover tooltips (prefixed `popover-`) survive — they're owned by the popover lifecycle and
     * cleaned up in `hideSelectedPopover`. Action-button tooltips (prefixed `action-`) survive too.
     */
    private destroyAllBadgeTooltips(): void {
        for (const id of Array.from(this.tooltips.keys())) {
            if (!id.startsWith('action-') && !id.startsWith('popover-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public destroy(): void {
        this.destroyAllTooltips();

        if (this.dropdownCleanup) this.dropdownCleanup();
        if (this.hintCleanup) this.hintCleanup();
        if (this.selectedPopoverCleanup) this.selectedPopoverCleanup();

        // Clean up document-level event listeners
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
            this.documentClickHandler = null;
        }
        if (this.documentKeydownHandler) {
            document.removeEventListener('keydown', this.documentKeydownHandler);
            this.documentKeydownHandler = null;
        }

        // Clean up virtual scroll
        if (this.virtualScroll) {
            this.virtualScroll.destroy();
            this.virtualScroll = null;
        }

        if (this.dropdown) this.dropdown.remove();
        if (this.hint) this.hint.remove();
        if (this.selectedPopover) this.selectedPopover.remove();

        // Clear the element's content to prevent duplication on re-initialization
        this.element.innerHTML = '';
        this.element.classList.remove('ms', 'ms--open', 'ms--no-checkboxes');

        initLogger.info(`[${this.instanceId}] Component destroyed`);
    }
}
