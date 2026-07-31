import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/groups.html';

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

test('group-member produces grouped headers + options', async ({ page }) => {
    const p = picker(page, 'grouped');
    await openDropdown(p);

    await expect(p.locator('.ms__group-label')).toHaveCount(2);
    await expect(p.locator('.ms__group-label').first()).toContainText(/Fruits/);
});

test('allow-groups="false" renders a flat list', async ({ page }) => {
    const p = picker(page, 'flat');
    await openDropdown(p);

    await expect(p.locator('.ms__group-label')).toHaveCount(0);
    await expect(p.locator('.ms__option')).toHaveCount(6);
});

test('renderGroupLabelContentCallback overrides label content', async ({ page }) => {
    const p = picker(page, 'custom-label');
    await openDropdown(p);

    // Wait for re-render after callback assignment
    await expect(p.locator('.js-custom-label')).toHaveCount(2);
    await expect(p.locator('.js-custom-label').first()).toContainText('[FRUITS]');
});
