import { describe, it, expect } from 'vitest';
import { parseOptionsData } from '../../src/option-formats';

/**
 * Pure unit tests for the `data-options` payload parsers (json | csv | plain).
 * Element-level wiring/reactivity is covered in data-options.test.ts.
 */

describe('parseOptionsData — json', () => {
    it('parses a JSON array of option objects', () => {
        const r = parseOptionsData('[{"value":"js","label":"JavaScript"}]', 'json');
        expect(r.error).toBeUndefined();
        expect(r.options).toEqual([{ value: 'js', label: 'JavaScript' }]);
    });

    it('parses a JSON array of [value, label] tuples', () => {
        const r = parseOptionsData('[["js","JavaScript"],["ts","TypeScript"]]', 'json');
        expect(r.options).toEqual([['js', 'JavaScript'], ['ts', 'TypeScript']]);
    });

    it('reports an error and returns [] on invalid JSON', () => {
        const r = parseOptionsData('{not json', 'json');
        expect(r.options).toEqual([]);
        expect(r.error).toMatch(/not valid JSON/);
    });

    it('reports an error and returns [] when the JSON is not an array', () => {
        const r = parseOptionsData('{"value":"x"}', 'json');
        expect(r.options).toEqual([]);
        expect(r.error).toMatch(/must be an array/);
    });

    it('treats absent/blank as an empty list with no error', () => {
        expect(parseOptionsData(null, 'json')).toEqual({ options: [] });
        expect(parseOptionsData('   ', 'json')).toEqual({ options: [] });
    });
});

describe('parseOptionsData — csv (first row header)', () => {
    it('maps the header row onto each data row as objects', () => {
        const r = parseOptionsData('value,label\njs,JavaScript\nts,TypeScript', 'csv');
        expect(r.error).toBeUndefined();
        expect(r.options).toEqual([
            { value: 'js', label: 'JavaScript' },
            { value: 'ts', label: 'TypeScript' },
        ]);
    });

    it('supports arbitrary header names (mapped via *-member by the consumer)', () => {
        const r = parseOptionsData('id,name,group\n1,Apple,Fruit', 'csv');
        expect(r.options).toEqual([{ id: '1', name: 'Apple', group: 'Fruit' }]);
    });

    it('handles CRLF line endings and a trailing newline', () => {
        const r = parseOptionsData('value,label\r\njs,JavaScript\r\n', 'csv');
        expect(r.options).toEqual([{ value: 'js', label: 'JavaScript' }]);
    });

    it('honours quoted fields with embedded commas and escaped quotes', () => {
        const r = parseOptionsData('value,label\n1,"Smith, John"\n2,"She said ""hi"""', 'csv');
        expect(r.options).toEqual([
            { value: '1', label: 'Smith, John' },
            { value: '2', label: 'She said "hi"' },
        ]);
    });

    it('handles a newline inside a quoted field', () => {
        const r = parseOptionsData('value,label\n1,"line1\nline2"', 'csv');
        expect(r.options).toEqual([{ value: '1', label: 'line1\nline2' }]);
    });

    it('errors when there is only a header row', () => {
        const r = parseOptionsData('value,label', 'csv');
        expect(r.options).toEqual([]);
        expect(r.error).toMatch(/header row and at least one data row/);
    });
});

describe('parseOptionsData — plain', () => {
    it('splits comma-separated bare values into [value, label] tuples', () => {
        const r = parseOptionsData('apple,banana,cherry', 'plain');
        expect(r.options).toEqual([['apple', 'apple'], ['banana', 'banana'], ['cherry', 'cherry']]);
    });

    it('splits newline-separated values and trims each', () => {
        const r = parseOptionsData('  apple \n banana \n cherry ', 'plain');
        expect(r.options).toEqual([['apple', 'apple'], ['banana', 'banana'], ['cherry', 'cherry']]);
    });

    it('collapses blank/consecutive delimiters', () => {
        const r = parseOptionsData('apple,,\n,banana', 'plain');
        expect(r.options).toEqual([['apple', 'apple'], ['banana', 'banana']]);
    });
});
