import { computePosition, autoUpdate, offset, flip, shift, type Placement, type VirtualElement } from '@floating-ui/dom';

export interface TooltipOptions {
    /** Element that triggers the tooltip on mouseenter / hides on mouseleave */
    trigger: HTMLElement;
    /** DOM container the tooltip element is appended to (e.g. shadow root or document.body) */
    container: HTMLElement | ShadowRoot;
    /** Tooltip content — strings set textContent (preserves \n etc.); HTMLElements are appended */
    content: string | HTMLElement;
    /** CSS class on the tooltip element. Default: 'ms__badge-tooltip' (component-styled) */
    cssClass?: string;
    /** CSS class added/removed to toggle visibility. Default: 'ms__badge-tooltip--visible' */
    visibleClass?: string;
    /** Floating UI placement for the tooltip */
    placement?: Placement;
    /** Distance in px between tooltip and trigger */
    offsetDistance?: number;
    /** Delay before showing on mouseenter (ms). Default 100. */
    showDelay?: number;
    /** Delay before hiding on mouseleave (ms). Default 100. */
    hideDelay?: number;
    /**
     * Anchor the tooltip to the mouse pointer instead of the trigger element, and follow it as the
     * pointer moves over the trigger. Useful for wide triggers (e.g. a full-width option row) where a
     * trigger-centered tooltip would land far from the cursor. `placement`/`offsetDistance` still apply,
     * computed relative to the pointer.
     */
    followCursor?: boolean;
    /**
     * Hook fired right before this tooltip becomes visible. Used by the badge-remove tooltip to
     * immediately dismiss its parent badge tooltip so the two don't overlap.
     */
    onBeforeShow?: () => void;
}

/**
 * One hover-triggered tooltip with Floating UI positioning, paired show/hide timeouts, and
 * proper cleanup. All three previous tooltip variants in the multiselect (badge text,
 * badge-remove button, action button) collapse to this one class.
 */
export class Tooltip {
    private readonly element: HTMLDivElement;
    private readonly trigger: HTMLElement;
    private readonly container: HTMLElement | ShadowRoot;
    private readonly placement: Placement;
    private readonly offsetDistance: number;
    private readonly showDelay: number;
    private readonly hideDelay: number;
    private readonly visibleClass: string;
    private readonly followCursor: boolean;
    private readonly onBeforeShow?: () => void;

    private showTimer: number | null = null;
    private hideTimer: number | null = null;
    private positionCleanup: (() => void) | null = null;
    private visible = false;
    private cursorX = 0;
    private cursorY = 0;

    private readonly handleMouseEnter: (e: MouseEvent) => void;
    private readonly handleMouseLeave: () => void;
    private readonly handleMouseMove?: (e: MouseEvent) => void;

    constructor(opts: TooltipOptions) {
        this.trigger = opts.trigger;
        this.container = opts.container;
        this.placement = opts.placement ?? 'top';
        this.offsetDistance = opts.offsetDistance ?? 8;
        this.showDelay = opts.showDelay ?? 100;
        this.hideDelay = opts.hideDelay ?? 100;
        this.visibleClass = opts.visibleClass ?? 'ms__badge-tooltip--visible';
        this.followCursor = opts.followCursor ?? false;
        this.onBeforeShow = opts.onBeforeShow;

        this.element = document.createElement('div');
        this.element.className = opts.cssClass ?? 'ms__badge-tooltip';
        if (typeof opts.content === 'string') {
            this.element.textContent = opts.content;
        } else {
            this.element.appendChild(opts.content);
        }
        this.container.appendChild(this.element);

        this.handleMouseEnter = (e: MouseEvent) => {
            if (this.followCursor) {
                this.cursorX = e.clientX;
                this.cursorY = e.clientY;
            }
            this.scheduleShow();
        };
        this.handleMouseLeave = () => this.scheduleHide();
        this.trigger.addEventListener('mouseenter', this.handleMouseEnter);
        this.trigger.addEventListener('mouseleave', this.handleMouseLeave);

        if (this.followCursor) {
            this.handleMouseMove = (e: MouseEvent) => {
                this.cursorX = e.clientX;
                this.cursorY = e.clientY;
                if (this.visible) this.positionAtCursor();
            };
            this.trigger.addEventListener('mousemove', this.handleMouseMove);
        }
    }

    private scheduleShow(): void {
        if (this.hideTimer !== null) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        if (this.showTimer !== null) return; // already pending
        this.showTimer = window.setTimeout(() => {
            this.showTimer = null;
            this.show();
        }, this.showDelay);
    }

    private scheduleHide(): void {
        if (this.showTimer !== null) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        if (this.hideTimer !== null) return; // already pending
        this.hideTimer = window.setTimeout(() => {
            this.hideTimer = null;
            this.hide();
        }, this.hideDelay);
    }

    private show(): void {
        this.onBeforeShow?.();
        this.visible = true;
        this.element.classList.add(this.visibleClass);
        if (this.positionCleanup) {
            this.positionCleanup();
            this.positionCleanup = null;
        }
        if (this.followCursor) {
            // Anchored to the pointer; the mousemove handler drives repositioning while visible.
            this.positionAtCursor();
        } else {
            // (Re)attach autoUpdate positioning relative to the trigger while visible.
            this.positionCleanup = autoUpdate(this.trigger, this.element, () => this.computeAt(this.trigger));
        }
    }

    /** Position the tooltip relative to a reference (the trigger element or a pointer virtual element). */
    private computeAt(reference: Element | VirtualElement): void {
        computePosition(reference, this.element, {
            placement: this.placement,
            strategy: 'fixed',
            middleware: [
                offset(this.offsetDistance),
                flip(),
                shift({ padding: 8 })
            ]
        }).then(({ x, y }) => {
            Object.assign(this.element.style, {
                left: `${x}px`,
                top: `${y}px`
            });
        });
    }

    /** Position the tooltip relative to the last-known pointer location (follow-cursor mode). */
    private positionAtCursor(): void {
        const x = this.cursorX;
        const y = this.cursorY;
        const pointer: VirtualElement = {
            getBoundingClientRect: () => ({
                width: 0, height: 0, x, y, top: y, left: x, right: x, bottom: y
            })
        };
        this.computeAt(pointer);
    }

    private hide(): void {
        this.visible = false;
        this.element.classList.remove(this.visibleClass);
        if (this.positionCleanup) {
            this.positionCleanup();
            this.positionCleanup = null;
        }
    }

    /** Hide synchronously (skip the hideDelay). Used by parent tooltips when a child tooltip is about to show. */
    public hideImmediate(): void {
        if (this.showTimer !== null) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        if (this.hideTimer !== null) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        this.hide();
    }

    public destroy(): void {
        if (this.showTimer !== null) clearTimeout(this.showTimer);
        if (this.hideTimer !== null) clearTimeout(this.hideTimer);
        this.showTimer = null;
        this.hideTimer = null;
        if (this.positionCleanup) {
            this.positionCleanup();
            this.positionCleanup = null;
        }
        this.trigger.removeEventListener('mouseenter', this.handleMouseEnter);
        this.trigger.removeEventListener('mouseleave', this.handleMouseLeave);
        if (this.handleMouseMove) this.trigger.removeEventListener('mousemove', this.handleMouseMove);
        this.element.remove();
    }
}
