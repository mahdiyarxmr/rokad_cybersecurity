import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that navigating to any page (except events pages)
 * automatically resets all scroll containers (window, document, and layout <main>)
 * to the very top, preventing pages from opening in a scrolled position.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // Ensure manual scroll restoration so browsers do not restore previous scroll positions
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Exclude events pages as explicitly requested: "(به جز صفحه رویدادها)"
    if (pathname.includes('/events')) {
      return;
    }

    const resetScroll = () => {
      // 1. Reset standard window and document root scroll
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }

      // 2. Reset layout <main> scroll container(s)
      const mainElements = document.querySelectorAll('main');
      mainElements.forEach((el) => {
        el.scrollTop = 0;
      });

      // 3. Reset any layout-level scroll containers
      const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
      scrollContainers.forEach((el) => {
        if (el.tagName === 'MAIN' || el.classList.contains('flex-1') || el.clientHeight > 400) {
          el.scrollTop = 0;
        }
      });
    };

    // Execute immediately before browser paint
    resetScroll();

    // Re-verify on animation frame and after small tick for any dynamic content
    const rafId = requestAnimationFrame(resetScroll);
    const timer1 = setTimeout(resetScroll, 25);
    const timer2 = setTimeout(resetScroll, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [pathname]);

  return null;
};
