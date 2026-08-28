'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card, .pipeline-step, .comparison-card, .security-card, .sandbox-panel, .cta-card');
    cards.forEach((card, index) => {
      card.classList.add('reveal-on-scroll');
      card.style.setProperty('--reveal-delay', `${(index % 4) * 70}ms`);
    });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);
  return null;
}
