import { WebMultiSelect } from './multiselect';
import type { MultiSelectConfig, MultiSelectEventDetail, OptionContentRenderContext, BadgeContentRenderContext } from './types';
import styles from './css/main.css?inline';
import { dataLogger } from './logger';

// SSR compatibility: provide stub HTMLElement if not in browser
const BaseElement = (typeof HTMLElement !== 'undefined' ? HTMLElement : class {}) as typeof HTMLElement;

// Type declarations for build-time constants
declare const __VERSION__: string;

// ============================================================================
// ATTRIBUTE TABLE — single source of truth for HTML attribute → config option
// ============================================================================
// Drives:
//   - static get observedAttributes()
//   - initial parsing in initializePicker
//   - attributeChangedCallback (to compute the partial options update)
//
// Boolean parser semantics (matches the original hand-coded behavior):
//   - 'bool-default-true':  attribute missing, '', or anything other than 'false' → true.
//                           Only the literal string 'false' makes it false.
//   - 'bool-default-false': attribute missing or '' → false. Only 'true' makes it true.

type AttrParser =
    | 'string'                 // null/'' → default; otherwise raw
    | 'string-or-undefined'    // null/'' → default (typically undefined)
    | 'enum'                   // raw must be in enumValues, else default
    | 'int'                    // parseInt; NaN/empty → default
    | 'bool-default-true'
    | 'bool-default-false';

interface AttrSpec {
    /** External (kebab-case) attribute name */
    attr: string;
    /** Internal MultiSelectConfig key */
    key: keyof MultiSelectConfig;
    parser: AttrParser;
    /** Used when attribute is missing/empty/unparseable. */
    default?: any;
    /** Allowed values for 'enum' parser. */
    enumValues?: readonly string[];
}

