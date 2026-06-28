import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/action-buttons.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('built-in actions', () => {
    test('select-all selects every option', async ({ page }) => {
        const p = picker(page, 'builtins');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();

        const values = await p.evaluate((el: any) => el.getValue());
        expect(values).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7']);
    });

    test('clear-all empties selection', async ({ page }) => {
        const p = picker(page, 'builtins');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();
        await p.locator('.ms__action-btn[data-action="clear-all"]').click();

        expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
    });
});

test.describe('custom action', () => {
    test('onClick fires when clicked', async ({ page }) => {
        const p = picker(page, 'custom');
        await openDropdown(p);

        await p.locator('.ms__action-btn.js-custom').click();
        const clicks = await page.evaluate(() => (window as any).__customClicks);
        expect(clicks).toBe(1);
    });
});

test.describe('dynamic visibility / disabled', () => {
    test('getIsVisibleCallback hides the button', async ({ page }) => {
        const p = picker(page, 'dynamic');
        await openDropdown(p);

        // __dynamicVisible defaults to false → hidden
        await expect(p.locator('.ms__action-btn.js-maybe-visible')).toHaveCount(0);
    });

    test('getIsDisabledCallback sets disabled attribute', async ({ page }) => {
        const p = picker(page, 'dynamic');
        await openDropdown(p);

        await expect(p.locator('.ms__action-btn.js-maybe-disabled')).toBeDisabled();
    });
});

test.describe('layout modifiers', () => {
    test('sticky-actions adds the modifier class', async ({ page }) => {
        const p = picker(page, 'sticky');
        await openDropdown(p);

        await expect(p.locator('.ms__actions')).toHaveClass(/ms__actions--sticky/);
    });

    test('actions-layout="wrap" adds the wrap modifier class', async ({ page }) => {
        const p = picker(page, 'wrap');
        await openDropdown(p);

        await expect(p.locator('.ms__actions')).toHaveClass(/ms__actions--wrap/);
    });
});

test.describe('per-item callbacks fire on bulk operations', () => {
    test('select-all fires onSelect once per newly-selected item', async ({ page }) => {
        const p = picker(page, 'tracker');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();

        const selected = await page.evaluate(() => (window as any).__trackerSelected);
        expect(selected).toHaveLength(8);
    });

    test('clear-all fires onDeselect once per removed item', async ({ page }) => {
        const p = picker(page, 'tracker');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();
        // Reset counter so we only measure clear-all's contribution.
        await page.evaluate(() => { (window as any).__trackerDeselected = []; });
        await p.locator('.ms__action-btn[data-action="clear-all"]').click();

        const deselected = await page.evaluate(() => (window as any).__trackerDeselected);
        expect(deselected).toHaveLength(8);
    });
});
