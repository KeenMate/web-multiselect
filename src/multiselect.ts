/**
 * Pure Admin - MultiSelect with Typeahead
 * Comprehensive multiselect component with rich content support and floating hints
 */

import { computePosition, flip, offset, autoUpdate, shift, type Placement } from '@floating-ui/dom';
import type { MultiSelectOption, MultiSelectOptions, MultiSelectConfig, BadgesDisplayMode, BadgesPosition, SearchInputMode, BadgesThresholdMode, SearchMode, OptionContentRenderContext, BadgeContentRenderContext } from './types';
import { initLogger, dataLogger, uiLogger, interactionLogger } from './logger';
import { VirtualScroll } from './virtual-scroll';

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

    // Badge tooltip storage
    private badgeTooltips = new Map<string, HTMLDivElement>();
    private badgeTooltipCleanups = new Map<string, () => void>();
    private badgeTooltipShowTimeouts = new Map<string, number>();
    private badgeTooltipHideTimeouts = new Map<string, number>();

    // Action button tooltip storage
    private actionButtonTooltips = new Map<string, HTMLDivElement>();
    private actionButtonTooltipCleanups = new Map<string, () => void>();

    // Virtual scroll instance
    private virtualScroll: VirtualScroll<T> | null = null;
    private optionsContainer: HTMLDivElement | null = null;
    private selectedPopoverVirtualScroll: VirtualScroll<T> | null = null;
    private selectedPopoverContainer: HTMLDivElement | null = null;

    // DOM elements
    private input!: HTMLInputElement;
    private dropdown!: HTMLDivElement;
    private badgesContainer!: HTMLDivElement;
    private counter!: HTMLSpanElement;
    private hint?: HTMLDivElement;
    private selectedPopover!: HTMLDivElement;

    // ========================================================================
    // DATA EXTRACTION METHODS (following svelte-treeview pattern)
    // ========================================================================

    /**
     * Extract value/ID from item
     * Precedence: tuple[0] -> valueMember -> getValueCallback -> '[N/A]'
     */
    private getItemValue(item: T): string | number {
        // Auto-detect [key, value] tuple
        if (Array.isArray(item) && item.length === 2) {
            return item[0];
        }

        // Member property
        if (this.options.valueMember && (item as any)[this.options.valueMember] !== undefined) {
            return (item as any)[this.options.valueMember];
        }

        // Callback
        if (this.options.getValueCallback) {
            return this.options.getValueCallback(item);
        }

        // Fallback
        return '[N/A]';
    }

    /**
     * Extract display value from item
     * Precedence: tuple[1] -> displayValueMember -> getDisplayValueCallback -> '[N/A]'
     */
    private getItemDisplayValue(item: T): string {
        // Auto-detect [key, value] tuple
        if (Array.isArray(item) && item.length === 2) {
            return String(item[1]);
        }

        // Member property
        if (this.options.displayValueMember && (item as any)[this.options.displayValueMember] !== undefined) {
            return String((item as any)[this.options.displayValueMember]);
        }

        // Callback
        if (this.options.getDisplayValueCallback) {
            return this.options.getDisplayValueCallback(item);
        }

        // Fallback
        return '[N/A]';
    }

    /**
     * Extract badge display value from item
     * Precedence: getBadgeDisplayCallback -> getItemDisplayValue()
     * This allows customizing badge text separately from dropdown display text
     */
    private getItemBadgeDisplayValue(item: T): string {
        // Custom badge callback (if provided)
        if (this.options.getBadgeDisplayCallback) {
            return this.options.getBadgeDisplayCallback(item);
        }

        // Fall back to standard display value
        return this.getItemDisplayValue(item);
    }

    /**
     * Extract search value from item
     * Precedence: searchValueMember -> getSearchValueCallback -> displayValue
     */
    private getItemSearchValue(item: T): string {
        // Member property
        if (this.options.searchValueMember && (item as any)[this.options.searchValueMember] !== undefined) {
            return String((item as any)[this.options.searchValueMember]);
        }

        // Callback
        if (this.options.getSearchValueCallback) {
            return this.options.getSearchValueCallback(item);
        }

        // Fallback to display value
        return this.getItemDisplayValue(item);
    }

    /**
     * Extract icon from item
     */
    private getItemIcon(item: T): string | undefined {
        if (Array.isArray(item)) return undefined;

        if (this.options.iconMember && (item as any)[this.options.iconMember] !== undefined) {
            return String((item as any)[this.options.iconMember]);
        }

        if (this.options.getIconCallback) {
            return this.options.getIconCallback(item);
        }

        return undefined;
    }

    /**
     * Extract subtitle from item
     */
    private getItemSubtitle(item: T): string | undefined {
        if (Array.isArray(item)) return undefined;

        if (this.options.subtitleMember && (item as any)[this.options.subtitleMember] !== undefined) {
            return String((item as any)[this.options.subtitleMember]);
        }

        if (this.options.getSubtitleCallback) {
            return this.options.getSubtitleCallback(item);
        }

        return undefined;
    }

    /**
     * Extract group from item
     */
    private getItemGroup(item: T): string | undefined {
        if (Array.isArray(item)) return undefined;

        if (this.options.groupMember && (item as any)[this.options.groupMember] !== undefined) {
            return String((item as any)[this.options.groupMember]);
        }

        if (this.options.getGroupCallback) {
            return this.options.getGroupCallback(item);
        }

        return undefined;
    }

    /**
     * Extract disabled state from item
     */
    private getItemDisabled(item: T): boolean {
        if (Array.isArray(item)) return false;

        if (this.options.disabledMember && (item as any)[this.options.disabledMember] !== undefined) {
            return Boolean((item as any)[this.options.disabledMember]);
        }

        if (this.options.getDisabledCallback) {
            return this.options.getDisabledCallback(item);
        }

        return false;
    }

    constructor(element: HTMLElement, options: Partial<MultiSelectConfig<T>> = {}) {
        this.element = element;
        this.instanceId = `MS-${Math.random().toString(36).substr(2, 9)}`;

        // Merge options with defaults (using internal naming with 'is' prefix for booleans)
        this.options = {
            // String options
            searchHint: element.dataset.searchHint || '',
            searchPlaceholder: element.dataset.searchPlaceholder || 'Search...',
            dropdownMinWidth: element.dataset.dropdownMinWidth || undefined,
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
            this.dropdown.innerHTML = html;
            return;
        }

        if (this.options.isMultipleEnabled && this.options.actionButtons && this.options.actionButtons.length > 0) {
            const stickyClass = this.options.isActionsSticky ? ' ms__actions--sticky' : '';
            const wrapClass = this.options.actionsLayout === 'wrap' ? ' ms__actions--wrap' : '';
            html += `<div class="ms__actions${stickyClass}${wrapClass}">`;
            this.options.actionButtons.forEach(button => {
                // Check visibility condition (callback takes priority over static property)
                const isVisible = button.isVisibleCallback ? button.isVisibleCallback(this) : (button.isVisible ?? true);
                if (!isVisible) {
                    return;
                }

                // Check disabled state (callback takes priority over static property)
                const isDisabled = button.isDisabledCallback ? button.isDisabledCallback(this) : (button.isDisabled ?? false);
                const disabledAttr = isDisabled ? ' disabled' : '';

                // Get button text (callback takes priority over static property)
                const text = button.getTextCallback ? button.getTextCallback(this) : button.text;

                // Get CSS classes (callback takes priority over static property)
                let cssClass = '';
                if (button.getClassCallback) {
                    const classes = button.getClassCallback(this);
                    cssClass = Array.isArray(classes) ? ` ${classes.join(' ')}` : (classes ? ` ${classes}` : '');
                } else if (button.cssClass) {
                    cssClass = ` ${button.cssClass}`;
                }

                // Note: Tooltips are handled by Floating UI, not HTML title attribute

                html += `<button type="button"${disabledAttr} class="ms__action-btn${cssClass}" data-action="${button.action}">${text}</button>`;
            });
            html += '</div>';
        }

        html += '<div class="ms__options">';

        if (this.filteredOptions.length === 0) {
            html += `<div class="ms__empty">${this.options.emptyMessage}</div>`;
        } else {
            if (this.options.isGroupsAllowed) {
                const groups = this.groupOptions(this.filteredOptions);
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
                    groups[groupName].forEach((option, index) => {
                        html += this.renderOption(option, index);
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
        this.dropdown.innerHTML = html;

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
            if (this.options.isMultipleEnabled && this.options.actionButtons && this.options.actionButtons.length > 0) {
                const stickyClass = this.options.isActionsSticky ? ' ms__actions--sticky' : '';
                const wrapClass = this.options.actionsLayout === 'wrap' ? ' ms__actions--wrap' : '';
                html += `<div class="ms__actions${stickyClass}${wrapClass}">`;
                this.options.actionButtons.forEach(button => {
                    // Check visibility condition (callback takes priority over static property)
                    const isVisible = button.isVisibleCallback ? button.isVisibleCallback(this) : (button.isVisible ?? true);
                    if (!isVisible) {
                        return;
                    }

                    // Check disabled state (callback takes priority over static property)
                    const isDisabled = button.isDisabledCallback ? button.isDisabledCallback(this) : (button.isDisabled ?? false);
                    const disabledAttr = isDisabled ? ' disabled' : '';

                    // Get button text (callback takes priority over static property)
                    const text = button.getTextCallback ? button.getTextCallback(this) : button.text;

                    // Get CSS classes (callback takes priority over static property)
                    let cssClass = '';
                    if (button.getClassCallback) {
                        const classes = button.getClassCallback(this);
                        cssClass = Array.isArray(classes) ? ` ${classes.join(' ')}` : (classes ? ` ${classes}` : '');
                    } else if (button.cssClass) {
                        cssClass = ` ${button.cssClass}`;
                    }

                    // Note: Tooltips are handled by Floating UI, not HTML title attribute

                    html += `<button type="button"${disabledAttr} class="ms__action-btn${cssClass}" data-action="${button.action}">${text}</button>`;
                });
                html += '</div>';
            }

            // Create options container for virtual scroll
            // Add inline styles to ensure proper height constraint and scrolling
            const maxHeight = this.options.maxHeight || '20rem';
            const optionHeight = this.options.optionHeight ?? 50;
            html += `<div class="ms__options ms__options--virtual" style="height: ${maxHeight}; max-height: ${maxHeight}; overflow-y: auto; position: relative; --ms-option-height: ${optionHeight}px;"></div>`;
            this.dropdown.innerHTML = html;

            // Get options container
            this.optionsContainer = this.dropdown.querySelector('.ms__options') as HTMLDivElement;
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

            uiLogger.warn(`[${this.instanceId}] renderBadges() single-select mode`, {
                isOpen: this.isOpen,
                count,
                selectedOptionsLength: selectedOptions.length,
                willSetValue: !this.isOpen && count > 0 && selectedOptions.length > 0,
                selectedLabel
            });

            if (!this.isOpen && count > 0 && selectedOptions.length > 0) {
                uiLogger.info(`[${this.instanceId}] ✅ SETTING input.value = "${selectedLabel}"`);
                this.input.value = selectedLabel!;
                uiLogger.info(`[${this.instanceId}] 🔍 VERIFY input.value = "${this.input.value}"`);
            } else if (!this.isOpen) {
                uiLogger.info(`[${this.instanceId}] ❌ CLEARING input.value (no selection)`);
                this.input.value = '';
            } else {
                uiLogger.info(`[${this.instanceId}] ⏭️ SKIPPING input update (dropdown is open)`);
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
            this.badgesContainer.innerHTML = selectedOptions.map(option => {
                const value = this.getItemValue(option);
                let badgeContent: string;

                // Check if custom render callback is provided
                if (this.options.renderBadgeContentCallback) {
                    const context: BadgeContentRenderContext = {
                        displayMode: 'badges',
                        isInPopover: false
                    };
                    const customContent = this.options.renderBadgeContentCallback(option, context);
                    badgeContent = typeof customContent === 'string' ? customContent : customContent.outerHTML;
                } else {
                    // Default: use existing badge display logic
                    const displayValue = this.getItemBadgeDisplayValue(option);
                    badgeContent = displayValue;
                }

                // Get custom CSS classes if callback provided
                let badgeClasses = 'ms__badge';
                if (this.options.getBadgeClassCallback) {
                    const customClasses = this.options.getBadgeClassCallback(option);
                    const classArray = Array.isArray(customClasses) ? customClasses : [customClasses];
                    badgeClasses += ' ' + classArray.filter(c => c).join(' ');
                }

                return `
                <div class="${badgeClasses}">
                    <span class="ms__badge-text">${badgeContent}</span>
                    <button type="button" class="ms__badge-remove" data-value="${value}" aria-label="Remove ${this.getItemBadgeDisplayValue(option)}"></button>
                </div>
            `;
            }).join('');
        } else if (effectiveMode === 'partial') {
            // Partial mode: show limited badges + "+X more" badge
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;

            const maxVisible = this.options.badgesMaxVisible || 3;
            const visibleOptions = selectedOptions.slice(0, maxVisible);
            const remainingCount = count - maxVisible;

            const visibleBadgesHtml = visibleOptions.map(option => {
                const value = this.getItemValue(option);
                let badgeContent: string;

                // Check if custom render callback is provided
                if (this.options.renderBadgeContentCallback) {
                    const context: BadgeContentRenderContext = {
                        displayMode: 'partial',
                        isInPopover: false
                    };
                    const customContent = this.options.renderBadgeContentCallback(option, context);
                    badgeContent = typeof customContent === 'string' ? customContent : customContent.outerHTML;
                } else {
                    // Default: use existing badge display logic
                    badgeContent = this.getItemBadgeDisplayValue(option);
                }

                // Get custom CSS classes if callback provided
                let badgeClasses = 'ms__badge';
                if (this.options.getBadgeClassCallback) {
                    const customClasses = this.options.getBadgeClassCallback(option);
                    const classArray = Array.isArray(customClasses) ? customClasses : [customClasses];
                    badgeClasses += ' ' + classArray.filter(c => c).join(' ');
                }

                return `
                <div class="${badgeClasses}">
                    <span class="ms__badge-text">${badgeContent}</span>
                    <button type="button" class="ms__badge-remove" data-value="${value}" aria-label="Remove ${this.getItemBadgeDisplayValue(option)}"></button>
                </div>
            `;
            }).join('');

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
                    <div class="ms__badge ms__badge--counter" data-action="show-selected">
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
        setTimeout(() => {
            document.addEventListener('click', (e) => this.handleClickOutside(e));
        }, 0);

        this.dropdown.addEventListener('click', (e) => this.handleDropdownClick(e));

        // Prevent page scroll when scrolling dropdown at boundaries
        this.dropdown.addEventListener('wheel', (e: WheelEvent) => {
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
                this.close();
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
                // Find the custom button and call its onClick handler
                const button = this.options.actionButtons?.find(btn =>
                    btn.action === 'custom' && btn.text === actionBtn.textContent?.trim()
                );
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

    private focusNext(): void {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = Math.min(this.filteredOptions.length - 1, this.focusedIndex + 1);
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusPrevious(): void {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = Math.max(0, this.focusedIndex - 1);
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusFirst(): void {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = 0;
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusLast(): void {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = this.filteredOptions.length - 1;
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusNextMatch(): void {
        if (this.matchingIndices.size === 0) return;

        const matchedArray = Array.from(this.matchingIndices).sort((a, b) => a - b);
        const currentIndex = matchedArray.findIndex(idx => idx === this.focusedIndex);
        const nextIndex = (currentIndex + 1) % matchedArray.length;

        this.focusedIndex = matchedArray[nextIndex];
        this.renderDropdown();
        this.scrollToFocused();
        interactionLogger.debug(`[${this.instanceId}] Jumped to next match: index ${this.focusedIndex} (${currentIndex + 1} of ${matchedArray.length})`);
    }

    private focusPreviousMatch(): void {
        if (this.matchingIndices.size === 0) return;

        const matchedArray = Array.from(this.matchingIndices).sort((a, b) => a - b);
        const currentIndex = matchedArray.findIndex(idx => idx === this.focusedIndex);
        const prevIndex = currentIndex <= 0 ? matchedArray.length - 1 : currentIndex - 1;

        this.focusedIndex = matchedArray[prevIndex];
        this.renderDropdown();
        this.scrollToFocused();
        interactionLogger.debug(`[${this.instanceId}] Jumped to previous match: index ${this.focusedIndex} (${currentIndex + 1} of ${matchedArray.length})`);
    }

    private focusPageUp(): void {
        if (this.filteredOptions.length === 0) return;

        // Jump 10 items up or to the first item
        this.focusedIndex = Math.max(0, this.focusedIndex - 10);
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusPageDown(): void {
        if (this.filteredOptions.length === 0) return;

        // Jump 10 items down or to the last item
        this.focusedIndex = Math.min(this.filteredOptions.length - 1, this.focusedIndex + 10);
        this.renderDropdown();
        this.scrollToFocused();
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

            uiLogger.info(`[${this.instanceId}] ❌ Closing dropdown (single-select mode)`);
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

        interactionLogger.debug(`[${this.instanceId}] Checking closeOnSelect`, {
            closeOnSelect: this.options.isCloseOnSelect,
            willClose: this.options.isCloseOnSelect === true,
            placeholder: this.options.searchPlaceholder
        });
        if (this.options.isCloseOnSelect) {
            uiLogger.info(`[${this.instanceId}] ❌ Closing dropdown (closeOnSelect=true)`);
            this.close();
        } else {
            uiLogger.info(`[${this.instanceId}] ✅ Keeping dropdown open (closeOnSelect=false)`);
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
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();

        if (this.options.selectCallback) {
            this.options.selectCallback(option);
        }
        if (this.options.changeCallback) {
            this.options.changeCallback(this.getSelected());
        }
    }

    private deselectOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);
        this.selectedValues.delete(valueKey);
        this.selectedOptions.delete(valueKey);
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();

        if (this.options.deselectCallback) {
            this.options.deselectCallback(option);
        }
        if (this.options.changeCallback) {
            this.options.changeCallback(this.getSelected());
        }
    }

    private selectAll(): void {
        this.filteredOptions.forEach(option => {
            if (!this.getItemDisabled(option)) {
                const value = this.getItemValue(option);
                const valueKey = String(value);
                this.selectedValues.add(valueKey);
                this.selectedOptions.set(valueKey, option);
            }
        });
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();

        if (this.options.changeCallback) {
            this.options.changeCallback(this.getSelected());
        }
    }

    private clearAll(): void {
        this.selectedValues.clear();
        this.selectedOptions.clear();
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();

        if (this.options.changeCallback) {
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
            const willClearInput = this.options.isMultipleEnabled || this.options.isSearchEnabled;
            uiLogger.warn(`[${this.instanceId}] close() - input clearing decision`, {
                multiple: this.options.isMultipleEnabled,
                enableSearch: this.options.isSearchEnabled,
                willClearInput,
                currentInputValue: this.input.value
            });

            if (willClearInput) {
                uiLogger.info(`[${this.instanceId}] 🧹 close() CLEARING input.value`);
                this.input.value = '';
            } else {
                uiLogger.info(`[${this.instanceId}] 🔒 close() KEEPING input.value = "${this.input.value}"`);
            }

            this.filteredOptions = [...this.allOptions];
        }

        this.focusedIndex = -1;

        uiLogger.info(`[${this.instanceId}] 📞 close() CALLING renderBadges()`);
        this.renderBadges();
        uiLogger.info(`[${this.instanceId}] ✅ close() AFTER renderBadges(), input.value = "${this.input.value}"`);

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

        uiLogger.info(`[${this.instanceId}] Dropdown closed. Stack trace:`);
        uiLogger.trace();
    }

    private positionDropdown(): void {
        this.dropdownCleanup = autoUpdate(
            this.input,
            this.dropdown,
            () => {
                // Use locked placement if lockPlacement is enabled and we have a placement
                const placement = (this.options.isPlacementLocked && this.dropdownPlacement)
                    ? this.dropdownPlacement
                    : 'bottom-start';

                // Only include flip() if placement is not locked or lockPlacement is disabled
                const middleware = [
                    offset(4),
                    ...(this.options.isPlacementLocked && this.dropdownPlacement ? [] : [flip()]),
                    shift({ padding: 8 })
                ];

                computePosition(this.input, this.dropdown, {
                    placement: placement,
                    middleware: middleware
                }).then(({ x, y, placement: finalPlacement }) => {
                    // Lock placement after first computation if lockPlacement is enabled
                    if (this.options.isPlacementLocked && !this.dropdownPlacement) {
                        this.dropdownPlacement = finalPlacement;
                        uiLogger.debug(`[${this.instanceId}] Locked dropdown placement:`, finalPlacement);
                    }

                    const styles: Record<string, string> = {
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${this.input.offsetWidth}px`
                    };

                    if (this.options.dropdownMinWidth) {
                        styles.minWidth = this.options.dropdownMinWidth;
                    }

                    Object.assign(this.dropdown.style, styles);

                    // Update hint position if it exists
                    if (this.hint && this.isOpen) {
                        this.positionHint();
                    }
                });
            }
        );
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
                    middleware: [
                        offset(4),
                        // Don't use flip() - we want hint to stay opposite of dropdown
                        shift({ padding: 8 })
                    ]
                }).then(({ x, y }) => {
                    Object.assign(this.hint!.style, {
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
                    const valueKey = String(value);
                    this.selectedValues.add(valueKey);
                    const option = this.allOptions.find(opt => String(this.getItemValue(opt)) === valueKey);
                    if (option) {
                        this.selectedOptions.set(valueKey, option);
                    }
                });
                this.renderBadges();
            } catch (e) {
                dataLogger.error(`[${this.instanceId}] Failed to parse initial values:`, e);
            }
        }
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
        const threshold = 100;
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
    }

    private renderSelectedPopover(): void {
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        // Use virtual scroll for large selections
        const threshold = 100;
        if (count >= threshold) {
            this.renderSelectedPopoverVirtual(selectedOptions, count);
            return;
        }

        // Standard rendering for small selections
        this.selectedPopover.innerHTML = `
            <div class="ms__selected-popover-header">
                <span>Selected Items (${count})</span>
                <button type="button" class="ms__selected-popover-close" aria-label="Close">&times;</button>
            </div>
            <div class="ms__selected-popover-body">
                ${selectedOptions.map(option => this.renderBadgeForPopover(option)).join('')}
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
                    <button type="button" class="ms__selected-popover-close" aria-label="Close">&times;</button>
                </div>
                <div class="ms__selected-popover-body ms__selected-popover-body--virtual" style="height: 18rem; overflow-y: auto; position: relative; --ml-badge-height-virtual: ${badgeHeight}px;"></div>
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
                    renderItem: (item) => this.renderBadgeForPopover(item),
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

    private renderBadgeForPopover(item: T): string {
        const value = this.getItemValue(item);
        let badgeContent: string;

        // Check for selected item content callback first, fall back to badge content callback
        if (this.options.renderSelectedItemContentCallback) {
            const customContent = this.options.renderSelectedItemContentCallback(item);
            badgeContent = typeof customContent === 'string' ? customContent : customContent.outerHTML;
        } else if (this.options.renderBadgeContentCallback) {
            const context: BadgeContentRenderContext = {
                displayMode: this.options.badgesDisplayMode || 'badges',
                isInPopover: true
            };
            const customContent = this.options.renderBadgeContentCallback(item, context);
            badgeContent = typeof customContent === 'string' ? customContent : customContent.outerHTML;
        } else {
            // Default: use existing badge display logic
            badgeContent = this.getItemBadgeDisplayValue(item);
        }

        // Check for selected item class callback first, fall back to badge class callback
        let badgeClasses = 'ms__badge';
        const classCallback = this.options.getSelectedItemClassCallback || this.options.getBadgeClassCallback;
        if (classCallback) {
            const customClasses = classCallback(item);
            const classArray = Array.isArray(customClasses) ? customClasses : [customClasses];
            badgeClasses += ' ' + classArray.filter(c => c).join(' ');
        }

        return `
            <div class="${badgeClasses}">
                <span class="ms__badge-text">${badgeContent}</span>
                <button type="button" class="ms__badge-remove" data-value="${value}" aria-label="Remove ${this.getItemBadgeDisplayValue(item)}"></button>
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
        this.selectedPopoverCleanup = autoUpdate(
            this.input,
            this.selectedPopover,
            () => {
                const placement = this.selectedPopoverPlacement || 'bottom-start';

                computePosition(this.input, this.selectedPopover, {
                    placement: placement,
                    middleware: [
                        offset(4),
                        ...(this.selectedPopoverPlacement ? [] : [flip()]),
                        shift({ padding: 8 })
                    ]
                }).then(({ x, y, placement: finalPlacement }) => {
                    if (!this.selectedPopoverPlacement) {
                        this.selectedPopoverPlacement = finalPlacement;
                        uiLogger.debug(`[${this.instanceId}] Locked popover placement:`, finalPlacement);
                    }

                    const styles: Record<string, string> = {
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${this.input.offsetWidth}px`
                    };

                    if (this.options.dropdownMinWidth) {
                        styles.minWidth = this.options.dropdownMinWidth;
                    }

                    Object.assign(this.selectedPopover.style, styles);
                });
            }
        );
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
    // BADGE TOOLTIP METHODS
    // ========================================================================

    private attachBadgeTooltips(container?: HTMLElement): void {
        if (!this.options.isBadgeTooltipsEnabled) {
            uiLogger.debug(`[${this.instanceId}] Tooltips disabled - isBadgeTooltipsEnabled is false`);
            return;
        }

        const targetContainer = container || this.badgesContainer;
        const badges = targetContainer.querySelectorAll('.ms__badge:not(.ms__badge--more)');
        uiLogger.debug(`[${this.instanceId}] Found ${badges.length} badges to attach tooltips to`);
        badges.forEach((badge: Element) => {
            const badgeElement = badge as HTMLElement;
            const removeBtn = badgeElement.querySelector('.ms__badge-remove') as HTMLElement;
            if (!removeBtn) return;

            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (!option) return;

            // Create tooltip for badge text (not the entire badge to avoid conflicts with remove button)
            const badgeText = badgeElement.querySelector('.ms__badge-text') as HTMLElement;
            if (badgeText) {
                this.createTooltipForElement(badgeText, option, value);
            }

            // Create tooltip for remove button
            const displayValue = this.getItemBadgeDisplayValue(option);
            this.createRemoveButtonTooltip(removeBtn, displayValue, value, option);
        });

        // Handle "+X more" badge remove button tooltip (only for main badges container)
        if (!container) {
            const moreBadge = this.badgesContainer.querySelector('.ms__badge--more');
            if (moreBadge) {
                const removeBtn = moreBadge.querySelector('.ms__badge-remove') as HTMLElement;
                if (removeBtn && removeBtn.dataset.action === 'remove-hidden') {
                    const maxVisible = this.options.badgesMaxVisible || 3;
                    const selectedOptions = Array.from(this.selectedOptions.values());
                    const hiddenCount = selectedOptions.length - maxVisible;
                    this.createRemoveButtonTooltip(removeBtn, `${hiddenCount} hidden items`, 'more-badge-remove');
                }
            }
        }
    }

    private createTooltipForElement(element: HTMLElement, option: any, uniqueId: string): void {
        const tooltip = document.createElement('div');
        tooltip.className = 'ms__badge-tooltip';

        // Get content from callback or use default (display value + subtitle)
        let content: string | HTMLElement;
        if (this.options.getBadgeTooltipCallback) {
            content = this.options.getBadgeTooltipCallback(option);
            uiLogger.debug(`[${this.instanceId}] Using custom callback for tooltip content`);
        } else {
            const displayValue = this.getItemBadgeDisplayValue(option);
            const subtitle = this.getItemSubtitle(option);
            content = subtitle ? `${displayValue}\n${subtitle}` : displayValue;
            uiLogger.debug(`[${this.instanceId}] Using default content: "${content}"`);
        }

        if (typeof content === 'string') {
            tooltip.textContent = content;
        } else {
            tooltip.appendChild(content);
        }

        const container = this.options.container || document.body;
        container.appendChild(tooltip);
        uiLogger.debug(`[${this.instanceId}] Tooltip element created and appended for "${uniqueId}"`);

        this.badgeTooltips.set(uniqueId, tooltip);

        // Setup hover handlers with tracked timeouts for proper cleanup
        const showTooltip = () => {
            // Clear any pending hide timeout
            const existingHideTimeout = this.badgeTooltipHideTimeouts.get(uniqueId);
            if (existingHideTimeout) {
                clearTimeout(existingHideTimeout);
                this.badgeTooltipHideTimeouts.delete(uniqueId);
            }

            uiLogger.debug(`[${this.instanceId}] Mouse entered badge "${uniqueId}", will show tooltip in ${this.options.badgeTooltipDelay ?? 100}ms`);
            const showTimeout = window.setTimeout(() => {
                uiLogger.debug(`[${this.instanceId}] Showing tooltip for "${uniqueId}"`);
                tooltip.classList.add('ms__badge-tooltip--visible');
                this.positionBadgeTooltip(element, tooltip, uniqueId);
                this.badgeTooltipShowTimeouts.delete(uniqueId);
            }, this.options.badgeTooltipDelay ?? 100);
            this.badgeTooltipShowTimeouts.set(uniqueId, showTimeout);
        };

        const hideTooltip = () => {
            // Clear any pending show timeout
            const existingShowTimeout = this.badgeTooltipShowTimeouts.get(uniqueId);
            if (existingShowTimeout) {
                clearTimeout(existingShowTimeout);
                this.badgeTooltipShowTimeouts.delete(uniqueId);
            }

            const hideTimeout = window.setTimeout(() => {
                tooltip.classList.remove('ms__badge-tooltip--visible');
                this.cleanupBadgeTooltip(uniqueId);
                this.badgeTooltipHideTimeouts.delete(uniqueId);
            }, 100);
            this.badgeTooltipHideTimeouts.set(uniqueId, hideTimeout);
        };

        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    }

    private createRemoveButtonTooltip(removeBtn: HTMLElement, itemName: string, uniqueId: string, option?: T): void {
        const tooltip = document.createElement('div');
        tooltip.className = 'ms__badge-tooltip';

        // Get tooltip text from callback, format string, or default
        let tooltipText: string;
        if (option && this.options.getRemoveButtonTooltipCallback) {
            tooltipText = this.options.getRemoveButtonTooltipCallback(option);
        } else if (this.options.removeButtonTooltipText) {
            // Support format string with {0} placeholder for item name
            tooltipText = this.options.removeButtonTooltipText.replace('{0}', itemName);
        } else {
            tooltipText = `Remove ${itemName}`;
        }
        tooltip.textContent = tooltipText;

        const container = this.options.container || document.body;
        container.appendChild(tooltip);

        const tooltipId = `${uniqueId}-remove`;
        this.badgeTooltips.set(tooltipId, tooltip);

        // Setup hover handlers with tracked timeouts for proper cleanup
        const showTooltip = () => {
            // Clear any pending hide timeout
            const existingHideTimeout = this.badgeTooltipHideTimeouts.get(tooltipId);
            if (existingHideTimeout) {
                clearTimeout(existingHideTimeout);
                this.badgeTooltipHideTimeouts.delete(tooltipId);
            }

            // Hide the parent badge tooltip to prevent overlap
            const badgeTooltip = this.badgeTooltips.get(uniqueId);
            if (badgeTooltip) {
                badgeTooltip.classList.remove('ms__badge-tooltip--visible');
            }

            const showTimeout = window.setTimeout(() => {
                tooltip.classList.add('ms__badge-tooltip--visible');
                this.positionBadgeTooltip(removeBtn, tooltip, tooltipId);
                this.badgeTooltipShowTimeouts.delete(tooltipId);
            }, this.options.badgeTooltipDelay ?? 100);
            this.badgeTooltipShowTimeouts.set(tooltipId, showTimeout);
        };

        const hideTooltip = () => {
            // Clear any pending show timeout
            const existingShowTimeout = this.badgeTooltipShowTimeouts.get(tooltipId);
            if (existingShowTimeout) {
                clearTimeout(existingShowTimeout);
                this.badgeTooltipShowTimeouts.delete(tooltipId);
            }

            const hideTimeout = window.setTimeout(() => {
                tooltip.classList.remove('ms__badge-tooltip--visible');
                this.cleanupBadgeTooltip(tooltipId);
                this.badgeTooltipHideTimeouts.delete(tooltipId);
            }, 100);
            this.badgeTooltipHideTimeouts.set(tooltipId, hideTimeout);
        };

        removeBtn.addEventListener('mouseenter', showTooltip);
        removeBtn.addEventListener('mouseleave', hideTooltip);
    }

    private positionBadgeTooltip(referenceElement: HTMLElement, tooltip: HTMLElement, uniqueId: string): void {
        const cleanup = autoUpdate(referenceElement, tooltip, () => {
            computePosition(referenceElement, tooltip, {
                placement: this.options.badgeTooltipPlacement || 'top',
                strategy: 'fixed',
                middleware: [
                    offset(this.options.badgeTooltipOffset || 8),
                    flip(),
                    shift({ padding: 8 })
                ]
            }).then(({ x, y }) => {
                Object.assign(tooltip.style, {
                    left: `${x}px`,
                    top: `${y}px`
                });
                uiLogger.debug(`[${this.instanceId}] Positioned tooltip "${uniqueId}" at x:${x}, y:${y}`, {
                    placement: this.options.badgeTooltipPlacement || 'top',
                    tooltipClasses: tooltip.className,
                    tooltipDisplay: window.getComputedStyle(tooltip).display,
                    tooltipOpacity: window.getComputedStyle(tooltip).opacity,
                    tooltipVisibility: window.getComputedStyle(tooltip).visibility,
                    tooltipZIndex: window.getComputedStyle(tooltip).zIndex,
                    tooltipPosition: window.getComputedStyle(tooltip).position
                });
            });
        });

        this.badgeTooltipCleanups.set(uniqueId, cleanup);
    }

    private cleanupBadgeTooltip(uniqueId: string): void {
        // Clear any pending timeouts for this specific tooltip
        const showTimeout = this.badgeTooltipShowTimeouts.get(uniqueId);
        if (showTimeout) {
            clearTimeout(showTimeout);
            this.badgeTooltipShowTimeouts.delete(uniqueId);
        }
        const hideTimeout = this.badgeTooltipHideTimeouts.get(uniqueId);
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            this.badgeTooltipHideTimeouts.delete(uniqueId);
        }

        // Clean up Floating UI positioning
        const cleanup = this.badgeTooltipCleanups.get(uniqueId);
        if (cleanup) {
            cleanup();
            this.badgeTooltipCleanups.delete(uniqueId);
        }
    }

    private destroyAllBadgeTooltips(): void {
        // Clear all pending show/hide timeouts first to prevent orphaned callbacks
        this.badgeTooltipShowTimeouts.forEach(timeout => clearTimeout(timeout));
        this.badgeTooltipShowTimeouts.clear();
        this.badgeTooltipHideTimeouts.forEach(timeout => clearTimeout(timeout));
        this.badgeTooltipHideTimeouts.clear();

        // Clean up all tooltip positioning (Floating UI cleanup)
        this.badgeTooltipCleanups.forEach(cleanup => cleanup());
        this.badgeTooltipCleanups.clear();

        // Remove all tooltip elements from DOM
        this.badgeTooltips.forEach(tooltip => tooltip.remove());
        this.badgeTooltips.clear();
    }

    // ========================================================================
    // ACTION BUTTON TOOLTIP METHODS
    // ========================================================================

    private attachActionButtonTooltips(): void {
        const actionButtons = this.dropdown.querySelectorAll('.ms__action-btn');
        uiLogger.debug(`[${this.instanceId}] Found ${actionButtons.length} action buttons to attach tooltips to`);

        actionButtons.forEach((button: Element) => {
            const buttonElement = button as HTMLElement;
            const action = buttonElement.dataset.action;
            if (!action) return;

            // Find the action button config to get tooltip
            const actionConfig = this.options.actionButtons?.find(btn => {
                if (btn.action === 'custom') {
                    return buttonElement.dataset.customAction === buttonElement.dataset.action;
                }
                return btn.action === action;
            });

            if (!actionConfig) return;

            // Get tooltip from callback or static property
            let tooltipText: string | undefined;
            if (actionConfig.getTooltipCallback) {
                tooltipText = actionConfig.getTooltipCallback(this);
                uiLogger.debug(`[${this.instanceId}] Using getTooltipCallback for action button "${action}": "${tooltipText}"`);
            } else {
                tooltipText = actionConfig.tooltip;
                uiLogger.debug(`[${this.instanceId}] Using static tooltip for action button "${action}": "${tooltipText}"`);
            }

            if (!tooltipText) {
                uiLogger.debug(`[${this.instanceId}] No tooltip for action button "${action}"`);
                return;
            }

            // Create unique ID for this button
            const uniqueId = `action-${action}-${Date.now()}`;
            this.createActionButtonTooltip(buttonElement, tooltipText, uniqueId);
        });
    }

    private createActionButtonTooltip(button: HTMLElement, tooltipText: string, uniqueId: string): void {
        const tooltip = document.createElement('div');
        tooltip.className = 'ms__badge-tooltip'; // Reuse badge tooltip styling
        tooltip.textContent = tooltipText;

        const container = this.options.container || document.body;
        container.appendChild(tooltip);
        uiLogger.debug(`[${this.instanceId}] Tooltip element created for action button "${uniqueId}"`);

        this.actionButtonTooltips.set(uniqueId, tooltip);

        // Setup hover handlers
        let showTimeout: number;
        let hideTimeout: number;

        const showTooltip = () => {
            clearTimeout(hideTimeout);
            uiLogger.debug(`[${this.instanceId}] Mouse entered action button "${uniqueId}", will show tooltip in ${this.options.badgeTooltipDelay ?? 100}ms`);
            showTimeout = window.setTimeout(() => {
                uiLogger.debug(`[${this.instanceId}] Showing tooltip for action button "${uniqueId}"`);
                tooltip.classList.add('ms__badge-tooltip--visible');
                this.positionActionButtonTooltip(button, tooltip, uniqueId);
            }, this.options.badgeTooltipDelay ?? 100);
        };

        const hideTooltip = () => {
            clearTimeout(showTimeout);
            hideTimeout = window.setTimeout(() => {
                tooltip.classList.remove('ms__badge-tooltip--visible');
                this.cleanupActionButtonTooltip(uniqueId);
            }, 100);
        };

        button.addEventListener('mouseenter', showTooltip);
        button.addEventListener('mouseleave', hideTooltip);
    }

    private positionActionButtonTooltip(button: HTMLElement, tooltip: HTMLElement, uniqueId: string): void {
        const cleanup = autoUpdate(button, tooltip, () => {
            computePosition(button, tooltip, {
                placement: this.options.badgeTooltipPlacement || 'top',
                strategy: 'fixed',
                middleware: [
                    offset(this.options.badgeTooltipOffset || 8),
                    flip(),
                    shift({ padding: 8 })
                ]
            }).then(({ x, y }) => {
                Object.assign(tooltip.style, {
                    left: `${x}px`,
                    top: `${y}px`
                });
                uiLogger.debug(`[${this.instanceId}] Positioned action button tooltip "${uniqueId}" at x:${x}, y:${y}`);
            });
        });

        this.actionButtonTooltipCleanups.set(uniqueId, cleanup);
    }

    private cleanupActionButtonTooltip(uniqueId: string): void {
        const cleanup = this.actionButtonTooltipCleanups.get(uniqueId);
        if (cleanup) {
            cleanup();
            this.actionButtonTooltipCleanups.delete(uniqueId);
        }
    }

    private destroyAllActionButtonTooltips(): void {
        // Clean up all tooltip positioning
        this.actionButtonTooltipCleanups.forEach(cleanup => cleanup());
        this.actionButtonTooltipCleanups.clear();

        // Remove all tooltip elements
        this.actionButtonTooltips.forEach(tooltip => tooltip.remove());
        this.actionButtonTooltips.clear();
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public destroy(): void {
        this.destroyAllBadgeTooltips();
        this.destroyAllActionButtonTooltips();

        if (this.dropdownCleanup) this.dropdownCleanup();
        if (this.hintCleanup) this.hintCleanup();
        if (this.selectedPopoverCleanup) this.selectedPopoverCleanup();

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
