import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for MultiSelectElement.setAttributes() — the batch attribute setter.
 *
 * Goal: a group of attribute writes is reflected to the DOM and applied to the
 * picker as a SINGLE in-place update, rather than one re-render per attribute.
 */

const ITEMS = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' }
];

let el: any;

function input(): HTMLInputElement {
    return el.shadowRoot.querySelector('.ms__input') as HTMLInputElement;
}

beforeEach(() => {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    document.body.appendChild(el);
    el.options = ITEMS;
});

afterEach(() => {
    el.remove();
});

describe('setAttributes — DOM reflection', () => {
    it('reflects every key to a real attribute', () => {
        el.setAttributes({
            'search-placeholder': 'Search…',
            'select-placeholder': 'Pick…',
            'no-data-placeholder': 'Empty'
        });
        expect(el.getAttribute('search-placeholder')).toBe('Search…');
        expect(el.getAttribute('select-placeholder')).toBe('Pick…');
        expect(el.getAttribute('no-data-placeholder')).toBe('Empty');
    });

    it('removes attributes when the value is null/undefined/false', () => {
        el.setAttribute('no-data-placeholder', 'Empty');
        el.setAttributes({ 'no-data-placeholder': null });
        expect(el.hasAttribute('no-data-placeholder')).toBe(false);
    });

    it('sets boolean true as an empty-string attribute', () => {
        el.setAttributes({ 'enable-search': true });
        expect(el.getAttribute('enable-search')).toBe('');
    });
});

describe('setAttributes — single in-place update', () => {
    it('calls picker.updateOptions exactly once for a multi-attribute set', () => {
        const spy = vi.spyOn(el.picker, 'updateOptions');
        el.setAttributes({
            'search-placeholder': 'Search…',
            'select-placeholder': 'Pick…',
            'no-data-placeholder': 'Empty'
        });
        expect(spy).toHaveBeenCalledTimes(1);
        // The single call carries the merged partial for all three changes.
        const partial = spy.mock.calls[0][0];
        expect(partial).toMatchObject({
            searchPlaceholder: 'Search…',
            selectPlaceholder: 'Pick…',
            noDataPlaceholder: 'Empty'
        });
    });

    it('applies the change so the live placeholder updates (i18n switch)', () => {
        el.setAttributes({ 'search-placeholder': 'Buscar…' });
        expect(input().placeholder).toBe('Buscar…');
    });

    it('reflects an emptied option list + select placeholder together', () => {
        el.setAttributes({ 'enable-search': 'false', 'select-placeholder': 'Choose' });
        expect(input().placeholder).toBe('Choose');
    });
});
