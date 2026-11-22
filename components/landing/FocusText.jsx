'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { splitWords } from '@/lib/landing/text';
import { shouldAnimate } from '@/lib/landing/motion-prefs';

const MotionSpan = motion.span;

/**
 * A headline whose words come into focus one by one as it scrolls into view.
 * The full text is always in the DOM (and in aria-label), so it stays
 * readable and indexable while it animates.
 *
 * `intro` is for the first screen: the words are marked for a CSS focus-in
 * that starts with the server HTML instead of after hydration.
 */
export function FocusText({ as = 'h2', text, className = '', delay = 0, intro = false }) {
  const Tag = as;
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Server render and first client render are identical (plain words);
  // animation switches on after hydration only.
  useEffect(() => setMounted(true), []);

  const animate = !intro && mounted && shouldAnimate(prefersReducedMotion);
  const words = splitWords(text);

  return (
    <Tag className={`lp-focus ${className}`.trim()} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden="true">
          {animate ? (
            <MotionSpan
              className="lp-focus__word"
              initial={{ filter: 'blur(12px)', opacity: 0.15 }}
              whileInView={{ filter: 'blur(0px)', opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.9, delay: delay + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </MotionSpan>
          ) : (
            <span
              className={intro ? 'lp-focus__word lp-focus__word--intro' : 'lp-focus__word'}
              style={intro ? { '--i': index } : undefined}
            >
              {word}
            </span>
          )}
          {index < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}
