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

export interface ParseOptionsOptions {
    /** Field/cell delimiter for `csv` and `plain` (default `,`). Escapes `\t \n \r \\` are honoured. */
    splitter?: string;
    /** Row/record delimiter for `csv` and `plain` (default newline). Escapes honoured. */
    rowSplitter?: string;
}

/** Default field and row delimiters (used by `csv` and `plain`; ignored by `json`). */
export const DEFAULT_SPLITTER = ',';
export const DEFAULT_ROW_SPLITTER = '\n';

/**
 * Parse a `data-options` payload per `format`:
 *  - `json`  — a JSON array of option objects or `[value, label]` tuples.
 *              (`splitter`/`rowSplitter` do not apply.)
 *  - `csv`   — rows split on `rowSplitter`, cells on `splitter`; the first row is a
 *              header and each later row becomes an object keyed by the header cells
 *              (map columns via `*-member`). RFC-4180-ish quoting on the cell splitter.
 *  - `plain` — bare values split on `splitter` and `rowSplitter` -> `[value, label]`
 *              tuples (value === label), so it renders with no member config.
 */
export function parseOptionsData(
    raw: string | null | undefined,
    format: OptionsFormat,
    opts: ParseOptionsOptions = {},
): ParsedOptions {
    if (raw == null || raw.trim() === '') return { options: [] };
    const splitter = interpretEscapes(opts.splitter ?? DEFAULT_SPLITTER) || DEFAULT_SPLITTER;
    const rowSplitter = interpretEscapes(opts.rowSplitter ?? DEFAULT_ROW_SPLITTER) || DEFAULT_ROW_SPLITTER;
    switch (format) {
        case 'csv':
            return parseCsv(raw, splitter, rowSplitter);
        case 'plain':
            return parsePlain(raw, splitter, rowSplitter);
        case 'json':
        default:
            return parseJson(raw);
    }
}

/** Turn attribute-friendly escape sequences (`\t \n \r \\`) into their characters. */
function interpretEscapes(s: string): string {
    return s.replace(/\\[ntr\\]/g, (m) =>
        m === '\\n' ? '\n' : m === '\\t' ? '\t' : m === '\\r' ? '\r' : '\\',
    );
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

function parsePlain(raw: string, cellDelim: string, rowDelim: string): ParsedOptions {
    const tokens = raw
        .split(rowDelim)
        .flatMap((row) => row.split(cellDelim))
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    return { options: tokens.map((t) => [t, t]) };
}

function parseCsv(raw: string, cellDelim: string, rowDelim: string): ParsedOptions {
    const rows = tokenizeCsv(raw, cellDelim, rowDelim).filter((r) => !(r.length === 1 && r[0].trim() === ''));
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
 * Minimal RFC-4180-ish CSV tokenizer parameterized by the cell and row
 * delimiters (both may be multi-character). A double-quoted field may contain
 * either delimiter, `""` is an escaped quote, and a bare `\r` is tolerated so
 * CRLF works whatever `rowDelim` is.
 */
function tokenizeCsv(input: string, cellDelim: string, rowDelim: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < input.length; ) {
        const ch = input[i];
        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') {
                    cell += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i += 1;
                }
            } else {
                cell += ch;
                i += 1;
            }
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
            i += 1;
        } else if (cellDelim && input.startsWith(cellDelim, i)) {
            row.push(cell);
            cell = '';
            i += cellDelim.length;
        } else if (rowDelim && input.startsWith(rowDelim, i)) {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            i += rowDelim.length;
        } else if (ch === '\r') {
            i += 1; // tolerate CRLF regardless of rowDelim
        } else {
            cell += ch;
            i += 1;
        }
    }
    row.push(cell);
    rows.push(row);
    return rows;
}
