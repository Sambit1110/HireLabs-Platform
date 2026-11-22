'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

import { shouldAnimate } from '@/lib/landing/motion-prefs';
import { FocusText } from '@/components/landing/FocusText';

const MotionDiv = motion.div;

// Position (percent), size (px), resting tilt (deg) and parallax depth.
const SLABS = [
  { left: 4, top: 18, width: 150, height: 260, rotate: -12, depth: 60 },
  { left: 18, top: 58, width: 120, height: 210, rotate: -6, depth: -40 },
  { left: 72, top: 12, width: 170, height: 290, rotate: 8, depth: -55 },
  { left: 84, top: 56, width: 110, height: 190, rotate: 4, depth: 45 },
  { left: 56, top: 70, width: 130, height: 220, rotate: -9, depth: 30 },
];

function Slab({ slab, progress, animate }) {
  const y = useTransform(progress, [0, 1], [slab.depth, -slab.depth]);
  return (
    <MotionDiv
      className="lp-slab"
      aria-hidden="true"
      style={{
        left: `${slab.left}%`,
        top: `${slab.top}%`,
        width: slab.width,
        height: slab.height,
        rotate: slab.rotate,
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
    <section ref={sectionRef} id="principles" data-lp-theme="lavender" className="lp-section lp-principles">
      <div className="lp-principles__slabs">
        {SLABS.map((slab) => (
          <Slab key={`${slab.left}-${slab.top}`} slab={slab} progress={scrollYProgress} animate={animate} />
        ))}
      </div>

      <div className="lp-container lp-principles__inner">
        <FocusText as="h2" className="lp-display" text="Our principles" />
        <div className="lp-principles__lines">
          <FocusText as="h3" className="lp-principles__line" text="AI suggests. People decide." />
          <FocusText as="h3" className="lp-principles__line" text="Every score shows its reasons." />
          <FocusText as="h3" className="lp-principles__line" text="Your candidates belong to your team." />
        </div>
        <p className="lp-principles__note">
          Resumes stay in private storage, and row-level security means each account only ever sees its
          own candidates.
        </p>
      </div>
    </section>
  );
}
