import { computePosition, autoUpdate, offset, flip, shift, type Placement } from '@floating-ui/dom';

export interface TooltipOptions {
    /** Element that triggers the tooltip on mouseenter / hides on mouseleave */
    trigger: HTMLElement;
    /** DOM container the tooltip element is appended to (e.g. shadow root or document.body) */
    container: HTMLElement;
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
    private readonly container: HTMLElement;
    private readonly placement: Placement;
    private readonly offsetDistance: number;
    private readonly showDelay: number;
    private readonly hideDelay: number;
    private readonly visibleClass: string;
    private readonly onBeforeShow?: () => void;

    private showTimer: number | null = null;
    private hideTimer: number | null = null;
    private positionCleanup: (() => void) | null = null;

    private readonly handleMouseEnter: () => void;
    private readonly handleMouseLeave: () => void;

    constructor(opts: TooltipOptions) {
        this.trigger = opts.trigger;
        this.container = opts.container;
        this.placement = opts.placement ?? 'top';
        this.offsetDistance = opts.offsetDistance ?? 8;
        this.showDelay = opts.showDelay ?? 100;
        this.hideDelay = opts.hideDelay ?? 100;
        this.visibleClass = opts.visibleClass ?? 'ms__badge-tooltip--visible';
        this.onBeforeShow = opts.onBeforeShow;

        this.element = document.createElement('div');
        this.element.className = opts.cssClass ?? 'ms__badge-tooltip';
        if (typeof opts.content === 'string') {
            this.element.textContent = opts.content;
        } else {
            this.element.appendChild(opts.content);
        }
        this.container.appendChild(this.element);

        this.handleMouseEnter = () => this.scheduleShow();
        this.handleMouseLeave = () => this.scheduleHide();
        this.trigger.addEventListener('mouseenter', this.handleMouseEnter);
        this.trigger.addEventListener('mouseleave', this.handleMouseLeave);
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
        this.element.classList.add(this.visibleClass);
        // (Re)attach autoUpdate positioning while visible
        if (this.positionCleanup) this.positionCleanup();
        this.positionCleanup = autoUpdate(this.trigger, this.element, () => {
            computePosition(this.trigger, this.element, {
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
        });
    }

    private hide(): void {
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
        this.element.remove();
    }
}
