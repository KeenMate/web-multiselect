import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/rtl.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('dir="rtl" attribute adds the ms--rtl modifier class to the host container', async ({ page }) => {
    const inner = picker(page, 'rtl-explicit').locator('.ms-container, .ms__container, [class*="ms-"]').first();
    // The picker's inner container should have ms--rtl somewhere.
    const hasRtl = await picker(page, 'rtl-explicit').evaluate((el: any) =>
        !!el.shadowRoot?.querySelector('.ms--rtl')
    );
    expect(hasRtl).toBe(true);
});

test('ancestor dir="rtl" propagates to the picker', async ({ page }) => {
    const hasRtl = await picker(page, 'rtl-ancestor').evaluate((el: any) =>
        !!el.shadowRoot?.querySelector('.ms--rtl')
    );
    expect(hasRtl).toBe(true);
});

test('LTR control does not have ms--rtl class', async ({ page }) => {
    const hasRtl = await picker(page, 'ltr-control').evaluate((el: any) =>
        !!el.shadowRoot?.querySelector('.ms--rtl')
    );
    expect(hasRtl).toBe(false);
});
