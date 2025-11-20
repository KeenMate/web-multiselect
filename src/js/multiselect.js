/**
 * Pure Admin - Multiselect with Typeahead
 * Comprehensive multiselect component with rich content support and floating hints
 * Requires: @floating-ui/dom (loaded via CDN in layout)
 */

(function() {
    'use strict';

    // Check for Floating UI dependency
    if (typeof window.FloatingUIDOM === 'undefined') {
        console.error('[MultiSelect] Floating UI library is required but not loaded. Please include @floating-ui/dom.');
        return;
    }

    // Destructure Floating UI functions
    const { computePosition, flip, offset, autoUpdate, shift } = window.FloatingUIDOM;

    // Simple inline logger for debugging
    const LOG_ENABLED = true; // Set to false to disable all logs
    let logCounter = 0;
    const log = {
        debug: (message, ...args) => {
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
        info: (message, ...args) => {
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
        warn: (message, ...args) => {
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
        error: (message, ...args) => {
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

class MultiSelect {
    constructor(element, options = {}) {
        this.element = element;

        // Create unique instance ID for debugging
        this.instanceId = `MS-${Math.random().toString(36).substr(2, 9)}`;

        this.options = {
            searchHint: element.dataset.searchHint || '',
            searchPlaceholder: element.dataset.searchPlaceholder || 'Search...',
            multiple: element.dataset.multiple !== 'false', // Allow multiple selections (default: true)
            allowGroups: element.dataset.allowGroups !== 'false',
            allowSelectAll: element.dataset.allowSelectAll !== 'false',
            allowClearAll: element.dataset.allowClearAll !== 'false',
            showCheckboxes: element.dataset.showCheckboxes !== 'false', // Show checkboxes (default: true)
            closeOnSelect: element.dataset.closeOnSelect === 'true', // Close dropdown after selecting option (default: false)
            dropdownMinWidth: element.dataset.dropdownMinWidth || null, // Min width for dropdown (e.g., '20rem', '300px')
            displayMode: element.dataset.displayMode || 'pills', // pills | count | compact
            pillsThreshold: element.dataset.pillsThreshold ? parseInt(element.dataset.pillsThreshold) : null, // Auto-switch to count when exceeded
            pillsPosition: element.dataset.pillsPosition || 'bottom', // top | bottom | left | right
            countFormat: element.dataset.countFormat || '{count} selected', // Template for count display
            showCountBadge: element.dataset.showCountBadge === 'true', // Show [3] badge next to toggle icon
            maxHeight: element.dataset.maxHeight || '20rem',
            emptyMessage: element.dataset.emptyMessage || 'No results found',
            loadingMessage: element.dataset.loadingMessage || 'Loading...',
            minSearchLength: parseInt(element.dataset.minSearchLength) || 0, // Minimum search length before loading data
            onSearch: options.onSearch || null, // Async function to load data: (searchTerm) => Promise<options[]>
            onSelect: options.onSelect || null,
            onDeselect: options.onDeselect || null,
            onChange: options.onChange || null,
            ...options
        };

        this.isOpen = false;
        this.selectedValues = new Set();
        this.selectedOptions = new Map(); // Store selected option objects by value
        this.allOptions = [];
        this.filteredOptions = [];
        this.focusedIndex = -1;
        this.searchTerm = '';
        this.isLoading = false;
        this.loadingTimeout = null;
        this.showSelectedPopover = false;
        this.selectedPopoverPlacement = null; // Lock initial placement to prevent jumping

        // Floating UI cleanup functions
        this.dropdownCleanup = null;
        this.hintCleanup = null;
        this.selectedPopoverCleanup = null;

        this.init();
    }

    init() {
        // Parse options from data attribute or provided options
        this.parseOptions();

        // Build the component HTML
        this.buildHTML();

        // Attach event listeners
        this.attachEvents();

        // Parse pre-selected values
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

    parseOptions() {
        // Check if options are provided via data attribute
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

        // Set filtered options to all initially
        this.filteredOptions = [...this.allOptions];
    }

    buildHTML() {
        // Add multiselect class to container
        this.element.classList.add('ml');

        // Add modifier class if checkboxes are hidden
        if (!this.options.showCheckboxes || !this.options.multiple) {
            this.element.classList.add('ml--no-checkboxes');
        }

        // Create input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'ml__input-wrapper';

        // Create search input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'ml__input';
        this.input.placeholder = this.options.searchPlaceholder;
        this.input.autocomplete = 'off';

        // Create toggle icon
        const toggle = document.createElement('span');
        toggle.className = 'ml__toggle';
        toggle.innerHTML = '▼';

        // Create count badge (initially hidden)
        this.countBadge = document.createElement('span');
        this.countBadge.className = 'ml__counter';
        this.countBadge.style.display = 'none';

        inputWrapper.appendChild(this.input);
        inputWrapper.appendChild(this.countBadge);
        inputWrapper.appendChild(toggle);

        // Create floating hint (if provided)
        if (this.options.searchHint) {
            this.hint = document.createElement('div');
            this.hint.className = 'ml__hint';
            this.hint.textContent = this.options.searchHint;
            document.body.appendChild(this.hint);
        }

        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'ml__dropdown';
        document.body.appendChild(this.dropdown);

        // Create pills container
        this.pillsContainer = document.createElement('div');
        this.pillsContainer.className = 'ml__pills';

        // Create selected items popover (for count display mode)
        this.selectedPopover = document.createElement('div');
        this.selectedPopover.className = 'ml__selected-popover';
        document.body.appendChild(this.selectedPopover);

        // Create wrapper for multiselect + pills
        const wrapper = document.createElement('div');
        wrapper.className = 'ml-wrapper';

        // Add layout modifier based on pills position
        if (this.options.pillsPosition === 'left' || this.options.pillsPosition === 'right') {
            wrapper.classList.add('ml-wrapper--inline');
        }

        // Width classes stay on the multiselect element, not transferred to wrapper

        // Append elements to multiselect container
        this.element.appendChild(inputWrapper);

        // Insert wrapper before the element, then move element into wrapper
        this.element.parentNode.insertBefore(wrapper, this.element);
        wrapper.appendChild(this.element);

        // Append pills container to wrapper (not to element)
        wrapper.appendChild(this.pillsContainer);

        // Store wrapper reference
        this.wrapper = wrapper;

        // Render dropdown content
        this.renderDropdown();
    }

    renderDropdown() {
        let html = '';

        // Show loader if loading
        if (this.isLoading) {
            html += '<div class="ml__loader">';
            html += '<div class="pa-loader pa-loader--sm"></div>';
            html += `<div class="ml__loading-text">${this.options.loadingMessage}</div>`;
            html += '</div>';
            this.dropdown.innerHTML = html;
            return;
        }

        // Actions (Select All / Clear All) - only in multi-select mode
        if (this.options.multiple && (this.options.allowSelectAll || this.options.allowClearAll)) {
            html += '<div class="ml__actions">';
            if (this.options.allowSelectAll) {
                html += '<button type="button" class="ml__action-btn" data-action="select-all">Select All</button>';
            }
            if (this.options.allowClearAll) {
                html += '<button type="button" class="ml__action-btn" data-action="clear-all">Clear All</button>';
            }
            html += '</div>';
        }

        // Options
        html += '<div class="ml__options">';

        if (this.filteredOptions.length === 0) {
            html += `<div class="ml__empty">${this.options.emptyMessage}</div>`;
        } else {
            // Group options if enabled
            if (this.options.allowGroups) {
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

    renderOption(option, index) {
        const isSelected = this.selectedValues.has(option.value);
        const isFocused = index === this.focusedIndex;
        const isDisabled = option.disabled || false;

        let classes = ['ml__option'];
        if (isSelected) classes.push('ml__option--selected');
        if (isFocused) classes.push('ml__option--focused');
        if (isDisabled) classes.push('ml__option--disabled');

        let html = `<div class="${classes.join(' ')}" data-value="${option.value}" data-index="${index}">`;

        // Checkbox (only if showCheckboxes is true AND multiple mode is enabled)
        if (this.options.showCheckboxes && this.options.multiple) {
            html += `<input type="checkbox" class="ml__checkbox" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>`;
        }

        // Content
        html += '<div class="ml__option-content">';

        // Icon (if provided)
        if (option.icon) {
            html += `<span class="ml__option-icon">${option.icon}</span>`;
        }

        // Text
        html += '<div class="ml__option-text">';
        html += `<div class="ml__option-title">${this.highlightMatch(option.label, this.searchTerm)}</div>`;

        // Subtitle (if provided)
        if (option.subtitle) {
            html += `<div class="ml__option-subtitle">${option.subtitle}</div>`;
        }

        html += '</div>'; // Close option-text
        html += '</div>'; // Close option-content
        html += '</div>'; // Close option

        return html;
    }

    highlightMatch(text, searchTerm) {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    groupOptions(options) {
        const groups = {};

        options.forEach(option => {
            const groupName = option.group || '__ungrouped__';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(option);
        });

        return groups;
    }

    renderPills() {
        // Get selected options from the Map (preserves options even if not in current allOptions)
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        // Single-select mode: show selected item in input field
        if (!this.options.multiple) {
            this.pillsContainer.innerHTML = ''; // No pills in single-select mode
            this.countBadge.style.display = 'none'; // No count badge

            if (!this.isOpen && count > 0) {
                // Show selected item's label in input when closed
                this.input.value = selectedOptions[0].label;
            } else if (!this.isOpen) {
                // Show placeholder when nothing selected and closed
                this.input.value = '';
            }
            return;
        }

        // Multi-select mode below:

        // Determine effective display mode (considering threshold)
        let effectiveMode = this.options.displayMode;
        if (this.options.pillsThreshold !== null && count > this.options.pillsThreshold) {
            effectiveMode = 'count';
        }

        // Update input placeholder when closed
        if (!this.isOpen) {
            if (count > 0 && (effectiveMode === 'count' || effectiveMode === 'compact')) {
                this.input.placeholder = this.options.countFormat.replace('{count}', count);
            } else {
                this.input.placeholder = this.options.searchPlaceholder;
            }
        }

        // Update count badge
        if (this.options.showCountBadge && count > 0) {
            this.countBadge.textContent = `[${count}]`;
            this.countBadge.style.display = '';
        } else {
            this.countBadge.style.display = 'none';
        }

        // Render pills or count display
        if (effectiveMode === 'pills') {
            // Standard pills display
            this.pillsContainer.className = `ml__pills ml__pills--${this.options.pillsPosition}`;
            this.pillsContainer.innerHTML = selectedOptions.map(option => `
                <div class="ml__pill">
                    <span class="ml__pill-text">${option.label}</span>
                    <button type="button" class="ml__pill-remove" data-value="${option.value}" aria-label="Remove ${option.label}"></button>
                </div>
            `).join('');
        } else {
            // Count display mode (count or compact)
            this.pillsContainer.className = `ml__count-display ml__count-display--${this.options.pillsPosition}`;
            if (count > 0) {
                const countText = this.options.countFormat.replace('{count}', count);
                this.pillsContainer.innerHTML = `
                    <div class="ml__counter-wrapper">
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
    }

    attachEvents() {
        // Input focus - open dropdown
        this.input.addEventListener('focus', () => this.open());

        // Input typing - filter options
        this.input.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Click outside - close dropdown
        document.addEventListener('click', (e) => this.handleClickOutside(e));

        // Dropdown clicks - handle option selection and actions
        this.dropdown.addEventListener('click', (e) => this.handleDropdownClick(e));

        // Pills clicks - handle removal and count text
        this.pillsContainer.addEventListener('click', (e) => this.handlePillClick(e));

        // Count badge click - toggle selected popover
        this.countBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSelectedPopover();
        });

        // Selected popover clicks - handle removal
        this.selectedPopover.addEventListener('click', (e) => this.handleSelectedPopoverClick(e));
    }

    async handleSearch(value) {
        this.searchTerm = value;

        // Clear any pending timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }

        // If onSearch callback is provided (async mode)
        if (this.options.onSearch) {
            // Check minimum search length
            if (value.length < this.options.minSearchLength) {
                this.filteredOptions = [];
                this.allOptions = [];
                this.renderDropdown();
                return;
            }

            // Show loader immediately
            this.isLoading = true;
            this.renderDropdown();
            log.debug(`[${this.instanceId}] Loading data for search term:`, value);

            try {
                // Call async search function
                const results = await this.options.onSearch(value);

                // Only update if search term hasn't changed
                if (this.searchTerm === value) {
                    this.allOptions = results || [];
                    this.filteredOptions = [...this.allOptions];
                    this.isLoading = false;
                    this.focusedIndex = -1;
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
            // Standard filtering mode (synchronous)
            if (!value) {
                this.filteredOptions = [...this.allOptions];
            } else {
                this.filteredOptions = this.allOptions.filter(option => {
                    // Simple substring match
                    return option.label.toLowerCase().includes(value.toLowerCase()) ||
                           (option.subtitle && option.subtitle.toLowerCase().includes(value.toLowerCase()));
                });
            }

            // Reset focused index
            this.focusedIndex = -1;

            // Re-render dropdown
            this.renderDropdown();
        }
    }

    handleKeydown(e) {
        if (!this.isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.open();
            }
            return;
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
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
            case 'Tab':
                this.close();
                break;
        }
    }

    handleDropdownClick(e) {
        log.debug(`[${this.instanceId}] Dropdown clicked`, { target: e.target.className });

        // Stop event from bubbling to document (which would trigger handleClickOutside)
        e.stopPropagation();

        // Action buttons
        const actionBtn = e.target.closest('[data-action]');
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

        // Option selection
        const option = e.target.closest('.ml__option');
        if (option && !option.classList.contains('ml__option--disabled')) {
            e.preventDefault();
            const value = option.dataset.value;
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

    handlePillClick(e) {
        // Handle count clear button
        const countClearBtn = e.target.closest('.ml__count-clear');
        if (countClearBtn) {
            e.preventDefault();
            e.stopPropagation();
            log.debug(`[${this.instanceId}] Count clear button clicked`);
            this.clearAll();
            return;
        }

        // Handle count text button
        const countTextBtn = e.target.closest('.ml__count-text');
        if (countTextBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelectedPopover();
            return;
        }

        // Handle pill removal
        const removeBtn = e.target.closest('.ml__pill-remove');
        if (removeBtn) {
            e.preventDefault();
            const value = removeBtn.dataset.value;
            const option = this.selectedOptions.get(value); // Get from Map
            if (option) {
                this.deselectOption(option);
            }
        }
    }

    handleClickOutside(e) {
        // Check if clicked outside selected popover (handle separately from dropdown)
        if (this.showSelectedPopover) {
            const clickedInsidePopover = this.selectedPopover.contains(e.target) ||
                                        this.countBadge.contains(e.target) ||
                                        (e.target.closest && e.target.closest('.ml__count-text'));

            if (!clickedInsidePopover) {
                log.debug(`[${this.instanceId}] Closing selected popover due to click outside`);
                this.hideSelectedPopover();
                return; // Don't check dropdown if we're closing popover
            }
        }

        // Check if clicked outside dropdown
        if (!this.isOpen) return;

        const clickedInside = this.element.contains(e.target) ||
                             this.dropdown.contains(e.target) ||
                             (this.hint && this.hint.contains(e.target));

        log.debug(`[${this.instanceId}] handleClickOutside`, {
            target: e.target.className,
            targetTag: e.target.tagName,
            clickedInside,
            elementContains: this.element.contains(e.target),
            dropdownContains: this.dropdown.contains(e.target),
            dropdownEl: this.dropdown,
            targetParent: e.target.parentElement?.className,
            isConnected: this.dropdown.isConnected,
            dropdownInBody: document.body.contains(this.dropdown)
        });

        if (!clickedInside) {
            log.warn(`[${this.instanceId}] Closing dropdown due to click outside`);
            this.close();
        }
    }

    focusNext() {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = (this.focusedIndex + 1) % this.filteredOptions.length;
        this.renderDropdown();
        this.scrollToFocused();
    }

    focusPrevious() {
        if (this.filteredOptions.length === 0) return;

        this.focusedIndex = this.focusedIndex <= 0
            ? this.filteredOptions.length - 1
            : this.focusedIndex - 1;
        this.renderDropdown();
        this.scrollToFocused();
    }

    scrollToFocused() {
        const focusedElement = this.dropdown.querySelector('.ml__option--focused');
        if (focusedElement) {
            focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    toggleOption(option) {
        log.debug(`[${this.instanceId}] toggleOption called`, { value: option.value, multiple: this.options.multiple });

        // Single-select mode: only one item can be selected at a time
        if (!this.options.multiple) {
            // If clicking the already selected item, deselect it
            if (this.selectedValues.has(option.value)) {
                log.debug(`[${this.instanceId}] Deselecting option in single-select mode`, { value: option.value });
                this.deselectOption(option);
            } else {
                // Clear all selections first, then select the new one
                log.debug(`[${this.instanceId}] Clearing previous selections and selecting new option`, { value: option.value });
                this.selectedValues.clear();
                this.selectOption(option);
            }

            // Always close dropdown after selection in single-select mode
            log.info(`[${this.instanceId}] ❌ Closing dropdown (single-select mode)`);
            this.close();
            return;
        }

        // Multi-select mode: toggle selection
        if (this.selectedValues.has(option.value)) {
            log.debug(`[${this.instanceId}] Deselecting option`, { value: option.value });
            this.deselectOption(option);
        } else {
            log.debug(`[${this.instanceId}] Selecting option`, { value: option.value });
            this.selectOption(option);
        }

        // Close dropdown after selection if option is enabled
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

    selectOption(option) {
        this.selectedValues.add(option.value);
        this.selectedOptions.set(option.value, option); // Store the option object
        this.renderDropdown();
        this.renderPills();

        if (this.options.onSelect) {
            this.options.onSelect(option);
        }
        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    deselectOption(option) {
        this.selectedValues.delete(option.value);
        this.selectedOptions.delete(option.value); // Remove from Map
        this.renderDropdown();
        this.renderPills();

        if (this.options.onDeselect) {
            this.options.onDeselect(option);
        }
        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    selectAll() {
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

    clearAll() {
        this.selectedValues.clear();
        this.selectedOptions.clear(); // Clear the Map too
        this.renderDropdown();
        this.renderPills();

        if (this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    open() {
        log.debug(`[${this.instanceId}] open() called`, { isOpen: this.isOpen });
        if (this.isOpen) return;

        this.isOpen = true;
        this.element.classList.add('ml--open');
        this.dropdown.classList.add('ml__dropdown--visible');
        log.info(`[${this.instanceId}] Dropdown opened`);

        // Reset placeholder to search placeholder when opening
        this.input.placeholder = this.options.searchPlaceholder;

        // Clear input value in single-select mode to allow searching
        if (!this.options.multiple) {
            this.input.value = '';
        }

        // Re-render dropdown to update checkbox states
        this.renderDropdown();

        // Position dropdown using Floating UI
        this.positionDropdown();

        // Position hint if it exists
        if (this.hint) {
            this.hint.classList.add('ml__hint--visible');
            this.positionHint();
        }
    }

    close() {
        log.debug(`[${this.instanceId}] close() called`, { isOpen: this.isOpen });
        if (!this.isOpen) return;

        this.isOpen = false;
        this.element.classList.remove('ml--open');
        this.dropdown.classList.remove('ml__dropdown--visible');
        if (this.hint) {
            this.hint.classList.remove('ml__hint--visible');
        }
        this.searchTerm = '';
        this.input.value = '';
        this.filteredOptions = [...this.allOptions];
        this.focusedIndex = -1;

        // Update placeholder to show count if in count mode
        this.renderPills();

        // Clean up Floating UI
        if (this.dropdownCleanup) {
            this.dropdownCleanup();
            this.dropdownCleanup = null;
        }
        if (this.hintCleanup) {
            this.hintCleanup();
            this.hintCleanup = null;
        }

        // Log stack trace to see who called close()
        log.info(`[${this.instanceId}] Dropdown closed. Stack trace:`);
        console.trace();
    }

    positionDropdown() {
        this.dropdownCleanup = autoUpdate(
            this.input,
            this.dropdown,
            () => {
                computePosition(this.input, this.dropdown, {
                    placement: 'bottom-start',
                    middleware: [
                        offset(4),
                        flip(),
                        shift({ padding: 8 })
                    ]
                }).then(({ x, y }) => {
                    const styles = {
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${this.input.offsetWidth}px`
                    };

                    // Apply minWidth if specified
                    if (this.options.dropdownMinWidth) {
                        styles.minWidth = this.options.dropdownMinWidth;
                    }

                    Object.assign(this.dropdown.style, styles);
                });
            }
        );
    }

    positionHint() {
        this.hintCleanup = autoUpdate(
            this.input,
            this.hint,
            () => {
                computePosition(this.input, this.hint, {
                    placement: 'top-start',
                    middleware: [
                        offset(4),
                        flip(),
                        shift({ padding: 8 })
                    ]
                }).then(({ x, y }) => {
                    Object.assign(this.hint.style, {
                        left: `${x}px`,
                        top: `${y}px`
                    });
                });
            }
        );
    }

    parseInitialSelection() {
        const initialValues = this.element.dataset.initialValues;
        if (initialValues) {
            try {
                const values = JSON.parse(initialValues);
                values.forEach(value => {
                    this.selectedValues.add(value);
                    // Find option in allOptions and store it
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

    // Selected items popover (for count display mode)
    toggleSelectedPopover() {
        if (this.showSelectedPopover) {
            this.hideSelectedPopover();
        } else {
            this.showPopover();
        }
    }

    showPopover() {
        log.debug(`[${this.instanceId}] showPopover() called`);

        // Close main dropdown if open (mutually exclusive)
        if (this.isOpen) {
            this.close();
        }

        this.showSelectedPopover = true;
        this.renderSelectedPopover();
        this.selectedPopover.classList.add('ml__selected-popover--visible');
        this.positionSelectedPopover();
    }

    hideSelectedPopover() {
        log.debug(`[${this.instanceId}] hideSelectedPopover() called`);
        this.showSelectedPopover = false;
        this.selectedPopover.classList.remove('ml__selected-popover--visible');
        this.selectedPopoverPlacement = null; // Reset locked placement

        // Clean up Floating UI
        if (this.selectedPopoverCleanup) {
            this.selectedPopoverCleanup();
            this.selectedPopoverCleanup = null;
        }
    }

    renderSelectedPopover() {
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        this.selectedPopover.innerHTML = `
            <div class="ml__selected-popover-header">
                <span>Selected Items (${count})</span>
                <button type="button" class="ml__selected-popover-close" aria-label="Close">&times;</button>
            </div>
            <div class="ml__selected-popover-body">
                ${selectedOptions.map(option => `
                    <div class="ml__pill">
                        <span class="ml__pill-text">${option.label}</span>
                        <button type="button" class="ml__pill-remove" data-value="${option.value}" aria-label="Remove ${option.label}"></button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    handleSelectedPopoverClick(e) {
        e.stopPropagation();

        // Close button
        const closeBtn = e.target.closest('.ml__selected-popover-close');
        if (closeBtn) {
            e.preventDefault();
            this.hideSelectedPopover();
            return;
        }

        // Remove button
        const removeBtn = e.target.closest('.ml__pill-remove');
        if (removeBtn) {
            e.preventDefault();
            const value = removeBtn.dataset.value;
            const option = this.selectedOptions.get(value); // Get from Map
            if (option) {
                this.deselectOption(option);
                // Re-render popover with updated selection
                this.renderSelectedPopover();
                // Close popover if no items left
                if (this.selectedValues.size === 0) {
                    this.hideSelectedPopover();
                }
            }
        }
    }

    positionSelectedPopover() {
        // Position relative to input (same placement as main dropdown)
        this.selectedPopoverCleanup = autoUpdate(
            this.input,
            this.selectedPopover,
            () => {
                // Use locked placement or determine initial placement
                const placement = this.selectedPopoverPlacement || 'bottom-start';

                computePosition(this.input, this.selectedPopover, {
                    placement: placement,
                    middleware: [
                        offset(4),
                        // Only use flip() on first positioning, then lock the placement
                        ...(this.selectedPopoverPlacement ? [] : [flip()]),
                        shift({ padding: 8 })
                    ]
                }).then(({ x, y, placement: finalPlacement }) => {
                    // Lock the placement after first positioning
                    if (!this.selectedPopoverPlacement) {
                        this.selectedPopoverPlacement = finalPlacement;
                        log.debug(`[${this.instanceId}] Locked popover placement:`, finalPlacement);
                    }

                    Object.assign(this.selectedPopover.style, {
                        left: `${x}px`,
                        top: `${y}px`
                    });
                });
            }
        );
    }

    // Public API
    getSelected() {
        return Array.from(this.selectedOptions.values());
    }

    setSelected(values) {
        this.selectedValues = new Set(values);
        this.selectedOptions.clear();
        // Find and store the option objects
        values.forEach(value => {
            const option = this.allOptions.find(opt => opt.value === value);
            if (option) {
                this.selectedOptions.set(value, option);
            }
        });
        this.renderDropdown();
        this.renderPills();
    }

    destroy() {
        // Clean up Floating UI
        if (this.dropdownCleanup) this.dropdownCleanup();
        if (this.hintCleanup) this.hintCleanup();
        if (this.selectedPopoverCleanup) this.selectedPopoverCleanup();

        // Remove DOM elements
        if (this.dropdown) this.dropdown.remove();
        if (this.hint) this.hint.remove();
        if (this.selectedPopover) this.selectedPopover.remove();

        // Remove event listeners (ideally store references to remove properly)
        this.element.classList.remove('ml', 'ml--open');

        console.log('[MultiSelect] Destroyed');
    }
}

    // Auto-initialize all multiselects on page load
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-multiselect]').forEach(element => {
            new MultiSelect(element);
        });
    });

    // Export for manual initialization
    window.MultiSelect = MultiSelect;

})();
