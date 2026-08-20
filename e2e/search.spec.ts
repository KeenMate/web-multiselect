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

    // Regression: a below-the-fold match must be scrolled to the CENTRE of the sheet's
    // list, not bottom-aligned (block:'nearest'). On a phone the bottom edge sits behind
    // the soft keyboard, so a bottom-aligned match "scrolls" but lands hidden. We can't
    // raise a real keyboard here, but we can assert the match lands centred (~0.5 down
    // the scroller) rather than jammed at the bottom (~0.9+), which is the fix.
    test('a deep match is centred in the fullscreen list, not bottom-aligned', async ({ page }) => {
        const p = picker(page, 'navigate-fs-big');
        await openFullscreen(p);

        await fsSearch(p).fill('Item 25'); // unique match well below the first screenful
        await expect(p.locator('.ms__option--focused')).toContainText('Item 25');

        const frac = await p.evaluate(() => {
            const root = (document.querySelector('#navigate-fs-big') as any).shadowRoot;
            const scroller = root.querySelector('.ms__options') as HTMLElement;
            const focused = root.querySelector('.ms__option--focused') as HTMLElement;
            const s = scroller.getBoundingClientRect();
            const f = focused.getBoundingClientRect();
            // Vertical position of the focused row's centre within the scroller (0=top, 1=bottom).
            return ((f.top + f.height / 2) - s.top) / s.height;
        });
        expect(frac).toBeGreaterThan(0.25);
        expect(frac).toBeLessThan(0.75); // centred, NOT bottom-aligned (would be ~0.9+)
    });

    // The phone Back gesture/button should close the sheet, not navigate the page away.
    // Opening the fullscreen sheet pushes a history entry; a back navigation pops it and
    // closes the overlay instead of leaving the page.
    test('Back gesture closes the fullscreen sheet instead of navigating away', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        const url = page.url();
        const lenBefore = await page.evaluate(() => history.length);

        await openFullscreen(p);
        // A history entry was pushed for the open overlay.
        expect(await page.evaluate(() => history.length)).toBe(lenBefore + 1);

        // Same-document back navigation (what the Back gesture triggers).
        await page.evaluate(() => history.back());

        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
        expect(page.url()).toBe(url); // still on the page, no navigation away
    });

    // A programmatic close (✕) consumes the pushed entry, so it doesn't leave a history
    // trap. The overlay entry carries a marker in history.state; while open it's the
    // current entry, and after ✕ the current entry is no longer the overlay's (we moved
    // back off it via history.back()).
    const onOverlayEntry = (page: Page) =>
        page.evaluate(() => !!(history.state && (history.state as any).msOverlay));

    test('closing via the ✕ button consumes the pushed history entry', async ({ page }) => {
        const p = picker(page, 'navigate-fs');

        await openFullscreen(p);
        expect(await onOverlayEntry(page)).toBe(true); // sitting on the pushed entry

        await p.locator('.ms__fullscreen-close').click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();

        await expect.poll(() => onOverlayEntry(page)).toBe(false); // moved back off it
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

test.describe('fullscreen search — inline clear (✕)', () => {
    // The fullscreen sheet opens with the keyboard closed; touch has no Escape to
    // reset a search, so the header search carries an inline ✕ that clears the term.
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');
    const clear = (p: Locator) => p.locator('.ms__fullscreen-search-clear');

    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('clear button is hidden until a term is entered', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);
        await expect(clear(p)).toBeHidden();

        await fsSearch(p).fill('ch');
        await expect(clear(p)).toBeVisible();
    });

    test('clicking clear empties the field and resets the results', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        // Filter mode narrows the list; "ch" leaves only Cherry.
        await fsSearch(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(clear(p)).toBeVisible();

        await clear(p).click();

        await expect(fsSearch(p)).toHaveValue('');
        await expect(visibleOptions(p)).toHaveCount(5); // full list restored
        await expect(clear(p)).toBeHidden();             // hides itself again
    });

    test('clear keeps focus on the search field so typing can continue', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        await fsSearch(p).fill('ch');
        await clear(p).click();

        const focused = await p.evaluate((host: any) =>
            host.shadowRoot?.activeElement?.className ?? null);
        expect(focused ?? '').toContain('ms__fullscreen-search');
    });
});

