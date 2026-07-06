import { test, expect, Page, Locator } from '@playwright/test';

/**
 * E2E for the option row-height and long-title knobs (used by tree rows, but
 * general to every `.ms__option`):
 *   - `--ms-option-min-height` gives an adjustable minimum row height.
 *   - `--ms-option-title-white-space` / `-overflow` / `-text-overflow` flip the
 *     title label (`.ms__option-title`, the treeview `node-label` analog) from
 *     the default wrap to single-line ellipsis truncation.
 * Verified in a real browser because both ride computed layout.
 */

const PAGE = '/test/tree.html';

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

test('default: long titles wrap (multi-line, not truncated)', async ({ page }) => {
    const p = picker(page, 'tree-multi');
    await openDropdown(p);
    const title = p.locator('.ms__option[data-path="1"] .ms__option-title');
    await expect(title).toHaveCSS('white-space', 'normal');
    await expect(title).toHaveCSS('text-overflow', 'clip');
});

test('--ms-option-title-* variables truncate the title to one line with ellipsis', async ({ page }) => {
    const p = picker(page, 'tree-truncate');
    await openDropdown(p);
    const title = p.locator('.ms__option[data-path="1"] .ms__option-title');

    await expect(title).toHaveCSS('white-space', 'nowrap');
    await expect(title).toHaveCSS('overflow-x', 'hidden');
    await expect(title).toHaveCSS('text-overflow', 'ellipsis');

    // Truncated → the rendered box is narrower than the text's natural width.
    const clipped = await title.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1
    );
    expect(clipped).toBe(true);
});

test('--ms-option-min-height sets an adjustable row height', async ({ page }) => {
    const p = picker(page, 'tree-tall');
    await openDropdown(p);
    const row = p.locator('.ms__option[data-path="1.2"]'); // the SHORT label

    // min-height wins even for a short single-line row.
    const h = await row.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(56);
});
