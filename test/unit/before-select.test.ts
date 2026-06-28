import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebMultiSelect } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Unit tests for the beforeSelectCallback / beforeDeselectCallback interceptors.
 *
 * Exercised against the core WebMultiSelect class on a plain <div>, driving the
 * interactive choke point directly via the private `toggleOption` (the same path
 * a click or keyboard Enter takes). `setSelected` is the programmatic path and is
 * asserted to bypass the veto.
 */

interface Item { value: string; label: string; }

const ITEMS: Item[] = [
    { value: 'item1', label: 'Item 1' },
    { value: 'item2', label: 'Item 2' },
    { value: 'item3', label: 'Item 3' }
];

const BASE: Partial<MultiSelectConfig<Item>> = {
    valueMember: 'value',
    displayValueMember: 'label',
    isMultipleEnabled: true,
    options: ITEMS
};

let host: HTMLDivElement;
let instance: WebMultiSelect<Item> | undefined;

function make(opts: Partial<MultiSelectConfig<Item>> = {}): WebMultiSelect<Item> {
    instance = new WebMultiSelect<Item>(host, { ...BASE, ...opts });
    return instance;
}

function toggle(item: Item): void {
    (instance as any).toggleOption(item);
}

function selectedValues(): string[] {
    return instance!.getSelected().map(o => o.value);
}

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});

afterEach(() => {
    instance?.destroy();
    instance = undefined;
    host.remove();
});

describe('beforeSelectCallback', () => {
    it('blocks a selection when the callback returns false', () => {
        // Block selecting item1 while item2 is already selected.
        make({
            beforeSelectCallback: (option, selected) =>
                !(option.value === 'item1' && selected.some(o => o.value === 'item2'))
        });

        toggle(ITEMS[1]); // item2 → allowed
        expect(selectedValues()).toEqual(['item2']);

        toggle(ITEMS[0]); // item1 while item2 selected → blocked
        expect(selectedValues()).toEqual(['item2']);

        toggle(ITEMS[2]); // item3 → allowed (rule only targets item1)
        expect(selectedValues()).toEqual(['item2', 'item3']);
    });

    it('allows the selection when the callback returns true/undefined', () => {
        const calls: string[] = [];
        make({
            beforeSelectCallback: (option) => { calls.push(option.value); /* undefined → allow */ }
        });

        toggle(ITEMS[0]);
        expect(selectedValues()).toEqual(['item1']);
        expect(calls).toEqual(['item1']);
    });

    it('receives the current selection BEFORE the change', () => {
        let seen: string[] | null = null;
        make({
            beforeSelectCallback: (_option, selected) => { seen = selected.map(o => o.value); }
        });

        toggle(ITEMS[1]);          // select item2 (selection was empty)
        expect(seen).toEqual([]);

        toggle(ITEMS[0]);          // select item1 (selection was [item2])
        expect(seen).toEqual(['item2']);
    });
});

describe('beforeDeselectCallback', () => {
    it('blocks a deselection when the callback returns false', () => {
        // item1 is "required" — cannot be removed once selected.
        make({
            beforeDeselectCallback: (option) => option.value !== 'item1'
        });

        toggle(ITEMS[0]); // select item1
        toggle(ITEMS[1]); // select item2
        expect(selectedValues()).toEqual(['item1', 'item2']);

        toggle(ITEMS[0]); // try to remove item1 → blocked
        expect(selectedValues()).toEqual(['item1', 'item2']);

        toggle(ITEMS[1]); // remove item2 → allowed
        expect(selectedValues()).toEqual(['item1']);
    });
});

describe('single-select mode', () => {
    it('blocked selection keeps the previous value (no clobber)', () => {
        make({
            isMultipleEnabled: false,
            beforeSelectCallback: (option) => option.value !== 'item3'
        });

        toggle(ITEMS[0]); // item1 → allowed
        expect(selectedValues()).toEqual(['item1']);

        toggle(ITEMS[2]); // item3 → blocked; item1 must remain
        expect(selectedValues()).toEqual(['item1']);
    });
});

describe('beforeDeselectCallback covers the badge remove (×) button', () => {
    it('blocks removing a required item via its badge ×, allows others', () => {
        make({
            beforeDeselectCallback: (option) => option.value !== 'item1'
        });
        instance!.setSelected(['item1', 'item2']); // programmatic — bypasses veto

        const removeBadge = (value: string) =>
            host.querySelector<HTMLButtonElement>(`.ms__badge-remove[data-value="${value}"]`);

        // Required item's badge × is vetoed
        removeBadge('item1')!.click();
        expect(selectedValues()).toEqual(['item1', 'item2']);

        // A normal item's badge × goes through
        removeBadge('item2')!.click();
        expect(selectedValues()).toEqual(['item1']);
    });
});

describe('programmatic setSelected bypasses the veto', () => {
    it('does not consult beforeSelectCallback', () => {
        let called = false;
        make({ beforeSelectCallback: () => { called = true; return false; } });

        instance!.setSelected(['item1', 'item2']);
        expect(selectedValues()).toEqual(['item1', 'item2']);
        expect(called).toBe(false);
    });
});
