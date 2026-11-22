import { FocusText } from '@/components/landing/FocusText';
import { PillButton } from '@/components/landing/PillButton';

export function ClosingCta({ onGetStarted }) {
  return (
    <section id="cta" data-lp-theme="ink" className="lp-section lp-cta">
      <div className="lp-container lp-cta__inner">
        <FocusText as="h2" className="lp-display" text="Ready to read between the lines?" />
        <PillButton onClick={onGetStarted}>Get started →</PillButton>
      </div>
    </section>
  );
}
