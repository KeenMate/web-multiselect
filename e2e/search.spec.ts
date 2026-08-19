import { test, expect, Page, Locator } from './fixtures';

/**
 * Section 3 — search behavior.
 *
 * Fixture: test/search.html.
 */

const PAGE = '/test/search.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

async function openDropdown(p: Locator): Promise<void> {
    await input(p).click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

function visibleOptions(p: Locator): Locator {
    return p.locator('.ms__option:visible');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('filter mode (default)', () => {
    test('non-matching options are hidden as user types', async ({ page }) => {
        const p = picker(page, 'filter');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText(/Cherry/i);
    });

    test('clearing search restores all options', async ({ page }) => {
        const p = picker(page, 'filter');
        await openDropdown(p);

        await input(p).fill('ch');
        await input(p).fill('');
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('navigate mode', () => {
    test('all options remain visible while searching', async ({ page }) => {
        const p = picker(page, 'navigate');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(5);
    });

    test('matched options receive --matched class', async ({ page }) => {
        const p = picker(page, 'navigate');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(p.locator('.ms__option--matched')).toHaveCount(1);
    });
});

test.describe('navigate mode — fullscreen match navigator', () => {
    // The fullscreen overlay covers the main input; its own header search + the
    // match navigator (count + prev/next) take over. Touch has no Ctrl+Arrow, so
    // these buttons are the on-screen way to step through matches.
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');
    const nav = (p: Locator) => p.locator('.ms__fullscreen-nav');
    const navCount = (p: Locator) => p.locator('.ms__fullscreen-nav-count');

    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('navigator is hidden until a search term is entered', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);
        await expect(nav(p)).toBeHidden();
    });

    test('shows "1 of N" once a term matches, all options stay visible', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        // "e" matches Apple, Cherry, Date, Elderberry (4 of 5).
        await fsSearch(p).fill('e');
        await expect(nav(p)).toBeVisible();
        await expect(navCount(p)).toHaveText('1 of 4');
        await expect(visibleOptions(p)).toHaveCount(5);
    });

    test('next/prev buttons step focus through matches and update the count', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        await fsSearch(p).fill('e');
        await expect(navCount(p)).toHaveText('1 of 4');

        await p.locator('.ms__fullscreen-nav-btn--next').click();
        await expect(navCount(p)).toHaveText('2 of 4');

        await p.locator('.ms__fullscreen-nav-btn--prev').click();
        await expect(navCount(p)).toHaveText('1 of 4');
    });

    test('no matches disables the step buttons', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        await fsSearch(p).fill('zzzz');
        await expect(nav(p)).toBeVisible();
        await expect(p.locator('.ms__fullscreen-nav-btn--next')).toBeDisabled();
        await expect(p.locator('.ms__fullscreen-nav-btn--prev')).toBeDisabled();
    });

    // Regression: selecting an option in the fullscreen sheet used to call
    // this.input.focus() (to keep desktop arrow-key nav working). That input is the
    // control field hidden behind the overlay — focusing it popped the soft keyboard
    // on every tap and made the keyboard-inset observer shrink the sheet ("blink").
    // In fullscreen the select must NOT move focus to the underlying input.
    test('selecting an option does not focus the underlying control input', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        // Keyboard-off default: no field is focused right after open.
        const focusedAfterOpen = await p.evaluate((host: any) =>
            host.shadowRoot?.activeElement?.className ?? null);
        expect(focusedAfterOpen ?? '').not.toContain('ms__input');

        await p.locator('.ms__option').first().click();
        await expect(p.locator('.ms__option--selected')).toHaveCount(1); // the select happened

        // The tap must not have focused the hidden control input.
        const focusedAfterSelect = await p.evaluate((host: any) =>
            host.shadowRoot?.activeElement?.className ?? null);
        expect(focusedAfterSelect ?? '').not.toContain('ms__input');
    });
});

test.describe('search-input-mode', () => {
    test('readonly prevents typing', async ({ page }) => {
        const p = picker(page, 'readonly');
        await openDropdown(p);

        await expect(input(p)).toHaveAttribute('readonly', '');
    });

    test('hidden removes the input from layout', async ({ page }) => {
        const p = picker(page, 'hidden-input');
        await expect(input(p)).toBeHidden();
    });
});

test.describe('enable-search="false"', () => {
    test('typing into the input does not filter options', async ({ page }) => {
        const p = picker(page, 'no-search');
        await openDropdown(p);

        // Try to type — the search subsystem is disabled, so filtering is a no-op.
        await input(p).fill('apple');
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('empty-message', () => {
    test('custom empty message shown when no results', async ({ page }) => {
        const p = picker(page, 'empty-msg');
        await openDropdown(p);

        await input(p).fill('zzzzz');
        await expect(p.locator('.ms__empty')).toContainText('nothing here');
    });
});

test.describe('min-search-length (with async searchCallback)', () => {
    test('searchCallback is not invoked below threshold', async ({ page }) => {
        const p = picker(page, 'min-len');
        await openDropdown(p);

        await input(p).fill('c'); // 1 char — under threshold
        // Give any async work time to settle.
        await page.waitForTimeout(150);
        const callsAfterOne = await page.evaluate(() => (window as any).__minLenCalls.length);
        expect(callsAfterOne).toBe(0);

        await input(p).fill('ch'); // 2 chars — threshold met
        await expect(visibleOptions(p)).toHaveCount(1);
        const callsAfterTwo = await page.evaluate(() => (window as any).__minLenCalls.length);
        expect(callsAfterTwo).toBeGreaterThan(0);
    });
});

test.describe('async searchCallback', () => {
    test('loading message appears during pending request', async ({ page }) => {
        const p = picker(page, 'async-search');
        await openDropdown(p);

        await input(p).fill('ch');
        // The loading state is brief (50ms); race the message into view.
        const loading = p.locator('.ms__loading');
        await expect(loading.or(visibleOptions(p).first())).toBeVisible();
    });

    test('results populate from async callback', async ({ page }) => {
        const p = picker(page, 'async-search');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText(/Cherry/i);
    });
});

test.describe('keep-options-on-search', () => {
    test('initial options remain visible below min-search-length threshold', async ({ page }) => {
        const p = picker(page, 'keep-options');
        await openDropdown(p);

        // Before any typing, all options should be visible (no callback fired yet
        // because no search term).
        await input(p).fill('a'); // 1 char — under min-search-length 2
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('should-keep-search-on-close', () => {
    test('clears search and options on close when false', async ({ page }) => {
        const p = picker(page, 'clear-on-close');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);

        await page.mouse.click(0, 0); // outside-click
        await expect(p.locator('.ms__dropdown')).not.toBeVisible();

        await openDropdown(p);
        await expect(input(p)).toHaveValue('');
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('beforeSearchCallback', () => {
    test('strips spaces from search term', async ({ page }) => {
        const p = picker(page, 'before-search');
        await openDropdown(p);

        // "c h e" → "che" (matches cherry) after strip.
        await input(p).fill('c h e');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText(/Cherry/i);
    });
});
