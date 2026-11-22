'use client';

import { useEffect, useRef } from 'react';

import { themeFor } from '@/lib/landing/theme';

/**
 * Fixed full-page colour layer. Whichever `[data-lp-theme]` section crosses
 * the middle of the viewport sets the page background and text colour.
 */
export function ScrollBackground() {
  const layerRef = useRef(null);
  const activeSection = useRef('deep');

  const apply = (root) => {
    const { bg, fg } = themeFor(activeSection.current);
    root.style.setProperty('--lp-bg', bg);
    root.style.setProperty('--lp-fg', fg);
  };

  useEffect(() => {
    const root = layerRef.current?.closest('.lp');
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection.current = entry.target.dataset.lpTheme;
            apply(root);
          }
        }
      },
      // A thin band across the middle of the screen decides the theme,
      // so very tall sections (like the word wheel) still switch reliably.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    root.querySelectorAll('[data-lp-theme]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return <div ref={layerRef} className="lp-bg" aria-hidden="true" />;
}
