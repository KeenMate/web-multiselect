/**
 * Component-local converters.
 *
 * A core invariant (SPEC §4/§5): "a new input type is a new converter created
 * anywhere — never a core edit." `toInitialValues` is exactly that — its
 * JSON-OR-bare-CSV attribute grammar is multiselect-specific, so it lives next to
 * the component (the `Converter<V>` interface is the intended extension point).
 */
import type { Converter } from '@keenmate/web-components-core';

/**
 * `initial-values` — accepted as JSON (`["a","b"]` / `[1,2]`) or a bare CSV
 * fallback (`a,b,c`). Absent/blank → empty array. Also travels the property
 * path (assign an array directly), validated as an array of strings/numbers.
 */
export function toInitialValues(): Converter<Array<string | number>> {
  return {
    fromAttribute(raw) {
      if (raw === null || raw.trim() === '') return [];
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed as Array<string | number>;
        } catch {
          /* fall through to CSV */
        }
      }
      return trimmed.split(',').map((s) => s.trim());
    },
    validate(value): value is Array<string | number> {
      return Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number');
    },
    toAttribute(value) {
      return Array.isArray(value) ? JSON.stringify(value) : null;
    },
  };
}
