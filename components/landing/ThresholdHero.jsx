'use client';

import { useEffect, useRef, useState } from 'react';

import { FocusText } from '@/components/landing/FocusText';
import { PillButton } from '@/components/landing/PillButton';
import { RoseGlass } from '@/components/landing/RoseGlass';

/**
 * Opening scene: a glowing slab swings open like a door, the paper-rose
 * bouquet blooms in behind a glass-brick wall, and the headline comes into
 * focus on the glass. Both are in the server HTML and run as CSS
 * animations (only when the visitor allows motion), so the finished hero
 * never flashes before the door appears.
 */
export function ThresholdHero({ onTrySample, onSignIn }) {
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
  }, []);

  return (
    <section id="product" data-lp-theme="deep" className={`lp-hero${skipIntro ? ' lp-hero--no-intro' : ''}`}>
      <RoseGlass />

      {skipIntro ? null : (
        <div className="lp-door" aria-hidden="true">
          <div className="lp-door__frame">
            <div className="lp-door__panel" />
          </div>
        </div>
      )}

      <div className="lp-container lp-hero__inner">
        <p className="lp-eyebrow lp-hero__eyebrow">HireLabs · AI-assisted resume screening</p>
        <FocusText
          as="h1"
          className="lp-display lp-hero__title"
          text="Find the people behind the resume."
          intro
        />
        <p className="lp-hero__lede">
          HireLabs reads every resume for evidence, ranks candidates by meaning, and explains every
          score, so your team decides with confidence.
        </p>
        <div className="lp-hero__actions">
          <PillButton onClick={onTrySample} arrow>
            Try the sample
          </PillButton>
          <PillButton variant="ghost" onClick={onSignIn}>
            Sign in
          </PillButton>
        </div>
      </div>

    </section>
  );
}
