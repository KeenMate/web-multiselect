import { test, expect, Page, Locator } from './fixtures';

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

// Layout mirroring — the component is authored with CSS logical properties, so
// these assert the *rendered geometry* flips under RTL (not just that a class is
// present). Centre-x comparisons are direction-of-mirroring checks.
const centreX = (loc: Locator) =>
    loc.evaluate((el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
    });

test('dropdown inherits direction: rtl', async ({ page }) => {
    const dir = await picker(page, 'rtl-explicit')
        .locator('.ms__dropdown')
        .evaluate((el) => getComputedStyle(el).direction);
    expect(dir).toBe('rtl');
});

test('toggle icon sits on the leading (left) edge in RTL, trailing (right) in LTR', async ({ page }) => {
    const rtl = picker(page, 'rtl-explicit');
    expect(await centreX(rtl.locator('.ms__toggle')))
        .toBeLessThan(await centreX(rtl.locator('.ms__input')));

    const ltr = picker(page, 'ltr-control');
    expect(await centreX(ltr.locator('.ms__toggle')))
        .toBeGreaterThan(await centreX(ltr.locator('.ms__input')));
});

test('badge remove button mirrors to the left of the text in RTL', async ({ page }) => {
    const rtl = picker(page, 'rtl-explicit'); // has a pre-selected badge
    expect(await centreX(rtl.locator('.ms__badge-remove').first()))
        .toBeLessThan(await centreX(rtl.locator('.ms__badge-text').first()));
});

test('option checkbox mirrors to the right side of the row in RTL', async ({ page }) => {
    const rtl = picker(page, 'rtl-explicit');
    await rtl.locator('.ms__input').click();
    await expect(rtl.locator('.ms__dropdown')).toBeVisible();
    const opt = rtl.locator('.ms__option').first();
    expect(await centreX(opt.locator('.ms__checkbox')))
        .toBeGreaterThan(await centreX(opt));
});

test('fullscreen overlay mirrors: close button on the left of the search in RTL', async ({ page }) => {
    const fs = picker(page, 'rtl-fs');
    await fs.locator('.ms__input').click();
    await expect(fs.locator('.ms__dropdown--fullscreen')).toBeVisible();
    expect(await centreX(fs.locator('.ms__fullscreen-close')))
        .toBeLessThan(await centreX(fs.locator('.ms__fullscreen-search')));
});
