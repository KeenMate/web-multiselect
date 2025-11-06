/// <reference types="vite/client" />

// Declare module for SCSS imports with ?inline query
declare module '*.scss?inline' {
    const content: string;
    export default content;
}

// Declare module for regular SCSS imports
declare module '*.scss' {
    const content: string;
    export default content;
}
