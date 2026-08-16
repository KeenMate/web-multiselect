/**
 * Resolves the `mobile-presentation` setting against the live device/viewport
 * environment (core §12.9) into the picker's concrete presentation mode.
 *
 * Kept as a pure module (no DOM, no element) so the phone/tablet/desktop mapping
 * is unit-testable in isolation — `MultiSelectElement.environmentChanged()` just
 * feeds it the current `EnvironmentSnapshot` and relays the result to the picker.
 */
import type { EnvironmentSnapshot } from '@keenmate/web-components-core';

/** The author-facing `mobile-presentation` attribute values. */
export type MobilePresentation = 'auto' | 'floating' | 'fullscreen';

/** The picker's concrete presentation mode (what `setPresentation()` accepts). */
export type ResolvedPresentation = 'floating' | 'fullscreen';

/**
 * The phone/tablet boundary, in **CSS px** (not inches), applied to the *shorter*
 * viewport side. This is the Material `sw600dp` line — "smallest width ≥ 600dp ⇒
 * tablet" — and it's the orientation-robust test we want: a device's shorter side
 * stays constant across rotation, so a phone reads as a phone in landscape too.
 *
 * Why 600, against the 2026 CSS-width map (physical ÷ DPR, what media queries see —
 * inches lie): phones lay out at ~320–360 (compact), ~390–393 (mainstream), and up
 * to ~430 CSS px, with ~480 as the large-phone/Pro-Max stress point. 7" tablets
 * start ~600, iPad mini ~768, and folds *open* jump to ~700+. So 480→600 is an
 * empty band with no phones in it — `< 600` catches every phone (comfortable
 * headroom over ~480) while handing tablets and opened foldables to the floating
 * panel. Single knob: bump this if the device landscape shifts.
 */
export const TABLET_MIN_SHORT_SIDE = 600;

/** Map `mobile-presentation` + the current environment to a concrete presentation. */
export function resolveMobilePresentation(
  mode: MobilePresentation,
  env: EnvironmentSnapshot,
): ResolvedPresentation {
  if (mode === 'floating') return 'floating';
  if (mode === 'fullscreen') return 'fullscreen'; // forced — for previews/testing on any device
  // auto: a phone is a touch-primary device whose SHORTER viewport side is below the
  // tablet boundary (orientation-robust). Everything else keeps the floating panel.
  const shortSide = Math.min(env.viewportWidth, env.viewportHeight);
  return env.isTouchPrimary && shortSide < TABLET_MIN_SHORT_SIDE ? 'fullscreen' : 'floating';
}
