/**
 * Logging configuration using loglevel with categorized loggers
 *
 * Categories:
 * - INIT: Component initialization and configuration
 * - DATA: Data loading, async operations, option parsing
 * - UI: UI updates, rendering, dropdown/popover/tooltip operations
 * - INTERACTION: User interactions, clicks, selections, keyboard events
 *
 * Usage:
 * - By default, all logging is disabled (silent mode) for production
 * - Enable logging in browser console:
 *   ```javascript
 *   import { enableLogging, setLogLevel, enableCategory } from './logger';
 *
 *   // Enable all logging at debug level
 *   enableLogging();
 *
 *   // Or set a specific log level
 *   setLogLevel('info');  // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
 *
 *   // Or enable only specific categories
 *   disableLogging();  // First disable all
 *   enableCategory('UI', 'debug');  // Enable only UI logs
 *   enableCategory('DATA', 'info');  // Enable only DATA logs at info level
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

// Register prefix plugin with the root logger
prefix.reg(log);

// Configure prefix plugin with color-coded formatting
prefix.apply(log, {
    format(level: string, name: string | undefined, timestamp: string) {
        // Get color for the current log level
        const color = COLORS[level.toLowerCase() as keyof typeof COLORS] || '#666';

        // Return formatted prefix with color styling
        return `%c[${timestamp}]%c %c[${level}]%c ${name ? `%c[${name}]%c ` : ''}`;
    },
    timestampFormatter(date: Date) {
        // Format: HH:MM:SS.mmm
        return date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0');
    }
});

// Apply color styling to console output using a custom method factory
const originalFactory = log.methodFactory;
log.methodFactory = function(methodName: string, logLevel: number, loggerName: string) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    return function(...args: any[]) {
        // If first arg contains %c color codes, inject the colors
        if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('%c')) {
            const color = COLORS[methodName as keyof typeof COLORS] || '#666';
            const coloredArgs = [
                args[0],
                `color: ${color}; font-weight: bold;`,  // timestamp color
                'color: inherit;',                        // reset
                `color: ${color}; font-weight: bold;`,  // level color
                'color: inherit;',                        // reset
                ...(loggerName ? [
                    `color: ${color}; font-weight: bold;`,  // name color
                    'color: inherit;',                        // reset
                ] : []),
                ...args.slice(1)
            ];
            rawMethod(...coloredArgs);
        } else {
            rawMethod(...args);
        }
    };
};

// Set default log level to silent (production mode)
// Can be changed at runtime via setLogLevel()
log.setLevel('silent');

// Create category-specific loggers
export const initLogger = log.getLogger('INIT');
export const dataLogger = log.getLogger('DATA');
export const uiLogger = log.getLogger('UI');
export const interactionLogger = log.getLogger('INTERACTION');

// Apply prefix and color styling to all category loggers
[initLogger, dataLogger, uiLogger, interactionLogger].forEach(logger => {
    prefix.apply(logger, {
        format(level: string, name: string | undefined, timestamp: string) {
            const color = COLORS[level.toLowerCase() as keyof typeof COLORS] || '#666';
            return `%c[${timestamp}]%c %c[${level}]%c %c[${name}]%c `;
        },
        timestampFormatter(date: Date) {
            return date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0');
        }
    });

    // Apply color-aware method factory to category loggers
    const catOriginalFactory = logger.methodFactory;
    logger.methodFactory = function(methodName: string, logLevel: number, loggerName: string) {
        const rawMethod = catOriginalFactory(methodName, logLevel, loggerName);

        return function(...args: any[]) {
            if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('%c')) {
                const color = COLORS[methodName as keyof typeof COLORS] || '#666';
                const coloredArgs = [
                    args[0],
                    `color: ${color}; font-weight: bold;`,  // timestamp
                    'color: inherit;',
                    `color: ${color}; font-weight: bold;`,  // level
                    'color: inherit;',
                    `color: ${color}; font-weight: bold;`,  // category name
                    'color: inherit;',
                    ...args.slice(1)
                ];
                rawMethod(...coloredArgs);
            } else {
                rawMethod(...args);
            }
        };
    };

    logger.setLevel('silent');
});

// Export the default logger
export default log;

/**
 * Enable logging for all loggers
 * @param level Log level to set ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
 */
export const setLogLevel = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => {
    log.setLevel(level);
    initLogger.setLevel(level);
    dataLogger.setLevel(level);
    uiLogger.setLevel(level);
    interactionLogger.setLevel(level);
};

/**
 * Enable all logging (set to debug level)
 */
export const enableLogging = () => {
    setLogLevel('debug');
};

/**
 * Disable all logging (set to silent level)
 */
export const disableLogging = () => {
    setLogLevel('silent');
};

/**
 * Enable logging for a specific category only
 * @param category Category logger to enable
 * @param level Log level to set (default: 'debug')
 */
export const enableCategory = (
    category: 'INIT' | 'DATA' | 'UI' | 'INTERACTION',
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' = 'debug'
) => {
    const loggerMap = {
        'INIT': initLogger,
        'DATA': dataLogger,
        'UI': uiLogger,
        'INTERACTION': interactionLogger
    };
    loggerMap[category].setLevel(level);
};

/**
 * Helper function to log structured data (objects/arrays)
 * Since loglevel doesn't natively support structured logging, this helper
 * ensures consistent formatting of complex data types.
 *
 * @param logger Logger instance to use
 * @param level Log level ('trace' | 'debug' | 'info' | 'warn' | 'error')
 * @param message Message string
 * @param data Optional data object to log
 */
export const logStructured = (
    logger: any,
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any
) => {
    if (data !== undefined) {
        logger[level](message, data);
    } else {
        logger[level](message);
    }
};
