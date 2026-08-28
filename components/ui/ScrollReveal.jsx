'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll(
      '.feature-card, .pipeline-step, .comparison-card, .security-card, .sandbox-panel, .cta-card'
    );

    // Don't force animation on users who prefer reduced motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => {
        element.classList.add('is-revealed');
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    elements.forEach((element) => {
      element.classList.add('reveal-on-scroll');
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}