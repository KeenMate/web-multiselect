import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Basic dark-mode contrast checks.
 *
 * The component doesn't ship a "dark mode" per se — consumers compose dark themes by
 * overriding `--base-*` and `--ms-*` CSS variables. These specs verify that the
 * library's defaults don't produce illegible state transitions (e.g. white-on-light-gray
 * hover) when a consumer applies a dark palette.
 *
 * Strategy:
 *   1. Render two pickers — one with the bare-minimum dark overrides a consumer would
 *      reach for first (just `--base-main-bg` + `--base-text-color`), and one with the
 *      fuller recommended set (also `--base-hover-bg` + `--base-border-color`).
 *   2. Open the dropdown, hover or focus an option, and verify the rendered option's
 *      text vs background contrast ratio meets WCAG AA for non-text UI (≥ 3:1).
 *
 * Fixture: test/dark-mode.html.
 */

const PAGE = '/test/dark-mode.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

function options(p: Locator): Locator {
    return p.locator('.ms__option');
}

/**
 * Parse a computed-style color string into [r, g, b, a] (0-255 RGB, 0-1 alpha).
 * Handles `rgb(...)` / `rgba(...)` and the modern `color(srgb r g b / a)` form that
 * Chrome returns for `color-mix()` results.
 */
function parseColor(s: string): [number, number, number, number] {
    const rgbMatch = s.match(/rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
        return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]), rgbMatch[4] !== undefined ? Number(rgbMatch[4]) : 1];
    }
    const srgbMatch = s.match(/color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
    if (srgbMatch) {
        return [
            Math.round(Number(srgbMatch[1]) * 255),
            Math.round(Number(srgbMatch[2]) * 255),
            Math.round(Number(srgbMatch[3]) * 255),
            srgbMatch[4] !== undefined ? Number(srgbMatch[4]) : 1
        ];
    }
    throw new Error(`Unparseable color: ${s}`);
}

/** Composite `fg` over `bg` (both 0-255 RGB(A)) using normal alpha blending. */
function compositeOver(fg: [number, number, number, number], bg: [number, number, number, number]): [number, number, number] {
    const a = fg[3];
    return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a))
    ];
}

/** WCAG 2.1 relative luminance of an [r, g, b] color (0-255). */
function relativeLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two [r, g, b] colors. */
function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Read the effective text-over-rendered-background contrast of a hovered/focused option.
 * Composites the option's (possibly semi-transparent) background over the dropdown's
 * background so we measure what the eye actually sees, not just the inline color values.
 */
async function measureOptionContrast(option: Locator, dropdown: Locator): Promise<number> {
    const [optionStyles, dropdownBg] = await Promise.all([
        option.evaluate(el => {
            const cs = getComputedStyle(el);
            return { color: cs.color, bg: cs.backgroundColor };
        }),
        dropdown.evaluate(el => getComputedStyle(el).backgroundColor)
    ]);
    const text = parseColor(optionStyles.color);
    const optionBg = parseColor(optionStyles.bg);
    const baseBg = parseColor(dropdownBg);
    // Composite option bg over dropdown bg (handles semi-transparent option highlights),
    // then composite text over the result (handles semi-transparent text, rare but possible).
    const effectiveBg = compositeOver(optionBg, baseBg);
    const effectiveText = compositeOver(text, [...effectiveBg, 1]);
    return contrastRatio(effectiveText, effectiveBg);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('option hover state stays readable on a dark page', async ({ page }) => {
    const p = picker(page, 'ms-dark');
    await input(p).click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    const firstOption = options(p).first();
    await firstOption.hover();

    const ratio = await measureOptionContrast(firstOption, p.locator('.ms__dropdown'));
    // WCAG AA for non-text UI components is 3:1. Body-text AA is 4.5:1.
    // Hover state should clear the lower bar; if it doesn't, the option is illegible.
    expect(ratio, `hover contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('option hover stays readable when only the page declares color-scheme: dark', async ({ page }) => {
    // Regression test for the `light-dark()` fallbacks. The multiselect has zero --base-* /
    // --ms-* overrides — every color comes from the library defaults. The fixture's <body>
    // declares `color-scheme: dark`, which inherits into the multiselect's shadow DOM and
    // makes our `light-dark(<light>, <dark>)` fallbacks resolve to the dark branch.
    //
    // This is the dhl-rdm-organiogram pattern: an app with a dark visual theme that signals
    // its intent via `color-scheme: dark` on body. The library should "just work" on such
    // an app without the consumer enumerating ~15 CSS variable overrides.
    const p = picker(page, 'ms-dark-auto');
    await input(p).click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    const firstOption = options(p).first();
    await firstOption.hover();

    const ratio = await measureOptionContrast(firstOption, p.locator('.ms__dropdown'));
    expect(ratio, `hover contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('option hover state stays readable with only minimal dark-theme overrides', async ({ page }) => {
    // Regression test for the variable-fallback fix: --ms-primary-bg used to fall back to
    // a bare `var(--base-main-bg)`, which made the hover color collapse onto the panel
    // background in dark themes. Now it mixes 8% of the current text color into the main
    // background, so the highlight stays visible even when the consumer only overrides
    // the obvious text + background variables.
    const p = picker(page, 'ms-dark-minimal');
    await input(p).click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    const firstOption = options(p).first();
    await firstOption.hover();

    const ratio = await measureOptionContrast(firstOption, p.locator('.ms__dropdown'));
    expect(ratio, `hover contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('keyboard-focused option stays readable on a dark page', async ({ page }) => {
    const p = picker(page, 'ms-dark');
    await input(p).click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    // ArrowDown selects the first option as the focused/highlighted one.
    await input(p).press('ArrowDown');

    const focused = p.locator('.ms__option--focused');
    await expect(focused).toHaveCount(1);

    const ratio = await measureOptionContrast(focused, p.locator('.ms__dropdown'));
    expect(ratio, `keyboard-focused contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('selected option stays readable on a dark page', async ({ page }) => {
    const p = picker(page, 'ms-dark');
    await input(p).click();
    await options(p).first().click();
    // Reopen if the click closed the dropdown (depends on close-on-select default).
    if (!(await p.locator('.ms__dropdown').isVisible())) {
        await input(p).click();
    }

    const selected = p.locator('.ms__option--selected').first();
    await expect(selected).toHaveCount(1);

    const ratio = await measureOptionContrast(selected, p.locator('.ms__dropdown'));
    expect(ratio, `selected contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});
