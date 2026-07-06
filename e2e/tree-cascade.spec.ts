import { test, expect, Page, Locator } from '@playwright/test';

/**
 * E2E for cascade checkbox mode (checkbox-mode="cascade") + the cascade value
 * policy. Tree:
 *   Fruit (1)
 *   ├─ Apple (1.1) ─ Gala (1.1.1), Fuji (1.1.2)
 *   └─ Pear (1.2)
 *   Vegetables (2) ─ Carrot (2.1), Kale (2.2)
 * Verified in a real browser because the tristate + subtree cascade ride real
 * DOM rendering and the emitted value depends on the policy projection.
 */

const PAGE = '/test/tree.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}
async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}
const val = (p: Locator) => p.evaluate((el: any) => el.getValue());
const optAt = (p: Locator, path: string) => p.locator(`.ms__option[data-path="${path}"]`);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('tree-cascade (rolled-up default)', () => {
    test('checking a branch cascades to its whole subtree', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple
        // Both leaves are now checked...
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).toBeChecked();
        await expect(optAt(p, '1.1.2').locator('.ms__checkbox')).toBeChecked();
        // ...Apple reads checked...
        await expect(optAt(p, '1.1')).toHaveClass(/ms__option--selected/);
        // ...and the grandparent Fruit is indeterminate (Pear still unchecked).
        await expect(optAt(p, '1')).toHaveClass(/ms__option--indeterminate/);
        await expect(optAt(p, '1').locator('.ms__checkbox')).toHaveClass(/ms__checkbox--indeterminate/);
    });

    test('rolled-up emits the complete branch as a single value', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple fully selected
        // Rolled-up: one value ("apple"), not the two leaves.
        expect(await val(p)).toEqual(['apple']);
    });

    test('a single leaf leaves ancestors indeterminate and emits just the leaf', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1.1').click(); // Gala only
        await expect(optAt(p, '1.1')).toHaveClass(/ms__option--indeterminate/);
        await expect(optAt(p, '1')).toHaveClass(/ms__option--indeterminate/);
        expect(await val(p)).toEqual(['gala']);
    });

    test('re-clicking a checked branch clears its subtree', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1').click();
        expect(await val(p)).toEqual(['apple']);
        await optAt(p, '1.1').click();
        expect(await val(p)).toEqual([]);
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).not.toBeChecked();
    });

    test('selecting every leaf rolls the whole tree up to its roots', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1').click(); // Fruit subtree
        await optAt(p, '2').click(); // Vegetables subtree
        expect((await val(p)).sort()).toEqual(['fruit', 'veg']);
    });
});

test.describe('cascade-select-policy="leaves"', () => {
    test('checking a branch emits its leaves, not the branch', async ({ page }) => {
        const p = picker(page, 'tree-cascade-leaves');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple
        const v = await val(p);
        expect(v.sort()).toEqual(['fuji', 'gala']);
        expect(v).not.toContain('apple');
    });
});

test.describe('cascade in a leaves-only tree', () => {
    test('non-selectable branches roll up to the leaves', async ({ page }) => {
        const p = picker(page, 'tree-cascade-leavesonly');
        await openDropdown(p);

        // Branches have no checkbox (non-selectable); check the two Apple leaves.
        await optAt(p, '1.1.1').click();
        await optAt(p, '1.1.2').click();
        // Apple (1.1) is non-selectable, so rolled-up cannot collapse to it —
        // the leaves surface individually.
        expect((await val(p)).sort()).toEqual(['fuji', 'gala']);
        await expect(optAt(p, '1.1').locator('.ms__checkbox')).toHaveCount(0);
    });
});
