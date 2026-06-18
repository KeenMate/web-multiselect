import { test, expect, Page, Locator } from '@playwright/test';

function picker(page: Page, id: string): Locator {
  return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
  await p.locator('.ms__input').click();
  await expect(p.locator('.ms__dropdown')).toBeVisible();
}

async function pickReplacement(p: Locator) {
  // Pick Apple, then Banana — dropdown auto-closes in single mode.
  await openDropdown(p);
  await p.locator('.ms__option[data-value="apple"]').click();
  await openDropdown(p);
  await p.locator('.ms__option[data-value="banana"]').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Svelte 5 on:change directive — single-select replacement fires change', async ({ page }) => {
  await pickReplacement(picker(page, 'picker-a'));

  const ev = await page.evaluate(() => (window as any).__a);
  expect(ev.select).toHaveLength(2);
  expect(ev.select[1].selectedValues).toEqual(['banana']);
  expect(ev.deselect).toHaveLength(0);
  expect(ev.change).toHaveLength(2);
  expect(ev.change[1].selectedValues).toEqual(['banana']);
});

// Pins the bubbles+composed fix on the dispatchEvent sites. Svelte 5's
// `onchange={handler}` callback prop routes through document-level event
// delegation ($.delegate(['change'])), so the CustomEvent must bubble to be
// observed. If a future change removes bubbles/composed from web-component.ts,
// this assertion regresses to changeCount === 0.
test('Svelte 5 onchange callback prop — single-select replacement fires change (requires bubbles+composed)', async ({ page }) => {
  await pickReplacement(picker(page, 'picker-b'));

  const ev = await page.evaluate(() => (window as any).__b);
  expect(ev.select).toHaveLength(2);
  expect(ev.select[1].selectedValues).toEqual(['banana']);
  expect(ev.deselect).toHaveLength(0);
  expect(ev.change).toHaveLength(2);
  expect(ev.change[1].selectedValues).toEqual(['banana']);
});
