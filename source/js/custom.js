/**
 * Custom JavaScript - Sterling Zeng's Blog
 * Enhances the blog with additional interactivity
 */

(function() {
  'use strict';

  // ============================
  // Smooth scroll for anchor links
  // ============================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.getElementById(targetId.slice(1));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ============================
  // Table of Contents active state
  // ============================
  function initTocHighlight() {
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;

    const headings = [];
    tocLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const heading = document.getElementById(href.slice(1));
        if (heading) {
          headings.push({ element: heading, link: link });
        }
      }
    });

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const item = headings.find(h => h.element === entry.target);
          if (item) {
            if (entry.isIntersecting) {
              tocLinks.forEach(l => l.classList.remove('active'));
              item.link.classList.add('active');
            }
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach(h => observer.observe(h.element));
  }

  // ============================
  // Keyboard shortcuts
  // ============================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K: Open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) searchBtn.click();
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
      }
    });
  }

  // ============================
  // External link handler
  // ============================
  function initExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  // ============================
  // Reading progress bar
  // ============================
  function initReadingProgress() {
    const progressBar = document.querySelector('.reading-progress-bar');
    if (!progressBar) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = (scrollTop / docHeight) * 100;
          progressBar.style.width = `${progress}%`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================
  // Initialize all features
  // ============================
  function init() {
    initSmoothScroll();
    initTocHighlight();
    initKeyboardShortcuts();
    initExternalLinks();
    initReadingProgress();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on swup page transition (if using single page mode)
  if (typeof swup !== 'undefined') {
    swup.on('contentReplaced', init);
  }
})();
