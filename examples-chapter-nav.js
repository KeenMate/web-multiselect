/* =============================================================================
   CHAPTER NAV — floating "on this page" jump navigator (shared by every example)
   =============================================================================
   Self-initializing, zero-config: drop <script type="module" src="examples-chapter-nav.js">
   onto any example page and it scans the page's section headings, builds a floating
   tab pinned to the right edge (~1/3 down the viewport), and expands into a list you
   can click to jump between chapters. Highlights the current chapter as you scroll.

   Chapters = every <h2> inside `.container` (each example page wraps its sections in
   `.card` / `.example-section` blocks led by an <h2>). No per-page wiring; if a page
   has fewer than two chapters (e.g. the landing grid) it renders nothing. Styles live
   in examples-shared.css under `.chapter-nav*`.

   Positioning: the open panel is anchored to the tab with Floating UI (loaded on
   demand from a CDN via dynamic import — this stays a dependency-free, drop-in file
   that works in any project without a bundler). If the CDN can't be reached we fall
   back to a plain viewport-fixed placement so the nav still works offline. */
(function () {
  'use strict';

  // Pinned to the 1.x line; `+esm` gives a ready-to-import ES module with deps bundled.
  var FLOATING_UI_URL = 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1/+esm';
  var floatingUiPromise = null;
  function loadFloatingUi() {
    // Cache the (single) import; swallow failures and race a timeout so a slow or
    // blocked CDN falls back to plain positioning instead of hanging the panel.
    if (!floatingUiPromise) {
      var imported = import(/* @vite-ignore */ FLOATING_UI_URL).catch(function () { return null; });
      var timedOut = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); });
      floatingUiPromise = Promise.race([imported, timedOut]);
    }
    return floatingUiPromise;
  }

  function init() {
    var container = document.querySelector('.container') || document.body;
    var headings = Array.prototype.slice.call(container.querySelectorAll('h2'));
    // Nothing to navigate on single-section / index-style pages.
    if (headings.length < 2) return;

    // Warm the Floating UI import now so the panel is ready to anchor on first open.
    loadFloatingUi();

    var used = Object.create(null);

    // Turn a heading into { id, label, section }. Reuses an existing id, else slugs
    // the heading text; labels drop any inline badge chip (e.g. a "NEW" pill).
    var chapters = headings.map(function (h2, i) {
      var section = h2.closest('.card, .example-section') || h2.parentElement || h2;

      // Label: heading text without badge spans.
      var clone = h2.cloneNode(true);
      Array.prototype.forEach.call(clone.querySelectorAll('.badge'), function (b) { b.remove(); });
      var label = (clone.textContent || '').replace(/\s+/g, ' ').trim() || ('Section ' + (i + 1));

      // Anchor id: prefer an existing one, else slugify (unique).
      var id = section.id || h2.id;
      if (!id) {
        id = label.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || ('section-' + (i + 1));
        if (used[id]) { var n = 2; while (used[id + '-' + n]) n++; id = id + '-' + n; }
        section.id = id;
      }
      used[id] = true;
      return { id: id, label: label, section: section };
    });

    // ── build the nav ────────────────────────────────────────────────────────
    var root = document.createElement('div');
    root.className = 'chapter-nav';
    root.setAttribute('data-open', 'false');

    var panelId = 'chapter-nav-panel';
    var nav = document.createElement('nav');
    nav.className = 'chapter-nav__panel';
    nav.id = panelId;
    nav.setAttribute('aria-label', 'On this page');

    var title = document.createElement('div');
    title.className = 'chapter-nav__title';
    title.textContent = 'On this page';
    nav.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'chapter-nav__list';

    var itemsById = Object.create(null);
    chapters.forEach(function (c) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'chapter-nav__item';
      a.href = '#' + c.id;
      a.textContent = c.label;
      // Native hash jump handles the scroll (smooth via CSS); keep the panel open
      // so you can hop back and forth without reopening it.
      a.addEventListener('click', function () { setActive(c.id); });
      li.appendChild(a);
      list.appendChild(li);
      itemsById[c.id] = a;
    });
    nav.appendChild(list);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chapter-nav__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', panelId);
    toggle.setAttribute('aria-label', 'Jump to a section on this page');
    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<line x1="8" y1="6" x2="20" y2="6"></line>' +
      '<line x1="8" y1="12" x2="20" y2="12"></line>' +
      '<line x1="8" y1="18" x2="20" y2="18"></line>' +
      '<circle cx="4" cy="6" r="1.4"></circle>' +
      '<circle cx="4" cy="12" r="1.4"></circle>' +
      '<circle cx="4" cy="18" r="1.4"></circle>' +
      '</svg>';

    // The tab stays in `.chapter-nav` (CSS-fixed at the right edge); the panel is
    // positioned against it by Floating UI, so it can never be clipped or overflow.
    root.appendChild(toggle);
    root.appendChild(nav);
    document.body.appendChild(root);

    // Keep the wheel inside the panel: when it can't scroll further (or doesn't
    // overflow at all — e.g. a short chapter list), don't let the scroll chain
    // through to the page. `overscroll-behavior: contain` (CSS) covers the
    // overflowing case; this covers the non-scrollable case too.
    nav.addEventListener('wheel', function (e) {
      var atTop = nav.scrollTop <= 0;
      var atBottom = nav.scrollTop + nav.clientHeight >= nav.scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) e.preventDefault();
      e.stopPropagation();
    }, { passive: false });

    // ── positioning (Floating UI, anchored to the tab) ───────────────────────
    var stopAutoUpdate = null;

    function reposition() {
      loadFloatingUi().then(function (fui) {
        if (!fui) { positionFallback(); return; }
        // autoUpdate keeps the panel anchored across scroll/resize/zoom.
        stopAutoUpdate = fui.autoUpdate(toggle, nav, function () {
          fui.computePosition(toggle, nav, {
            placement: 'left-start',           // open to the left of the right-edge tab
            strategy: 'fixed',
            middleware: [
              fui.offset(8),
              // If there's no room to the left, try the other corners before giving up.
              fui.flip({ fallbackPlacements: ['right-start', 'bottom-end', 'top-end'] }),
              fui.shift({ padding: 8 })         // slide along the edge to stay in view
            ]
          }).then(function (pos) {
            nav.style.left = pos.x + 'px';
            nav.style.top = pos.y + 'px';
          });
        });
      });
    }

    // No-CDN fallback: pin the panel just left of the tab, clamped into the viewport.
    function positionFallback() {
      var r = toggle.getBoundingClientRect();
      nav.style.left = 'auto';
      nav.style.right = (window.innerWidth - r.left + 8) + 'px';
      var top = Math.max(8, Math.min(r.top, window.innerHeight - nav.offsetHeight - 8));
      nav.style.top = top + 'px';
    }

    function stopPositioning() {
      if (stopAutoUpdate) { stopAutoUpdate(); stopAutoUpdate = null; }
    }

    // ── open / close ───────────────────────────────────────────────────────
    function setOpen(open) {
      root.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) reposition();
      else stopPositioning();
    }
    toggle.addEventListener('click', function () {
      setOpen(root.getAttribute('data-open') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (root.getAttribute('data-open') === 'true' && !root.contains(e.target)) setOpen(false);
    });

    // ── scroll-spy: highlight the chapter nearest the top ────────────────────
    var activeId = null;
    function setActive(id) {
      if (id === activeId) return;
      if (activeId && itemsById[activeId]) itemsById[activeId].classList.remove('is-active');
      activeId = id;
      if (id && itemsById[id]) {
        var a = itemsById[id];
        a.classList.add('is-active');
        // Keep the active item visible in a long, scrolled panel.
        if (typeof a.scrollIntoView === 'function') a.scrollIntoView({ block: 'nearest' });
      }
    }
    function updateActive() {
      var current = chapters[0].id;
      for (var i = 0; i < chapters.length; i++) {
        if (chapters[i].section.getBoundingClientRect().top <= 120) current = chapters[i].id;
        else break;
      }
      setActive(current);
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { updateActive(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateActive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
