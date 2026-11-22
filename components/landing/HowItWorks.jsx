'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { FocusText } from '@/components/landing/FocusText';
import { HowDemo } from '@/components/landing/HowDemo';
import { StickerIcon } from '@/components/landing/StickerIcon';

const STEPS = [
  {
    kind: 'parse',
    title: 'Parse',
    body: 'Upload PDFs and Word files. Our parser pulls out names, roles, skills and experience.',
  },
  {
    kind: 'match',
    title: 'Match',
    body: 'Paste a job description. Our matching model ranks your candidates by meaning, not keyword overlap.',
  },
  {
    kind: 'explain',
    title: 'Explain',
    body: 'Every score comes with matched skills, missing skills and quotes from the resume.',
  },
  {
    kind: 'fair',
    title: 'Stay fair',
    body: "A fairness audit checks that names and gender don't move the score.",
  },
];

/**
 * One step card. The whole front is a button that turns the card over to a
 * small sample of that step's output; "Back" (or Escape) turns it back.
 * The hidden side is `inert`, and focus follows the visible side.
 * Mouse users who allow motion also get a gentle tilt and a spotlight that
 * follows the pointer (set as CSS variables, so React doesn't re-render).
 */
function HowCard({ step, number }) {
  const [flipped, setFlipped] = useState(false);
  const toggled = useRef(false);
  const frontButton = useRef(null);
  const backButton = useRef(null);
  const backId = useId();

  useEffect(() => {
    if (!toggled.current) return;
    (flipped ? backButton : frontButton).current?.focus({ preventScroll: true });
  }, [flipped]);

  const turn = (next) => {
    toggled.current = true;
    setFlipped(next);
  };

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return;
    const card = event.currentTarget;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    card.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
  };

  const onPointerLeave = (event) => {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && flipped) turn(false);
  };

  return (
    <li
      className={`lp-card lp-how__card${flipped ? ' is-flipped' : ''}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
    >
      <div className="lp-how__inner">
        <div className="lp-how__face lp-how__front" inert={flipped}>
          <div className="lp-how__top">
            <span className="lp-how__number">{number}</span>
            <StickerIcon kind={step.kind} />
          </div>
          <h3 className="lp-how__title">{step.title}</h3>
          <p className="lp-how__body">{step.body}</p>
          <button
            ref={frontButton}
            type="button"
            className="lp-how__toggle"
            aria-expanded={flipped}
            aria-controls={backId}
            onClick={() => turn(true)}
          >
            See it in action <span aria-hidden="true">→</span>
          </button>
        </div>

        <div
          id={backId}
          className="lp-how__face lp-how__back"
          inert={!flipped}
          role="group"
          aria-label={`${step.title}: sample output`}
        >
          <div className="lp-how__top">
            <span className="lp-how__number">{number} · Sample data</span>
          </div>
          <HowDemo kind={step.kind} />
          <button ref={backButton} type="button" className="lp-how__toggle" onClick={() => turn(false)}>
            <span aria-hidden="true">←</span> Back
          </button>
        </div>
      </div>
    </li>
  );
}

export function HowItWorks() {
  return (
    <section id="how" data-lp-theme="mid" className="lp-section lp-how">
      <div className="lp-container">
        <p className="lp-eyebrow lp-section__eyebrow">How it works</p>
        <FocusText as="h2" className="lp-heading" text="From a pile of resumes to a reasoned shortlist." />

        <ol className="lp-how__grid">
          {STEPS.map((step, index) => (
            <HowCard key={step.kind} step={step} number={String(index + 1).padStart(2, '0')} />
          ))}
        </ol>
      </div>
    </section>
  );
}
