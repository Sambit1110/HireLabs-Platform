'use client';

import { useId, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';

import { wheelIndexAt, wordPose } from '@/lib/landing/wheel';

const MotionSpan = motion.span;
const MotionP = motion.p;
const MotionDiv = motion.div;

/** Drum radius, in multiples of the word size. */
const RADIUS_EM = 2.1;

const pad = (number) => String(number).padStart(2, '0');

function DrumWord({ word, index, active }) {
  const y = useTransform(active, (value) => `${wordPose(index - value).y * RADIUS_EM}em`);
  const rotateX = useTransform(active, (value) => wordPose(index - value).rotateX);
  const opacity = useTransform(active, (value) => wordPose(index - value).opacity);
  const filter = useTransform(active, (value) => `blur(${wordPose(index - value).blur}px)`);

  return (
    <MotionSpan className="lp-wheel__word" style={{ y, rotateX, opacity, filter }}>
      {word}
    </MotionSpan>
  );
}

function DrumCaption({ caption, index, active }) {
  const opacity = useTransform(active, (value) => Math.max(0, 1 - Math.abs(index - value) * 2.5));
  const y = useTransform(active, (value) => (index - value) * 12);

  return (
    <MotionP className="lp-wheel__caption" style={{ opacity, y }}>
      {caption}
    </MotionP>
  );
}

/**
 * "We read for …" followed by an upright drum of words that turns as the
 * page scrolls, resting on each word with a short caption.
 *
 * The drum is in the server HTML; CSS shows it only on wide screens for
 * visitors who allow motion. Everyone else (and screen readers) gets the
 * numbered list with the same words and captions.
 *
 * @param {{ items: { word: string, caption: string }[], label?: string }} props
 */
export function WordWheel({ items, label = 'We read for' }) {
  const sectionRef = useRef(null);
  const headingId = useId();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const active = useTransform(scrollYProgress, (progress) => wheelIndexAt(progress, items.length));

  const [current, setCurrent] = useState(0);
  useMotionValueEvent(active, 'change', (value) => setCurrent(Math.round(value)));

  return (
    <section ref={sectionRef} data-lp-theme="deep" className="lp-wheel" aria-labelledby={headingId}>
      <div className="lp-container lp-wheel__stage">
        <h2 id={headingId} className="lp-wheel__lead">
          {label}
        </h2>

        <div className="lp-wheel__drum" aria-hidden="true">
          <span className="lp-wheel__band" />
          {items.map((item, index) => (
            <DrumWord key={item.word} word={item.word} index={index} active={active} />
          ))}
        </div>

        <div className="lp-wheel__meta" aria-hidden="true">
          <span className="lp-wheel__count">{`${pad(current + 1)} / ${pad(items.length)}`}</span>
          <div className="lp-wheel__captions">
            {items.map((item, index) => (
              <DrumCaption key={item.word} caption={item.caption} index={index} active={active} />
            ))}
          </div>
        </div>

        <MotionDiv className="lp-wheel__progress" aria-hidden="true" style={{ scaleX: scrollYProgress }} />

        <ul className="lp-wheel__list">
          {items.map((item, index) => (
            <li key={item.word}>
              <span className="lp-wheel__list-num" aria-hidden="true">
                {pad(index + 1)}
              </span>
              <span className="lp-wheel__list-word">{item.word}</span>
              <span className="lp-wheel__list-caption">{item.caption}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
