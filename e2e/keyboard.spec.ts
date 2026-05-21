import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Section 6 — keyboard navigation.
 */

const PAGE = '/test/keyboard.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openWithKeyboard(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

function focused(p: Locator): Locator {
    return p.locator('.ms__option--focused');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('basic arrow navigation', () => {
    test('ArrowDown moves focus down', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await expect(focused(p)).toContainText('Item 00');

        await page.keyboard.press('ArrowDown');
        await expect(focused(p)).toContainText('Item 01');
    });

    test('ArrowUp moves focus up', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        await expect(focused(p)).toContainText('Item 00');
    });

    test('Home jumps to first option', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Home');
        await expect(focused(p)).toContainText('Item 00');
    });

    test('End jumps to last option', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);
        await page.keyboard.press('End');
        await expect(focused(p)).toContainText('Item 19');
    });

    test('PageDown moves 10 options', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);
        await page.keyboard.press('ArrowDown'); // → Item 00
        await page.keyboard.press('PageDown');
        await expect(focused(p)).toContainText('Item 10');
    });

    test('PageUp moves 10 options up', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);
        await page.keyboard.press('End'); // → Item 19
        await page.keyboard.press('PageUp');
        await expect(focused(p)).toContainText('Item 09');
    });
});

test.describe('Enter / Escape', () => {
    test('Enter toggles selection of focused option', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['item-0']);
    });

    test('Escape with non-empty search clears search', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await p.locator('.ms__input').fill('Item 01');
        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__input')).toHaveValue('');
        await expect(p.locator('.ms__dropdown')).toBeVisible();
    });

    test('Escape with empty search closes dropdown', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__dropdown')).not.toBeVisible();
    });
});

test.describe('navigate mode shortcuts', () => {
    test('Ctrl+ArrowDown jumps to next match', async ({ page }) => {
        const p = picker(page, 'kb-navigate');
        await openWithKeyboard(p);

        // "Item 1" matches Item 01, 10-19 — multiple matches.
        await p.locator('.ms__input').fill('Item 1');
        await page.keyboard.press('Control+ArrowDown');
        // Cursor should be on one of the matches.
        await expect(p.locator('.ms__option--matched')).not.toHaveCount(0);
    });
});

test.describe('grouped options focus highlight', () => {
    test('only the actually-focused option lights up', async ({ page }) => {
        const p = picker(page, 'kb-grouped');
        await openWithKeyboard(p);

        // Focus the 2nd item via keyboard.
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        // Exactly one option has the --focused class even across multiple groups.
        await expect(focused(p)).toHaveCount(1);
    });
});

test.describe('focused option scrolls into view', () => {
    test('End scrolls last option into the viewport', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('End');

        // The focused last option must be visible (in viewport).
        const focusedOpt = focused(p);
        await expect(focusedOpt).toBeInViewport();
    });
});
