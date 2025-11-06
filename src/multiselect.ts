/**
 * Pure Admin - MultiSelect with Typeahead
 * Comprehensive multiselect component with rich content support and floating hints
 */

import { computePosition, flip, offset, autoUpdate, shift, type Placement } from '@floating-ui/dom';
import type { MultiSelectOption, MultiSelectOptions, DisplayMode, PillsPosition, SearchInputMode } from './types';

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

export class PureMultiSelect {
    private element: HTMLElement;
    private instanceId: string;
    private options: Required<MultiSelectOptions>;

    private isOpen = false;
    private selectedValues = new Set<string>();
    private selectedOptions = new Map<string, MultiSelectOption>();
    private allOptions: MultiSelectOption[] = [];
    private filteredOptions: MultiSelectOption[] = [];
    private focusedIndex = -1;
    private searchTerm = '';
    private isLoading = false;
    private loadingTimeout: number | null = null;
    private showSelectedPopover = false;
    private selectedPopoverPlacement: Placement | null = null;
    private dropdownPlacement: Placement | null = null;

    // Floating UI cleanup functions
    private dropdownCleanup: (() => void) | null = null;
    private hintCleanup: (() => void) | null = null;
    private selectedPopoverCleanup: (() => void) | null = null;

    // DOM elements
    private input!: HTMLInputElement;
    private dropdown!: HTMLDivElement;
    private pillsContainer!: HTMLDivElement;
    private countBadge!: HTMLSpanElement;
    private wrapper!: HTMLDivElement;
    private hint?: HTMLDivElement;
    private selectedPopover!: HTMLDivElement;

    constructor(element: HTMLElement, options: Partial<MultiSelectOptions> = {}) {
        this.element = element;
        this.instanceId = `MS-${Math.random().toString(36).substr(2, 9)}`;

        // Merge options with defaults
        this.options = {
            searchHint: element.dataset.searchHint || '',
            searchPlaceholder: element.dataset.searchPlaceholder || 'Search...',
            multiple: element.dataset.multiple !== 'false',
            allowGroups: element.dataset.allowGroups !== 'false',
            allowSelectAll: element.dataset.allowSelectAll !== 'false',
            allowClearAll: element.dataset.allowClearAll !== 'false',
            showCheckboxes: element.dataset.showCheckboxes !== 'false',
            stickyActions: element.dataset.stickyActions !== 'false',
            closeOnSelect: element.dataset.closeOnSelect === 'true',
            lockPlacement: element.dataset.lockPlacement !== 'false',
            dropdownMinWidth: element.dataset.dropdownMinWidth || null,
            displayMode: (element.dataset.displayMode as DisplayMode) || 'pills',
            pillsThreshold: element.dataset.pillsThreshold ? parseInt(element.dataset.pillsThreshold) : null,
            pillsPosition: (element.dataset.pillsPosition as PillsPosition) || 'bottom',
            countFormat: element.dataset.countFormat || '{count} selected',
            showCountBadge: element.dataset.showCountBadge === 'true',
            maxHeight: element.dataset.maxHeight || '20rem',
            emptyMessage: element.dataset.emptyMessage || 'No results found',
            loadingMessage: element.dataset.loadingMessage || 'Loading...',
            minSearchLength: parseInt(element.dataset.minSearchLength || '0') || 0,
            enableSearch: element.dataset.enableSearch !== 'false',
            searchInputMode: (element.dataset.searchInputMode as SearchInputMode) || 'normal',
            allowAddNew: element.dataset.allowAddNew === 'true',
            onSearch: null,
            onAddNew: null,
            onSelect: null,
            onDeselect: null,
            onChange: null,
            options: [],
            container: null,
            ...options
        } as Required<MultiSelectOptions>;

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
            closeOnSelect: this.options.closeOnSelect,
            dataAttribute: this.element.dataset.closeOnSelect,
            allowSelectAll: this.options.allowSelectAll,
            allowClearAll: this.options.allowClearAll
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
        this.element.classList.add('pa-multiselect');

        if (!this.options.showCheckboxes || !this.options.multiple) {
            this.element.classList.add('pa-multiselect--no-checkboxes');
        }

        // Create wrapper for pills layout
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'pa-multiselect-wrapper';

        if (this.options.pillsPosition === 'left' || this.options.pillsPosition === 'right') {
            this.wrapper.classList.add('pa-multiselect-wrapper--inline');
        }

        // Create input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'pa-multiselect__input-wrapper';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'pa-multiselect__input';
        this.input.placeholder = this.options.searchPlaceholder;
        this.input.autocomplete = 'off';

        // Apply searchInputMode
        if (this.options.searchInputMode === 'readonly') {
            this.input.readOnly = true;
        } else if (this.options.searchInputMode === 'hidden') {
            this.input.style.display = 'none';
        }

        const toggle = document.createElement('span');
        toggle.className = 'pa-multiselect__toggle';
        toggle.innerHTML = '▼';

        this.countBadge = document.createElement('span');
        this.countBadge.className = 'pa-multiselect__count-badge';
        this.countBadge.style.display = 'none';

        inputWrapper.appendChild(this.input);
        inputWrapper.appendChild(this.countBadge);
        inputWrapper.appendChild(toggle);

        // Create pills container
        this.pillsContainer = document.createElement('div');
        this.pillsContainer.className = 'pa-multiselect__pills';

        // Build the structure: element contains wrapper, wrapper contains inputWrapper and pillsContainer
        this.element.appendChild(inputWrapper);
        this.element.appendChild(this.pillsContainer);

        // Create dropdown (attached to container)
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'pa-multiselect__dropdown';
        container.appendChild(this.dropdown);

        // Create hint if provided (attached to container)
        if (this.options.searchHint) {
            this.hint = document.createElement('div');
            this.hint.className = 'pa-multiselect__hint';
            this.hint.textContent = this.options.searchHint;
            container.appendChild(this.hint);
        }

        // Create selected popover (attached to container)
        this.selectedPopover = document.createElement('div');
        this.selectedPopover.className = 'pa-multiselect__selected-popover';
        container.appendChild(this.selectedPopover);

        this.renderDropdown();
    }

