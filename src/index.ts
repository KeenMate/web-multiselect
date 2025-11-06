// Import styles
import './scss/_multiselect.scss';

// Export the web component
export { MultiSelectElement } from './web-component';

// Export the base class if users want direct access
export { PureMultiSelect } from './multiselect';

// Export types
export type { MultiSelectOption, MultiSelectOptions, MultiSelectEventDetail, DisplayMode, PillsPosition } from './types';

// Auto-register the custom element
import './web-component';
