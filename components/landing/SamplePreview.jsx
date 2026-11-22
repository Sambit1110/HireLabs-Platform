import { FocusText } from '@/components/landing/FocusText';

// Fictional people, clearly labelled as sample data on the page.
const SAMPLE_CANDIDATES = [
  { name: 'Alex Mercer', title: 'Lead Full-Stack Engineer', skills: ['React', 'TypeScript', 'PostgreSQL'] },
  { name: 'Sarah Lin', title: 'Staff ML Engineer', skills: ['Python', 'Machine Learning', 'Vector Search'] },
  { name: 'Elena Rostova', title: 'Cloud Architect', skills: ['AWS', 'Kubernetes', 'Security'] },
];

export function SamplePreview() {
  return (
    <section id="demo" data-lp-theme="slate" className="lp-section lp-sample">
      <div className="lp-container">
        <p className="lp-eyebrow lp-section__eyebrow">Product preview · Sample data</p>
        <FocusText as="h2" className="lp-heading" text="What a parsed profile looks like." />
        <p className="lp-sample__intro">
          These profiles are fictional. Sign in to parse your own resumes, rank them against a job and
          see a full, explained evaluation.
        </p>

        <ul className="lp-sample__grid">
          {SAMPLE_CANDIDATES.map((candidate) => (
            <li key={candidate.name} className="lp-card lp-sample__card">
              <span className="lp-eyebrow lp-sample__tag">Sample candidate</span>
              <h3 className="lp-sample__name">{candidate.name}</h3>
              <p className="lp-sample__title">{candidate.title}</p>
              <ul className="lp-sample__skills" aria-label={`Skills for ${candidate.name}`}>
                {candidate.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
