// Import styles
import './scss/main.scss';

// Import for export and global API
import { getAllInstances, MultiSelectElement } from './web-component';

// Export the web component
export { MultiSelectElement };

// Export the base class if users want direct access
export { WebMultiSelect } from './multiselect';

// Export types
export type { MultiSelectOption, MultiSelectOptions, MultiSelectEventDetail, BadgesDisplayMode, BadgesPosition, BadgesThresholdMode, SearchInputMode, SearchMode, ValueFormat } from './types';

// Export logging utilities for runtime control
export {
    setLogLevel,
    enableLogging,
    disableLogging,
    setCategoryLevel,
    LOGGING_CATEGORIES,
    initLogger,
    dataLogger,
    uiLogger,
    interactionLogger
} from './logger';

// Auto-register the custom element
import './web-component';

// Type declarations for build-time constants
declare const __VERSION__: string;
declare const __PACKAGE_NAME__: string;
declare const __AUTHOR__: string;
declare const __LICENSE__: string;
declare const __REPOSITORY__: string;
declare const __HOMEPAGE__: string;

// Global API interface
export interface GlobalMultiSelectAPI {
    version: () => string;
    config: {
        name: string;
        version: string;
        author: string;
        license: string;
        repository: string;
        homepage: string;
    };
    logging: {
        enableLogging: () => void;
        disableLogging: () => void;
        setLogLevel: (level: string) => void;
        setCategoryLevel: (category: string, level: string) => void;
        getCategories: () => string[];
    };
    register: () => void;
    getInstances: () => HTMLElement[];
}

// Declare global namespace
declare global {
    interface Window {
        components?: {
            'web-multiselect'?: GlobalMultiSelectAPI;
        };
    }
}

// Import logging functions for global API
import {
    setLogLevel,
    enableLogging,
    disableLogging,
    setCategoryLevel,
    LOGGING_CATEGORIES
} from './logger';

// Initialize global API
if (typeof window !== 'undefined') {
    window.components = window.components || {};
    window.components['web-multiselect'] = {
        version: () => __VERSION__,
        config: {
            name: __PACKAGE_NAME__,
            version: __VERSION__,
            author: __AUTHOR__,
            license: __LICENSE__,
            repository: __REPOSITORY__,
            homepage: __HOMEPAGE__
        },
        logging: {
            enableLogging,
            disableLogging,
            setLogLevel,
            setCategoryLevel,
            getCategories: () => [...LOGGING_CATEGORIES]
        },
        register: () => {
            if (typeof customElements !== 'undefined' && !customElements.get('web-multiselect')) {
                customElements.define('web-multiselect', MultiSelectElement);
            }
        },
        getInstances: () => getAllInstances()
    };
}
