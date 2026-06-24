import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/search-debounce.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function calls(page: Page, id: string): Promise<number> {
    return page.evaluate((key) => (window as any).__calls[key], id);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('without debounce, the searchCallback fires once per keystroke', async ({ page }) => {
    const p = picker(page, 'ms-immediate');
    await p.locator('.ms__input').click();
    // type() dispatches one input event per character.
    await p.locator('.ms__input').type('abc', { delay: 60 });

    await expect.poll(() => calls(page, 'ms-immediate')).toBe(3);
});

test('with search-debounce, a burst of keystrokes collapses into one call', async ({ page }) => {
    const p = picker(page, 'ms-debounced');
    await p.locator('.ms__input').click();
    // 60ms between keystrokes is well under the 300ms debounce window.
    await p.locator('.ms__input').type('abc', { delay: 60 });

    // Give the debounce window time to elapse and settle.
    await page.waitForTimeout(500);
    await expect.poll(() => calls(page, 'ms-debounced')).toBe(1);
});

test('debounced call uses the latest term (single result for full query)', async ({ page }) => {
    const p = picker(page, 'ms-debounced');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').type('abc', { delay: 60 });
    await page.waitForTimeout(500);

    const options = p.locator('.ms__option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('ABC');
});