    private renderDropdown(): void {
        let html = '';

        if (this.isLoading) {
            html += '<div class="pa-multiselect__loader">';
            html += '<div class="pa-loader pa-loader--sm"></div>';
            html += `<div class="pa-multiselect__loading-text">${this.options.loadingMessage}</div>`;
            html += '</div>';
            this.dropdown.innerHTML = html;
            return;
        }

        if (this.options.multiple && (this.options.allowSelectAll || this.options.allowClearAll)) {
            const stickyClass = this.options.stickyActions ? ' pa-multiselect__actions--sticky' : '';
            html += `<div class="pa-multiselect__actions${stickyClass}">`;
            if (this.options.allowSelectAll) {
                html += '<button type="button" class="pa-multiselect__action-btn" data-action="select-all">Select All</button>';
            }
            if (this.options.allowClearAll) {
                html += '<button type="button" class="pa-multiselect__action-btn" data-action="clear-all">Clear All</button>';
            }
            html += '</div>';
        }

        html += '<div class="pa-multiselect__options">';

        if (this.filteredOptions.length === 0) {
            html += `<div class="pa-multiselect__empty">${this.options.emptyMessage}</div>`;
        } else {
            if (this.options.allowGroups) {
                const groups = this.groupOptions(this.filteredOptions);
                Object.keys(groups).forEach(groupName => {
                    html += '<div class="pa-multiselect__group">';
                    if (groupName !== '__ungrouped__') {
                        html += `<div class="pa-multiselect__group-label">${groupName}</div>`;
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

    private renderOption(option: MultiSelectOption, index: number): string {
        const isSelected = this.selectedValues.has(option.value);
        const isFocused = index === this.focusedIndex;
        const isDisabled = option.disabled || false;

        const classes = ['pa-multiselect__option'];
        if (isSelected) classes.push('pa-multiselect__option--selected');
        if (isFocused) classes.push('pa-multiselect__option--focused');
        if (isDisabled) classes.push('pa-multiselect__option--disabled');

        let html = `<div class="${classes.join(' ')}" data-value="${option.value}" data-index="${index}">`;

        if (this.options.showCheckboxes && this.options.multiple) {
            html += `<input type="checkbox" class="pa-multiselect__checkbox" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>`;
        }

        html += '<div class="pa-multiselect__option-content">';

        if (option.icon) {
            html += `<span class="pa-multiselect__option-icon">${option.icon}</span>`;
        }

        html += '<div class="pa-multiselect__option-text">';
        html += `<div class="pa-multiselect__option-title">${this.highlightMatch(option.label, this.searchTerm)}</div>`;

        if (option.subtitle) {
            html += `<div class="pa-multiselect__option-subtitle">${option.subtitle}</div>`;
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

    private groupOptions(options: MultiSelectOption[]): Record<string, MultiSelectOption[]> {
        const groups: Record<string, MultiSelectOption[]> = {};

        options.forEach(option => {
            const groupName = option.group || '__ungrouped__';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(option);
        });

        return groups;
    }

    private renderPills(): void {
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        if (!this.options.multiple) {
            this.pillsContainer.innerHTML = '';
            this.countBadge.style.display = 'none';

            log.warn(`[${this.instanceId}] renderPills() single-select mode`, {
                isOpen: this.isOpen,
                count,
                selectedOptionsLength: selectedOptions.length,
                willSetValue: !this.isOpen && count > 0 && selectedOptions.length > 0,
                selectedLabel: selectedOptions[0]?.label
            });

            if (!this.isOpen && count > 0 && selectedOptions.length > 0) {
                log.info(`[${this.instanceId}] ✅ SETTING input.value = "${selectedOptions[0].label}"`);
                this.input.value = selectedOptions[0].label;
                log.info(`[${this.instanceId}] 🔍 VERIFY input.value = "${this.input.value}"`);
            } else if (!this.isOpen) {
                log.info(`[${this.instanceId}] ❌ CLEARING input.value (no selection)`);
                this.input.value = '';
            } else {
                log.info(`[${this.instanceId}] ⏭️ SKIPPING input update (dropdown is open)`);
            }
            return;
        }

        let effectiveMode = this.options.displayMode;
        if (this.options.pillsThreshold !== null && count > this.options.pillsThreshold) {
            effectiveMode = 'count';
        }

        if (!this.isOpen) {
            if (count > 0 && (effectiveMode === 'count' || effectiveMode === 'compact')) {
                this.input.placeholder = this.options.countFormat.replace('{count}', count.toString());
            } else {
                this.input.placeholder = this.options.searchPlaceholder;
            }
        }

        if (this.options.showCountBadge && count > 0) {
            this.countBadge.textContent = `[${count}]`;
            this.countBadge.style.display = '';
        } else {
            this.countBadge.style.display = 'none';
        }

        if (effectiveMode === 'pills') {
            this.pillsContainer.className = `pa-multiselect__pills pa-multiselect__pills--${this.options.pillsPosition}`;
            this.pillsContainer.innerHTML = selectedOptions.map(option => `
                <div class="pa-multiselect__pill">
                    <span class="pa-multiselect__pill-text">${option.label}</span>
                    <button type="button" class="pa-multiselect__pill-remove" data-value="${option.value}" aria-label="Remove ${option.label}"></button>
                </div>
            `).join('');
        } else {
            this.pillsContainer.className = `pa-multiselect__count-display pa-multiselect__count-display--${this.options.pillsPosition}`;
            if (count > 0) {
                const countText = this.options.countFormat.replace('{count}', count.toString());
                this.pillsContainer.innerHTML = `
                    <div class="pa-multiselect__count-badge-wrapper">
                        <button type="button" class="pa-multiselect__count-text" data-action="show-selected">
                            ${countText}
                        </button>
                        <button type="button" class="pa-multiselect__count-clear" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
            } else {
                this.pillsContainer.innerHTML = '';
            }
        }
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
            if (this.options.enableSearch && !this.isOpen) {
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
            const countTextBtn = (e.target as HTMLElement).closest('.pa-multiselect__count-text');
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
        if (!this.options.enableSearch) {
            return;
        }

        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }

        if (this.options.onSearch) {
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
                const results = await this.options.onSearch(value);

                if (this.searchTerm === value) {
                    this.allOptions = results || [];
                    this.filteredOptions = [...this.allOptions];
                    this.isLoading = false;
                    // Auto-focus first option if search is enabled and there are results
                    this.focusedIndex = (this.options.enableSearch && this.filteredOptions.length > 0) ? 0 : -1;
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
                    return option.label.toLowerCase().includes(value.toLowerCase()) ||
                           (option.subtitle && option.subtitle.toLowerCase().includes(value.toLowerCase()));
                });
            }

            // Auto-focus first option if search is enabled and there are results
            this.focusedIndex = (this.options.enableSearch && this.filteredOptions.length > 0) ? 0 : -1;
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
        if (!this.options.enableSearch) {
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
                } else if (this.options.allowAddNew && this.options.onAddNew && this.input.value.trim()) {
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

        const option = (e.target as HTMLElement).closest('.pa-multiselect__option') as HTMLElement;
        if (option && !option.classList.contains('pa-multiselect__option--disabled')) {
            e.preventDefault();
            const value = option.dataset.value!;
            const optionData = this.filteredOptions.find(opt => opt.value === value);
            log.debug(`[${this.instanceId}] Option clicked:`, {
                value,
                closeOnSelect: this.options.closeOnSelect,
                placeholder: this.options.searchPlaceholder
            });
            if (optionData) {
                this.toggleOption(optionData);
            }
        }
    }

    private handlePillClick(e: MouseEvent): void {
        const countClearBtn = (e.target as HTMLElement).closest('.pa-multiselect__count-clear');
        if (countClearBtn) {
            e.preventDefault();
            e.stopPropagation();
            log.debug(`[${this.instanceId}] Count clear button clicked`);
            this.clearAll();
            return;
        }

        const countTextBtn = (e.target as HTMLElement).closest('.pa-multiselect__count-text');
        if (countTextBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.pa-multiselect__pill-remove') as HTMLElement;
        if (removeBtn) {
            e.preventDefault();
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (option) {
                this.deselectOption(option);
            }
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
                    (el.closest && el.closest('.pa-multiselect__count-text'))
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
        const focusedElement = this.dropdown.querySelector('.pa-multiselect__option--focused');
        if (focusedElement) {
            focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    private toggleOption(option: MultiSelectOption): void {
        log.debug(`[${this.instanceId}] toggleOption called`, { value: option.value, multiple: this.options.multiple });

        if (!this.options.multiple) {
            if (this.selectedValues.has(option.value)) {
                log.debug(`[${this.instanceId}] Deselecting option in single-select mode`, { value: option.value });
                this.deselectOption(option);
            } else {
                log.debug(`[${this.instanceId}] Clearing previous selections and selecting new option`, { value: option.value });
                this.selectedValues.clear();
                this.selectedOptions.clear();
                this.selectOption(option);
            }

            log.info(`[${this.instanceId}] ❌ Closing dropdown (single-select mode)`);
            this.close();
            return;
        }

        if (this.selectedValues.has(option.value)) {
            log.debug(`[${this.instanceId}] Deselecting option`, { value: option.value });
            this.deselectOption(option);
        } else {
            log.debug(`[${this.instanceId}] Selecting option`, { value: option.value });
            this.selectOption(option);
        }

        log.debug(`[${this.instanceId}] Checking closeOnSelect`, {
            closeOnSelect: this.options.closeOnSelect,
            willClose: this.options.closeOnSelect === true,
            placeholder: this.options.searchPlaceholder
        });
        if (this.options.closeOnSelect) {
            log.info(`[${this.instanceId}] ❌ Closing dropdown (closeOnSelect=true)`);
            this.close();
        } else {
            log.info(`[${this.instanceId}] ✅ Keeping dropdown open (closeOnSelect=false)`);
        }
    }

    private async handleAddNew(value: string): Promise<void> {
        if (!this.options.onAddNew) return;

        try {
            log.debug(`[${this.instanceId}] Adding new option:`, value);
            const newOption = await this.options.onAddNew(value);

            // Add to options list
            this.allOptions.push(newOption);
            this.filteredOptions.push(newOption);

            // Select the new option
            this.selectOption(newOption);

            // Clear input and re-render
            this.input.value = '';
            this.renderDropdown();
            this.renderPills();

            if (this.options.closeOnSelect) {
                this.close();
            }
        } catch (error) {
            log.error(`[${this.instanceId}] Error adding new option:`, error);
        }
    }

    private selectOption(option: MultiSelectOption): void {
        this.selectedValues.add(option.value);
        this.selectedOptions.set(option.value, option);
        this.renderDropdown();
        this.renderPills();

        if (this.options.onSelect) {
            this.options.onSelect(option);
        }
        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    private deselectOption(option: MultiSelectOption): void {
        this.selectedValues.delete(option.value);
        this.selectedOptions.delete(option.value);
        this.renderDropdown();
        this.renderPills();

        if (this.options.onDeselect) {
            this.options.onDeselect(option);
        }
        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    private selectAll(): void {
        this.filteredOptions.forEach(option => {
            if (!option.disabled) {
                this.selectedValues.add(option.value);
                this.selectedOptions.set(option.value, option);
            }
        });
        this.renderDropdown();
        this.renderPills();

        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    private clearAll(): void {
        this.selectedValues.clear();
        this.selectedOptions.clear();
        this.renderDropdown();
        this.renderPills();

        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    private open(): void {
        log.debug(`[${this.instanceId}] open() called`, { isOpen: this.isOpen });
        if (this.isOpen) return;

        this.isOpen = true;
        this.element.classList.add('pa-multiselect--open');
        this.dropdown.classList.add('pa-multiselect__dropdown--visible');
        log.info(`[${this.instanceId}] Dropdown opened`);

        this.input.placeholder = this.options.searchPlaceholder;

        // Only clear input if search is enabled
        if (!this.options.multiple && this.options.enableSearch) {
            this.input.value = '';
        }

        this.renderDropdown();
        this.positionDropdown();

        if (this.hint) {
            this.hint.classList.add('pa-multiselect__hint--visible');
            this.positionHint();
        }
    }

    private close(): void {
        log.debug(`[${this.instanceId}] close() called`, { isOpen: this.isOpen });
        if (!this.isOpen) return;

        this.isOpen = false;
        this.element.classList.remove('pa-multiselect--open');
        this.dropdown.classList.remove('pa-multiselect__dropdown--visible');
        if (this.hint) {
            this.hint.classList.remove('pa-multiselect__hint--visible');
        }
        this.searchTerm = '';
        // Only clear input in multi-select mode or when search is enabled
        const willClearInput = this.options.multiple || this.options.enableSearch;
        log.warn(`[${this.instanceId}] close() - input clearing decision`, {
            multiple: this.options.multiple,
            enableSearch: this.options.enableSearch,
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
                const placement = (this.options.lockPlacement && this.dropdownPlacement)
                    ? this.dropdownPlacement
                    : 'bottom-start';

                // Only include flip() if placement is not locked or lockPlacement is disabled
                const middleware = [
                    offset(4),
                    ...(this.options.lockPlacement && this.dropdownPlacement ? [] : [flip()]),
                    shift({ padding: 8 })
                ];

                computePosition(this.input, this.dropdown, {
                    placement: placement,
                    middleware: middleware
                }).then(({ x, y, placement: finalPlacement }) => {
                    // Lock placement after first computation if lockPlacement is enabled
                    if (this.options.lockPlacement && !this.dropdownPlacement) {
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
                values.forEach((value: string) => {
                    this.selectedValues.add(value);
                    const option = this.allOptions.find(opt => opt.value === value);
                    if (option) {
                        this.selectedOptions.set(value, option);
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
        this.selectedPopover.classList.add('pa-multiselect__selected-popover--visible');
        this.positionSelectedPopover();
    }

    private hideSelectedPopover(): void {
        log.debug(`[${this.instanceId}] hideSelectedPopover() called`);
        this.showSelectedPopover = false;
        this.selectedPopover.classList.remove('pa-multiselect__selected-popover--visible');
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
            <div class="pa-multiselect__selected-popover-header">
                <span>Selected Items (${count})</span>
                <button type="button" class="pa-multiselect__selected-popover-close" aria-label="Close">&times;</button>
            </div>
            <div class="pa-multiselect__selected-popover-body">
                ${selectedOptions.map(option => `
                    <div class="pa-multiselect__pill">
                        <span class="pa-multiselect__pill-text">${option.label}</span>
                        <button type="button" class="pa-multiselect__pill-remove" data-value="${option.value}" aria-label="Remove ${option.label}"></button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    private handleSelectedPopoverClick(e: MouseEvent): void {
        e.stopPropagation();

        const closeBtn = (e.target as HTMLElement).closest('.pa-multiselect__selected-popover-close');
        if (closeBtn) {
            e.preventDefault();
            this.hideSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.pa-multiselect__pill-remove') as HTMLElement;
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

    // Public API
    public getSelected(): MultiSelectOption[] {
        return Array.from(this.selectedOptions.values());
    }

    public setSelected(values: string[]): void {
        this.selectedValues = new Set(values);
        this.selectedOptions.clear();
        values.forEach(value => {
            const option = this.allOptions.find(opt => opt.value === value);
            if (option) {
                this.selectedOptions.set(value, option);
            }
        });
        this.renderDropdown();
        this.renderPills();
    }

    public destroy(): void {
        if (this.dropdownCleanup) this.dropdownCleanup();
        if (this.hintCleanup) this.hintCleanup();
        if (this.selectedPopoverCleanup) this.selectedPopoverCleanup();

        if (this.dropdown) this.dropdown.remove();
        if (this.hint) this.hint.remove();
        if (this.selectedPopover) this.selectedPopover.remove();

        // Clear the element's content to prevent duplication on re-initialization
        this.element.innerHTML = '';
        this.element.classList.remove('pa-multiselect', 'pa-multiselect--open', 'pa-multiselect--no-checkboxes');

        console.log('[MultiSelect] Destroyed');
    }
}
