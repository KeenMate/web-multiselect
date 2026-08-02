import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for the `data-options` attribute on <web-multiselect>.
 *
 * `data-options` is now a first-class input (configKey `options`, attribute
 * `data-options`, converter core `toObjectArray`, on: 'reinit') — NOT a value
 * hand-parsed once at build time. It therefore must be:
 *   - parsed + shape-validated by core (JSON array of objects; JSON only),
 *   - reactive (changing/removing the attribute re-renders),
 *   - crash-safe on bad JSON (falls back to an empty list).
 *
 * Options-presence is asserted via the input placeholder, exactly as the
 * placeholder tests do: options present -> "Search..."; empty list + a
 * no-data-placeholder -> that placeholder. (Keeps the dropdown/Floating UI out.)
 */

const ITEMS_JSON = '[{"value":"apple","label":"Apple"},{"value":"banana","label":"Banana"}]';

let el: any;

function make(attrs: Record<string, string>): any {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el;
}

function placeholder(): string {
    return (el.shadowRoot.querySelector('.ms__input') as HTMLInputElement).placeholder;
}

afterEach(() => {
    el?.remove();
    el = undefined;
});

describe('data-options — parsing', () => {
    it('parses a JSON array of option objects set before connect', async () => {
        make({ 'data-options': ITEMS_JSON, 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(el.options).toHaveLength(2);
        expect(placeholder()).toBe('Search...'); // options present
    });

    it('falls back to an empty list (no throw) on invalid JSON', async () => {
        make({ 'data-options': '{not valid json', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(el.options).toHaveLength(0);
        expect(placeholder()).toBe('Empty');
    });

    it('falls back to an empty list when the JSON is not an array', async () => {
        make({ 'data-options': '{"value":"x"}', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(el.options).toHaveLength(0);
        expect(placeholder()).toBe('Empty');
    });
});

describe('data-options — reactivity', () => {
    it('re-renders when the attribute changes (v1 read it only once at build)', async () => {
        make({ 'data-options': ITEMS_JSON, 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');

        el.setAttribute('data-options', '[]');
        await el.whenSettled();
        expect(el.options).toHaveLength(0);
        expect(placeholder()).toBe('Empty'); // reactively emptied
    });

    it('resets to the empty default when the attribute is removed', async () => {
        make({ 'data-options': ITEMS_JSON, 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        el.removeAttribute('data-options');
        await el.whenSettled();
        expect(el.options).toHaveLength(0);
        expect(placeholder()).toBe('Empty');
    });

    it('a direct .options property assignment wins over the attribute value', async () => {
        make({ 'data-options': ITEMS_JSON });
        await el.whenSettled();
        el.options = [{ value: 'x', label: 'X' }];
        await el.whenSettled();
        expect(el.options).toHaveLength(1);
        expect(el.options[0].value).toBe('x');
    });
});
