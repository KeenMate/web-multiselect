import { PureMultiSelect } from './multiselect';
import type { MultiSelectConfig, MultiSelectEventDetail } from './types';
import styles from './scss/_multiselect.scss?inline';

export class MultiSelectElement<T = any> extends HTMLElement {
    private picker?: PureMultiSelect<T>;
    private containerElement?: HTMLDivElement;
    private shadow: ShadowRoot;

    // Properties for complex data (not attributes)
    private _options?: T[];

    // Member/Callback properties
    private _valueMember?: string;
    private _getValueCallback?: (item: T) => string | number;
    private _displayValueMember?: string;
    private _getDisplayValueCallback?: (item: T) => string;
    private _searchValueMember?: string;
    private _getSearchValueCallback?: (item: T) => string;
    private _iconMember?: string;
    private _getIconCallback?: (item: T) => string;
    private _subtitleMember?: string;
    private _getSubtitleCallback?: (item: T) => string;
    private _groupMember?: string;
    private _getGroupCallback?: (item: T) => string;
    private _disabledMember?: string;
    private _getDisabledCallback?: (item: T) => boolean;

    // Form integration callbacks
    private _getFormValueCallback?: (selectedValues: (string | number)[]) => string;

    // Event callbacks
    private _searchCallback?: (searchTerm: string) => Promise<T[]>;
    private _addNewCallback?: (value: string) => T | Promise<T>;
    private _selectCallback?: (option: T) => void;
    private _deselectCallback?: (option: T) => void;
    private _changeCallback?: (selectedOptions: T[]) => void;

    static get observedAttributes() {
        return [
            // Existing attributes (external names - standard/familiar)
            'search-hint', 'search-placeholder', 'multiple', 'allow-groups',
            'allow-select-all', 'allow-clear-all', 'show-checkboxes', 'sticky-actions', 'close-on-select',
            'lock-placement', 'dropdown-min-width', 'display-mode', 'pills-threshold', 'pills-position',
            'count-format', 'show-count-badge', 'max-height', 'empty-message',
            'loading-message', 'min-search-length', 'enable-search', 'search-input-mode', 'allow-add-new',
            'initial-values',

            // New member properties
            'value-member', 'display-value-member', 'search-value-member',
            'icon-member', 'subtitle-member', 'group-member', 'disabled-member',

            // Form integration
            'name', 'form-value-format'
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
        let initialValues: (string | number)[] | undefined;
        const initialValuesAttr = this.getAttribute('initial-values');
        if (initialValuesAttr) {
            try {
                initialValues = JSON.parse(initialValuesAttr);
            } catch (e) {
                console.error('[MultiSelectElement] Failed to parse initial-values:', e);
            }
        }

        // Map external attribute names to internal config (external → internal with 'is' prefix for booleans)
        const options: Partial<MultiSelectConfig<T>> = {
            // String options
            searchHint: this.getAttribute('search-hint') || undefined,
            searchPlaceholder: this.getAttribute('search-placeholder') || 'Search...',
            dropdownMinWidth: this.getAttribute('dropdown-min-width') || undefined,
            displayMode: (this.getAttribute('display-mode') as any) || 'pills',
            pillsPosition: (this.getAttribute('pills-position') as any) || 'bottom',
            countFormat: this.getAttribute('count-format') || '{count} selected',
            maxHeight: this.getAttribute('max-height') || '20rem',
            emptyMessage: this.getAttribute('empty-message') || 'No results found',
            loadingMessage: this.getAttribute('loading-message') || 'Loading...',
            searchInputMode: (this.getAttribute('search-input-mode') as any) || 'normal',

            // Number options
            pillsThreshold: this.getAttribute('pills-threshold') ? parseInt(this.getAttribute('pills-threshold')!) : undefined,
            minSearchLength: this.getAttribute('min-search-length') ? parseInt(this.getAttribute('min-search-length')!) : 0,

            // Boolean options (map external to internal with 'is' prefix)
            isMultipleEnabled: this.getAttribute('multiple') !== 'false',
            isGroupsAllowed: this.getAttribute('allow-groups') !== 'false',
            isSelectAllAllowed: this.getAttribute('allow-select-all') !== 'false',
            isClearAllAllowed: this.getAttribute('allow-clear-all') !== 'false',
            isCheckboxesShown: this.getAttribute('show-checkboxes') !== 'false',
            isActionsSticky: this.getAttribute('sticky-actions') !== 'false',
            isCloseOnSelect: this.getAttribute('close-on-select') === 'true',
            isPlacementLocked: this.getAttribute('lock-placement') !== 'false',
            isSearchEnabled: this.getAttribute('enable-search') !== 'false',
            isAddNewAllowed: this.getAttribute('allow-add-new') === 'true',
            isCountBadgeShown: this.getAttribute('show-count-badge') === 'true',

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
            getSearchValueCallback: this._getSearchValueCallback,
            getIconCallback: this._getIconCallback,
            getSubtitleCallback: this._getSubtitleCallback,
            getGroupCallback: this._getGroupCallback,
            getDisabledCallback: this._getDisabledCallback,

            // Form integration
            formFieldId: this.getAttribute('name') || undefined,
            formValueFormat: (this.getAttribute('form-value-format') as any) || 'json',
            getFormValueCallback: this._getFormValueCallback,

            // Data and callbacks
            options: this._options,
            searchCallback: this._searchCallback,
            addNewCallback: this._addNewCallback,
            selectCallback: (option) => {
                if (this._selectCallback) this._selectCallback(option);
                this.dispatchEvent(new CustomEvent('select', {
                    detail: {
                        option,
                        selectedOptions: this.picker?.getSelected(),
                        selectedValues: Array.from(this.picker?.getValue() as any || [])
                    } as MultiSelectEventDetail<T>
                }));
            },
            deselectCallback: (option) => {
                if (this._deselectCallback) this._deselectCallback(option);
                this.dispatchEvent(new CustomEvent('deselect', {
                    detail: {
                        option,
                        selectedOptions: this.picker?.getSelected(),
                        selectedValues: Array.from(this.picker?.getValue() as any || [])
                    } as MultiSelectEventDetail<T>
                }));
            },
            changeCallback: (selectedOptions) => {
                if (this._changeCallback) this._changeCallback(selectedOptions);
                this.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        selectedOptions,
                        selectedValues: Array.from(this.picker?.getValue() as any || [])
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

        this.picker = new PureMultiSelect<T>(this.containerElement, options);
    }

    private reinitialize() {
        if (this.picker) {
            this.picker.destroy();
            this.initializePicker();
        }
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

    set getDisabledCallback(callback: ((item: T) => boolean) | undefined) {
        this._getDisabledCallback = callback;
        this.reinitialize();
    }

    get getDisabledCallback() {
        return this._getDisabledCallback;
    }

    // Form integration
    set name(value: string | null) {
        if (value) this.setAttribute('name', value);
        else this.removeAttribute('name');
    }

    get name(): string | null {
        return this.getAttribute('name');
    }

    set formValueFormat(value: 'json' | 'csv' | 'array' | null) {
        if (value) this.setAttribute('form-value-format', value);
        else this.removeAttribute('form-value-format');
    }

    get formValueFormat(): string | null {
        return this.getAttribute('form-value-format');
    }

    set getFormValueCallback(callback: ((values: (string | number)[]) => string) | undefined) {
        this._getFormValueCallback = callback;
        this.reinitialize();
    }

    get getFormValueCallback() {
        return this._getFormValueCallback;
    }

    // Event callbacks
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

// Auto-register the custom element
if (!customElements.get('multi-select')) {
    customElements.define('multi-select', MultiSelectElement);
}
