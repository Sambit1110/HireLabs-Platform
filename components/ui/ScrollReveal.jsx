'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    /*
     * ==========================================================
     * HireLabs — Global Scroll Motion
     *
     * Goal:
     * Make the landing page feel like one continuous story.
     *
     * The animation is intentionally subtle:
     * - sections ease into view
     * - content rises gently
     * - cards stagger
     * - text has a small delay
     * - already-visible content stays stable
     *
     * No scroll hijacking is used, so native browser scrolling
     * remains intact and accessible.
     * ==========================================================
     */

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const sections = Array.from(
      document.querySelectorAll('main > section, .hl-page > section')
    );

    const revealTargets = document.querySelectorAll(
      `
      .sandbox-panel,
      .sandbox-container,
      .feature-card,
      .pipeline-step,
      .comparison-card,
      .security-card,
      .security-item,
      .faq-item,
      .cta-card,
      .section-header,
      .features-grid,
      .comparison-wrapper,
      .security-grid,
      .faq-list
      `
    );

    /*
     * ----------------------------------------------------------
     * Inject motion CSS locally.
     * This keeps the behavior isolated from the rest of the app.
     * ----------------------------------------------------------
     */

    const style = document.createElement('style');

    style.setAttribute(
      'data-hirelabs-scroll-motion',
      'true'
    );

    style.textContent = `
      /* ========================================================
         BASE SECTION FLOW
         ======================================================== */

      .hl-scroll-section {
        position: relative;
        opacity: 0;
        transform: translate3d(0, 28px, 0);
        transition:
          opacity 900ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 1000ms cubic-bezier(0.16, 1, 0.3, 1);
        will-change: opacity, transform;
      }

      .hl-scroll-section.hl-scroll-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }


      /* ========================================================
         GENERIC CONTENT REVEAL
         ======================================================== */

      .hl-scroll-item {
        opacity: 0;
        transform: translate3d(0, 24px, 0);
        transition:
          opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 850ms cubic-bezier(0.16, 1, 0.3, 1);
        transition-delay: var(--hl-delay, 0ms);
        will-change: opacity, transform;
      }

      .hl-scroll-item.hl-scroll-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }


      /* ========================================================
         HEADERS
         ======================================================== */

      .hl-scroll-header {
        opacity: 0;
        transform: translate3d(0, 26px, 0);
        transition:
          opacity 850ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
        will-change: opacity, transform;
      }

      .hl-scroll-header.hl-scroll-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }


      /* ========================================================
         STAGGERED CARDS
         ======================================================== */

      .hl-scroll-stagger > * {
        opacity: 0;
        transform: translate3d(0, 24px, 0);
        transition:
          opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 850ms cubic-bezier(0.16, 1, 0.3, 1);
        transition-delay: calc(var(--hl-index, 0) * 90ms);
        will-change: opacity, transform;
      }

      .hl-scroll-stagger.hl-scroll-visible > * {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }


      /* ========================================================
         SOFT SECTION DIVIDER MOTION
         ======================================================== */

      .hl-scroll-section::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 0;

        width: min(960px, 82%);

        height: 1px;

        background: #DED7CA;

        transform:
          translateX(-50%)
          scaleX(0);

        transform-origin: center;

        opacity: 0.65;

        transition:
          transform 1200ms cubic-bezier(0.16, 1, 0.3, 1),
          opacity 800ms ease;

        pointer-events: none;
      }

      .hl-scroll-section.hl-scroll-visible::after {
        transform:
          translateX(-50%)
          scaleX(1);
      }


      /* ========================================================
         INTERACTIVE DEMO
         ======================================================== */

      .sandbox-section .sandbox-container {
        opacity: 0;
        transform: translate3d(0, 30px, 0) scale(0.992);
        transition:
          opacity 900ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 1000ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .sandbox-section.hl-scroll-visible .sandbox-container {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }


      /* ========================================================
         FEATURE CARDS
         ======================================================== */

      .feature-card {
        transition:
          opacity 800ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 900ms cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 280ms ease,
          border-color 280ms ease;
      }


      /* ========================================================
         ARCHITECTURE
         ======================================================== */

      .hl-architecture {
        isolation: isolate;
      }

      .hl-architecture .hl-arch-kicker,
      .hl-architecture .hl-arch-title,
      .hl-architecture .hl-arch-description {
        transition:
          opacity 850ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .hl-architecture .hl-arch-kicker {
        transform: translate3d(0, 14px, 0);
        opacity: 0;
      }

      .hl-architecture .hl-arch-title {
        transform: translate3d(0, 22px, 0);
        opacity: 0;
        transition-delay: 80ms;
      }

      .hl-architecture .hl-arch-description {
        transform: translate3d(0, 18px, 0);
        opacity: 0;
        transition-delay: 150ms;
      }

      .hl-architecture.hl-scroll-visible .hl-arch-kicker,
      .hl-architecture.hl-scroll-visible .hl-arch-title,
      .hl-architecture.hl-scroll-visible .hl-arch-description {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }


      /* ========================================================
         NAVBAR — SUBTLE SCROLL DEPTH
         ======================================================== */

      .navbar-header {
        transition:
          background 450ms ease,
          border-color 450ms ease,
          box-shadow 450ms ease,
          backdrop-filter 450ms ease;
      }

      .navbar-header.scrolled {
        box-shadow:
          0 12px 30px rgba(33, 28, 24, 0.055);
      }


      /* ========================================================
         REDUCED MOTION
         ======================================================== */

      @media (prefers-reduced-motion: reduce) {
        .hl-scroll-section,
        .hl-scroll-item,
        .hl-scroll-header,
        .hl-scroll-stagger > *,
        .sandbox-section .sandbox-container,
        .hl-architecture .hl-arch-kicker,
        .hl-architecture .hl-arch-title,
        .hl-architecture .hl-arch-description {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }

        .hl-scroll-section::after {
          transform:
            translateX(-50%)
            scaleX(1);
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);


    /*
     * ----------------------------------------------------------
     * Register sections
     * ----------------------------------------------------------
     */

    sections.forEach((section) => {
      section.classList.add('hl-scroll-section');
    });


    /*
     * ----------------------------------------------------------
     * Register section headers
     * ----------------------------------------------------------
     */

    document
      .querySelectorAll(
        '.section-header, .hl-arch-intro'
      )
      .forEach((element) => {
        element.classList.add(
          'hl-scroll-header'
        );
      });


    /*
     * ----------------------------------------------------------
     * Register general targets
     * ----------------------------------------------------------
     */

    revealTargets.forEach((element) => {
      element.classList.add(
        'hl-scroll-item'
      );
    });


    /*
     * ----------------------------------------------------------
     * Register staggered groups
     * ----------------------------------------------------------
     */

    const staggerGroups = [
      '.features-grid',
      '.comparison-wrapper',
      '.security-card-list',
      '.faq-list',
      '.pipeline-flow',
    ];

    staggerGroups.forEach((selector) => {
      document
        .querySelectorAll(selector)
        .forEach((group) => {
          group.classList.add(
            'hl-scroll-stagger'
          );

          Array.from(group.children).forEach(
            (child, index) => {
              child.style.setProperty(
                '--hl-index',
                index
              );
            }
          );
        });
    });


    /*
     * ----------------------------------------------------------
     * Architecture step list gets its own stagger.
     * ----------------------------------------------------------
     */

    document
      .querySelectorAll(
        '.hl-arch-nav'
      )
      .forEach((nav) => {
        Array.from(nav.children).forEach(
          (child, index) => {
            child.style.setProperty(
              '--hl-index',
              index
            );

            child.classList.add(
              'hl-scroll-item'
            );
          }
        );
      });


    /*
     * ----------------------------------------------------------
     * When reduced motion is enabled, reveal everything.
     * ----------------------------------------------------------
     */

    if (reduceMotion) {
      sections.forEach((section) => {
        section.classList.add(
          'hl-scroll-visible'
        );
      });

      document
        .querySelectorAll(
          '.hl-scroll-item, .hl-scroll-header, .hl-scroll-stagger'
        )
        .forEach((element) => {
          element.classList.add(
            'hl-scroll-visible'
          );
        });

      return () => {
        style.remove();
      };
    }


    /*
     * ----------------------------------------------------------
     * IntersectionObserver
     * ----------------------------------------------------------
     */

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              'hl-scroll-visible'
            );

            /*
             * We intentionally keep the class after reveal.
             *
             * This means the page does not repeatedly animate
             * every time the user makes tiny scroll movements.
             *
             * The result feels much more polished and stable.
             */
            observer.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.12,

          rootMargin:
            '0px 0px -8% 0px',
        }
      );


    /*
     * ----------------------------------------------------------
     * Observe sections
     * ----------------------------------------------------------
     */

    sections.forEach((section) => {
      observer.observe(section);
    });


    /*
     * ----------------------------------------------------------
     * Observe headers / cards / groups
     * ----------------------------------------------------------
     */

    document
      .querySelectorAll(
        `
        .hl-scroll-item,
        .hl-scroll-header,
        .hl-scroll-stagger
        `
      )
      .forEach((element) => {
        observer.observe(element);
      });


    /*
     * ----------------------------------------------------------
     * Small pointer-depth effect for desktop cards.
     *
     * This is intentionally tiny. It should feel tactile,
     * not like a flashy 3D effect.
     * ----------------------------------------------------------
     */

    const canHover =
      window.matchMedia(
        '(hover: hover) and (pointer: fine)'
      ).matches;

    const interactiveCards = document.querySelectorAll(
      `
      .feature-card,
      .sandbox-panel,
      .security-item,
      .cta-card
      `
    );

    const pointerHandlers = [];

    if (canHover) {
      interactiveCards.forEach((card) => {
        const handlePointerMove = (event) => {
          const rect =
            card.getBoundingClientRect();

          const x =
            (event.clientX -
              rect.left) /
            rect.width -
            0.5;

          const y =
            (event.clientY -
              rect.top) /
            rect.height -
            0.5;

          card.style.setProperty(
            '--hl-pointer-x',
            `${x * 2}px`
          );

          card.style.setProperty(
            '--hl-pointer-y',
            `${y * 2}px`
          );
        };

        const handlePointerLeave = () => {
          card.style.setProperty(
            '--hl-pointer-x',
            '0px'
          );

          card.style.setProperty(
            '--hl-pointer-y',
            '0px'
          );
        };

        card.addEventListener(
          'pointermove',
          handlePointerMove,
          {
            passive: true,
          }
        );

        card.addEventListener(
          'pointerleave',
          handlePointerLeave
        );

        pointerHandlers.push({
          card,
          handlePointerMove,
          handlePointerLeave,
        });
      });

      const pointerStyle =
        document.createElement('style');

      pointerStyle.setAttribute(
        'data-hirelabs-pointer-motion',
        'true'
      );

      pointerStyle.textContent = `
        .feature-card,
        .sandbox-panel,
        .security-item,
        .cta-card {
          --hl-pointer-x: 0px;
          --hl-pointer-y: 0px;

          transform:
            translate3d(
              var(--hl-pointer-x),
              var(--hl-pointer-y),
              0
            );
        }

        .feature-card.hl-scroll-visible,
        .sandbox-panel.hl-scroll-visible,
        .security-item.hl-scroll-visible,
        .cta-card.hl-scroll-visible {
          transition:
            opacity 800ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 350ms ease,
            box-shadow 280ms ease,
            border-color 280ms ease;
        }
      `;

      document.head.appendChild(
        pointerStyle
      );

      pointerHandlers.pointerStyle =
        pointerStyle;
    }


    /*
     * ----------------------------------------------------------
     * Cleanup
     * ----------------------------------------------------------
     */

    return () => {
      observer.disconnect();

      pointerHandlers.forEach(
        ({
          card,
          handlePointerMove,
          handlePointerLeave,
        }) => {
          card.removeEventListener(
            'pointermove',
            handlePointerMove
          );

          card.removeEventListener(
            'pointerleave',
            handlePointerLeave
          );
        }
      );

      pointerHandlers.pointerStyle?.remove();

      style.remove();
    };
  }, []);

  return null;
}