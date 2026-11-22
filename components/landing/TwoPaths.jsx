import { FocusText } from '@/components/landing/FocusText';

const PATHS = [
  {
    href: '/dashboard',
    title: 'Screen candidates',
    body: 'Upload resumes, rank them against a job and read the reasons behind every score.',
  },
  {
    href: '/dashboard/results',
    title: 'See how our models perform',
    body: 'Our own models compared with keyword matching, on resumes they were never trained on.',
  },
];

export function TwoPaths() {
  return (
    <section data-lp-theme="mid" className="lp-section lp-paths">
      <div className="lp-container">
        <FocusText as="h2" className="lp-heading lp-paths__heading" text="You're probably here for one of two things" />
        <div className="lp-paths__grid">
          {PATHS.map((path) => (
            <a key={path.href} href={path.href} className="lp-card lp-paths__card">
              <span className="lp-paths__title">{path.title}</span>
              <span className="lp-paths__body">{path.body}</span>
              <span className="lp-paths__arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
