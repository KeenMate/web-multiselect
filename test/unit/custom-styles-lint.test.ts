import { describe, it, expect, afterEach, vi } from 'vitest';
import { extractConsumedMsVars, declaredMsVars, suggestMsVars } from '../../src/css-var-lint';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Dev-mode lint for customStylesCallback: catches the `--ms-badge-text-background`
 * vs `--ms-badge-text-bg` class of typo, where a callback sets a `--ms-*` variable
 * no stylesheet reads and it silently does nothing.
 *
 * The element wiring depends on the bundled stylesheet, which is empty under
 * vitest (`?inline` isn't bundled), so the element-level behaviour there is the
 * guard: it must NOT warn without ground truth. The lint logic itself is covered
 * directly against the pure helpers.
 */

describe('css-var-lint helpers', () => {
    it('extractConsumedMsVars finds every var(--ms-…) reference', () => {
        const css = '.a{background:var(--ms-badge-text-bg);color:var( --ms-badge-text-color )} .b{width:var(--ms-dropdown-width,10rem)}';
        const consumed = extractConsumedMsVars(css);
        expect(consumed).toEqual(new Set(['--ms-badge-text-bg', '--ms-badge-text-color', '--ms-dropdown-width']));
    });

    it('extractConsumedMsVars ignores plain declarations (only var() reads count)', () => {
        expect(extractConsumedMsVars('.a{--ms-badge-text-bg:red}')).toEqual(new Set());
    });

    it('declaredMsVars finds every --ms-* declaration, de-duped', () => {
        const css = '.a{--ms-badge-text-bg:red;--ms-badge-text-color:#000} .b{--ms-badge-text-bg:blue}';
        expect(declaredMsVars(css).sort()).toEqual(['--ms-badge-text-bg', '--ms-badge-text-color']);
    });

    it('declaredMsVars ignores non---ms custom properties', () => {
        expect(declaredMsVars('.a{--my-own:4px;color:red}')).toEqual([]);
    });

    it('suggestMsVars proposes the closest real variable for a typo', () => {
        const known = new Set(['--ms-badge-text-bg', '--ms-badge-text-color', '--ms-dropdown-width']);
        expect(suggestMsVars('--ms-badge-text-background', known)).toContain('--ms-badge-text-bg');
    });

    it('suggestMsVars stays quiet when nothing shares ≥3 tokens', () => {
        const known = new Set(['--ms-dropdown-width', '--ms-selected-popover-width']);
        expect(suggestMsVars('--ms-totally-unrelated-thing', known)).toEqual([]);
    });
});

describe('element customStylesCallback lint (guard under vitest)', () => {
    let el: any;
    afterEach(() => {
        el?.remove();
        vi.restoreAllMocks();
    });

    it('does not warn when the stylesheet has no ground truth (empty inlined CSS)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = document.createElement('web-multiselect');
        document.body.appendChild(el);
        el.customStylesCallback = () => '.x { --ms-obviously-not-real: 1px; }';
        await el.whenSettled();
        expect(warn.mock.calls.map((c) => String(c[0])).filter((w) => w.includes('customStylesCallback sets'))).toHaveLength(0);
    });
});
