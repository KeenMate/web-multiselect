// Import styles
import './scss/main.scss';

// Import for export and global API
import { getAllInstances, MultiSelectElement } from './web-component';

// Export the web component
export { MultiSelectElement };

// Export the base class if users want direct access
export { PureMultiSelect } from './multiselect';

// Export types
export type { MultiSelectOption, MultiSelectOptions, MultiSelectEventDetail, PillsDisplayMode, PillsPosition, PillsThresholdMode, SearchInputMode, ValueFormat } from './types';

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
    register: () => void;
    getInstances: () => HTMLElement[];
}

// Declare global namespace
declare global {
    interface Window {
        keenmate?: {
            multiselect?: GlobalMultiSelectAPI;
        };
    }
}

// Initialize global API
if (typeof window !== 'undefined') {
    window.keenmate = window.keenmate || {};
    window.keenmate.multiselect = {
        version: () => __VERSION__,
        config: {
            name: __PACKAGE_NAME__,
            version: __VERSION__,
            author: __AUTHOR__,
            license: __LICENSE__,
            repository: __REPOSITORY__,
            homepage: __HOMEPAGE__
        },
        register: () => {
            if (typeof customElements !== 'undefined' && !customElements.get('multi-select')) {
                customElements.define('multi-select', MultiSelectElement);
            }
        },
        getInstances: () => getAllInstances()
    };
}
