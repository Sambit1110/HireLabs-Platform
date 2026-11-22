'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { shouldAnimate } from '@/lib/landing/motion-prefs';
import { CircularBadge } from '@/components/landing/CircularBadge';
import { FocusText } from '@/components/landing/FocusText';
import { PillButton } from '@/components/landing/PillButton';

const MotionDiv = motion.div;
const EASE = [0.65, 0, 0.35, 1];

/**
 * Opening scene: a glowing slab swings open like a door, then the
 * headline comes into focus.
 */
export function ThresholdHero({ onTrySample, onSignIn }) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const introDecided = useRef(false);

  useEffect(() => {
    // Visitors redirected to sign in (/?auth=signin) see the sign-in pop-up
    // straight away, so don't play the door behind it. Decide once: this
    // child effect runs before the page's effect removes the query
    // parameter, and the ref keeps React's dev double-run from re-deciding.
    if (!introDecided.current) {
      introDecided.current = true;
      setSkipIntro(new URLSearchParams(window.location.search).get('auth') === 'signin');
    }
    setMounted(true);
  }, []);

  const animate = mounted && shouldAnimate(prefersReducedMotion);
  const playDoor = animate && !skipIntro;

  return (
    <section id="product" data-lp-theme="deep" className="lp-hero">
      <div className="lp-hero__glow" aria-hidden="true" />
      <div className="lp-hero__ribs" aria-hidden="true" />

      {playDoor ? (
        <MotionDiv
          className="lp-door"
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 1.5, ease: 'easeOut' }}
        >
          <div className="lp-door__frame">
            <MotionDiv
              className="lp-door__panel"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: -100 }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
            />
          </div>
        </MotionDiv>
      ) : null}

      <div className="lp-container lp-hero__inner">
        <p className="lp-eyebrow lp-hero__eyebrow">HireLabs · AI-assisted resume screening</p>
        <FocusText
          as="h1"
          className="lp-display lp-hero__title"
          text="Find the people behind the resume."
          delay={playDoor ? 1.1 : 0}
        />
        <p className="lp-hero__lede">
          HireLabs reads every resume for evidence, ranks candidates by meaning, and explains every
          score, so your team decides with confidence.
        </p>
        <div className="lp-hero__actions">
          <PillButton onClick={onTrySample}>Try the sample →</PillButton>
          <PillButton variant="ghost" onClick={onSignIn}>
            Sign in
          </PillButton>
        </div>
      </div>

      <CircularBadge className="lp-hero__badge" />
    </section>
  );
}
