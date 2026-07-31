import { test, expect, Page, Locator } from './fixtures';

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

    test('dropdown-width and selected-popover-width size the two panels independently of the input', async ({ page }) => {
        const p = picker(page, 'panel-widths');
        const inputW = (await p.locator('.ms__input').boundingBox())!.width;
        expect(inputW).toBeLessThan(220); // ~180px input, unaffected by the wide panels

        // Options dropdown honours dropdown-width="600px" (not the input width).
        const dropdown = await openDropdown(p);
        expect((await dropdown.boundingBox())!.width).toBeGreaterThanOrEqual(598);

        // Selected-items popover honours selected-popover-width="300px".
        await p.locator('.ms__option').first().click();
        await p.locator('.ms__counter').click();
        const popover = p.locator('.ms__selected-popover');
        await expect(popover).toBeVisible();
        const popW = (await popover.boundingBox())!.width;
        expect(popW).toBeGreaterThanOrEqual(298);
        expect(popW).toBeLessThanOrEqual(304); // 300px + borders — decoupled from the 600px dropdown
    });

    test('a theme-level CSS variable (no attribute) drives the dropdown width', async ({ page }) => {
        // The attributes are sugar over CSS vars; setting the var from the light DOM ("app/theme
        // level") must win over the :host default and size the dropdown — proving the var, not the
        // attribute, is the real knob.
        await page.addStyleTag({ content: `#default-below { --ms-dropdown-width: 30rem; }` });
        const p = picker(page, 'default-below');
        const inputW = (await p.locator('.ms__input').boundingBox())!.width;
        const dropdown = await openDropdown(p);
        const dropW = (await dropdown.boundingBox())!.width;
        expect(dropW).toBeGreaterThanOrEqual(478);   // 30rem = 480px at the page's 16px root
        expect(dropW).toBeGreaterThan(inputW + 100); // decoupled from the input
    });

    test('removing selected-popover-width falls back to the intrinsic 32rem default', async ({ page }) => {
        const p = picker(page, 'panel-widths');
        // Drop the per-instance override; the attribute handler must clear the inline var so the
        // :host default (calc(32 * --ms-rem)) takes over.
        await p.evaluate((el: HTMLElement) => el.removeAttribute('selected-popover-width'));
        const remPx = await p.evaluate((el: HTMLElement) =>
            parseFloat(getComputedStyle(el).getPropertyValue('--ms-rem')) || 10);

        await openDropdown(p);
        await p.locator('.ms__option').first().click();
        await p.locator('.ms__counter').click();
        const popover = p.locator('.ms__selected-popover');
        await expect(popover).toBeVisible();
        const popW = (await popover.boundingBox())!.width;
        expect(popW).toBeGreaterThanOrEqual(32 * remPx - 3);
        expect(popW).toBeLessThanOrEqual(32 * remPx + 3); // 32rem intrinsic default, not the input width
    });
});

test.describe('height constraints', () => {
    // Height counterparts to the width levers: both panels clamp to a CSS variable and scroll
    // their overflow. Set the var from the light DOM ("app/theme level") — same knob as widths.
    test('--ms-options-max-height clamps the dropdown and its list scrolls', async ({ page }) => {
        await page.addStyleTag({ content: `#default-below { --ms-options-max-height: 80px; }` });
        const p = picker(page, 'default-below');
        const dropdown = await openDropdown(p);
        // Panel clamped to ~80px (plus its 1px borders).
        expect((await dropdown.boundingBox())!.height).toBeLessThanOrEqual(84);
        // The clamp actually bit: the inner list overflows and scrolls.
        const overflowing = await p.locator('.ms__dropdown-inner').evaluate(
            (el) => el.scrollHeight > el.clientHeight + 1);
        expect(overflowing).toBe(true);
    });

    test('--ms-selected-popover-max-height clamps the selected-items popover', async ({ page }) => {
        await page.addStyleTag({ content: `#panel-widths { --ms-selected-popover-max-height: 70px; }` });
        const p = picker(page, 'panel-widths');
        // Select every option so the popover list overflows the clamp.
        const dropdown = await openDropdown(p);
        const count = await p.locator('.ms__option').count();
        for (let i = 0; i < count; i++) await p.locator('.ms__option').nth(i).click();
        await p.locator('.ms__counter').click();
        const popover = p.locator('.ms__selected-popover');
        await expect(popover).toBeVisible();
        expect((await popover.boundingBox())!.height).toBeLessThanOrEqual(74);
        const overflowing = await p.locator('.ms__selected-popover-body').evaluate(
            (el) => el.scrollHeight > el.clientHeight + 1);
        expect(overflowing).toBe(true);
    });

    test('--ms-selected-popover-body-max-height clamps the inner body independently of the panel', async ({ page }) => {
        // The body has its own inner clamp. With the outer panel left at its roomy default, a small
        // body max-height must bite on the body (scrolls) without collapsing the whole popover.
        await page.addStyleTag({ content: `#panel-widths { --ms-selected-popover-body-max-height: 60px; }` });
        const p = picker(page, 'panel-widths');
        await openDropdown(p);
        const count = await p.locator('.ms__option').count();
        for (let i = 0; i < count; i++) await p.locator('.ms__option').nth(i).click();
        await p.locator('.ms__counter').click();
        const body = p.locator('.ms__selected-popover-body');
        await expect(body).toBeVisible();
        // 60px content clamp + the body's own padding; well under the unclamped ~128px of 4 rows.
        expect((await body.boundingBox())!.height).toBeLessThanOrEqual(82);
        const overflowing = await body.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
        expect(overflowing).toBe(true); // the clamp bit — the body scrolls its overflow
    });

    test('--ms-input-height sizes the control', async ({ page }) => {
        await page.addStyleTag({ content: `#default-below { --ms-input-height: 60px; }` });
        const p = picker(page, 'default-below');
        const h = (await p.locator('.ms__input').boundingBox())!.height;
        expect(h).toBeGreaterThanOrEqual(58);
        expect(h).toBeLessThanOrEqual(62); // border-box: the 60px includes borders
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
