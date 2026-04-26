/**
 * Logging configuration using loglevel with categorized loggers
 *
 * Categories:
 * - MULTISELECT:INIT: Component initialization and configuration
 * - MULTISELECT:DATA: Data loading, async operations, option parsing
 * - MULTISELECT:UI: UI updates, rendering, dropdown/popover/tooltip operations
 * - MULTISELECT:INTERACTION: User interactions, clicks, selections, keyboard events
 *
 * Usage:
 * - By default, all logging is disabled (silent mode) for production
 * - Enable logging in browser console:
 *   ```javascript
 *   import { enableLogging, setLogLevel, setCategoryLevel } from './logger';
 *
 *   // Enable all logging at debug level
 *   enableLogging();
 *
 *   // Or set a specific log level for all categories
 *   setLogLevel('info');  // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
 *
 *   // Or enable/disable specific categories
 *   disableLogging();  // First disable all
 *   setCategoryLevel('MULTISELECT:UI', 'debug');  // Enable only UI logs
 *   setCategoryLevel('MULTISELECT:DATA', 'info');  // Enable only DATA logs at info level
 *   setCategoryLevel('MULTISELECT:INTERACTION', 'silent');  // Disable interaction logs
 *   ```
 */

// Import vendored libraries via ES module wrappers
// @ts-ignore - Vendored library without type definitions
import log from './vendor/loglevel/index.js';
// @ts-ignore - Vendored library without type definitions
import prefix from './vendor/loglevel/prefix.js';

// Define color scheme matching original logger
const COLORS = {
    debug: '#0ea5e9',  // Blue
    info: '#10b981',   // Green
    warn: '#f59e0b',   // Orange
    error: '#ef4444'   // Red
};

// Custom method factory: builds a colored prefix string + matching CSS-substitution args, then
// invokes the underlying console method directly. Replaces the previous setup that combined the
// loglevel-plugin-prefix with a separate %c-injecting wrapper — the wrapper ran BEFORE the
// prefix added its %c codes, so the CSS args never got passed to console and the prefix
// rendered as literal text. Doing both jobs in one factory avoids that ordering trap.
//
// Note: keeping prefix.reg(log) so any consumer who calls prefix APIs at runtime doesn't crash,
// but we no longer call prefix.apply — we own the prefix layout here.
prefix.reg(log);

const formatTimestamp = (d: Date): string =>
    d.toTimeString().split(' ')[0] + '.' + d.getMilliseconds().toString().padStart(3, '0');

const originalFactory = log.methodFactory;
log.methodFactory = function(methodName: string, logLevel: number, loggerName: string) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);
    const color = COLORS[methodName as keyof typeof COLORS] || '#666';
    const colorCss = `color: ${color}; font-weight: bold;`;
    const resetCss = 'color: inherit;';

    return function(...args: any[]) {
        const timestamp = formatTimestamp(new Date());
        const levelLabel = methodName.toUpperCase();
        // Build prefix with %c color regions matching the CSS args below.
        const prefix = loggerName
            ? `%c[${timestamp}]%c %c[${levelLabel}]%c %c[${loggerName}]%c`
            : `%c[${timestamp}]%c %c[${levelLabel}]%c`;
        const cssArgs = loggerName
            ? [colorCss, resetCss, colorCss, resetCss, colorCss, resetCss]
            : [colorCss, resetCss, colorCss, resetCss];

        // The prefix string and its CSS args go first, then the caller's original args.
        rawMethod(prefix, ...cssArgs, ...args);
    };
};

// Default to silent in production, but DON'T persist this default — `setDefaultLevel` only
// applies when there's no persisted level (so a user who set 'info' last visit keeps 'info').
// Using `setLevel('silent')` here would overwrite their persisted choice on every page load.
if (typeof log.setDefaultLevel === 'function') {
    log.setDefaultLevel('silent');
} else {
    log.setLevel('silent', false);
}

// Create category-specific loggers with hierarchical naming
export const initLogger = log.getLogger('MULTISELECT:INIT');
export const dataLogger = log.getLogger('MULTISELECT:DATA');
export const uiLogger = log.getLogger('MULTISELECT:UI');
export const interactionLogger = log.getLogger('MULTISELECT:INTERACTION');

// Export the default logger
export default log;

/**
 * List of all logging categories for introspection
 */
export const LOGGING_CATEGORIES = [
    'MULTISELECT:INIT',
    'MULTISELECT:DATA',
    'MULTISELECT:UI',
    'MULTISELECT:INTERACTION'
];

/**
 * Propagate the root logger's level to every named child. The vendored loglevel needs this
 * because `setLevel` only updates the logger it's called on (the source even has a comment:
 * "in v2, this should call rebuild()"). Without this, named loggers created via getLogger
 * keep whatever level they had when they were instantiated.
 */
function syncChildLevels() {
    if (typeof log.rebuild === 'function') log.rebuild();
}

/**
 * Enable all logging (set to debug level)
 */
export function enableLogging() {
    log.setLevel('debug');
    syncChildLevels();
}

/**
 * Disable all logging (set to silent level)
 */
export function disableLogging() {
    log.setLevel('silent');
    syncChildLevels();
}

/**
 * Set log level for all loggers
 * @param level Log level to set ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
 */
export function setLogLevel(level: string) {
    log.setLevel(level);
    syncChildLevels();
}

/**
 * Set log level for a specific category. Accepts either the full prefixed name
 * (e.g. `MULTISELECT:UI`) or the bare suffix (`UI`) for convenience.
 * @param category Category logger name; bare names (UI/DATA/INIT/INTERACTION) are normalized to the prefixed form.
 * @param level Log level ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
 */
export function setCategoryLevel(category: string, level: string) {
    const fullName = category.includes(':') ? category : `MULTISELECT:${category}`;
    log.getLogger(fullName).setLevel(level);
}
