/**
 * Dev-only helpers for linting `customStylesCallback` output against the
 * component's real `--ms-*` theming surface. A callback that *sets* a variable
 * the stylesheet never *reads* fails silently (the property just resolves to
 * nothing), so these let the element warn about a misspelled/renamed variable —
 * e.g. `--ms-badge-text-background` where the real one is `--ms-badge-text-bg`.
 *
 * Pure string functions, no DOM — the element wires them up under
 * `import.meta.env.DEV` (see web-component.ts `#checkCustomStyleVars`).
 */

/** Every `--ms-*` custom property a CSS string *reads* via `var(--ms-…)`. */
export function extractConsumedMsVars(css: string): Set<string> {
  const found = new Set<string>();
  const re = /var\(\s*(--ms-[a-z0-9-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) found.add(m[1]);
  return found;
}

/** Every `--ms-*` custom property a CSS string *declares* (`--ms-foo: …`). */
export function declaredMsVars(css: string): string[] {
  const found = new Set<string>();
  const re = /(--ms-[a-z0-9-]+)\s*:/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) found.add(m[1]);
  return [...found];
}

/**
 * Known variables that share the most `-`-separated tokens with `name` — the
 * likely intended target of a typo. Requires ≥3 shared tokens (`ms` + two path
 * segments) to keep the suggestion list quiet; returns at most 3, best first.
 */
export function suggestMsVars(name: string, known: Iterable<string>): string[] {
  const tokens = new Set(name.split('-').filter(Boolean));
  return [...known]
    .map((k) => ({ k, score: k.split('-').filter((t) => tokens.has(t)).length }))
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.k);
}
