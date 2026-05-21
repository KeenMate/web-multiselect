import { test, expect, Page, Locator } from '@playwright/test';

const PAGE = '/test/logging.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function clickAnOption(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await p.locator('.ms__option[data-value="apple"]').click();
}

test('default level is silent — no logger output without explicit enable', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(m.text()));

    await page.goto(PAGE);
    const p = picker(page, 'log-picker');
    await clickAnOption(p);

    // No MULTISELECT-prefixed logs.
    const multiselectLogs = consoleMessages.filter(m => m.includes('MULTISELECT'));
    expect(multiselectLogs).toHaveLength(0);
});

test('setLogLevel("debug") at runtime starts producing logs without a reload', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(m.text()));

    await page.goto(PAGE);
    await page.evaluate(() => (window as any).__log.setLogLevel('debug'));

    const p = picker(page, 'log-picker');
    await clickAnOption(p);

    // Each selection emits interaction logs prefixed with the category.
    const multiselectLogs = consoleMessages.filter(m => m.includes('MULTISELECT'));
    expect(multiselectLogs.length).toBeGreaterThan(0);
});

test('setCategoryLevel accepts bare names ("INTERACTION")', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(m.text()));

    await page.goto(PAGE);
    await page.evaluate(() => {
        (window as any).__log.setLogLevel('silent');
        (window as any).__log.setCategoryLevel('INTERACTION', 'debug');
    });

    const p = picker(page, 'log-picker');
    await clickAnOption(p);

    const interactionLogs = consoleMessages.filter(m => m.includes('MULTISELECT:INTERACTION'));
    expect(interactionLogs.length).toBeGreaterThan(0);
});
