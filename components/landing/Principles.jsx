'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

import { shouldAnimate } from '@/lib/landing/motion-prefs';
import { FocusText } from '@/components/landing/FocusText';

const MotionDiv = motion.div;

// Paper resume pages kept to the outer edges, clear of the centred text:
// position (percent), width (px), resting tilt (deg) and parallax depth.
const SHEETS = [
  { left: 3, top: 14, width: 150, rotate: -12, depth: 60 },
  { left: 10, top: 60, width: 118, rotate: -5, depth: -40 },
  { left: 86, top: 10, width: 160, rotate: 9, depth: -55 },
  { left: 90, top: 58, width: 112, rotate: 5, depth: 45 },
  { left: -2, top: 82, width: 96, rotate: 14, depth: 30 },
];

const PRINCIPLES = [
  {
    line: 'AI suggests. People decide.',
    proof: 'Scores rank candidates; nobody is rejected automatically.',
  },
  {
    line: 'Every score shows its reasons.',
    proof: 'Matched skills, missing skills and quotes from the resume.',
  },
  {
    line: 'Your candidates belong to your team.',
    proof:
      'Resumes stay in private storage, and row-level security means each account only ever sees its own candidates.',
  },
];

function Sheet({ sheet, progress, animate }) {
  const y = useTransform(progress, [0, 1], [sheet.depth, -sheet.depth]);
  return (
    <MotionDiv
      className="lp-sheet"
      aria-hidden="true"
      style={{
        left: `${sheet.left}%`,
        top: `${sheet.top}%`,
        width: sheet.width,
        rotate: sheet.rotate,
        y: animate ? y : 0,
      }}
    />
  );
}

export function Principles() {
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const animate = mounted && shouldAnimate(prefersReducedMotion);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });

  return (
    <section ref={sectionRef} id="principles" data-lp-theme="cream" className="lp-section lp-principles">
      <div className="lp-principles__sheets">
        {SHEETS.map((sheet) => (
          <Sheet key={`${sheet.left}-${sheet.top}`} sheet={sheet} progress={scrollYProgress} animate={animate} />
        ))}
      </div>

      <div className="lp-container lp-principles__inner">
        <FocusText as="h2" className="lp-display" text="Our principles" />
        <ul className="lp-principles__list">
          {PRINCIPLES.map((principle) => (
            <li key={principle.line} className="lp-principles__item">
              <FocusText as="h3" className="lp-principles__line" text={principle.line} />
              <p className="lp-principles__proof">{principle.proof}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
