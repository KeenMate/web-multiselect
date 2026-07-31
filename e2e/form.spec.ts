import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/form.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function selectAll(p: Locator, ...values: string[]): Promise<void> {
    await p.locator('.ms__input').click();
    for (const v of values) {
        await p.locator(`.ms__option[data-value="${v}"]`).click();
    }
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('default JSON format emits a single hidden input with JSON array value', async ({ page }) => {
    const p = picker(page, 'json-form');
    await selectAll(p, 'apple', 'banana');

    // Hidden input is rendered in light DOM (host), not shadow DOM.
    const hidden = page.locator('input[type="hidden"][name="fruits-json"]');
    await expect(hidden).toHaveCount(1);
    expect(await hidden.inputValue()).toBe(JSON.stringify(['apple', 'banana']));
});

test('value-format="csv" emits comma-separated values', async ({ page }) => {
    const p = picker(page, 'csv-form');
    await selectAll(p, 'apple', 'banana');

    const hidden = page.locator('input[type="hidden"][name="fruits-csv"]');
    expect(await hidden.inputValue()).toBe('apple,banana');
});

test('value-format="array" emits multiple hidden inputs with name[]', async ({ page }) => {
    const p = picker(page, 'arr-form');
    await selectAll(p, 'apple', 'banana');

    const hidden = page.locator('input[type="hidden"][name="fruits-arr[]"]');
    await expect(hidden).toHaveCount(2);
    const values = await hidden.evaluateAll((inputs: HTMLInputElement[]) => inputs.map(i => i.value));
    expect(values).toEqual(['apple', 'banana']);
});

test('getValueFormatCallback overrides serialization', async ({ page }) => {
    const p = picker(page, 'custom-fmt');
    await selectAll(p, 'apple', 'banana');

    const hidden = page.locator('input[type="hidden"][name="custom-fmt"]');
    expect(await hidden.inputValue()).toBe('apple|banana');
});

test('form.reset() clears the multiselect via formResetCallback', async ({ page }) => {
    const p = picker(page, 'form-in-form');
    await selectAll(p, 'apple');

    const hidden = page.locator('input[type="hidden"][name="form-field"]');
    expect(await hidden.inputValue()).toBe(JSON.stringify(['apple']));

    // Trigger reset programmatically — the visible reset button can be covered
    // by the open dropdown in this fixture, but the form lifecycle is the same.
    await page.evaluate(() => (document.getElementById('real-form') as HTMLFormElement).reset());

    // formResetCallback should have cleared the picker; the hidden input
    // reflects the empty array now.
    expect(await hidden.inputValue()).toBe(JSON.stringify([]));
    expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
});
