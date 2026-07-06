import { test, expect, Page, Locator } from '@playwright/test';

/**
 * The option checkbox is a custom-drawn box (native appearance removed). It reads
 * as a real control via a dedicated mid-grey border colour (--ms-checkbox-border-color,
 * default #8f8f8f) rather than the generic --ms-border, plus a bold checkmark when
 * checked. Width/colour are themeable via --ms-checkbox-border-width/-color.
 */

const PAGE = '/test/tree.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

test('unchecked checkbox uses the dedicated mid-grey border colour', async ({ page }) => {
    await page.goto(PAGE);
    const p = picker(page, 'tree-sel-member');
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    // A leaf row carries the checkbox (branches don't, in this fixture).
    const cb = p.locator('.ms__option[data-path="1.1.1"] .ms__checkbox');
    await expect(cb).toHaveCSS('border-top-width', '1px');
    // #8f8f8f → rgb(143, 143, 143)
    await expect(cb).toHaveCSS('border-top-color', 'rgb(143, 143, 143)');
});
