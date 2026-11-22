'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

import { shouldAnimate } from '@/lib/landing/motion-prefs';
import { wheelPositions } from '@/lib/landing/wheel';

const MotionDiv = motion.div;

function useIsNarrow(query = '(max-width: 767px)') {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return narrow;
}

/**
 * A tilted 3D wheel of words that turns as the page scrolls.
 * Phones and reduced-motion visitors get a simple list instead.
 * The list is always rendered (visually hidden while the wheel spins),
 * so screen readers read the words once, in order.
 */
export function WordWheel({ words, label = 'What we read for' }) {
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const isNarrow = useIsNarrow();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const spin = mounted && shouldAnimate(prefersReducedMotion) && !isNarrow;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const positions = wheelPositions(words.length);

  return (
    <section
      ref={sectionRef}
      data-lp-theme="ink"
      className={`lp-wheel ${spin ? 'is-spinning' : ''}`}
      aria-label={label}
    >
      <div className="lp-wheel__stage lp-container">
        <p className="lp-eyebrow lp-wheel__label">{label}</p>

        {spin ? (
          <div className="lp-wheel__viewport" aria-hidden="true">
            <MotionDiv className="lp-wheel__cylinder" style={{ rotateX }}>
              {words.map((word, index) => (
                <span
                  key={word}
                  className="lp-wheel__word"
                  style={{ transform: `rotateX(${-positions[index].angle}deg) translateZ(var(--lp-wheel-radius))` }}
                >
                  {word}
                </span>
              ))}
            </MotionDiv>
          </div>
        ) : null}

        <ul className={spin ? 'lp-sr-only' : 'lp-wheel__list'}>
          {words.map((word) => (
            <li key={word}>{word}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
