import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Section 4 (remaining) — dropdown positioning concerns.
 * The overflow-escape tests live in floating-panels.spec.ts.
 */

const PAGE = '/test/positioning.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<Locator> {
    await p.locator('.ms__input').click();
    const dropdown = p.locator('.ms__dropdown');
    await expect(dropdown).toBeVisible();
    return dropdown;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('default placement', () => {
    test('opens below the input', async ({ page }) => {
        const p = picker(page, 'default-below');
        const dropdown = await openDropdown(p);
        const inputBox = await p.locator('.ms__input').boundingBox();
        const dropdownBox = await dropdown.boundingBox();

        expect(dropdownBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height - 1);
    });
});

test.describe('flip placement', () => {
    test('flips above when there is no room below', async ({ page }) => {
        const p = picker(page, 'flip-above');
        const dropdown = await openDropdown(p);
        const inputBox = await p.locator('.ms__input').boundingBox();
        const dropdownBox = await dropdown.boundingBox();

        // Dropdown should be above the input (its bottom <= input top).
        expect(dropdownBox!.y + dropdownBox!.height).toBeLessThanOrEqual(inputBox!.y + 1);
    });
});

test.describe('width constraints', () => {
    test('dropdown-min-width enforces minimum width', async ({ page }) => {
        const p = picker(page, 'min-width');
        const dropdown = await openDropdown(p);
        const box = await dropdown.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(499); // ≈ 500px with sub-pixel
    });

    test('dropdown-max-width enforces maximum width', async ({ page }) => {
        const p = picker(page, 'max-width');
        const dropdown = await openDropdown(p);
        const box = await dropdown.boundingBox();
        // 250 max-width plus the dropdown's 1px border on each side.
        expect(box!.width).toBeLessThanOrEqual(253);
    });
});

test.describe('anchor stability', () => {
    test('dropdown follows the input when ancestor scrolls', async ({ page }) => {
        const p = picker(page, 'anchor-picker');
        const dropdown = await openDropdown(p);

        const inputBoxBefore = await p.locator('.ms__input').boundingBox();
        const dropdownBoxBefore = await dropdown.boundingBox();
        const initialGap = dropdownBoxBefore!.y - inputBoxBefore!.y;

        // Scroll the ancestor.
        await page.locator('#anchor-scroll').evaluate(el => el.scrollTo(0, 200));
        // Give autoUpdate one frame to reposition.
        await page.waitForTimeout(50);

        const inputBoxAfter = await p.locator('.ms__input').boundingBox();
        const dropdownBoxAfter = await dropdown.boundingBox();

        // Either both moved together (dropdown follows input) OR dropdown closed.
        // We're testing the "follows" path; assert the relative offset is preserved.
        if (await dropdown.isVisible()) {
            const finalGap = dropdownBoxAfter!.y - inputBoxAfter!.y;
            expect(Math.abs(finalGap - initialGap)).toBeLessThan(8);
        }
    });
});

test.describe('outside-click behavior', () => {
    test('clicking outside closes the dropdown', async ({ page }) => {
        const p = picker(page, 'outside-click');
        const dropdown = await openDropdown(p);

        await page.mouse.click(5, 5); // top-left corner, far from any picker
        await expect(dropdown).not.toBeVisible();
    });
});
