/**
 * Virtual Scroll Implementation
 *
 * Renders only visible items in the viewport for optimal performance with large datasets.
 * Based on fixed-height items for fast offset calculations.
 *
 * @example
 * ```typescript
 * const virtualScroll = new VirtualScroll({
 *   container: dropdownElement,
 *   itemHeight: 50,
 *   items: largeArray,
 *   renderItem: (item, index) => `<div class="option">${item.label}</div>`,
 *   bufferSize: 10
 * });
 * ```
 */

export interface VirtualScrollConfig<T> {
    /** Container element with overflow-y: auto */
    container: HTMLElement;

    /** Fixed height of each item in pixels (required for performance) */
    itemHeight: number;

    /** Array of items to render */
    items: T[];

    /** Function that returns HTML string for each item */
    renderItem: (item: T, index: number) => string;

    /** Number of items to render above/below viewport (default: 10) */
    bufferSize?: number;

    /** Optional callback when visible range changes */
    onVisibleRangeChange?: (start: number, end: number) => void;

    /** Optional callback on scroll */
    onScroll?: (scrollTop: number) => void;
}

export class VirtualScroll<T> {
    private container: HTMLElement;
    private wrapper: HTMLDivElement;
    private viewport: HTMLDivElement;
    private itemHeight: number;
    private items: T[];
    private renderItem: (item: T, index: number) => string;
    private bufferSize: number;
    private onVisibleRangeChange?: (start: number, end: number) => void;
    private onScroll?: (scrollTop: number) => void;

    private scrollTop = 0;
    private viewportHeight = 0;
    private visibleStart = 0;
    private visibleEnd = 0;

    private scrollHandler: () => void;
    private resizeObserver?: ResizeObserver;

    constructor(config: VirtualScrollConfig<T>) {
        this.container = config.container;
        this.itemHeight = config.itemHeight;
        this.items = config.items;
        this.renderItem = config.renderItem;
        this.bufferSize = config.bufferSize ?? 10;
        this.onVisibleRangeChange = config.onVisibleRangeChange;
        this.onScroll = config.onScroll;

        // Bind scroll handler
        this.scrollHandler = this.handleScroll.bind(this);

        // Initialize DOM structure
        this.init();
    }

    /**
     * Initialize virtual scroll DOM structure
     *
     * Structure:
     * container (overflow-y: auto)
     *   └─ wrapper (height: totalItems * itemHeight)
     *      └─ viewport (position: absolute, top: 0)
     *         └─ items (position: absolute, top: index * itemHeight)
     */
    private init(): void {
        // Clear container
        this.container.innerHTML = '';

        // Create wrapper (sets total scrollable height)
        this.wrapper = document.createElement('div');
        this.wrapper.style.position = 'relative';
        this.wrapper.style.width = '100%';
        this.wrapper.style.height = `${this.items.length * this.itemHeight}px`;
        this.wrapper.className = 'ms__virtual-scroll-wrapper';

        // Create viewport (holds visible items)
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = '0';
        this.viewport.style.left = '0';
        this.viewport.style.right = '0';
        this.viewport.style.width = '100%';
        this.viewport.className = 'ms__virtual-scroll-viewport';

        // Assemble structure
        this.wrapper.appendChild(this.viewport);
        this.container.appendChild(this.wrapper);

        // Setup event listeners
        this.container.addEventListener('scroll', this.scrollHandler);

        // Watch for container size changes
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateViewportHeight();
                this.render();
            });
            this.resizeObserver.observe(this.container);
        }

        // Initial render
        this.updateViewportHeight();
        this.render();
    }

    /**
     * Update viewport height (visible area)
     */
    private updateViewportHeight(): void {
        this.viewportHeight = this.container.clientHeight;
    }

    /**
     * Handle scroll event
     */
    private handleScroll(): void {
        this.scrollTop = this.container.scrollTop;

        // Call optional scroll callback
        if (this.onScroll) {
            this.onScroll(this.scrollTop);
        }

        // Re-render if visible range changed
        this.render();
    }

    /**
     * Calculate visible range based on scroll position
     */
    private calculateVisibleRange(): { start: number; end: number } {
        // Calculate indices for visible area
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.ceil((this.scrollTop + this.viewportHeight) / this.itemHeight);

        // Add buffer zone for smooth scrolling
        const bufferedStart = Math.max(0, startIndex - this.bufferSize);
        const bufferedEnd = Math.min(this.items.length, endIndex + this.bufferSize);

        return { start: bufferedStart, end: bufferedEnd };
    }

    /**
     * Render visible items
     */
    private render(): void {
        const { start, end } = this.calculateVisibleRange();

        // Skip if range hasn't changed
        if (start === this.visibleStart && end === this.visibleEnd) {
            return;
        }

        this.visibleStart = start;
        this.visibleEnd = end;

        // Call optional range change callback
        if (this.onVisibleRangeChange) {
            this.onVisibleRangeChange(start, end);
        }

        // Build HTML for visible items
        let html = '';
        for (let i = start; i < end; i++) {
            const item = this.items[i];
            const itemHtml = this.renderItem(item, i);

            // Wrap with positioned container
            const top = i * this.itemHeight;
            html += `<div class="ms__virtual-item" style="position: absolute; top: ${top}px; left: 0; right: 0; height: ${this.itemHeight}px;" data-index="${i}">`;
            html += itemHtml;
            html += '</div>';
        }

        // Update viewport
        this.viewport.innerHTML = html;
    }

    /**
     * Update items and re-render
     */
    public setItems(items: T[]): void {
        this.items = items;

        // Update wrapper height
        this.wrapper.style.height = `${items.length * this.itemHeight}px`;

        // Update viewport height (container dimensions may have changed)
        this.updateViewportHeight();

        // Reset visible range
        this.visibleStart = -1;
        this.visibleEnd = -1;

        // Re-render
        this.render();
    }

    /**
     * Scroll to specific item index
     */
    public scrollToIndex(index: number): void {
        if (index < 0 || index >= this.items.length) {
            return;
        }

        const scrollTop = index * this.itemHeight;
        this.container.scrollTop = scrollTop;
    }

    /**
     * Get currently visible range
     */
    public getVisibleRange(): { start: number; end: number } {
        return { start: this.visibleStart, end: this.visibleEnd };
    }

    /**
     * Get total number of items
     */
    public getItemCount(): number {
        return this.items.length;
    }

    /**
     * Update item height and re-render
     */
    public setItemHeight(height: number): void {
        this.itemHeight = height;
        this.wrapper.style.height = `${this.items.length * height}px`;
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.render();
    }

    /**
     * Update buffer size
     */
    public setBufferSize(size: number): void {
        this.bufferSize = size;
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.render();
    }

    /**
     * Refresh/force re-render
     */
    public refresh(): void {
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.render();
    }

    /**
     * Cleanup and remove event listeners
     */
    public destroy(): void {
        this.container.removeEventListener('scroll', this.scrollHandler);

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Clear container
        this.container.innerHTML = '';
    }
}
