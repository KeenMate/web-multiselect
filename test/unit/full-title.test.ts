import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for `full-title-member` + `show-badge-full-title`.
 *
 * A "full title" is a fully-qualified label that ships with the data (never
 * computed by the component). When `show-badge-full-title` is on, badges show
 * it instead of the display value, falling back to the display value for
 * options that don't carry one.
 */

const ITEMS = [
    { value: 'apple', label: 'Apple', fullTitle: 'Fruit / Pome fruit / Apple' },
    { value: 'plain', label: 'Plain' } // no fullTitle
];

let el: any;

function badgeTexts(): string[] {
    return Array.from(el.shadowRoot.querySelectorAll('.ms__badge')).map((b: any) =>
        b.textContent.replace(/[×✕�-]\s*$/, '').trim()
    );
}

function setup(attrs: Record<string, string> = {}) {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    el.setAttribute('full-title-member', 'fullTitle');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    el.options = ITEMS;
    el.setSelected(['apple', 'plain']);
}

afterEach(() => el?.remove());

describe('badge full title', () => {
    it('shows the full title on badges when show-badge-full-title is on', () => {
        setup({ 'show-badge-full-title': 'true' });
        expect(badgeTexts()).toContain('Fruit / Pome fruit / Apple');
    });

    it('falls back to the display value for options without a full title', () => {
        setup({ 'show-badge-full-title': 'true' });
        expect(badgeTexts()).toContain('Plain');
    });

    it('shows the plain display value when the opt-in is off (default)', () => {
        setup();
        const texts = badgeTexts();
        expect(texts).toContain('Apple');
        expect(texts).not.toContain('Fruit / Pome fruit / Apple');
    });

    it('lets an explicit getBadgeDisplayCallback win over the full title', () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        el.setAttribute('full-title-member', 'fullTitle');
        el.setAttribute('show-badge-full-title', 'true');
        document.body.appendChild(el);
        el.getBadgeDisplayCallback = (item: any) => `#${item.value}`;
        el.options = ITEMS;
        el.setSelected(['apple']);
        expect(badgeTexts()).toContain('#apple');
    });
});
