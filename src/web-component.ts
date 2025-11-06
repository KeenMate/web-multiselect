import { PureMultiSelect } from './multiselect';
import type { MultiSelectOption, MultiSelectOptions, MultiSelectEventDetail } from './types';
import styles from './scss/_multiselect.scss?inline';

export class MultiSelectElement extends HTMLElement {
    private picker?: PureMultiSelect;
    private containerElement?: HTMLDivElement;
    private shadow: ShadowRoot;

    // Properties for complex data (not attributes)
    private _options?: MultiSelectOption[];
    private _onSearch?: (searchTerm: string) => Promise<MultiSelectOption[]>;
    private _onSelect?: (option: MultiSelectOption) => void;
    private _onDeselect?: (option: MultiSelectOption) => void;
    private _onChange?: (selectedOptions: MultiSelectOption[]) => void;

    static get observedAttributes() {
        return [
            'search-hint', 'search-placeholder', 'multiple', 'allow-groups',
            'allow-select-all', 'allow-clear-all', 'show-checkboxes', 'sticky-actions', 'close-on-select',
            'lock-placement', 'dropdown-min-width', 'display-mode', 'pills-threshold', 'pills-position',
            'count-format', 'show-count-badge', 'max-height', 'empty-message',
            'loading-message', 'min-search-length', 'enable-search', 'search-input-mode', 'allow-add-new',
            'initial-values'
        ];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.initializePicker();
    }

    disconnectedCallback() {
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
        // Inject styles
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        this.shadow.appendChild(styleSheet);

        // Create container element
        this.containerElement = document.createElement('div');
        this.containerElement.setAttribute('data-multiselect', '');

        // Copy any CSS classes from the host element to the container
        if (this.className) {
            this.containerElement.className = this.className;
        }

        this.shadow.appendChild(this.containerElement);
    }

    private initializePicker() {
        if (!this.containerElement) return;

        // Parse initial values
        let initialValues: string[] | undefined;
        const initialValuesAttr = this.getAttribute('initial-values');
        if (initialValuesAttr) {
            try {
                initialValues = JSON.parse(initialValuesAttr);
            } catch (e) {
                console.error('[MultiSelectElement] Failed to parse initial-values:', e);
            }
        }

        const options: Partial<MultiSelectOptions> = {
            searchHint: this.getAttribute('search-hint') || undefined,
            searchPlaceholder: this.getAttribute('search-placeholder') || 'Search...',
            multiple: this.getAttribute('multiple') !== 'false',
            allowGroups: this.getAttribute('allow-groups') !== 'false',
            allowSelectAll: this.getAttribute('allow-select-all') !== 'false',
            allowClearAll: this.getAttribute('allow-clear-all') !== 'false',
            showCheckboxes: this.getAttribute('show-checkboxes') !== 'false',
            stickyActions: this.getAttribute('sticky-actions') !== 'false',
            closeOnSelect: this.getAttribute('close-on-select') === 'true',
            lockPlacement: this.getAttribute('lock-placement') !== 'false',
            dropdownMinWidth: this.getAttribute('dropdown-min-width') || undefined,
            displayMode: (this.getAttribute('display-mode') as any) || 'pills',
            pillsThreshold: this.getAttribute('pills-threshold') ? parseInt(this.getAttribute('pills-threshold')!) : undefined,
            pillsPosition: (this.getAttribute('pills-position') as any) || 'bottom',
            countFormat: this.getAttribute('count-format') || '{count} selected',
            showCountBadge: this.getAttribute('show-count-badge') === 'true',
            maxHeight: this.getAttribute('max-height') || '20rem',
            emptyMessage: this.getAttribute('empty-message') || 'No results found',
            loadingMessage: this.getAttribute('loading-message') || 'Loading...',
            minSearchLength: this.getAttribute('min-search-length') ? parseInt(this.getAttribute('min-search-length')!) : 0,
            enableSearch: this.getAttribute('enable-search') !== 'false',
            searchInputMode: (this.getAttribute('search-input-mode') as any) || 'normal',
            allowAddNew: this.getAttribute('allow-add-new') === 'true',

            // Complex properties
            options: this._options,
            onSearch: this._onSearch,
            onSelect: (option) => {
                if (this._onSelect) this._onSelect(option);
                this.dispatchEvent(new CustomEvent('select', {
                    detail: { option, selectedOptions: this.picker?.getSelected() } as MultiSelectEventDetail
                }));
            },
            onDeselect: (option) => {
                if (this._onDeselect) this._onDeselect(option);
                this.dispatchEvent(new CustomEvent('deselect', {
                    detail: { option, selectedOptions: this.picker?.getSelected() } as MultiSelectEventDetail
                }));
            },
            onChange: (selectedOptions) => {
                if (this._onChange) this._onChange(selectedOptions);
                this.dispatchEvent(new CustomEvent('change', {
                    detail: { selectedOptions, selectedValues: selectedOptions.map(o => o.value) } as MultiSelectEventDetail
                }));
            },
            // Pass shadow root as container for dropdown/hint/popover
            container: this.shadow as unknown as HTMLElement
        };

        // Set data attributes on container
        if (initialValues) {
            this.containerElement.dataset.initialValues = JSON.stringify(initialValues);
        }

        this.picker = new PureMultiSelect(this.containerElement, options);
    }

    // Public API - Properties
    get options(): MultiSelectOption[] | undefined {
        return this._options;
    }

    set options(value: MultiSelectOption[] | undefined) {
        this._options = value;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get onSearch(): ((searchTerm: string) => Promise<MultiSelectOption[]>) | undefined {
        return this._onSearch;
    }

    set onSearch(callback: ((searchTerm: string) => Promise<MultiSelectOption[]>) | undefined) {
        this._onSearch = callback;
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
    }

    get onSelect(): ((option: MultiSelectOption) => void) | undefined {
        return this._onSelect;
    }

    set onSelect(callback: ((option: MultiSelectOption) => void) | undefined) {
        this._onSelect = callback;
    }

    get onDeselect(): ((option: MultiSelectOption) => void) | undefined {
        return this._onDeselect;
    }

    set onDeselect(callback: ((option: MultiSelectOption) => void) | undefined) {
        this._onDeselect = callback;
    }

    get onChange(): ((selectedOptions: MultiSelectOption[]) => void) | undefined {
        return this._onChange;
    }

    set onChange(callback: ((selectedOptions: MultiSelectOption[]) => void) | undefined) {
        this._onChange = callback;
    }

    // Public API - Methods
    getSelected(): MultiSelectOption[] {
        return this.picker ? this.picker.getSelected() : [];
    }

    setSelected(values: string[]): void {
        if (this.picker) {
            this.picker.setSelected(values);
        }
    }

    destroy(): void {
        if (this.picker) {
            this.picker.destroy();
        }
    }
}

// Auto-register the custom element
if (!customElements.get('multi-select')) {
    customElements.define('multi-select', MultiSelectElement);
}
