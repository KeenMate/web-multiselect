/**
 * `data-options` payload parsers. The `data-options-format` attribute selects
 * one; each turns the raw attribute string into an options array the picker
 * understands. Pure + total (never throws) so they unit-test in isolation and a
 * malformed payload degrades to `[]` with a describable error rather than
 * breaking reinit.
 */

export const OPTIONS_FORMATS = ['json', 'csv', 'plain'] as const;
export type OptionsFormat = (typeof OPTIONS_FORMATS)[number];

export interface ParsedOptions {
    /** Parsed options: objects for `json`/`csv`, `[value, label]` tuples for `plain`. */
    options: unknown[];
    /** A human-readable reason when the payload was malformed (`options` is then `[]`). */
    error?: string;
}

/**
 * Parse a `data-options` payload per `format`:
 *  - `json`  — a JSON array of option objects or `[value, label]` tuples.
 *  - `csv`   — first row is a header; each later row becomes an object keyed by
 *              the header cells (map columns via `*-member`). RFC-4180-ish quoting.
 *  - `plain` — comma/newline-separated bare values -> `[value, label]` tuples
 *              (value === label), so it renders with no member config.
 */
export function parseOptionsData(raw: string | null | undefined, format: OptionsFormat): ParsedOptions {
    if (raw == null || raw.trim() === '') return { options: [] };
    switch (format) {
        case 'csv':
            return parseCsv(raw);
        case 'plain':
            return parsePlain(raw);
        case 'json':
        default:
            return parseJson(raw);
    }
}

function parseJson(raw: string): ParsedOptions {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        return { options: [], error: `data-options is not valid JSON: ${(e as Error).message}` };
    }
    if (!Array.isArray(parsed)) {
        return { options: [], error: 'data-options JSON must be an array' };
    }
    return { options: parsed };
}

function parsePlain(raw: string): ParsedOptions {
    const tokens = raw
        .split(/[\r\n,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    return { options: tokens.map((t) => [t, t]) };
}

function parseCsv(raw: string): ParsedOptions {
    const rows = tokenizeCsv(raw).filter((r) => !(r.length === 1 && r[0].trim() === ''));
    if (rows.length < 2) {
        return { options: [], error: 'data-options CSV needs a header row and at least one data row' };
    }
    const headers = rows[0].map((h) => h.trim());
    const options = rows.slice(1).map((cells) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
            obj[h] = (cells[i] ?? '').trim();
        });
        return obj;
    });
    return { options };
}

/**
 * Minimal RFC-4180-ish CSV tokenizer: comma-separated cells, newline-separated
 * rows; a double-quoted field may contain commas and newlines, and `""` is an
 * escaped quote.
 */
function tokenizeCsv(input: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += ch;
            }
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(cell);
            cell = '';
        } else if (ch === '\r') {
            // ignore — handled by the \n branch
        } else if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += ch;
        }
    }
    row.push(cell);
    rows.push(row);
    return rows;
}