test.describe('fullscreen search — keyboard dismissal', () => {
    // The soft keyboard is tied 1:1 to focus on the header search input; there's no
    // real keyboard in headless chromium, so we assert its proxy — after each
    // "done typing" gesture the search input must no longer be the shadow root's
    // activeElement (a blur is what tucks the keyboard away on a device).
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');

    async function openFullscreenFocused(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
        await fsSearch(p).fill('e'); // matches several fruits; also focuses the field
    }

    const searchIsFocused = (p: Locator) =>
        p.evaluate((host: any) =>
            (host.shadowRoot?.activeElement?.className ?? '').includes('ms__fullscreen-search'));

    test('tapping an option blurs the search (dismisses the keyboard)', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreenFocused(p);
        expect(await searchIsFocused(p)).toBe(true);

        await visibleOptions(p).first().click();
        await expect(p.locator('.ms__option--selected')).toHaveCount(1); // select still happens
        await expect.poll(() => searchIsFocused(p)).toBe(false);
    });

    test('the Enter/Search key blurs the search', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreenFocused(p);
        expect(await searchIsFocused(p)).toBe(true);

        await fsSearch(p).press('Enter');
        await expect.poll(() => searchIsFocused(p)).toBe(false);
    });

    test('scrolling the options list blurs the search', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreenFocused(p);
        expect(await searchIsFocused(p)).toBe(true);

        // A genuine drag on the list fires touchmove; dispatch one on the scroller.
        await p.evaluate((host: any) => {
            const list = host.shadowRoot.querySelector('.ms__options');
            list.dispatchEvent(new Event('touchmove', { bubbles: true }));
        });
        await expect.poll(() => searchIsFocused(p)).toBe(false);
    });
});

test.describe('fullscreen close — corner hit target', () => {
    // The close ✕ tap target is enlarged and anchored into the sheet's top-trailing
    // corner, so the previously-dead padding around a centered button is now clickable
    // (the corner is the easiest place to tap). We click a point a few px from the
    // header's physical top-right corner — outside where the old centered 43.2px button
    // sat — and expect the sheet to close.
    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('clicking the top-right corner closes the sheet', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        const header = await p.locator('.ms__fullscreen-header').boundingBox();
        if (!header) throw new Error('no header box');
        // A few px inside the header's top-right corner — the old dead zone.
        await page.mouse.click(header.x + header.width - 6, header.y + 6);

        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();
    });

    test('the close hit target covers the top-trailing corner without stealing other taps', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        // Hit-test the top-right and right-middle of the header — the former dead padding —
        // and assert they resolve to the close button (its ::after hit-area extension).
        // The extension is bounded below/leading so it must NOT cover the search field or
        // the first option row.
        const hits = await p.evaluate((host: any) => {
            const root = host.shadowRoot;
            const h = root.querySelector('.ms__fullscreen-header').getBoundingClientRect();
            const close = root.querySelector('.ms__fullscreen-close');
            const isClose = (x: number, y: number) => {
                const el = root.elementFromPoint(x, y);
                return el === close || (el && close.contains(el));
            };
            const cls = (x: number, y: number) =>
                (root.elementFromPoint(x, y) as HTMLElement)?.className ?? '';
            return {
                topRight: isClose(h.right - 3, h.top + 3),
                rightMid: isClose(h.right - 3, (h.top + h.bottom) / 2),
                input: cls(h.left + 40, (h.top + h.bottom) / 2).includes('ms__fullscreen-search'),
                firstOption: cls(h.left + 40, h.bottom + 20).includes('ms__option'),
            };
        });
        expect(hits.topRight).toBe(true);
        expect(hits.rightMid).toBe(true);
        expect(hits.input).toBe(true);       // search field not covered
        expect(hits.firstOption).toBe(true); // first option row not covered
    });

    test('close chip accepts a themed border via CSS variables', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        // Turn the ✕ into a bordered "button" through the public vars.
        await p.evaluate((host: HTMLElement) => {
            host.style.setProperty('--ms-fullscreen-close-border', '2px solid rgb(10, 20, 30)');
            host.style.setProperty('--ms-fullscreen-close-border-radius', '8px');
        });
        await openFullscreen(p);

        const style = await p.evaluate((host: any) => {
            const cs = getComputedStyle(host.shadowRoot.querySelector('.ms__fullscreen-close'));
            return { width: cs.borderTopWidth, color: cs.borderTopColor, radius: cs.borderTopLeftRadius, box: cs.boxSizing };
        });
        expect(style.width).toBe('2px');
        expect(style.color).toBe('rgb(10, 20, 30)');
        expect(style.radius).toBe('8px');
        expect(style.box).toBe('border-box'); // the border doesn't grow the chip
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
