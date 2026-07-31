/**
 * custom-elements-manifest analyzer plugin — attribute-table derivation.
 *
 * The element's ~60 observed attributes are declared only in the runtime
 * `ATTRIBUTE_TABLE` in `src/web-component.ts`, which the analyzer reaches via
 * `observedAttributes` → `ATTRIBUTE_TABLE.map(...)` — a dynamic spread it cannot
 * statically evaluate, so it emits ZERO attributes.
 *
 * This plugin reads that array straight from the AST and injects the attributes
 * into the custom-element declaration, so there is a SINGLE source of truth (the
 * table) and the manifest can never drift from it. Enum union types come from the
 * inline `enumValues: [...]` array on each `parser: 'enum'` entry; attribute
 * descriptions are harvested from the `MultiSelectConfig` interface JSDoc in
 * `src/types.ts` (keyed by each entry's `key`).
 *
 * The few out-of-table observed attributes (initial-values, show-debug-info, and
 * the CSS-var sugar attributes) are curated below, as are the three dispatched
 * events (select / deselect / change — all bubble + composed to the host).
 */

const TAG = 'web-multiselect';

const NON_TABLE_TYPES = {
    'initial-values': 'string',
    'show-debug-info': 'boolean',
    'dropdown-width': 'string',
    'selected-popover-width': 'string',
};

const NON_TABLE_DESCRIPTIONS = {
    'initial-values': 'JSON array of value IDs to preselect on initialization (e.g. `["a","b"]`). Consumed once at init; declarative `<option selected>` children take precedence.',
    'show-debug-info': 'Shows the dev-only debug info panel with render/selection stats. Enabled only when set to the literal string `true`.',
    'dropdown-width': 'Local override of the `--ms-dropdown-width` CSS variable (e.g. `60rem`). Sugar for setting the property inline on the host.',
    'selected-popover-width': 'Local override of the `--ms-selected-popover-width` CSS variable. Sugar for setting the property inline on the host.',
};

const EVENTS = [
    {
        name: 'select',
        type: { text: 'CustomEvent<MultiSelectEventDetail<T>>' },
        description: 'Fired (bubbles + composed) when an option is selected. detail = { option, selectedOptions, selectedValues }.',
    },
    {
        name: 'deselect',
        type: { text: 'CustomEvent<MultiSelectEventDetail<T>>' },
        description: 'Fired (bubbles + composed) when an option is deselected. detail = { option, selectedOptions, selectedValues }.',
    },
    {
        name: 'change',
        type: { text: 'CustomEvent<MultiSelectEventDetail<T>>' },
        description: 'Fired (bubbles + composed) whenever the selection set changes. detail = { selectedOptions, selectedValues }.',
    },
];

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// Preserve intentional line breaks (so multiline JSDoc renders as markdown —
// lists, paragraphs — in the editor hover) while tidying per-line whitespace.
const normalizeDoc = (s) =>
    s.replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

function readJsDoc(node) {
    const docs = node.jsDoc;
    if (!docs || !docs.length) return undefined;
    const c = docs[docs.length - 1].comment;
    if (typeof c === 'string') return normalizeDoc(c);
    if (Array.isArray(c)) return normalizeDoc(c.map((p) => p.text || '').join(''));
    return undefined;
}

/** Strip a wrapping `<expr> as const` / `as T` to reach the underlying array literal. */
function unwrapAs(ts, node) {
    while (ts.isAsExpression(node)) node = node.expression;
    return node;
}

export function attributeTablePlugin() {
    // Collected across analyzePhase of ALL modules, applied in packageLinkPhase.
    const tableEntries = []; // { attr, key, parserName, enumValues }
    const optionDocs = {};   // { badgesDisplayMode: 'JSDoc text', ... }

    return {
        name: 'ms-attribute-table',

        analyzePhase({ ts, node }) {
            // Harvest MultiSelectConfig member JSDoc for attribute descriptions.
            if (ts.isInterfaceDeclaration(node) && node.name.getText() === 'MultiSelectConfig') {
                for (const member of node.members) {
                    if (!member.name) continue;
                    const doc = readJsDoc(member);
                    if (doc) optionDocs[member.name.getText()] = doc;
                }
                return;
            }

            if (!ts.isVariableStatement(node)) return;
            for (const decl of node.declarationList.declarations) {
                if (!decl.initializer || !decl.name) continue;
                const name = decl.name.getText();
                const init = unwrapAs(ts, decl.initializer);

                if (name === 'ATTRIBUTE_TABLE' && ts.isArrayLiteralExpression(init)) {
                    for (const el of init.elements) {
                        if (!ts.isObjectLiteralExpression(el)) continue;
                        const entry = {};
                        for (const prop of el.properties) {
                            if (!ts.isPropertyAssignment(prop)) continue;
                            const pname = prop.name.getText();
                            const val = prop.initializer;
                            if (pname === 'attr' && ts.isStringLiteral(val)) entry.attr = val.text;
                            else if (pname === 'key' && ts.isStringLiteral(val)) entry.key = val.text;
                            else if (pname === 'parser' && ts.isStringLiteral(val)) entry.parserName = val.text;
                            else if (pname === 'enumValues') {
                                const arr = unwrapAs(ts, val);
                                if (ts.isArrayLiteralExpression(arr)) {
                                    entry.enumValues = arr.elements
                                        .filter((e) => ts.isStringLiteral(e))
                                        .map((e) => e.text);
                                }
                            }
                        }
                        if (entry.attr && entry.key) tableEntries.push(entry);
                    }
                }
            }
        },

        packageLinkPhase({ customElementsManifest }) {
            const typeFor = (entry) => {
                const p = entry.parserName || '';
                if (p === 'enum' && entry.enumValues && entry.enumValues.length) {
                    return entry.enumValues.map((v) => `'${v}'`).join(' | ');
                }
                if (p === 'int') return 'number';
                if (p.startsWith('bool')) return 'boolean';
                return 'string'; // string / string-or-undefined
            };

            for (const mod of customElementsManifest.modules || []) {
                for (const decl of mod.declarations || []) {
                    if (!(decl.customElement && decl.tagName === TAG)) continue;

                    const memberNames = new Set((decl.members || []).map((m) => m.name));
                    const attributes = [];

                    for (const e of tableEntries) {
                        const a = { name: e.attr, type: { text: typeFor(e) } };
                        if (optionDocs[e.key]) a.description = optionDocs[e.key];
                        if (memberNames.has(e.key)) a.fieldName = e.key;
                        attributes.push(a);
                    }

                    for (const name of Object.keys(NON_TABLE_TYPES)) {
                        const a = { name, type: { text: NON_TABLE_TYPES[name] } };
                        if (NON_TABLE_DESCRIPTIONS[name]) a.description = NON_TABLE_DESCRIPTIONS[name];
                        const field = kebabToCamel(name);
                        if (memberNames.has(field)) a.fieldName = field;
                        attributes.push(a);
                    }

                    decl.attributes = attributes;
                    decl.events = EVENTS;
                }
            }
        },
    };
}