const ATTRIBUTE_TABLE: ReadonlyArray<AttrSpec> = [
    // Strings
    { attr: 'search-hint',                 key: 'searchHint',               parser: 'string-or-undefined' },
    { attr: 'search-placeholder',          key: 'searchPlaceholder',        parser: 'string', default: 'Search...' },
    { attr: 'select-placeholder',          key: 'selectPlaceholder',        parser: 'string', default: 'Pick an option...' },
    { attr: 'no-data-placeholder',         key: 'noDataPlaceholder',        parser: 'string-or-undefined' },
    { attr: 'dropdown-min-width',          key: 'dropdownMinWidth',         parser: 'string-or-undefined' },
    { attr: 'dropdown-max-width',          key: 'dropdownMaxWidth',         parser: 'string-or-undefined' },
    { attr: 'max-height',                  key: 'maxHeight',                parser: 'string', default: '20rem' },
    { attr: 'empty-message',               key: 'emptyMessage',             parser: 'string', default: 'No results found' },
    { attr: 'loading-message',             key: 'loadingMessage',           parser: 'string', default: 'Loading...' },
    { attr: 'remove-button-tooltip-text',  key: 'removeButtonTooltipText',  parser: 'string-or-undefined' },
    { attr: 'name',                        key: 'formFieldId',              parser: 'string-or-undefined' },

    // Member properties (have programmatic fallback applied after parse)
    { attr: 'value-member',                key: 'valueMember',              parser: 'string-or-undefined' },
    { attr: 'display-value-member',        key: 'displayValueMember',       parser: 'string-or-undefined' },
    { attr: 'search-value-member',         key: 'searchValueMember',        parser: 'string-or-undefined' },
    { attr: 'icon-member',                 key: 'iconMember',               parser: 'string-or-undefined' },
    { attr: 'subtitle-member',             key: 'subtitleMember',           parser: 'string-or-undefined' },
    { attr: 'group-member',                key: 'groupMember',              parser: 'string-or-undefined' },
    { attr: 'disabled-member',             key: 'disabledMember',           parser: 'string-or-undefined' },

    // Enums
    { attr: 'badges-display-mode',         key: 'badgesDisplayMode',        parser: 'enum',
      enumValues: ['badges','count','compact','partial','none'], default: 'badges' },
    { attr: 'badges-position',             key: 'badgesPosition',           parser: 'enum',
      enumValues: ['top','bottom','left','right'], default: 'bottom' },
    { attr: 'badges-threshold-mode',       key: 'badgesThresholdMode',      parser: 'enum',
      enumValues: ['count','partial'], default: 'count' },
    { attr: 'search-input-mode',           key: 'searchInputMode',          parser: 'enum',
      enumValues: ['normal','readonly','hidden'], default: 'normal' },
    { attr: 'search-mode',                 key: 'searchMode',               parser: 'enum',
      enumValues: ['filter','navigate'], default: 'filter' },
    { attr: 'actions-layout',              key: 'actionsLayout',            parser: 'enum',
      enumValues: ['nowrap','wrap'], default: 'nowrap' },
    { attr: 'actions-position',            key: 'actionsPosition',          parser: 'enum',
      enumValues: ['top','bottom'], default: 'top' },
    { attr: 'actions-align',               key: 'actionsAlign',             parser: 'enum',
      enumValues: ['stretch','left','right','center','space-between'], default: 'stretch' },
    { attr: 'checkbox-align',              key: 'checkboxAlign',            parser: 'enum',
      enumValues: ['top','center','bottom'], default: 'center' },
    { attr: 'value-format',                key: 'valueFormat',              parser: 'enum',
      enumValues: ['json','csv','array'], default: 'json' },
    { attr: 'badge-tooltip-placement',     key: 'badgeTooltipPlacement',    parser: 'enum',
      enumValues: ['top','top-start','top-end','bottom','bottom-start','bottom-end','left','left-start','left-end','right','right-start','right-end'],
      default: 'top' },
    { attr: 'option-tooltip-placement',    key: 'optionTooltipPlacement',   parser: 'enum',
      enumValues: ['top','top-start','top-end','bottom','bottom-start','bottom-end','left','left-start','left-end','right','right-start','right-end'],
      default: 'top-start' },

    // Numbers
    { attr: 'badges-threshold',            key: 'badgesThreshold',          parser: 'int' },
    { attr: 'badges-max-visible',          key: 'badgesMaxVisible',         parser: 'int' },
    { attr: 'min-search-length',           key: 'minSearchLength',          parser: 'int', default: 0 },
    { attr: 'search-debounce',             key: 'searchDebounce',           parser: 'int', default: 0 },
    { attr: 'virtual-scroll-threshold',    key: 'virtualScrollThreshold',   parser: 'int', default: 100 },
    { attr: 'option-height',               key: 'optionHeight',             parser: 'int', default: 50 },
    { attr: 'badge-height',                key: 'badgeHeight',              parser: 'int', default: 36 },
    { attr: 'virtual-scroll-buffer',       key: 'virtualScrollBuffer',      parser: 'int', default: 10 },
    { attr: 'badge-tooltip-delay',         key: 'badgeTooltipDelay',        parser: 'int', default: 100 },
    { attr: 'badge-tooltip-offset',        key: 'badgeTooltipOffset',       parser: 'int', default: 8 },
    { attr: 'option-tooltip-delay',        key: 'optionTooltipDelay',       parser: 'int' },
    { attr: 'option-tooltip-offset',       key: 'optionTooltipOffset',      parser: 'int' },

    // Booleans (default true: presence/empty = true; only 'false' negates)
    { attr: 'multiple',                    key: 'isMultipleEnabled',        parser: 'bool-default-true' },
    { attr: 'allow-groups',                key: 'isGroupsAllowed',          parser: 'bool-default-true' },
    { attr: 'show-checkboxes',             key: 'isCheckboxesShown',        parser: 'bool-default-true' },
    { attr: 'sticky-actions',              key: 'isActionsSticky',          parser: 'bool-default-true' },
    { attr: 'lock-placement',              key: 'isPlacementLocked',        parser: 'bool-default-true' },
    { attr: 'enable-search',               key: 'isSearchEnabled',          parser: 'bool-default-true' },
    { attr: 'keep-options-on-search',      key: 'isKeepOptionsOnSearch',    parser: 'bool-default-true' },
    { attr: 'should-keep-search-on-close', key: 'shouldKeepSearchOnClose',  parser: 'bool-default-true' },

    // Booleans (default false: only 'true' enables)
    { attr: 'close-on-select',             key: 'isCloseOnSelect',          parser: 'bool-default-false' },
    { attr: 'allow-add-new',               key: 'isAddNewAllowed',          parser: 'bool-default-false' },
    { attr: 'show-counter',                key: 'isCounterShown',           parser: 'bool-default-false' },
    { attr: 'enable-virtual-scroll',       key: 'isVirtualScrollEnabled',   parser: 'bool-default-false' },
    { attr: 'enable-badge-tooltips',       key: 'isBadgeTooltipsEnabled',   parser: 'bool-default-false' },
    { attr: 'enable-option-tooltips',      key: 'isOptionTooltipsEnabled',  parser: 'bool-default-false' },
    { attr: 'option-tooltip-follow-cursor', key: 'isOptionTooltipFollowCursor', parser: 'bool-default-false' }
];

