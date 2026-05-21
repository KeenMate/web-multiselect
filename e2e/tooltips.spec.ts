import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/tooltips.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function selectFirst(p: Locator, value: string): Promise<void> {
    await p.locator('.ms__input').click();
    await p.locator(`.ms__option[data-value="${value}"]`).click();
    await p.locator('.ms__input').evaluate((el: HTMLElement) => el.blur());
    // Click outside to close
    await p.page().mouse.click(0, 0);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('badge tooltip becomes visible on hover (default content)', async ({ page }) => {
    const p = picker(page, 'default-tt');
    await selectFirst(p, 'apple');

    await p.locator('.ms__badge:not([data-action])').hover();

    // Tooltip lives in the document body (light DOM), positioned outside shadow root.
    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText(/Apple/);
});

test('getBadgeTooltipCallback overrides tooltip content', async ({ page }) => {
    const p = picker(page, 'custom-tt');
    await selectFirst(p, 'banana');

    await p.locator('.ms__badge:not([data-action])').hover();

    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText('A yellow fruit');
});

test('remove button tooltip uses configured template', async ({ page }) => {
    const p = picker(page, 'remove-tt');
    await selectFirst(p, 'cherry');

    await p.locator('.ms__badge-remove').hover();

    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText('Drop Cherry');
});

test('tooltip uses position:fixed', async ({ page }) => {
    const p = picker(page, 'default-tt');
    await selectFirst(p, 'apple');

    await p.locator('.ms__badge:not([data-action])').hover();
    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });

    const position = await tooltip.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('fixed');
});
