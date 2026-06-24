import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/placeholder.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function placeholder(p: Locator): Promise<string | null> {
    return p.locator('.ms__input').getAttribute('placeholder');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('search enabled shows the default "Search..." placeholder', async ({ page }) => {
    await expect(picker(page, 'ph-search').locator('.ms__input')).toHaveAttribute('placeholder', 'Search...');
});

test('enable-search="false" shows the default select placeholder', async ({ page }) => {
    await expect(picker(page, 'ph-nosearch').locator('.ms__input')).toHaveAttribute('placeholder', 'Pick an option...');
});

test('search-input-mode="readonly" shows the select placeholder', async ({ page }) => {
    await expect(picker(page, 'ph-readonly').locator('.ms__input')).toHaveAttribute('placeholder', 'Pick an option...');
});

test('custom select-placeholder is honoured when search is disabled', async ({ page }) => {
    await expect(picker(page, 'ph-custom-select').locator('.ms__input')).toHaveAttribute('placeholder', 'Choose a fruit');
});

test('no-data-placeholder is shown for an empty list without opening', async ({ page }) => {
    await expect(picker(page, 'ph-nodata').locator('.ms__input'))
        .toHaveAttribute('placeholder', 'No data — pick a category first');
});

test('no-data-placeholder does not apply when the list has options', async ({ page }) => {
    await expect(picker(page, 'ph-nodata-filled').locator('.ms__input')).toHaveAttribute('placeholder', 'Search...');
});

test('placeholder updates live when search-placeholder changes (i18n)', async ({ page }) => {
    const p = picker(page, 'ph-search');
    await p.evaluate((el) => el.setAttribute('search-placeholder', 'Buscar…'));
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Buscar…');
});

test('emptying the option list flips to the no-data placeholder (cascade)', async ({ page }) => {
    const p = picker(page, 'ph-nodata-filled');
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Search...');
    await p.evaluate((el: any) => { el.options = []; });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'No data');
});

test('repopulating the option list returns to the search placeholder', async ({ page }) => {
    const p = picker(page, 'ph-nodata');
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'No data — pick a category first');
    await p.evaluate((el: any) => { el.options = (window as any).__items; });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Search...');
});

test('setAttributes applies several placeholder attributes at once', async ({ page }) => {
    const p = picker(page, 'ph-nosearch');
    await p.evaluate((el: any) => el.setAttributes({
        'search-placeholder': 'Search items',
        'select-placeholder': 'Pick one please',
        'no-data-placeholder': 'Nothing here'
    }));
    // search is disabled on this instance → the select placeholder is what shows.
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Pick one please');
    await expect(p).toHaveAttribute('search-placeholder', 'Search items');
    await expect(p).toHaveAttribute('no-data-placeholder', 'Nothing here');
});