const ATTRIBUTE_TABLE_BY_ATTR = new Map(ATTRIBUTE_TABLE.map(s => [s.attr, s]));

/**
 * Member-property attributes whose absence falls back to a programmatic getter.
 * The map's value is the field name on the element instance to read when the attribute is absent.
 */
const MEMBER_PROPERTY_FALLBACKS: ReadonlyArray<{ key: keyof MultiSelectConfig; field: string }> = [
    { key: 'valueMember',         field: '_valueMember' },
    { key: 'displayValueMember',  field: '_displayValueMember' },
    { key: 'searchValueMember',   field: '_searchValueMember' },
    { key: 'iconMember',          field: '_iconMember' },
    { key: 'subtitleMember',      field: '_subtitleMember' },
    { key: 'groupMember',         field: '_groupMember' },
    { key: 'disabledMember',      field: '_disabledMember' }
];

/**
 * Member defaults for the keys parseDeclarativeOptions writes into each parsed option object.
 * Applied only when declarative <option>/<optgroup> children were parsed, and only for members
 * the consumer hasn't explicitly configured via attribute, property, or programmatic callback.
 * Without these, the picker has no idea which key holds the value/label/group and falls through
 * to its '[N/A]' fallback.
 */
const DECLARATIVE_MEMBER_DEFAULTS: ReadonlyArray<{ key: keyof MultiSelectConfig; member: string }> = [
    { key: 'valueMember',         member: 'value' },
    { key: 'displayValueMember',  member: 'label' },
    { key: 'groupMember',         member: 'group' },
    { key: 'iconMember',          member: 'icon' },
    { key: 'subtitleMember',      member: 'subtitle' },
    { key: 'disabledMember',      member: 'disabled' }
];

/** Parse a single attribute value through its spec. Used by both initial parse and live updates. */
function parseAttrValue(spec: AttrSpec, raw: string | null): any {
    // Treat null and empty string the same (so `<el foo>` and `<el foo="">` work like a missing attribute
    // for everything except the boolean parsers, which already handle empty strings explicitly).
    if (raw === null || raw === '') {
        switch (spec.parser) {
            case 'bool-default-true': return true;
            case 'bool-default-false': return false;
            default: return spec.default;
        }
    }
    switch (spec.parser) {
        case 'string':
        case 'string-or-undefined':
            return raw;
        case 'enum':
            return spec.enumValues!.includes(raw) ? raw : spec.default;
        case 'int': {
            const n = parseInt(raw);
            return isNaN(n) ? spec.default : n;
        }
        case 'bool-default-true':  return raw !== 'false';
        case 'bool-default-false': return raw === 'true';
    }
}

// Instance tracking for global API
const instances = new Set<MultiSelectElement>();

// Export for global API
export function getAllInstances(): MultiSelectElement[] {
    return Array.from(instances);
}

export class MultiSelectElement<T = any> extends BaseElement {
    // Opt into the form-associated custom element lifecycle. This is what
    // makes `form.reset()`, `form.elements`, and (in the future) constraint
    // validation actually do something. Without this flag the element is
    // invisible to the form lifecycle even when it has a `name`.
    static formAssociated = true;

