'use client';

import { Button } from '../ui/Button';

const examples = [
  { name: 'Alex Mercer', title: 'Lead Full-Stack Engineer', skills: ['React', 'TypeScript', 'PostgreSQL'] },
  { name: 'Sarah Lin', title: 'Staff ML Engineer', skills: ['Python', 'Machine Learning', 'Vector Search'] },
  { name: 'Elena Rostova', title: 'Cloud Architect', skills: ['AWS', 'Kubernetes', 'Security'] },
];

export function InteractiveDemo({ onAuthRequired }) {
  return <section className="hl-demo" id="demo" aria-labelledby="demo-title">
    <div className="hl-demo-shell">
      <p className="hl-demo-kicker">PRODUCT PREVIEW · SAMPLE DATA</p>
      <h2 id="demo-title">A clearer view of resume information</h2>
      <p className="hl-demo-intro">These fictional profiles show the kind of details HireLabs can organise. The examples are illustrative; this preview does not rank candidates or perform semantic matching.</p>
      <div className="hl-demo-grid">{examples.map((candidate) => <article className="hl-demo-card" key={candidate.name}>
        <span className="hl-demo-sample">SAMPLE CANDIDATE</span><h3>{candidate.name}</h3><p>{candidate.title}</p><div className="hl-demo-skills">{candidate.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
      </article>)}</div>
      <div className="hl-demo-action"><p>Your private resume library and protected AI tools are available after sign-in.</p><Button variant="primary" onClick={onAuthRequired}>Sign in to your workspace</Button></div>
    </div>
    <style jsx>{`
      .hl-demo { padding: 100px 24px; background: #f6f4ef; color: #28241f; }
      .hl-demo-shell { max-width: 1120px; margin: auto; }
      .hl-demo-kicker { font-size: 11px; font-weight: 800; letter-spacing: .15em; color: #777067; }
      .hl-demo h2 { max-width: 680px; font-size: clamp(32px, 5vw, 52px); line-height: 1.08; margin: 14px 0; }
      .hl-demo-intro { max-width: 740px; color: #676057; line-height: 1.7; }
      .hl-demo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 32px; }
      .hl-demo-card { padding: 22px; border: 1px solid #e2ded6; background: #fff; border-radius: 14px; }
      .hl-demo-sample { color: #786e5d; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
      .hl-demo-card h3 { margin: 15px 0 5px; }.hl-demo-card p { color: #70695f; margin: 0; }
      .hl-demo-skills { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 18px; }.hl-demo-skills span { padding: 6px 9px; border-radius: 99px; background: #f2f0eb; font-size: 12px; }
      .hl-demo-action { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; padding: 20px; border-radius: 12px; background: #ece9e1; }.hl-demo-action p { margin: 0; color: #5f594f; }
      @media(max-width: 720px) { .hl-demo-grid { grid-template-columns: 1fr; }.hl-demo-action { align-items: flex-start; flex-direction: column; } }
    `}</style>
  </section>;
}
