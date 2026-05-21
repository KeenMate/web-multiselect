import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/theming.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('--ms-rem scales the input height proportionally', async ({ page }) => {
    const defaultInput = picker(page, 'default-rem').locator('.ms__input');
    const bigInput = picker(page, 'big-rem').locator('.ms__input');

    const dh = (await defaultInput.boundingBox())!.height;
    const bh = (await bigInput.boundingBox())!.height;

    // Big should be substantially taller (≈1.6x). Allow some slack for sub-pixel.
    expect(bh).toBeGreaterThan(dh * 1.3);
});

test('individual --ms-* override flows through to the rendered border', async ({ page }) => {
    const p = picker(page, 'custom-border');
    const borderColor = await p.locator('.ms__input').evaluate(el => getComputedStyle(el).borderTopColor);
    expect(borderColor).toBe('rgb(255, 0, 0)');
});

test('--base-primary-bg flows through to --ms-primary-bg (accent)', async ({ page }) => {
    const p = picker(page, 'base-primary');
    // Read --ms-primary-bg from the picker host.
    const accent = await p.evaluate(el => getComputedStyle(el).getPropertyValue('--ms-primary-bg').trim());
    expect(accent).toMatch(/^rgb\(0,\s*255,\s*0\)$/);
});