    private picker?: WebMultiSelect<T>;
    private containerElement?: HTMLDivElement;
    private shadow: ShadowRoot;
    private internals?: ElementInternals;

    // Properties for complex data (not attributes)
    private _options?: T[];
    private _hasDeclarativeOptions = false;

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
    private _getOptionTooltipCallback?: (item: T) => string | HTMLElement;
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

    // Batch-update state (setAttributes): collects per-attribute changes so a group of
    // attribute writes applies as a single in-place update instead of one re-render each.
    private _batchDepth = 0;
    private _batchPartial: Partial<MultiSelectConfig<T>> = {};
    private _batchNeedsReinit = false;

    // Event callbacks
    private _beforeSearchCallback?: (searchTerm: string) => string | null;
    private _beforeSelectCallback?: (option: T, selectedOptions: T[]) => boolean | void;
    private _beforeDeselectCallback?: (option: T, selectedOptions: T[]) => boolean | void;
    private _searchCallback?: (searchTerm: string, signal?: AbortSignal) => Promise<T[]>;
    private _addNewCallback?: (value: string) => T | Promise<T>;
    private _onSelect?: (option: T) => void;
    private _onDeselect?: (option: T) => void;
    private _onChange?: (selectedOptions: T[]) => void;

    static get observedAttributes() {
        return [
            ...ATTRIBUTE_TABLE.map(s => s.attr),
            // Out-of-table attributes (handled by special-case logic in attributeChangedCallback)
            'initial-values',
            'show-debug-info'
        ];
    }

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });

        // attachInternals() is only available in form-associated elements and
        // older browsers may lack support entirely. Failing closed (without
        // form integration) is better than throwing on construction.
        if (typeof (this as any).attachInternals === 'function') {
            try {
                this.internals = (this as any).attachInternals();
            } catch {
                // jsdom or sandboxed environments may reject; ignore.
            }
        }

        // Inject styles immediately to prevent FOUC
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        this.shadow.appendChild(styleSheet);

        // Mark as ready after initialization to enable placeholder visibility
        requestAnimationFrame(() => {
            this.setAttribute('data-ready', '');
        });
    }

    /**
     * Called by the browser when the surrounding <form> is reset. Clears the
     * picker's selection so the multiselect actually participates in the
     * standard reset lifecycle. (Before form-association, reset was a no-op
     * because the hidden inputs were re-stamped from internal state on every
     * render.)
     */
    formResetCallback() {
        this.picker?.clearAll();
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
            this._hasDeclarativeOptions = true;
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
        if (!this.picker) return;

        // initial-values is consumed only at init time (or via declarative <option selected> children).
        // show-debug-info toggles the debug panel; rebuild not needed.
        if (name === 'initial-values') return;
        if (name === 'show-debug-info') {
            // Re-render the debug panel without rebuilding the picker.
            const existing = this.shadow.querySelector('.ms__debug-info');
            if (existing) existing.remove();
            if (newValue === 'true') this.renderDebugInfo();
            return;
        }

        // Table-driven update: parse the new value through the spec and feed it to the picker.
        const spec = ATTRIBUTE_TABLE_BY_ATTR.get(name);
        if (spec) {
            const value = parseAttrValue(spec, newValue);
            // Member properties keep the programmatic fallback.
            const fallbackField = MEMBER_PROPERTY_FALLBACKS.find(f => f.key === spec.key)?.field;
            const finalValue = (value === undefined && fallbackField)
                ? (this as any)[fallbackField]
                : value;
            // During a setAttributes() batch, accumulate the change instead of applying it now;
            // the whole partial is flushed in one updateOptions call when the batch ends.
            if (this._batchDepth > 0) {
                (this._batchPartial as any)[spec.key] = finalValue;
                return;
            }
            const partial = { [spec.key]: finalValue } as Partial<MultiSelectConfig<T>>;
            const applied = this.picker.updateOptions(partial);
            if (applied) return;
            // Falls through to full reinit below if updateOptions returned false (structural change).
        }

        // Fallback: full destroy + re-init for attributes the picker can't apply in place.
        if (this._batchDepth > 0) {
            this._batchNeedsReinit = true;
            return;
        }
        this.reinitialize();
    }

    /**
     * Set several attributes in one in-place update — a single re-render instead of one per
     * attribute (and a single reinit at most if any change is structural). Keys are attribute
     * names in kebab-case, exactly as `setAttribute`. A value of `null`/`undefined`/`false`
     * removes the attribute; `true` sets it to an empty string; anything else is stringified.
     *
     * @example
     *   el.setAttributes({
     *     'search-placeholder': t('search'),
     *     'select-placeholder': t('pick'),
     *     'no-data-placeholder': t('noData'),
     *   });
     */
    public setAttributes(attrs: Record<string, string | number | boolean | null | undefined>): void {
        this._batchDepth++;
        try {
            for (const [name, value] of Object.entries(attrs)) {
                if (value === null || value === undefined || value === false) {
                    this.removeAttribute(name);
                } else {
                    this.setAttribute(name, value === true ? '' : String(value));
                }
            }
        } finally {
            this._batchDepth--;
        }

        if (this._batchDepth > 0) return; // nested batch; let the outermost call flush

        const partial = this._batchPartial;
        const needsReinit = this._batchNeedsReinit;
        this._batchPartial = {};
        this._batchNeedsReinit = false;

        if (!this.picker) return;
        if (needsReinit) {
            this.reinitialize();
            return;
        }
        if (Object.keys(partial).length > 0) {
            const applied = this.picker.updateOptions(partial);
            if (!applied) this.reinitialize();
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
        const existingDebug = this.shadow.querySelector('.ms__debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }

        // Create debug info container
        const debugContainer = document.createElement('div');
        debugContainer.className = 'ms__debug-info';

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Debug Info';

        const statsDiv = document.createElement('div');
        statsDiv.className = 'ms__debug-stats';

        details.appendChild(summary);
        details.appendChild(statsDiv);
        debugContainer.appendChild(details);

        this.shadow.appendChild(debugContainer);

        // Update debug info periodically
        this.updateDebugInfo();
    }

    private updateDebugInfo() {
        const statsDiv = this.shadow.querySelector('.ms__debug-stats');
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

    /** Parse all observed attributes via ATTRIBUTE_TABLE into a partial config object. */
    private parseAttributesFromTable(): Partial<MultiSelectConfig<T>> {
        const out: Partial<MultiSelectConfig<T>> = {};
        for (const spec of ATTRIBUTE_TABLE) {
            const value = parseAttrValue(spec, this.getAttribute(spec.attr));
            // Only assign defined values so member-property fallback can detect "attribute not set".
            if (value !== undefined) (out as any)[spec.key] = value;
        }
        return out;
    }

    private initializePicker() {
        if (!this.containerElement) return;

        // Parse `data-options` from the host into a usable array. JS-property
        // assignment (`element.options = [...]`) takes precedence; the
        // attribute is the fallback for declarative / HTML-only usage where
        // no inline <script> is practical (SSR, SharePoint, Office Add-ins).
        let parsedDataOptions: T[] | undefined;
        const dataOptionsAttr = this.getAttribute('data-options');
        if (dataOptionsAttr && this._options === undefined) {
            try {
                parsedDataOptions = JSON.parse(dataOptionsAttr);
            } catch (e) {
                dataLogger.error('[MultiSelectElement] Failed to parse data-options:', e);
            }
        }

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

        // Build options from the attribute table, then layer on programmatic-only fields below.
        const options: Partial<MultiSelectConfig<T>> = this.parseAttributesFromTable();

        // Member properties: attribute wins, fall back to programmatic getter if attribute is unset.
        for (const { key, field } of MEMBER_PROPERTY_FALLBACKS) {
            if (options[key] === undefined) (options as any)[key] = (this as any)[field];
        }

        // Declarative member defaults: only when <option>/<optgroup> children were parsed and the
        // consumer hasn't already set the corresponding member (via attribute, property, or
        // get*Callback). Without this, the picker can't read value/label/group off the parsed
        // objects and every row renders as '[N/A]'.
        if (this._hasDeclarativeOptions) {
            const callbackOverrides: Partial<Record<keyof MultiSelectConfig, unknown>> = {
                valueMember: this._getValueCallback,
                displayValueMember: this._getDisplayValueCallback,
                groupMember: this._getGroupCallback,
                iconMember: this._getIconCallback,
                subtitleMember: this._getSubtitleCallback,
                disabledMember: this._getDisabledCallback
            };
            for (const { key, member } of DECLARATIVE_MEMBER_DEFAULTS) {
                if (options[key] === undefined && !callbackOverrides[key]) {
                    (options as any)[key] = member;
                }
            }
        }

        // Programmatic-only fields (no attribute equivalent).
        Object.assign(options, {
            actionButtons: this._actionButtons,
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
            renderOptionContentCallback: this._renderOptionContentCallback,
            renderBadgeContentCallback: this._renderBadgeContentCallback,
            renderSelectedItemContentCallback: this._renderSelectedItemContentCallback,
            getSelectedItemClassCallback: this._getSelectedItemClassCallback,
            renderSelectedContentCallback: this._renderSelectedContentCallback,
            getValueFormatCallback: this._getValueFormatCallback,
            getBadgeTooltipCallback: this._getBadgeTooltipCallback,
            getOptionTooltipCallback: this._getOptionTooltipCallback,
            getRemoveButtonTooltipCallback: this._getRemoveButtonTooltipCallback,
            getCounterCallback: this._getCounterCallback || ((count: number, moreCount?: number) => {
                if (moreCount !== undefined) return `+${moreCount} more`;
                return `${count} selected`;
            }),
            options: this._options ?? parsedDataOptions,
            beforeSearchCallback: this._beforeSearchCallback,
            beforeSelectCallback: this._beforeSelectCallback,
            beforeDeselectCallback: this._beforeDeselectCallback,
            searchCallback: this._searchCallback,
            addNewCallback: this._addNewCallback,
            onSelect: (option: T) => {
                if (this._onSelect) this._onSelect(option);
                // bubbles + composed so framework delegation (Svelte 5
                // onchange, React onChange, etc.) and ancestor listeners
                // receive the event. Necessary because Svelte 5 routes
                // 'change' via doc-level event delegation and won't see
                // non-bubbling CustomEvents.
                this.dispatchEvent(new CustomEvent('select', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        option,
                        selectedOptions: this.picker?.getSelected(),
                        selectedValues: this.collectSelectedValues()
                    } as MultiSelectEventDetail<T>
                }));
            },
            onDeselect: (option) => {
                if (this._onDeselect) this._onDeselect(option);
                this.dispatchEvent(new CustomEvent('deselect', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        option,
                        selectedOptions: this.picker?.getSelected(),
                        selectedValues: this.collectSelectedValues()
                    } as MultiSelectEventDetail<T>
                }));
            },
            onChange: (selectedOptions) => {
                if (this._onChange) this._onChange(selectedOptions);
                this.dispatchEvent(new CustomEvent('change', {
                    bubbles: true,
                    composed: true,
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
        });

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

    /**
     * Apply a partial config update to the live picker. Falls back to a full reinit if the
     * picker can't apply the change in place (e.g. adding/removing the `searchHint` element).
     * No-op if the picker hasn't been initialized yet — the next `initializePicker` will pick
     * up the new programmatic state.
     */
    private updatePicker(partial: Partial<MultiSelectConfig<T>>): void {
        if (!this.picker) return;
        if (!this.picker.updateOptions(partial)) this.reinitialize();
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
        this.updatePicker({ options: value });
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
        this.updatePicker({ getValueCallback: callback });
    }

    get getValueCallback() {
        return this._getValueCallback;
    }

    set getDisplayValueCallback(callback: ((item: T) => string) | undefined) {
        this._getDisplayValueCallback = callback;
        this.updatePicker({ getDisplayValueCallback: callback });
    }

    get getDisplayValueCallback() {
        return this._getDisplayValueCallback;
    }

    set getBadgeDisplayCallback(callback: ((item: T) => string) | undefined) {
        this._getBadgeDisplayCallback = callback;
        this.updatePicker({ getBadgeDisplayCallback: callback });
    }

    get getBadgeDisplayCallback() {
        return this._getBadgeDisplayCallback;
    }

    set getBadgeClassCallback(callback: ((item: T) => string | string[]) | undefined) {
        this._getBadgeClassCallback = callback;
        this.updatePicker({ getBadgeClassCallback: callback });
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
        this.updatePicker({ getSearchValueCallback: callback });
    }

    get getSearchValueCallback() {
        return this._getSearchValueCallback;
    }

    set getIconCallback(callback: ((item: T) => string) | undefined) {
        this._getIconCallback = callback;
        this.updatePicker({ getIconCallback: callback });
    }

    get getIconCallback() {
        return this._getIconCallback;
    }

    set getSubtitleCallback(callback: ((item: T) => string) | undefined) {
        this._getSubtitleCallback = callback;
        this.updatePicker({ getSubtitleCallback: callback });
    }

    get getSubtitleCallback() {
        return this._getSubtitleCallback;
    }

    set getGroupCallback(callback: ((item: T) => string) | undefined) {
        this._getGroupCallback = callback;
        this.updatePicker({ getGroupCallback: callback });
    }

    get getGroupCallback() {
        return this._getGroupCallback;
    }

    set renderGroupLabelContentCallback(callback: ((groupName: string) => string | HTMLElement) | undefined) {
        this._renderGroupLabelContentCallback = callback;
        this.updatePicker({ renderGroupLabelContentCallback: callback });
    }

    get renderGroupLabelContentCallback() {
        return this._renderGroupLabelContentCallback;
    }

    set getDisabledCallback(callback: ((item: T) => boolean) | undefined) {
        this._getDisabledCallback = callback;
        this.updatePicker({ getDisabledCallback: callback });
    }

    get getDisabledCallback() {
        return this._getDisabledCallback;
    }

    // Custom rendering callbacks
    set renderOptionContentCallback(callback: ((item: T, context: OptionContentRenderContext) => string | HTMLElement) | undefined) {
        this._renderOptionContentCallback = callback;
        this.updatePicker({ renderOptionContentCallback: callback });
    }

    get renderOptionContentCallback() {
        return this._renderOptionContentCallback;
    }

    set renderBadgeContentCallback(callback: ((item: T, context: BadgeContentRenderContext) => string | HTMLElement) | undefined) {
        this._renderBadgeContentCallback = callback;
        this.updatePicker({ renderBadgeContentCallback: callback });
    }

    get renderBadgeContentCallback() {
        return this._renderBadgeContentCallback;
    }

    set renderSelectedItemContentCallback(callback: ((item: T) => string | HTMLElement) | undefined) {
        this._renderSelectedItemContentCallback = callback;
        this.updatePicker({ renderSelectedItemContentCallback: callback });
    }

    get renderSelectedItemContentCallback() {
        return this._renderSelectedItemContentCallback;
    }

    set getSelectedItemClassCallback(callback: ((item: T) => string | string[]) | undefined) {
        this._getSelectedItemClassCallback = callback;
        this.updatePicker({ getSelectedItemClassCallback: callback });
    }

    get getSelectedItemClassCallback() {
        return this._getSelectedItemClassCallback;
    }

    set renderSelectedContentCallback(callback: ((item: T) => string) | undefined) {
        this._renderSelectedContentCallback = callback;
        this.updatePicker({ renderSelectedContentCallback: callback });
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
        this.updatePicker({ getValueFormatCallback: callback });
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

    set enableOptionTooltips(value: boolean) {
        if (value) this.setAttribute('enable-option-tooltips', 'true');
        else this.removeAttribute('enable-option-tooltips');
    }

    get enableOptionTooltips(): boolean {
        return this.getAttribute('enable-option-tooltips') === 'true';
    }

    set getOptionTooltipCallback(callback: ((item: T) => string | HTMLElement) | undefined) {
        this._getOptionTooltipCallback = callback;
        this.updatePicker({ getOptionTooltipCallback: callback });
    }

    get getOptionTooltipCallback() {
        return this._getOptionTooltipCallback;
    }

    set optionTooltipPlacement(value: string | null) {
        if (value) this.setAttribute('option-tooltip-placement', value);
        else this.removeAttribute('option-tooltip-placement');
    }

    get optionTooltipPlacement(): string | null {
        return this.getAttribute('option-tooltip-placement');
    }

    set optionTooltipFollowCursor(value: boolean) {
        if (value) this.setAttribute('option-tooltip-follow-cursor', 'true');
        else this.removeAttribute('option-tooltip-follow-cursor');
    }

    get optionTooltipFollowCursor(): boolean {
        return this.getAttribute('option-tooltip-follow-cursor') === 'true';
    }

    set actionsPosition(value: string | null) {
        if (value) this.setAttribute('actions-position', value);
        else this.removeAttribute('actions-position');
    }

    get actionsPosition(): string | null {
        return this.getAttribute('actions-position');
    }

    set actionsAlign(value: string | null) {
        if (value) this.setAttribute('actions-align', value);
        else this.removeAttribute('actions-align');
    }

    get actionsAlign(): string | null {
        return this.getAttribute('actions-align');
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
        this.updatePicker({ getBadgeTooltipCallback: callback });
    }

    get getBadgeTooltipCallback() {
        return this._getBadgeTooltipCallback;
    }

    set getRemoveButtonTooltipCallback(callback: ((item: T) => string) | undefined) {
        this._getRemoveButtonTooltipCallback = callback;
        this.updatePicker({ getRemoveButtonTooltipCallback: callback });
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
        this.updatePicker({ getCounterCallback: callback });
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
        this.updatePicker({ beforeSearchCallback: callback });
    }

    get beforeSelectCallback(): ((option: T, selectedOptions: T[]) => boolean | void) | undefined {
        return this._beforeSelectCallback;
    }

    set beforeSelectCallback(callback: ((option: T, selectedOptions: T[]) => boolean | void) | undefined) {
        this._beforeSelectCallback = callback;
        this.updatePicker({ beforeSelectCallback: callback });
    }

    get beforeDeselectCallback(): ((option: T, selectedOptions: T[]) => boolean | void) | undefined {
        return this._beforeDeselectCallback;
    }

    set beforeDeselectCallback(callback: ((option: T, selectedOptions: T[]) => boolean | void) | undefined) {
        this._beforeDeselectCallback = callback;
        this.updatePicker({ beforeDeselectCallback: callback });
    }

    get searchCallback(): ((searchTerm: string, signal?: AbortSignal) => Promise<T[]>) | undefined {
        return this._searchCallback;
    }

    set searchCallback(callback: ((searchTerm: string, signal?: AbortSignal) => Promise<T[]>) | undefined) {
        this._searchCallback = callback;
        this.updatePicker({ searchCallback: callback });
    }

    get addNewCallback(): ((value: string) => T | Promise<T>) | undefined {
        return this._addNewCallback;
    }

    set addNewCallback(callback: ((value: string) => T | Promise<T>) | undefined) {
        this._addNewCallback = callback;
        this.updatePicker({ addNewCallback: callback });
    }

    get onSelect(): ((option: T) => void) | undefined {
        return this._onSelect;
    }

    set onSelect(callback: ((option: T) => void) | undefined) {
        this._onSelect = callback;
    }

    get onDeselect(): ((option: T) => void) | undefined {
        return this._onDeselect;
    }

    set onDeselect(callback: ((option: T) => void) | undefined) {
        this._onDeselect = callback;
    }

    get onChange(): ((selectedOptions: T[]) => void) | undefined {
        return this._onChange;
    }

    set onChange(callback: ((selectedOptions: T[]) => void) | undefined) {
        this._onChange = callback;
    }

    // Action buttons
    get actionButtons(): any[] | undefined {
        return this._actionButtons;
    }

    set actionButtons(value: any[] | undefined) {
        this._actionButtons = value;
        this.updatePicker({ actionButtons: value });
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
