/**
 * Pure Admin - MultiSelect with Typeahead
 * Comprehensive multiselect component with rich content support and floating hints
 */

import { computePosition, flip, offset, autoUpdate, shift, type Placement } from '@floating-ui/dom';
import type { MultiSelectOption, MultiSelectOptions, MultiSelectConfig, PillsDisplayMode, PillsPosition, SearchInputMode, PillsThresholdMode } from './types';

// Simple inline logger for debugging
const LOG_ENABLED = true; // Set to false to disable all logs
let logCounter = 0;
const log = {
    debug: (message: string, ...args: any[]) => {
        if (LOG_ENABLED) {
            logCounter++;
            console.log(
                `%c[MultiSelect ${logCounter}]%c ${message}`,
                'color: #0ea5e9; font-weight: bold;',
                'color: inherit;',
                ...args
            );
        }
    },
    info: (message: string, ...args: any[]) => {
        if (LOG_ENABLED) {
            logCounter++;
            console.info(
                `%c[MultiSelect ${logCounter}]%c ${message}`,
                'color: #10b981; font-weight: bold;',
                'color: inherit;',
                ...args
            );
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (LOG_ENABLED) {
            logCounter++;
            console.warn(
                `%c[MultiSelect ${logCounter}]%c ${message}`,
                'color: #f59e0b; font-weight: bold;',
                'color: inherit;',
                ...args
            );
        }
    },
    error: (message: string, ...args: any[]) => {
        if (LOG_ENABLED) {
            logCounter++;
            console.error(
                `%c[MultiSelect ${logCounter}]%c ${message}`,
                'color: #ef4444; font-weight: bold;',
                'color: inherit;',
                ...args
            );
        }
    }
};

export class PureMultiSelect<T = any> {
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
    private searchTerm = '';
    private isLoading = false;
    private showSelectedPopover = false;
    private selectedPopoverPlacement: Placement | null = null;
    private dropdownPlacement: Placement | null = null;

    // Floating UI cleanup functions
    private dropdownCleanup: (() => void) | null = null;
    private hintCleanup: (() => void) | null = null;
    private selectedPopoverCleanup: (() => void) | null = null;

    // Pill tooltip storage
    private pillTooltips = new Map<string, HTMLDivElement>();
    private pillTooltipCleanups = new Map<string, () => void>();

    // DOM elements
    private input!: HTMLInputElement;
    private dropdown!: HTMLDivElement;
    private pillsContainer!: HTMLDivElement;
    private countBadge!: HTMLSpanElement;
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
            pillsDisplayMode: (element.dataset.pillsDisplayMode as any) || 'pills',
            pillsPosition: (element.dataset.pillsPosition as PillsPosition) || 'bottom',
            pillsThresholdMode: (element.dataset.pillsThresholdMode as any) || 'count',
            maxHeight: element.dataset.maxHeight || '20rem',
            emptyMessage: element.dataset.emptyMessage || 'No results found',
            loadingMessage: element.dataset.loadingMessage || 'Loading...',
            searchInputMode: (element.dataset.searchInputMode as SearchInputMode) || 'normal',

            // Number options
            pillsThreshold: element.dataset.pillsThreshold ? parseInt(element.dataset.pillsThreshold) : undefined,
            minSearchLength: parseInt(element.dataset.minSearchLength || '0') || 0,

            // Boolean options (internal names with 'is' prefix)
            isMultipleEnabled: element.dataset.multiple !== 'false',
            isGroupsAllowed: element.dataset.allowGroups !== 'false',
            isSelectAllAllowed: element.dataset.allowSelectAll !== 'false',
            isClearAllAllowed: element.dataset.allowClearAll !== 'false',
            isCheckboxesShown: element.dataset.showCheckboxes !== 'false',
            isActionsSticky: element.dataset.stickyActions !== 'false',
            isCloseOnSelect: element.dataset.closeOnSelect === 'true',
            isPlacementLocked: element.dataset.lockPlacement !== 'false',
            isSearchEnabled: element.dataset.enableSearch !== 'false',
            isAddNewAllowed: element.dataset.allowAddNew === 'true',
            isCountBadgeShown: element.dataset.showCountBadge === 'true',

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

        log.debug(`Initialized [${this.instanceId}] with options:`, {
            placeholder: this.options.searchPlaceholder,
            totalOptions: this.allOptions.length,
            isCloseOnSelect: this.options.isCloseOnSelect,
            dataAttribute: this.element.dataset.closeOnSelect,
            isSelectAllAllowed: this.options.isSelectAllAllowed,
            isClearAllAllowed: this.options.isClearAllAllowed
        });
    }

    private parseOptions(): void {
        const dataOptions = this.element.dataset.options;
        if (dataOptions) {
            try {
                this.allOptions = JSON.parse(dataOptions);
            } catch (e) {
                console.error('[MultiSelect] Failed to parse data-options:', e);
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

        // Add classes to the element
        this.element.classList.add('ml');

        if (!this.options.isCheckboxesShown || !this.options.isMultipleEnabled) {
            this.element.classList.add('ml--no-checkboxes');
        }

        // Create input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'ml__input-wrapper';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'ml__input';
        this.input.placeholder = this.options.searchPlaceholder;
        this.input.autocomplete = 'off';

        // Apply searchInputMode
        if (this.options.searchInputMode === 'readonly') {
            this.input.readOnly = true;
        } else if (this.options.searchInputMode === 'hidden') {
            this.input.style.display = 'none';
        }

        const toggle = document.createElement('span');
        toggle.className = 'ml__toggle';
        toggle.innerHTML = '▼';

        this.countBadge = document.createElement('span');
        this.countBadge.className = 'ml__count-badge';
        this.countBadge.style.display = 'none';

        inputWrapper.appendChild(this.input);
        inputWrapper.appendChild(this.countBadge);
        inputWrapper.appendChild(toggle);

        // Create pills container
        this.pillsContainer = document.createElement('div');
        this.pillsContainer.className = 'ml__pills';

        // Build the structure: element contains inputWrapper and pillsContainer
        this.element.appendChild(inputWrapper);
        this.element.appendChild(this.pillsContainer);

        // Create dropdown (attached to container)
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'ml__dropdown';
        container.appendChild(this.dropdown);

        // Create hint if provided (attached to container)
        if (this.options.searchHint) {
            this.hint = document.createElement('div');
            this.hint.className = 'ml__hint';
            this.hint.textContent = this.options.searchHint;
            container.appendChild(this.hint);
        }

        // Create selected popover (attached to container)
        this.selectedPopover = document.createElement('div');
        this.selectedPopover.className = 'ml__selected-popover';
        container.appendChild(this.selectedPopover);

        this.renderDropdown();
    }

    private renderDropdown(): void {
        let html = '';

        if (this.isLoading) {
            html += '<div class="ml__loader">';
            html += '<div class="pa-loader pa-loader--sm"></div>';
            html += `<div class="ml__loading-text">${this.options.loadingMessage}</div>`;
            html += '</div>';
            this.dropdown.innerHTML = html;
            return;
        }

        if (this.options.isMultipleEnabled && (this.options.isSelectAllAllowed || this.options.isClearAllAllowed)) {
            const stickyClass = this.options.isActionsSticky ? ' ml__actions--sticky' : '';
            html += `<div class="ml__actions${stickyClass}">`;
            if (this.options.isSelectAllAllowed) {
                html += '<button type="button" class="ml__action-btn" data-action="select-all">Select All</button>';
            }
            if (this.options.isClearAllAllowed) {
                html += '<button type="button" class="ml__action-btn" data-action="clear-all">Clear All</button>';
            }
            html += '</div>';
        }

        html += '<div class="ml__options">';

        if (this.filteredOptions.length === 0) {
            html += `<div class="ml__empty">${this.options.emptyMessage}</div>`;
        } else {
            if (this.options.isGroupsAllowed) {
                const groups = this.groupOptions(this.filteredOptions);
                Object.keys(groups).forEach(groupName => {
                    html += '<div class="ml__group">';
                    if (groupName !== '__ungrouped__') {
                        html += `<div class="ml__group-label">${groupName}</div>`;
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
    }

    private renderOption(option: T, index: number): string {
        const value = this.getItemValue(option);
        const displayValue = this.getItemDisplayValue(option);
        const icon = this.getItemIcon(option);
        const subtitle = this.getItemSubtitle(option);
        const disabled = this.getItemDisabled(option);

        const isSelected = this.selectedValues.has(String(value));
        const isFocused = index === this.focusedIndex;

        const classes = ['ml__option'];
        if (isSelected) classes.push('ml__option--selected');
        if (isFocused) classes.push('ml__option--focused');
        if (disabled) classes.push('ml__option--disabled');

        let html = `<div class="${classes.join(' ')}" data-value="${value}" data-index="${index}">`;

        if (this.options.isCheckboxesShown && this.options.isMultipleEnabled) {
            html += `<input type="checkbox" class="ml__checkbox" ${isSelected ? 'checked' : ''} ${disabled ? 'disabled' : ''}>`;
        }

        html += '<div class="ml__option-content">';

        if (icon) {
            html += `<span class="ml__option-icon">${icon}</span>`;
        }

        html += '<div class="ml__option-text">';
        html += `<div class="ml__option-title">${this.highlightMatch(displayValue, this.searchTerm)}</div>`;

        if (subtitle) {
            html += `<div class="ml__option-subtitle">${subtitle}</div>`;
        }

        html += '</div>';
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

    private renderPills(): void {
        // Clean up existing tooltips before re-rendering
        this.destroyAllPillTooltips();

        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        if (!this.options.isMultipleEnabled) {
            this.pillsContainer.innerHTML = '';
            this.countBadge.style.display = 'none';

            const selectedLabel = selectedOptions[0] ? this.getItemDisplayValue(selectedOptions[0]) : undefined;

            log.warn(`[${this.instanceId}] renderPills() single-select mode`, {
                isOpen: this.isOpen,
                count,
                selectedOptionsLength: selectedOptions.length,
                willSetValue: !this.isOpen && count > 0 && selectedOptions.length > 0,
                selectedLabel
            });

            if (!this.isOpen && count > 0 && selectedOptions.length > 0) {
                log.info(`[${this.instanceId}] ✅ SETTING input.value = "${selectedLabel}"`);
                this.input.value = selectedLabel!;
                log.info(`[${this.instanceId}] 🔍 VERIFY input.value = "${this.input.value}"`);
            } else if (!this.isOpen) {
                log.info(`[${this.instanceId}] ❌ CLEARING input.value (no selection)`);
                this.input.value = '';
            } else {
                log.info(`[${this.instanceId}] ⏭️ SKIPPING input update (dropdown is open)`);
            }
            return;
        }

        let effectiveMode = this.options.pillsDisplayMode;
        const exceedsThreshold = this.options.pillsThreshold !== null && count > this.options.pillsThreshold;

        if (exceedsThreshold) {
            effectiveMode = this.options.pillsThresholdMode || 'count';
        }

        if (!this.isOpen) {
            if (count > 0 && effectiveMode === 'count') {
                const countText = this.options.getCountPillCallback ? this.options.getCountPillCallback(count) : `${count} selected`;
                this.input.placeholder = countText;
            } else {
                this.input.placeholder = this.options.searchPlaceholder;
            }
        }

        if (this.options.isCountBadgeShown && count > 0) {
            this.countBadge.textContent = `[${count}]`;
            this.countBadge.style.display = '';
        } else {
            this.countBadge.style.display = 'none';
        }

        if (effectiveMode === 'pills') {
            this.pillsContainer.className = `ml__pills ml__pills--${this.options.pillsPosition}`;
            this.pillsContainer.innerHTML = selectedOptions.map(option => {
                const value = this.getItemValue(option);
                const displayValue = this.getItemDisplayValue(option);
                return `
                <div class="ml__pill">
                    <span class="ml__pill-text">${displayValue}</span>
                    <button type="button" class="ml__pill-remove" data-value="${value}" aria-label="Remove ${displayValue}"></button>
                </div>
            `;
            }).join('');
        } else if (effectiveMode === 'partial') {
            // Partial mode: show limited pills + "+X more" badge
            this.pillsContainer.className = `ml__pills ml__pills--${this.options.pillsPosition}`;

            const maxVisible = this.options.pillsMaxVisible || 3;
            const visibleOptions = selectedOptions.slice(0, maxVisible);
            const remainingCount = count - maxVisible;

            const visiblePillsHtml = visibleOptions.map(option => {
                const value = this.getItemValue(option);
                const displayValue = this.getItemDisplayValue(option);
                return `
                <div class="ml__pill">
                    <span class="ml__pill-text">${displayValue}</span>
                    <button type="button" class="ml__pill-remove" data-value="${value}" aria-label="Remove ${displayValue}"></button>
                </div>
            `;
            }).join('');

            let moreBadgeHtml = '';
            if (remainingCount > 0) {
                const moreText = this.options.getCountPillCallback
                    ? this.options.getCountPillCallback(count, remainingCount)
                    : `+${remainingCount} more`;

                moreBadgeHtml = `
                    <div class="ml__pill ml__pill--more" data-action="show-selected">
                        <span class="ml__pill-text">${moreText}</span>
                        <button type="button" class="ml__pill-remove" data-action="remove-hidden" aria-label="Remove ${remainingCount} hidden items"></button>
                    </div>
                `;
            }

            this.pillsContainer.innerHTML = visiblePillsHtml + moreBadgeHtml;
        } else {
            // Count mode
            this.pillsContainer.className = `ml__count-display ml__count-display--${this.options.pillsPosition}`;
            if (count > 0) {
                const countText = this.options.getCountPillCallback ? this.options.getCountPillCallback(count) : `${count} selected`;
                this.pillsContainer.innerHTML = `
                    <div class="ml__count-badge-wrapper">
                        <button type="button" class="ml__count-text" data-action="show-selected">
                            ${countText}
                        </button>
                        <button type="button" class="ml__count-clear" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
            } else {
                this.pillsContainer.innerHTML = '';
            }
        }

        // Attach tooltips after rendering pills
        this.attachPillTooltips();
    }

    private attachEvents(): void {
        // Prevent click propagation from input to document
        this.input.addEventListener('mousedown', (e) => {
            if (!this.isOpen) {
                e.stopPropagation();
            }
        });

        this.input.addEventListener('focus', () => this.open());
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

        // Prevent click propagation for count text button (in pills container)
        this.pillsContainer.addEventListener('mousedown', (e) => {
            const countTextBtn = (e.target as HTMLElement).closest('.ml__count-text');
            if (countTextBtn && !this.showSelectedPopover) {
                e.stopPropagation();
            }
        });
        this.pillsContainer.addEventListener('click', (e) => this.handlePillClick(e));

        // Prevent click propagation for count badge to avoid immediate popover close
        this.countBadge.addEventListener('mousedown', (e) => {
            if (!this.showSelectedPopover) {
                e.stopPropagation();
            }
        });
        this.countBadge.addEventListener('click', (e) => {
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

        if (this.options.searchCallback) {
            if (value.length < this.options.minSearchLength) {
                this.filteredOptions = [];
                this.allOptions = [];
                this.renderDropdown();
                return;
            }

            this.isLoading = true;
            this.renderDropdown();
            log.debug(`[${this.instanceId}] Loading data for search term:`, value);

            try {
                const results = await this.options.searchCallback(value);

                if (this.searchTerm === value) {
                    this.allOptions = results || [];
                    this.filteredOptions = [...this.allOptions];
                    this.isLoading = false;
                    // Auto-focus first option if search is enabled and there are results
                    this.focusedIndex = (this.options.isSearchEnabled && this.filteredOptions.length > 0) ? 0 : -1;
                    this.renderDropdown();
                    log.debug(`[${this.instanceId}] Loaded ${this.allOptions.length} results`);
                }
            } catch (error) {
                log.error(`[${this.instanceId}] Error loading data:`, error);
                this.isLoading = false;
                this.filteredOptions = [];
                this.allOptions = [];
                this.renderDropdown();
            }
        } else {
            if (!value) {
                this.filteredOptions = [...this.allOptions];
            } else {
                this.filteredOptions = this.allOptions.filter(option => {
                    const searchValue = this.getItemSearchValue(option).toLowerCase();
                    return searchValue.includes(value.toLowerCase());
                });
            }

            // Auto-focus first option if search is enabled and there are results
            this.focusedIndex = (this.options.isSearchEnabled && this.filteredOptions.length > 0) ? 0 : -1;
            this.renderDropdown();
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
                this.focusNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.focusPrevious();
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
        log.debug(`[${this.instanceId}] Dropdown clicked`, { target: (e.target as HTMLElement).className });

        e.stopPropagation();

        const actionBtn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
        if (actionBtn) {
            e.preventDefault();
            const action = actionBtn.dataset.action;
            log.debug(`[${this.instanceId}] Action button clicked:`, action);
            if (action === 'select-all') {
                this.selectAll();
            } else if (action === 'clear-all') {
                this.clearAll();
            }
            return;
        }

        const option = (e.target as HTMLElement).closest('.ml__option') as HTMLElement;
        if (option && !option.classList.contains('ml__option--disabled')) {
            e.preventDefault();
            const value = option.dataset.value!;
            const optionData = this.filteredOptions.find(opt => String(this.getItemValue(opt)) === value);
            log.debug(`[${this.instanceId}] Option clicked:`, {
                value,
                closeOnSelect: this.options.isCloseOnSelect,
                placeholder: this.options.searchPlaceholder
            });
            if (optionData) {
                this.toggleOption(optionData);
            }
        }
    }

    private handlePillClick(e: MouseEvent): void {
        const countClearBtn = (e.target as HTMLElement).closest('.ml__count-clear');
        if (countClearBtn) {
            e.preventDefault();
            e.stopPropagation();
            log.debug(`[${this.instanceId}] Count clear button clicked`);
            this.clearAll();
            return;
        }

        const countTextBtn = (e.target as HTMLElement).closest('.ml__count-text');
        if (countTextBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.ml__pill-remove') as HTMLElement;
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();

            // Handle remove-hidden action (remove all hidden items in partial mode)
            if (removeBtn.dataset.action === 'remove-hidden') {
                log.debug(`[${this.instanceId}] Remove hidden items button clicked`);
                const maxVisible = this.options.pillsMaxVisible || 3;
                const selectedOptions = Array.from(this.selectedOptions.values());
                const hiddenOptions = selectedOptions.slice(maxVisible);

                // Deselect all hidden options
                hiddenOptions.forEach(option => this.deselectOption(option));
                return;
            }

            // Handle regular pill remove
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (option) {
                this.deselectOption(option);
            }
            return;
        }

        // Handle clicking the "+X more" badge itself (not the remove button)
        const morePill = (e.target as HTMLElement).closest('.ml__pill--more');
        if (morePill && !(e.target as HTMLElement).closest('.ml__pill-remove')) {
            e.preventDefault();
            e.stopPropagation();
            log.debug(`[${this.instanceId}] '+X more' badge clicked, showing popover`);
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
                    this.countBadge.contains(el) ||
                    (el.closest && el.closest('.ml__count-text'))
                )
            );

            if (!clickedInsidePopover) {
                log.debug(`[${this.instanceId}] Closing selected popover due to click outside`);
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

        log.debug(`[${this.instanceId}] handleClickOutside`, {
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
            log.warn(`[${this.instanceId}] Closing dropdown due to click outside`);
            this.close();
        }
    }

    private focusNext(): void {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = (this.focusedIndex + 1) % this.filteredOptions.length;
        this.renderDropdown();
        this.scrollToFocused();
    }

    private focusPrevious(): void {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = this.focusedIndex <= 0
            ? this.filteredOptions.length - 1
            : this.focusedIndex - 1;
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
        const focusedElement = this.dropdown.querySelector('.ml__option--focused');
        if (focusedElement) {
            focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    private toggleOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);
        log.debug(`[${this.instanceId}] toggleOption called`, { value, multiple: this.options.isMultipleEnabled });

        if (!this.options.isMultipleEnabled) {
            if (this.selectedValues.has(valueKey)) {
                log.debug(`[${this.instanceId}] Deselecting option in single-select mode`, { value });
                this.deselectOption(option);
            } else {
                log.debug(`[${this.instanceId}] Clearing previous selections and selecting new option`, { value });
                this.selectedValues.clear();
                this.selectedOptions.clear();
                this.selectOption(option);
            }

            log.info(`[${this.instanceId}] ❌ Closing dropdown (single-select mode)`);
            this.close();
            return;
        }

        if (this.selectedValues.has(valueKey)) {
            log.debug(`[${this.instanceId}] Deselecting option`, { value });
            this.deselectOption(option);
        } else {
            log.debug(`[${this.instanceId}] Selecting option`, { value });
            this.selectOption(option);
        }

        log.debug(`[${this.instanceId}] Checking closeOnSelect`, {
            closeOnSelect: this.options.isCloseOnSelect,
            willClose: this.options.isCloseOnSelect === true,
            placeholder: this.options.searchPlaceholder
        });
        if (this.options.isCloseOnSelect) {
            log.info(`[${this.instanceId}] ❌ Closing dropdown (closeOnSelect=true)`);
            this.close();
        } else {
            log.info(`[${this.instanceId}] ✅ Keeping dropdown open (closeOnSelect=false)`);
        }
    }

    private async handleAddNew(value: string): Promise<void> {
        if (!this.options.addNewCallback) return;

        try {
            log.debug(`[${this.instanceId}] Adding new option:`, value);
            const newOption = await this.options.addNewCallback(value);

            // Add to options list
            this.allOptions.push(newOption);
            this.filteredOptions.push(newOption);

            // Select the new option
            this.selectOption(newOption);

            // Clear input and re-render
            this.input.value = '';
            this.renderDropdown();
            this.renderPills();

            if (this.options.isCloseOnSelect) {
                this.close();
            }
        } catch (error) {
            log.error(`[${this.instanceId}] Error adding new option:`, error);
        }
    }

    private selectOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);
        this.selectedValues.add(valueKey);
        this.selectedOptions.set(valueKey, option);
        this.renderDropdown();
        this.renderPills();
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
        this.renderPills();
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
        this.renderPills();
        this.updateHiddenInput();

        if (this.options.changeCallback) {
            this.options.changeCallback(this.getSelected());
        }
    }

    private clearAll(): void {
        this.selectedValues.clear();
        this.selectedOptions.clear();
        this.renderDropdown();
        this.renderPills();
        this.updateHiddenInput();

        if (this.options.changeCallback) {
            this.options.changeCallback(this.getSelected());
        }
    }

    private open(): void {
        log.debug(`[${this.instanceId}] open() called`, { isOpen: this.isOpen });
        if (this.isOpen) return;

        this.isOpen = true;
        this.element.classList.add('ml--open');
        this.dropdown.classList.add('ml__dropdown--visible');
        log.info(`[${this.instanceId}] Dropdown opened`);

        this.input.placeholder = this.options.searchPlaceholder;

        // Only clear input if search is enabled
        if (!this.options.isMultipleEnabled && this.options.isSearchEnabled) {
            this.input.value = '';
        }

        this.renderDropdown();
        this.positionDropdown();

        if (this.hint) {
            this.hint.classList.add('ml__hint--visible');
            this.positionHint();
        }
    }

    private close(): void {
        log.debug(`[${this.instanceId}] close() called`, { isOpen: this.isOpen });
        if (!this.isOpen) return;

        this.isOpen = false;
        this.element.classList.remove('ml--open');
        this.dropdown.classList.remove('ml__dropdown--visible');
        if (this.hint) {
            this.hint.classList.remove('ml__hint--visible');
        }
        this.searchTerm = '';
        // Only clear input in multi-select mode or when search is enabled
        const willClearInput = this.options.isMultipleEnabled || this.options.isSearchEnabled;
        log.warn(`[${this.instanceId}] close() - input clearing decision`, {
            multiple: this.options.isMultipleEnabled,
            enableSearch: this.options.isSearchEnabled,
            willClearInput,
            currentInputValue: this.input.value
        });

        if (willClearInput) {
            log.info(`[${this.instanceId}] 🧹 close() CLEARING input.value`);
            this.input.value = '';
        } else {
            log.info(`[${this.instanceId}] 🔒 close() KEEPING input.value = "${this.input.value}"`);
        }

        this.filteredOptions = [...this.allOptions];
        this.focusedIndex = -1;

        log.info(`[${this.instanceId}] 📞 close() CALLING renderPills()`);
        this.renderPills();
        log.info(`[${this.instanceId}] ✅ close() AFTER renderPills(), input.value = "${this.input.value}"`);

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

        log.info(`[${this.instanceId}] Dropdown closed. Stack trace:`);
        console.trace();
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
                        log.debug(`[${this.instanceId}] Locked dropdown placement:`, finalPlacement);
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
                this.renderPills();
            } catch (e) {
                console.error('[MultiSelect] Failed to parse initial values:', e);
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
        log.debug(`[${this.instanceId}] showPopover() called`);

        if (this.isOpen) {
            this.close();
        }

        this.showSelectedPopover = true;
        this.renderSelectedPopover();
        this.selectedPopover.classList.add('ml__selected-popover--visible');
        this.positionSelectedPopover();
    }

    private hideSelectedPopover(): void {
        log.debug(`[${this.instanceId}] hideSelectedPopover() called`);
        this.showSelectedPopover = false;
        this.selectedPopover.classList.remove('ml__selected-popover--visible');
        this.selectedPopoverPlacement = null;

        if (this.selectedPopoverCleanup) {
            this.selectedPopoverCleanup();
            this.selectedPopoverCleanup = null;
        }
    }

    private renderSelectedPopover(): void {
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        this.selectedPopover.innerHTML = `
            <div class="ml__selected-popover-header">
                <span>Selected Items (${count})</span>
                <button type="button" class="ml__selected-popover-close" aria-label="Close">&times;</button>
            </div>
            <div class="ml__selected-popover-body">
                ${selectedOptions.map(option => {
                    const value = this.getItemValue(option);
                    const displayValue = this.getItemDisplayValue(option);
                    return `
                    <div class="ml__pill">
                        <span class="ml__pill-text">${displayValue}</span>
                        <button type="button" class="ml__pill-remove" data-value="${value}" aria-label="Remove ${displayValue}"></button>
                    </div>
                `;
                }).join('')}
            </div>
        `;
    }

    private handleSelectedPopoverClick(e: MouseEvent): void {
        e.stopPropagation();

        const closeBtn = (e.target as HTMLElement).closest('.ml__selected-popover-close');
        if (closeBtn) {
            e.preventDefault();
            this.hideSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.ml__pill-remove') as HTMLElement;
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
                        log.debug(`[${this.instanceId}] Locked popover placement:`, finalPlacement);
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
        this.renderPills();
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
    // PILL TOOLTIP METHODS
    // ========================================================================

    private attachPillTooltips(): void {
        if (!this.options.isPillTooltipsEnabled) {
            console.log('[Tooltips] Disabled - isPillTooltipsEnabled is false');
            return;
        }

        const pills = this.pillsContainer.querySelectorAll('.ml__pill:not(.ml__pill--more)');
        console.log(`[Tooltips] Found ${pills.length} pills to attach tooltips to`);
        pills.forEach((pill: Element) => {
            const pillElement = pill as HTMLElement;
            const removeBtn = pillElement.querySelector('.ml__pill-remove') as HTMLElement;
            if (!removeBtn) return;

            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (!option) return;

            // Create tooltip for pill text (not the entire pill to avoid conflicts with remove button)
            const pillText = pillElement.querySelector('.ml__pill-text') as HTMLElement;
            if (pillText) {
                this.createTooltipForElement(pillText, option, value);
            }

            // Create tooltip for remove button
            const displayValue = this.getItemDisplayValue(option);
            this.createRemoveButtonTooltip(removeBtn, displayValue, value);
        });

        // Handle "+X more" badge remove button tooltip
        const morePill = this.pillsContainer.querySelector('.ml__pill--more');
        if (morePill) {
            const removeBtn = morePill.querySelector('.ml__pill-remove') as HTMLElement;
            if (removeBtn && removeBtn.dataset.action === 'remove-hidden') {
                const maxVisible = this.options.pillsMaxVisible || 3;
                const selectedOptions = Array.from(this.selectedOptions.values());
                const hiddenCount = selectedOptions.length - maxVisible;
                this.createRemoveButtonTooltip(removeBtn, `${hiddenCount} hidden items`, 'more-badge-remove');
            }
        }
    }

    private createTooltipForElement(element: HTMLElement, option: any, uniqueId: string): void {
        const tooltip = document.createElement('div');
        tooltip.className = 'ml__pill-tooltip';

        // Get content from callback or use default (display value + subtitle)
        let content: string | HTMLElement;
        if (this.options.getPillTooltipCallback) {
            content = this.options.getPillTooltipCallback(option);
            console.log('[Tooltips] Using custom callback for tooltip content');
        } else {
            const displayValue = this.getItemDisplayValue(option);
            const subtitle = this.getItemSubtitle(option);
            content = subtitle ? `${displayValue}\n${subtitle}` : displayValue;
            console.log(`[Tooltips] Using default content: "${content}"`);
        }

        if (typeof content === 'string') {
            tooltip.textContent = content;
        } else {
            tooltip.appendChild(content);
        }

        const container = this.options.container || document.body;
        container.appendChild(tooltip);
        console.log(`[Tooltips] Tooltip element created and appended for "${uniqueId}"`);

        this.pillTooltips.set(uniqueId, tooltip);

        // Setup hover handlers
        let showTimeout: number;
        let hideTimeout: number;

        const showTooltip = () => {
            clearTimeout(hideTimeout);
            console.log(`[Tooltips] Mouse entered pill "${uniqueId}", will show tooltip in ${this.options.pillTooltipDelay || 300}ms`);
            showTimeout = window.setTimeout(() => {
                console.log(`[Tooltips] Showing tooltip for "${uniqueId}"`);
                tooltip.classList.add('ml__pill-tooltip--visible');
                this.positionPillTooltip(element, tooltip, uniqueId);
            }, this.options.pillTooltipDelay || 300);
        };

        const hideTooltip = () => {
            clearTimeout(showTimeout);
            hideTimeout = window.setTimeout(() => {
                tooltip.classList.remove('ml__pill-tooltip--visible');
                this.cleanupPillTooltip(uniqueId);
            }, 100);
        };

        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    }

    private createRemoveButtonTooltip(removeBtn: HTMLElement, itemName: string, uniqueId: string): void {
        const tooltip = document.createElement('div');
        tooltip.className = 'ml__pill-tooltip';
        tooltip.textContent = `Remove ${itemName}`;

        const container = this.options.container || document.body;
        container.appendChild(tooltip);

        const tooltipId = `${uniqueId}-remove`;
        this.pillTooltips.set(tooltipId, tooltip);

        let showTimeout: number;
        let hideTimeout: number;

        const showTooltip = () => {
            clearTimeout(hideTimeout);

            // Hide the parent pill tooltip to prevent overlap
            const pillTooltip = this.pillTooltips.get(uniqueId);
            if (pillTooltip) {
                pillTooltip.classList.remove('ml__pill-tooltip--visible');
            }

            showTimeout = window.setTimeout(() => {
                tooltip.classList.add('ml__pill-tooltip--visible');
                this.positionPillTooltip(removeBtn, tooltip, tooltipId);
            }, this.options.pillTooltipDelay || 300);
        };

        const hideTooltip = () => {
            clearTimeout(showTimeout);
            hideTimeout = window.setTimeout(() => {
                tooltip.classList.remove('ml__pill-tooltip--visible');
                this.cleanupPillTooltip(tooltipId);
            }, 100);
        };

        removeBtn.addEventListener('mouseenter', showTooltip);
        removeBtn.addEventListener('mouseleave', hideTooltip);
    }

    private positionPillTooltip(referenceElement: HTMLElement, tooltip: HTMLElement, uniqueId: string): void {
        const cleanup = autoUpdate(referenceElement, tooltip, () => {
            computePosition(referenceElement, tooltip, {
                placement: this.options.pillTooltipPlacement || 'top',
                strategy: 'fixed',
                middleware: [
                    offset(this.options.pillTooltipOffset || 8),
                    flip(),
                    shift({ padding: 8 })
                ]
            }).then(({ x, y }) => {
                Object.assign(tooltip.style, {
                    left: `${x}px`,
                    top: `${y}px`
                });
                console.log(`[Tooltips] Positioned tooltip "${uniqueId}" at x:${x}, y:${y}`, {
                    placement: this.options.pillTooltipPlacement || 'top',
                    tooltipClasses: tooltip.className,
                    tooltipDisplay: window.getComputedStyle(tooltip).display,
                    tooltipOpacity: window.getComputedStyle(tooltip).opacity,
                    tooltipVisibility: window.getComputedStyle(tooltip).visibility,
                    tooltipZIndex: window.getComputedStyle(tooltip).zIndex,
                    tooltipPosition: window.getComputedStyle(tooltip).position
                });
            });
        });

        this.pillTooltipCleanups.set(uniqueId, cleanup);
    }

    private cleanupPillTooltip(uniqueId: string): void {
        const cleanup = this.pillTooltipCleanups.get(uniqueId);
        if (cleanup) {
            cleanup();
            this.pillTooltipCleanups.delete(uniqueId);
        }
    }

    private destroyAllPillTooltips(): void {
        // Clean up all tooltip positioning
        this.pillTooltipCleanups.forEach(cleanup => cleanup());
        this.pillTooltipCleanups.clear();

        // Remove all tooltip elements
        this.pillTooltips.forEach(tooltip => tooltip.remove());
        this.pillTooltips.clear();
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public destroy(): void {
        this.destroyAllPillTooltips();

        if (this.dropdownCleanup) this.dropdownCleanup();
        if (this.hintCleanup) this.hintCleanup();
        if (this.selectedPopoverCleanup) this.selectedPopoverCleanup();

        if (this.dropdown) this.dropdown.remove();
        if (this.hint) this.hint.remove();
        if (this.selectedPopover) this.selectedPopover.remove();

        // Clear the element's content to prevent duplication on re-initialization
        this.element.innerHTML = '';
        this.element.classList.remove('ml', 'ml--open', 'ml--no-checkboxes');

        console.log('[MultiSelect] Destroyed');
    }
}
