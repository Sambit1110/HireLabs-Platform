import { FocusText } from '@/components/landing/FocusText';
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

export function HowItWorks() {
  return (
    <section id="how" data-lp-theme="slate" className="lp-section lp-how">
      <div className="lp-container">
        <p className="lp-eyebrow lp-section__eyebrow">How it works</p>
        <FocusText as="h2" className="lp-heading" text="From a pile of resumes to a reasoned shortlist." />

        <ol className="lp-how__grid">
          {STEPS.map((step, index) => (
            <li key={step.kind} className="lp-card lp-how__card">
              <div className="lp-how__top">
                <span className="lp-how__number">{String(index + 1).padStart(2, '0')}</span>
                <StickerIcon kind={step.kind} />
              </div>
              <h3 className="lp-how__title">{step.title}</h3>
              <p className="lp-how__body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
